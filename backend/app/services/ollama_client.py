import ollama
import httpx
from app.config import settings


class OllamaService:
    def __init__(self):
        # Build headers — add Authorization if API key is set (Ollama Cloud)
        headers = {}
        if settings.OLLAMA_API_KEY:
            headers["Authorization"] = f"Bearer {settings.OLLAMA_API_KEY}"

        self.client = ollama.Client(
            host=settings.OLLAMA_HOST,
            headers=headers if headers else None
        )
        self.model = settings.AI_MODEL

    async def chat(self, messages: list, system_prompt: str = None) -> str:
        """
        Sends a conversation history to the configured Ollama model
        (local or Ollama Cloud, depending on OLLAMA_HOST and OLLAMA_API_KEY).
        """
        formatted_messages = []

        if system_prompt:
            formatted_messages.append({
                "role": "system",
                "content": system_prompt
            })

        formatted_messages.extend(messages)

        try:
            response = self.client.chat(
                model=self.model,
                messages=formatted_messages
            )
            return response['message']['content']
        except Exception as e:
            host_type = "Ollama Cloud" if settings.OLLAMA_API_KEY else "local Ollama"
            return (
                f"Error communicating with {host_type} ({settings.OLLAMA_HOST}): {str(e)}. "
                f"Please check your OLLAMA_HOST, OLLAMA_API_KEY, and AI_MODEL settings."
            )

    async def is_ready(self) -> bool:
        """
        Validates connection to Ollama (local or cloud) and checks model availability.
        """
        try:
            models = self.client.list()
            available_models = [m['name'] for m in models.get('models', [])]
            return self.model in available_models or any(self.model in name for name in available_models)
        except Exception:
            return False


ollama_service = OllamaService()

