import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "your-supabase-anon-key")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "your-supabase-service-role-key")
    
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "https://api.ollama.com")
    OLLAMA_API_KEY: str = os.getenv("OLLAMA_API_KEY", "")
    AI_MODEL: str = os.getenv("AI_MODEL", "deepseek-v3.2")
    
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    class Config:
        env_file = ".env"

settings = Settings()
