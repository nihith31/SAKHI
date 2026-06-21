from app.services.ollama_client import ollama_service
import json

class SymptomAnalyst:
    def __init__(self):
        pass

    def get_system_prompt(self, language: str, user_profile: dict) -> str:
        lang_instruction = "Respond in warm, simple English."
        if language == 'hi':
            lang_instruction = "Respond completely in Hindi (using simple, everyday Hindi/Hinglish characters)."
        elif language == 'te':
            lang_instruction = "Respond completely in Telugu (using simple, everyday Telugu characters or Telugu-English blend)."

        profile_context = (
            f"User profile details:\n"
            f"- Name: {user_profile.get('display_name', 'Friend')}\n"
            f"- Age: {user_profile.get('age', 'N/A')}\n"
            f"- PCOS Diagnosed: {user_profile.get('pcos_diagnosed', 'No')}\n"
            f"- Goals: {', '.join(user_profile.get('goals', []))}\n"
        )

        return (
            "You are Sakhi's Health Analyst 📊, an expert medical AI assistant specialized in analyzing PCOS-related symptoms.\n"
            "Your role is to analyze a list of daily health logs (mood, pain, energy, skin/hair/digestive symptoms) and summarize the trends.\n"
            f"{lang_instruction}\n\n"
            f"{profile_context}\n"
            "Guidelines:\n"
            "1. Be structured, clear, and empathetic. Use bullet points.\n"
            "2. Identify patterns (e.g., 'Your energy levels seem to dip when bloating is reported' or 'Pain levels have been moderate during early logs').\n"
            "3. Offer gentle, holistic wellness advice (hydration, specific yoga poses, sleeping tips).\n"
            "4. Clearly state that this is an AI synthesis of logs for tracking patterns, not a formal medical diagnosis."
        )

    async def analyze(self, logs: list, language: str, user_profile: dict) -> str:
        if not logs:
            no_logs_msg = {
                "en": "You haven't logged any symptoms yet. Keep tracking your energy, mood, and symptoms daily so I can analyze your wellness trends! 🌸",
                "hi": "आपने अभी तक कोई लक्षण लॉग नहीं किए हैं। अपने स्वास्थ्य के रुझानों का विश्लेषण करने के लिए दैनिक रूप से ट्रैक करते रहें! 🌸",
                "te": "మీరు ఇంకా ఎటువంటి లక్షణాలను నమోదు చేయలేదు. మీ ఆరోగ్య పోకడలను విశ్లేషించడానికి ప్రతిరోజూ ట్రాక్ చేసుకోండి! 🌸"
            }
            return no_logs_msg.get(language, no_logs_msg["en"])

        system_prompt = self.get_system_prompt(language, user_profile)
        
        # Serialize logs into a clean representation for the prompt
        formatted_logs = []
        for log in logs:
            formatted_logs.append({
                "date": str(log.get("date")),
                "energy": log.get("energy_level"),
                "mood": log.get("mood"),
                "pain": log.get("pain_level"),
                "symptoms": {
                    "acne": log.get("acne"),
                    "hair_loss": log.get("hair_loss"),
                    "bloating": log.get("bloating")
                },
                "notes": log.get("notes")
            })

        prompt = (
            f"Here are my daily symptom logs for analysis:\n"
            f"{json.dumps(formatted_logs, indent=2)}\n\n"
            f"Please analyze these logs and provide an overview of my wellness trends and helpful recommendations."
        )

        messages = [{"role": "user", "content": prompt}]
        response = await ollama_service.chat(messages, system_prompt=system_prompt)
        return response

symptom_analyst = SymptomAnalyst()
