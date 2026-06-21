from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.services.auth import get_current_user
from app.services.supabase_client import supabase_admin
from app.schemas.tracker import (
    SymptomLogCreate, SymptomLogResponse,
    CycleLogCreate, CycleLogResponse,
    WeightLogCreate, WeightLogResponse
)
from datetime import date as date_type
from app.agents.symptom_analyst import symptom_analyst

router = APIRouter(
    prefix="/api/tracker",
    tags=["tracker"]
)

# --- SYMPTOM LOGS ---

@router.post("/symptom", response_model=SymptomLogResponse)
async def log_symptom(log: SymptomLogCreate, current_user=Depends(get_current_user)):
    try:
        data = log.model_dump()
        data["user_id"] = current_user.id
        # Convert date to string for JSON serialization/postgres
        data["date"] = str(data["date"])

        # Insert or upsert (UNIQUE constraint is on user_id, date)
        response = supabase_admin.table("symptom_logs").upsert(data, on_conflict="user_id,date").execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to log symptom.")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/symptoms", response_model=List[SymptomLogResponse])
async def get_symptoms(current_user=Depends(get_current_user)):
    try:
        response = supabase_admin.table("symptom_logs")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .order("date", descending=True)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- CYCLE LOGS ---

@router.post("/cycle", response_model=CycleLogResponse)
async def log_cycle(log: CycleLogCreate, current_user=Depends(get_current_user)):
    try:
        data = log.model_dump()
        data["user_id"] = current_user.id
        data["period_start"] = str(data["period_start"])
        if data["period_end"]:
            data["period_end"] = str(data["period_end"])

        # Insert new period log
        response = supabase_admin.table("cycle_logs").insert(data).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to log cycle.")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cycles", response_model=List[CycleLogResponse])
async def get_cycles(current_user=Depends(get_current_user)):
    try:
        response = supabase_admin.table("cycle_logs")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .order("period_start", descending=True)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- WEIGHT LOGS ---

@router.post("/weight", response_model=WeightLogResponse)
async def log_weight(log: WeightLogCreate, current_user=Depends(get_current_user)):
    try:
        data = log.model_dump()
        data["user_id"] = current_user.id
        data["date"] = str(data["date"])

        response = supabase_admin.table("weight_logs").upsert(data, on_conflict="user_id,date").execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to log weight.")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/weights", response_model=List[WeightLogResponse])
async def get_weights(current_user=Depends(get_current_user)):
    try:
        response = supabase_admin.table("weight_logs")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .order("date", descending=True)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analysis")
async def get_symptom_analysis(current_user=Depends(get_current_user)):
    try:
        # Fetch last 30 logs
        logs_response = supabase_admin.table("symptom_logs")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .order("date", descending=True)\
            .limit(30)\
            .execute()
        
        # Fetch user profile to get goals/diagnosed info
        profile_response = supabase_admin.table("profiles")\
            .select("*")\
            .eq("id", current_user.id)\
            .single()\
            .execute()
            
        user_profile = profile_response.data if profile_response.data else {}
        language = user_profile.get("language", "en")
        
        analysis_text = await symptom_analyst.analyze(logs_response.data, language, user_profile)
        return {"analysis": analysis_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
