from app.services.ollama_client import ollama_service
from app.services.rag_service import rag_service

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
            "4. Keep your responses structured and readable (use bullet points where appropriate)."
        )

    async def respond(self, message: str, chat_history: list, language: str, user_profile: dict) -> str:
        # Retrieve context via RAG
        context = rag_service.retrieve_context(message)
        system_prompt = self.get_system_prompt(language, user_profile, context)

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
        response = await ollama_service.chat(messages, system_prompt=system_prompt)
        return response

companion_agent = CompanionAgent()
