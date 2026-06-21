import json
import os

class RAGService:
    def __init__(self):
        self.kb_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "knowledge_base",
            "pcos_info.json"
        )
        self.data = {}
        self.load_kb()

    def load_kb(self):
        try:
            if os.path.exists(self.kb_path):
                with open(self.kb_path, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
        except Exception as e:
            print(f"Error loading knowledge base: {e}")

    def retrieve_context(self, query: str) -> str:
        """
        Scans key terms in the query and returns matching sections of the PCOS knowledge base.
        """
        query_lower = query.lower()
        context = []

        # PCOS definition
        if "pcos" in query_lower or "what is" in query_lower:
            context.append(f"Definition: {self.data.get('pcos_definition', '')}")

        # Symptoms
        symptom_keywords = ["symptom", "hair", "acne", "period", "cycle", "bleed", "weight", "fat"]
        if any(kw in query_lower for kw in symptom_keywords):
            symptom_info = self.data.get("symptoms", {})
            context.append("Symptom Insights:")
            for k, v in symptom_info.items():
                if k.replace("_", " ") in query_lower or any(part in query_lower for part in k.split("_")):
                    context.append(f"- {k.replace('_', ' ').capitalize()}: {v}")

        # Diet / Nutrition
        diet_keywords = ["eat", "food", "diet", "meal", "recipe", "nutrition", "dinner", "lunch", "breakfast", "curry", "ragi", "millet"]
        if any(kw in query_lower for kw in diet_keywords):
            diet_info = self.data.get("diet_nutrition", {})
            context.append("Nutrition & Diet Guidelines:")
            context.append(f"- General: {diet_info.get('general', '')}")
            
            # Region detection based on keywords or explicit region
            if "south" in query_lower or "telugu" in query_lower or "ragi" in query_lower or "idli" in query_lower or "dosa" in query_lower:
                si = diet_info.get("south_indian", {})
                context.append(f"- South Indian Staples: {', '.join(si.get('staples', []))}")
                context.append(f"- South Indian Tips: {si.get('tips', '')}")
            if "north" in query_lower or "hindi" in query_lower or "roti" in query_lower or "bajra" in query_lower or "lauki" in query_lower or "amla" in query_lower:
                ni = diet_info.get("north_indian", {})
                context.append(f"- North Indian Staples: {', '.join(ni.get('staples', []))}")
                context.append(f"- North Indian Tips: {ni.get('tips', '')}")

        # Fitness
        fitness_keywords = ["exercise", "workout", "gym", "yoga", "fit", "run", "walk", "stretch"]
        if any(kw in query_lower for kw in fitness_keywords):
            fit_info = self.data.get("fitness_guidelines", {})
            context.append("Fitness Guidelines:")
            context.append(f"- Fatigue/Low Energy days: {fit_info.get('low_energy_days', '')}")
            context.append(f"- High Energy/Regular days: {fit_info.get('regular_days', '')}")

        # Hormones / Labs
        hormone_keywords = ["hormone", "lab", "test", "report", "lh", "fsh", "amh", "testosterone", "blood"]
        if any(kw in query_lower for kw in hormone_keywords):
            hormone_info = self.data.get("hormone_ranges", {})
            context.append("Reference Hormone Range Guides:")
            for k, v in hormone_info.items():
                if k.lower() in query_lower:
                    context.append(f"- {k}: {v}")

        # If nothing specific was matches, return general PCOS overview
        if not context:
            context.append(f"General PCOS overview: {self.data.get('pcos_definition', '')}")

        return "\n".join(context)

rag_service = RAGService()
