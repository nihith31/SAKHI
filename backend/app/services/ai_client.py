from openai import AsyncOpenAI
from app.config import settings


class AIService:
    """
    Service wrapper that handles connection to the NVIDIA API Catalog
    using the OpenAI-compatible endpoint format.
    """
    def __init__(self):
        # We use standard AsyncOpenAI client pointing to NVIDIA endpoints
        self.client = AsyncOpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=settings.NVIDIA_API_KEY
        )
        # Default fallback model
        self.default_model = settings.NVIDIA_MODEL_CHAT

    async def chat(self, messages: list, system_prompt: str = None, model: str = None) -> str:
        """
        Sends a conversation history to the NVIDIA API Catalog.
        Supports model parameter routing (e.g. 8B for chat, 70B for planner).
        """
        selected_model = model or self.default_model
        formatted_messages = []

        if system_prompt:
            formatted_messages.append({
                "role": "system",
                "content": system_prompt
            })

        formatted_messages.extend(messages)

        try:
            # NVIDIA API Catalog endpoints use OpenAI format
            completion = await self.client.chat.completions.create(
                model=selected_model,
                messages=formatted_messages,
                temperature=0.2,
                top_p=0.7,
                max_tokens=1024
            )
            content = completion.choices[0].message.content
            return content if content else ""
        except Exception as e:
            return (
                f"Error communicating with NVIDIA API Catalog ({selected_model}): {str(e)}. "
                f"Please check your NVIDIA_API_KEY and model settings."
            )

    async def is_ready(self) -> bool:
        """
        Validates connection to NVIDIA API Catalog by sending a lightweight ping request.
        """
        # If key is empty or still has placeholder prefix, client is not ready
        if not settings.NVIDIA_API_KEY or "YOUR_NVIDIA_API_KEY" in settings.NVIDIA_API_KEY:
            return False
        try:
            await self.client.chat.completions.create(
                model=self.default_model,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1
            )
            return True
        except Exception:
            return False


# Keep the instance name same to prevent breaking imports in agent files
ai_service = AIService()


