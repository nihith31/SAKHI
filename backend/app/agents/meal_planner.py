from app.services.ai_client import ai_service
from app.config import settings
import json

class MealPlannerAgent:
    def __init__(self):
        pass

    def get_system_prompt(self, language: str, region: str, user_profile: dict) -> str:
        lang_instruction = "Respond and write descriptions in warm, simple English."
        if language == 'hi':
            lang_instruction = "Respond and write descriptions completely in Hindi (using simple, everyday Hinglish/Hindi characters)."
        elif language == 'te':
            lang_instruction = "Respond and write descriptions completely in Telugu (using simple, everyday Telugu characters or Telugu-English blend)."

        region_info = "general PCOS guidelines"
        if region == "south_indian":
            region_info = "South Indian diet preferences (using ragi, millets, brown rice, curry leaves, drumsticks, moringa, coconut oil in moderation)."
        elif region == "north_indian":
            region_info = "North Indian diet preferences (using jowar, bajra, methi/fenugreek seeds, lauki/bottle gourd, spinach, amla/gooseberry, mustard oil)."

        profile_context = (
            f"User profile details:\n"
            f"- Name: {user_profile.get('display_name', 'Friend')}\n"
            f"- Age: {user_profile.get('age', 'N/A')}\n"
            f"- Goals: {', '.join(user_profile.get('goals', []))}\n"
        )

        return (
            "You are Sakhi's Dietitian Agent 🍛, an expert clinical nutritionist specialized in PCOS diet management.\n"
            f"Your job is to generate a custom 7-day PCOS-friendly meal plan that is low-glycemic, anti-inflammatory, and aligns with {region_info}.\n"
            f"{lang_instruction}\n\n"
            f"{profile_context}\n"
            "Format the output strictly as a JSON object, containing no extra introductory or concluding text. "
            "The JSON must follow this exact structure:\n"
            "{\n"
            '  "monday": {"breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."},\n'
            '  "tuesday": {"breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."},\n'
            '  "wednesday": {"breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."},\n'
            '  "thursday": {"breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."},\n'
            '  "friday": {"breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."},\n'
            '  "saturday": {"breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."},\n'
            '  "sunday": {"breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."},\n'
            '  "shopping_list": ["item 1", "item 2", ...],\n'
            '  "wellness_tips": ["tip 1", "tip 2", ...]\n'
            "}\n\n"
            "Make sure all food names are localized (e.g., instead of just 'Finger Millet Porridge' write 'Ragi Porridge / రాగి జావ' or 'रागी दलिया' depending on the language)."
        )

    async def generate_plan(self, language: str, region: str, user_profile: dict) -> dict:
        system_prompt = self.get_system_prompt(language, region, user_profile)
        
        prompt = (
            f"Please generate a complete 7-day meal plan for a {region} region profile, "
            f"taking into account the goals: {', '.join(user_profile.get('goals', []))}. "
            "Output ONLY the JSON object. Do not include markdown code block syntax (like ```json) in your final response, just start with {."
        )

        messages = [{"role": "user", "content": prompt}]

        try:
            raw_response = await ai_service.chat(messages, system_prompt=system_prompt, model=settings.NVIDIA_MODEL_PLANNER)
        except Exception as connection_error:
            # AI model is offline or unreachable — return the curated fallback plan
            print(f"[meal_planner] AI unavailable ({connection_error}), returning fallback plan.")
            fallback = self.get_fallback_plan(language, region)
            fallback["_source"] = "fallback"
            return fallback
        
        # Clean up any potential markdown formatting
        cleaned_response = raw_response.strip()
        if cleaned_response.startswith("```"):
            # Strip markdown block if model outputted it anyway
            lines = cleaned_response.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned_response = "\n".join(lines).strip()

        try:
            plan_data = json.loads(cleaned_response)
            return plan_data
        except Exception as e:
            # Fallback mock plan in case JSON parsing fails
            fallback = self.get_fallback_plan(language, region)
            fallback["generation_error"] = str(e)
            return fallback

    def get_fallback_plan(self, language: str, region: str) -> dict:
        if region == "south_indian":
            return {
                "monday": {"breakfast": "Ragi Idli with Mint Chutney", "lunch": "Brown Rice with Moringa Sambar", "snack": "Sprouted Chana Salad", "dinner": "Jowar Roti with Vegetable Curry"},
                "tuesday": {"breakfast": "Millet Dosa with Tomato Chutney", "lunch": "Quinoa Upma with veggies", "snack": "Roasted Almonds", "dinner": "Methi Dal with Brown Rice"},
                "wednesday": {"breakfast": "Ragi Dosa", "lunch": "Brown Rice, Dal, Spinach Curry", "snack": "Buttermilk with flax seeds", "dinner": "Millet Khichdi"},
                "thursday": {"breakfast": "Oats Upma", "lunch": "Jowar Rotis with Ridge Gourd Curry", "snack": "Boiled Chickpeas", "dinner": "Moringa Soup & Brown Rice"},
                "friday": {"breakfast": "Ragi Porridge / Ragi Java", "lunch": "Brown Rice with Dal & cabbage poriyal", "snack": "Cucumber slices with hummus", "dinner": "Jowar Roti with Paneer"},
                "saturday": {"breakfast": "Millet Idli", "lunch": "Quinoa Pulav with plenty of veggies", "snack": "Walnuts & Pumpkin seeds", "dinner": "Sprout salad with veg soup"},
                "sunday": {"breakfast": "Vegetable Dosa", "lunch": "Brown Rice, Moringa Sambar, Beetroot palya", "snack": "Tender coconut water", "dinner": "Jowar Roti with Mixed Veg Curry"},
                "shopping_list": ["Ragi flour", "Jowar flour", "Millet grains", "Brown rice", "Moringa leaves", "Curry leaves", "Flax seeds", "Almonds"],
                "wellness_tips": ["Stay hydrated: Drink 2-3 liters of water daily.", "Incorporate Spearmint tea to help lower excess androgens.", "Walk for 10-15 minutes after meals."]
            }
        else:
            return {
                "monday": {"breakfast": "Bajra Khichdi with curd", "lunch": "Jowar Roti with Lauki Sabji & Curd", "snack": "Roasted Makhana", "dinner": "Moong Dal soup with Paneer Bhurji"},
                "tuesday": {"breakfast": "Sprouted Moong Cheela", "lunch": "Bajra Roti with Methi Palak Sabji", "snack": "Walnuts and Almonds", "dinner": "Oats Khichdi with mixed vegetables"},
                "wednesday": {"breakfast": "Daliya Upma", "lunch": "Jowar Roti with Bhindi and Raita", "snack": "Roasted Chana", "dinner": "Paneer tikka with green salad"},
                "thursday": {"breakfast": "Besan Cheela with Spinach", "lunch": "Bajra Roti with Gourd Curry & Dal", "snack": "Buttermilk with Roasted Cumin", "dinner": "Lentil soup with sauteed vegetables"},
                "friday": {"breakfast": "Vegetable Poha with peanuts", "lunch": "Jowar Roti with Palak Paneer", "snack": "Amla juice & seeds", "dinner": "Millet Khichdi"},
                "saturday": {"breakfast": "Oats Cheela", "lunch": "Brown Rice with Mixed Dal & Salad", "snack": "Roasted Makhana", "dinner": "Bajra Roti with Lauki Kofta"},
                "sunday": {"breakfast": "Sprouted Moong Salad", "lunch": "Jowar Roti, Dal Tadka, Cucumber Raita", "snack": "Apple with chia seeds", "dinner": "Vegetable soup with grilled Tofu/Paneer"},
                "shopping_list": ["Bajra flour", "Jowar flour", "Sprouted Moong", "Lauki", "Spinach", "Paneer", "Makhana", "Methi seeds"],
                "wellness_tips": ["Drink warm water with soaked fenugreek (methi) seeds in the morning.", "Include healthy fats like walnuts and flaxseeds for hormonal balance.", "Avoid refined flour (maida) and white sugar completely."]
            }
            
meal_planner = MealPlannerAgent()
