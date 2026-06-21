from fastapi import APIRouter, HTTPException, Depends
from app.services.auth import get_current_user
from app.services.supabase_client import supabase_admin
from app.agents.meal_planner import meal_planner
from datetime import datetime, date as date_type
from pydantic import BaseModel
from typing import Optional

router = APIRouter(
    prefix="/api/nutrition",
    tags=["nutrition"]
)

class GenerateMealPlanRequest(BaseModel):
    region: Optional[str] = "general" # "south_indian", "north_indian", "general"

@router.get("/meal-plan")
async def get_meal_plan(current_user=Depends(get_current_user)):
    try:
        # Retrieve the latest generated meal plan
        response = supabase_admin.table("meal_plans")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .order("created_at", descending=True)\
            .limit(1)\
            .execute()
        
        if not response.data:
            return {"plan": None}
            
        return {"plan": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/meal-plan/generate")
async def generate_new_meal_plan(req: GenerateMealPlanRequest, current_user=Depends(get_current_user)):
    try:
        # Fetch user profile to get language and preferences
        profile_response = supabase_admin.table("profiles")\
            .select("*")\
            .eq("id", current_user.id)\
            .single()\
            .execute()
            
        if not profile_response.data:
            raise HTTPException(status_code=404, detail="User profile not found.")
            
        user_profile = profile_response.data
        language = user_profile.get("language", "en")
        
        # Use the region passed in request, or fall back to profile setting (if any) or general
        region = req.region or "general"
        
        # Generate the weekly plan using our AI agent
        generated_plan = await meal_planner.generate_plan(language, region, user_profile)
        
        # Save to DB
        db_data = {
            "user_id": current_user.id,
            "week_start_date": str(date_type.today()),
            "language": language,
            "region": region,
            "plan_data": generated_plan,
            "generated_by_ai": True
        }
        
        insert_response = supabase_admin.table("meal_plans").insert(db_data).execute()
        if not insert_response.data:
            raise HTTPException(status_code=500, detail="Failed to save generated plan to database.")
            
        return {"plan": insert_response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
