from fastapi import Header, HTTPException, Depends
from typing import Optional
from app.services.supabase_client import supabase_client
from gotrue.errors import AuthApiError

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header. Must be Bearer token."
        )
    
    token = authorization.split(" ")[1]
    try:
        # Retrieve user using the JWT
        user_response = supabase_client.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid session token.")
        return user_response.user
    except AuthApiError as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
