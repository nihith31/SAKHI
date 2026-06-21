from app.services.ollama_client import ollama_service

class Orchestrator:
    def __init__(self):
        self.system_prompt = (
            "You are the routing module of Sakhi, a PCOS companion application.\n"
            "Your task is to analyze the user's message and determine the single best specialized agent to handle the request.\n"
            "Respond ONLY with one of the following classification words:\n"
            "- 'companion' (for general chat, emotional support, greetings, or overview questions)\n"
            "- 'nutrition' (for diet queries, food plans, ingredients, or cooking tips)\n"
            "- 'fitness' (for exercise, yoga, workout plans, or physical activities)\n"
            "- 'symptom' (for period schedules, cramps, logging cycles, acne, weight concerns)\n"
            "- 'lab' (for hormone levels, blood tests, or lab report entries)\n\n"
            "Rule: Return ONLY the exact classification word (lowercase), with no extra text or explanations."
        )

    async def route(self, message: str) -> str:
        messages = [
            {"role": "user", "content": f"Classify this message: '{message}'"}
        ]
        decision = await ollama_service.chat(messages, system_prompt=self.system_prompt)
        decision = decision.strip().lower()
        
        # Guard sanitization to guarantee valid routing
        for agent in ['companion', 'nutrition', 'fitness', 'symptom', 'lab']:
            if agent in decision:
                return agent
        return 'companion'

orchestrator = Orchestrator()
