from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.services.ollama_client import ollama_service
from app.routers.chat import router as chat_router
from app.routers.tracker import router as tracker_router
from app.routers.nutrition import router as nutrition_router
from app.routers.lab_reports import router as lab_reports_router
from app.routers.audio import router as audio_router

app = FastAPI(
    title="Sakhi Backend API",
    description="Multi-agent backend running BioMistral-7B locally, backed by Supabase.",
    version="1.0.0"
)

# Set up CORS to allow connections from local development mobile setups (Expo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(chat_router)
app.include_router(tracker_router)
app.include_router(nutrition_router)
app.include_router(lab_reports_router)
app.include_router(audio_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Sakhi API 🌸. Everything is running."}

@app.get("/health")
async def health_check():
    ai_ready = await ollama_service.is_ready()
    return {
        "status": "healthy",
        "database": "Supabase configured",
        "ai_agent_engine": f"Ollama/{settings.AI_MODEL}",
        "ai_ready": ai_ready
    }

