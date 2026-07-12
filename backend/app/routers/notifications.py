import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.auth import get_current_user
from app.services.supabase_client import supabase_admin

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class SendNotificationRequest(BaseModel):
    title: str
    body: str
    user_id: Optional[str] = None  # If None, sends to the authenticated user


class RegisterTokenRequest(BaseModel):
    expo_push_token: str


async def send_expo_push(push_token: str, title: str, body: str) -> dict:
    """
    Sends a push notification via Expo's Push API.
    https://docs.expo.dev/push-notifications/sending-notifications/
    """
    message = {
        "to": push_token,
        "sound": "default",
        "title": title,
        "body": body,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://exp.host/--/api/v2/push/send",
            json=message,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )
        return response.json()


@router.post("/register-token")
async def register_push_token(
    req: RegisterTokenRequest,
    current_user=Depends(get_current_user),
):
    """
    Saves the Expo push token to the user's profile.
    Called from the mobile app on startup.
    """
    try:
        supabase_admin.table("profiles") \
            .update({"expo_push_token": req.expo_push_token}) \
            .eq("id", current_user.id) \
            .execute()

        return {"status": "ok", "message": "Push token registered."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send")
async def send_notification(
    req: SendNotificationRequest,
    current_user=Depends(get_current_user),
):
    """
    Sends a push notification to a specific user (or to the authenticated user).
    Fetches the push token from the profiles table and calls Expo Push API.
    """
    target_user_id = req.user_id or current_user.id

    try:
        # Fetch the push token from the profile
        profile_response = supabase_admin.table("profiles") \
            .select("expo_push_token") \
            .eq("id", target_user_id) \
            .single() \
            .execute()

        if not profile_response.data:
            raise HTTPException(status_code=404, detail="User profile not found.")

        push_token = profile_response.data.get("expo_push_token")
        if not push_token:
            raise HTTPException(
                status_code=400,
                detail="User does not have a push token registered. They need to open the app first."
            )

        # Send via Expo Push API
        result = await send_expo_push(push_token, req.title, req.body)

        # Log the notification in the database
        supabase_admin.table("notification_logs").insert({
            "user_id": target_user_id,
            "type": "push",
            "title": req.title,
            "body": req.body,
        }).execute()

        return {"status": "sent", "expo_response": result}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
