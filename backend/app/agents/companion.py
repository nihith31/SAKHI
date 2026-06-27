from app.services.ollama_client import ollama_service
from app.services.rag_service import rag_service
from app.config import settings

class CompanionAgent:
    def __init__(self):
        pass

    def get_system_prompt(self, language: str, user_profile: dict, context: str) -> str:
        # Resolve target language instruction
        lang_instruction = "Respond in warm, simple English."
        if language == 'hi':
            lang_instruction = "Respond completely in Hindi (using simple, everyday Hinglish/Hindi characters that are easy to read)."
        elif language == 'te':
            lang_instruction = "Respond completely in Telugu (using simple, everyday Telugu characters or Telugu-English blend)."

        profile_context = (
            f"User profile details:\n"
            f"- Name: {user_profile.get('display_name', 'Friend')}\n"
            f"- Age: {user_profile.get('age', 'N/A')}\n"
            f"- Diagnosed with PCOS: {user_profile.get('pcos_diagnosed', 'No')}\n"
            f"- Primary Goals: {', '.join(user_profile.get('goals', []))}\n"
        )

        return (
            "You are Sakhi 🌸, a supportive, knowledgeable, and empathetic AI companion for women managing PCOS.\n"
            "Your tone should be warm, friendly, and non-judgmental—like a trusted best friend who understands healthcare.\n"
            f"{lang_instruction}\n\n"
            f"{profile_context}\n"
            f"Clinical Knowledge Base Context:\n{context}\n\n"
            "Guidelines:\n"
            "1. Give practical, simple advice focusing on holistic habits (nutrition, stress, cycles).\n"
            "2. Always acknowledge user concerns with empathy.\n"
            "3. If referencing food suggestions, lean towards regional ingredients (South Indian or North Indian) depending on their preferences.\n"
            "4. Do NOT use markdown formatting (such as **, #, ##, or markdown tables) in your response. Instead, write in clear, plain text. For headers, use plain text on new lines. For emphasis, use emojis or simple capitalization. Use standard unicode bullet points (•) and clean double-newlines to structure your response."
        )


    async def respond(self, message: str, chat_history: list, language: str, user_profile: dict) -> str:
        # Normalize language code — strip locale suffix and default to 'en'
        lang = (language or 'en').split('-')[0].lower()
        if lang not in ('en', 'hi', 'te'):
            lang = 'en'
        # Retrieve context via RAG
        context = rag_service.retrieve_context(message)
        system_prompt = self.get_system_prompt(lang, user_profile, context)

        # Structure messages history
        messages = []
        for msg in chat_history:
            messages.append({
                "role": "user" if msg.get("role") == "user" else "assistant",
                "content": msg.get("content", "")
            })
        
        # Add new user query
        messages.append({"role": "user", "content": message})

        # Run model inference
        response = await ollama_service.chat(messages, system_prompt=system_prompt, model=settings.NVIDIA_MODEL_CHAT)

        # Programmatically sanitize raw markdown formatting symbols
        cleaned_response = response.replace("**", "").replace("__", "")
        lines = cleaned_response.split("\n")
        cleaned_lines = []
        for line in lines:
            stripped_line = line.strip()
            # If the line starts with header hashes, strip them
            if stripped_line.startswith("#"):
                cleaned_lines.append(stripped_line.lstrip("#").strip())
            else:
                cleaned_lines.append(line)
        cleaned_response = "\n".join(cleaned_lines)

        # Localized disclaimers (short one-liners)
        disclaimers = {
            "en": "\n\n*AI-generated advice; consult a doctor for medical decisions.*",
            "hi": "\n\n*एआई-जनित सलाह; चिकित्सा निर्णयों के लिए डॉक्टर से परामर्श करें।*",
            "te": "\n\n*AI సలహా; వైద్యపరమైన నిర్ణయాల కోసం వైద్యుడిని సంప్రదించండి.*"
        }
        
        disclaimer = disclaimers.get(lang, disclaimers["en"])
        return cleaned_response + disclaimer


companion_agent = CompanionAgent()
