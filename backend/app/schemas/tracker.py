from pydantic import BaseModel, Field, conint
from typing import Optional
from datetime import date as date_type, datetime
from uuid import UUID

class SymptomLogCreate(BaseModel):
    date: date_type = Field(..., description="Date of the symptom log")
    energy_level: Optional[conint(ge=1, le=5)] = Field(None, description="Energy level from 1 to 5")
    mood: Optional[conint(ge=1, le=5)] = Field(None, description="Mood from 1 to 5")
    pain_level: Optional[conint(ge=1, le=5)] = Field(None, description="Pain level from 1 to 5")
    acne: bool = Field(False, description="Whether user has acne")
    hair_loss: bool = Field(False, description="Whether user has hair loss")
    bloating: bool = Field(False, description="Whether user is experiencing bloating")
    notes: Optional[str] = Field(None, description="Any additional text notes")

class SymptomLogResponse(SymptomLogCreate):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class CycleLogCreate(BaseModel):
    period_start: date_type = Field(..., description="Start date of the cycle/period")
    period_end: Optional[date_type] = Field(None, description="End date of the cycle/period")
    flow_intensity: Optional[str] = Field(None, description="Flow intensity: 'light', 'medium', 'heavy'")
    notes: Optional[str] = Field(None, description="Any additional notes")

class CycleLogResponse(CycleLogCreate):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class WeightLogCreate(BaseModel):
    date: date_type = Field(..., description="Date of the weight entry")
    weight_kg: float = Field(..., description="Weight in kilograms")

class WeightLogResponse(WeightLogCreate):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
