from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from typing import List, Optional
from app.services.auth import get_current_user
from app.services.supabase_client import supabase_admin
from app.services.ocr_service import ocr_service
from app.agents.lab_analyzer import lab_analyzer
from pydantic import BaseModel
from datetime import date as date_type
import uuid

router = APIRouter(
    prefix="/api/lab-reports",
    tags=["lab-reports"]
)

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/bmp",
    "image/tiff",
}

MAX_FILE_SIZE_MB = 10


@router.post("/upload")
async def upload_lab_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    """Upload a PDF or image lab report, run OCR, and queue AI analysis."""
    # Validate file type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Please upload a PDF or image (JPG/PNG/BMP/TIFF)."
        )

    # Read file bytes
    file_bytes = await file.read()

    # Check file size
    if len(file_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_FILE_SIZE_MB} MB.")

    try:
        # 1. Upload to Supabase Storage
        storage_path = f"{current_user.id}/{uuid.uuid4()}_{file.filename}"
        storage_response = supabase_admin.storage.from_("lab-reports").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type}
        )

        # Get public URL
        file_url = supabase_admin.storage.from_("lab-reports").get_public_url(storage_path)

        # 2. Extract text via OCR
        extracted_text = ocr_service.extract_text(file_bytes, file.filename or "report")

        # 3. Fetch user language preference
        profile_resp = supabase_admin.table("profiles").select("language").eq("id", current_user.id).single().execute()
        language = profile_resp.data.get("language", "en") if profile_resp.data else "en"

        # 4. Create initial DB row (without analysis yet)
        db_row = {
            "user_id": current_user.id,
            "file_url": file_url,
            "report_date": str(date_type.today()),
            "language": language,
            "ai_analysis": None,
            "extracted_values": None
        }
        insert_resp = supabase_admin.table("lab_reports").insert(db_row).execute()

        if not insert_resp.data:
            raise HTTPException(status_code=500, detail="Failed to create lab report record.")

        report_id = insert_resp.data[0]["id"]

        # 5. Run AI analysis in background (non-blocking)
        background_tasks.add_task(
            _run_ai_analysis_and_save,
            report_id=report_id,
            raw_text=extracted_text,
            language=language
        )

        return {
            "report_id": report_id,
            "file_url": file_url,
            "status": "uploaded",
            "message": "Lab report uploaded successfully. AI analysis is running in the background."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


async def _run_ai_analysis_and_save(report_id: str, raw_text: str, language: str):
    """Background task: run AI analysis and update the DB row."""
    try:
        analysis_result = await lab_analyzer.analyze(raw_text, language)

        supabase_admin.table("lab_reports").update({
            "ai_analysis": analysis_result.get("summary", ""),
            "extracted_values": analysis_result
        }).eq("id", report_id).execute()
    except Exception as e:
        # Update with error state
        supabase_admin.table("lab_reports").update({
            "ai_analysis": f"Analysis failed: {str(e)}",
            "extracted_values": {}
        }).eq("id", report_id).execute()


@router.post("/analyze/{report_id}")
async def analyze_existing_report(report_id: str, current_user=Depends(get_current_user)):
    """Re-run AI analysis on an already-uploaded report."""
    try:
        # Fetch the report
        report_resp = supabase_admin.table("lab_reports")\
            .select("*").eq("id", report_id).eq("user_id", current_user.id).single().execute()

        if not report_resp.data:
            raise HTTPException(status_code=404, detail="Lab report not found.")

        report = report_resp.data
        language = report.get("language", "en")

        # Download file from storage and re-extract text
        file_url: str = report.get("file_url", "")
        # Extract filename from URL for format detection
        filename = file_url.split("/")[-1] if "/" in file_url else "report.pdf"

        # Fetch raw file bytes from Supabase storage
        storage_path = "/".join(file_url.split("/")[-2:])  # user_id/filename
        file_bytes_resp = supabase_admin.storage.from_("lab-reports").download(storage_path)

        if not file_bytes_resp:
            raise HTTPException(status_code=500, detail="Could not retrieve report file from storage.")

        raw_text = ocr_service.extract_text(file_bytes_resp, filename)
        analysis_result = await lab_analyzer.analyze(raw_text, language)

        # Update DB
        supabase_admin.table("lab_reports").update({
            "ai_analysis": analysis_result.get("summary", ""),
            "extracted_values": analysis_result
        }).eq("id", report_id).execute()

        return {"report_id": report_id, "analysis": analysis_result}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_lab_reports(current_user=Depends(get_current_user)):
    """Fetch all lab reports for the current user."""
    try:
        response = supabase_admin.table("lab_reports")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .order("created_at", desc=True)\
            .execute()
        return {"reports": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{report_id}")
async def get_lab_report(report_id: str, current_user=Depends(get_current_user)):
    """Get a single lab report by ID."""
    try:
        response = supabase_admin.table("lab_reports")\
            .select("*")\
            .eq("id", report_id)\
            .eq("user_id", current_user.id)\
            .single()\
            .execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Lab report not found.")
        return {"report": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ManualValueEntry(BaseModel):
    hormone: str
    value: str
    unit: str

class UpdateValuesRequest(BaseModel):
    entries: List[ManualValueEntry]

@router.patch("/update-values/{report_id}")
async def update_extracted_values(report_id: str, req: UpdateValuesRequest, current_user=Depends(get_current_user)):
    """Merge manually entered hormone values into an existing report's extracted_values."""
    try:
        report_resp = supabase_admin.table("lab_reports")\
            .select("extracted_values").eq("id", report_id).eq("user_id", current_user.id).single().execute()
        if not report_resp.data:
            raise HTTPException(status_code=404, detail="Lab report not found.")

        extracted = report_resp.data.get("extracted_values") or {}
        ev = extracted.get("extracted_values", {})
        for entry in req.entries:
            if entry.value.strip():
                ev[entry.hormone] = {"value": entry.value, "unit": entry.unit, "status": "manual_entry"}
        extracted["extracted_values"] = ev

        supabase_admin.table("lab_reports").update({"extracted_values": extracted}).eq("id", report_id).execute()
        return {"status": "updated", "extracted_values": extracted}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{report_id}")
async def delete_lab_report(report_id: str, current_user=Depends(get_current_user)):
    """Delete a lab report from database and Supabase storage."""
    try:
        # 1. Fetch the report to get the file URL
        report_resp = supabase_admin.table("lab_reports")\
            .select("*").eq("id", report_id).eq("user_id", current_user.id).single().execute()
        if not report_resp.data:
            raise HTTPException(status_code=404, detail="Lab report not found.")
        
        report = report_resp.data
        file_url = report.get("file_url", "")
        
        # 2. Delete from database
        supabase_admin.table("lab_reports").delete().eq("id", report_id).execute()
        
        # 3. Delete from storage
        if file_url:
            try:
                storage_path = "/".join(file_url.split("/")[-2:])  # user_id/filename
                supabase_admin.storage.from_("lab-reports").remove(storage_path)
            except Exception as se:
                print(f"Error deleting file from storage: {se}")
                
        return {"status": "success", "message": "Lab report deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
