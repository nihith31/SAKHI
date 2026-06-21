import json
from app.services.ollama_client import ollama_service

# PCOS-relevant hormone reference ranges
HORMONE_REFERENCE = {
    "LH": {"normal_range": "2-10 mIU/mL (follicular phase)", "pcos_note": "Often elevated in PCOS, creating an LH:FSH ratio of 2:1 or higher."},
    "FSH": {"normal_range": "3-10 mIU/mL", "pcos_note": "Low-to-normal FSH with elevated LH is a common PCOS signature."},
    "AMH": {"normal_range": "1.5-4.0 ng/mL", "pcos_note": "Often significantly elevated (>5 ng/mL) in PCOS due to high follicle count."},
    "Testosterone": {"normal_range": "15-70 ng/dL", "pcos_note": "Elevated in PCOS (hyperandrogenism), causing acne and hair loss."},
    "Estradiol": {"normal_range": "30-400 pg/mL (follicular phase)", "pcos_note": "May be normal or slightly low; irregular in PCOS."},
    "Prolactin": {"normal_range": "2-29 ng/mL", "pcos_note": "Sometimes mildly elevated in PCOS; if very high, investigate other causes."},
    "TSH": {"normal_range": "0.4-4.0 mIU/L", "pcos_note": "Thyroid dysfunction can mimic or worsen PCOS symptoms; important to check."},
    "Insulin": {"normal_range": "Fasting: 2-25 uIU/mL", "pcos_note": "Insulin resistance is very common in PCOS, especially in overweight women."},
    "DHEA-S": {"normal_range": "35-430 ug/dL", "pcos_note": "Elevated in some PCOS subtypes with adrenal androgen excess."},
}


class LabAnalyzerAgent:
    def __init__(self):
        pass

    def get_system_prompt(self, language: str) -> str:
        lang_instruction = "Respond in warm, clear English. Use simple, jargon-free language."
        if language == "hi":
            lang_instruction = "Respond completely in Hindi (using simple Hinglish/Hindi characters). Explain medical terms in everyday language."
        elif language == "te":
            lang_instruction = "Respond completely in Telugu (using simple Telugu characters or Telugu-English blend). Explain medical terms simply."

        hormone_ref = json.dumps(HORMONE_REFERENCE, indent=2)

        return (
            "You are Sakhi's Lab Report Analyst 🧪, a compassionate AI medical assistant specializing in interpreting PCOS-related blood test reports.\n"
            f"{lang_instruction}\n\n"
            "Your job is to:\n"
            "1. Identify and extract any PCOS-relevant hormone/lab values from the provided raw text (LH, FSH, AMH, Testosterone, Estradiol, Prolactin, TSH, Insulin, DHEA-S, Vitamin D, etc.).\n"
            "2. Classify each identified value as: 'normal', 'mildly_abnormal', or 'significantly_abnormal' relative to PCOS context.\n"
            "3. Produce a friendly, empathetic explanation of what these numbers might mean for someone managing PCOS.\n"
            "4. Clearly state this is an AI-assisted interpretation, NOT a medical diagnosis.\n\n"
            f"PCOS Hormone Reference Guide:\n{hormone_ref}\n\n"
            "Output ONLY a JSON object with this exact structure, with no extra text before or after:\n"
            "{\n"
            '  "extracted_values": {\n'
            '    "<hormone_name>": {"value": "<raw_value>", "unit": "<unit>", "status": "normal|mildly_abnormal|significantly_abnormal"}\n'
            "  },\n"
            '  "summary": "<empathetic 2-3 paragraph explanation in the target language>",\n'
            '  "key_findings": ["<finding 1>", "<finding 2>", ...],\n'
            '  "suggested_followup": ["<suggestion 1>", "<suggestion 2>", ...]\n'
            "}"
        )

    async def analyze(self, raw_text: str, language: str) -> dict:
        """Analyze extracted OCR text and return structured PCOS lab interpretation."""
        if not raw_text or "[" in raw_text[:5]:
            # OCR failed or returned placeholder
            return {
                "extracted_values": {},
                "summary": "Unable to extract text from the uploaded file. Please ensure the file is a clear, readable lab report in PDF or image format.",
                "key_findings": ["OCR extraction failed — no readable text found."],
                "suggested_followup": ["Try uploading a higher resolution scan.", "Ensure the file is not password-protected."]
            }

        system_prompt = self.get_system_prompt(language)
        prompt = (
            f"Here is the raw text extracted from a blood test / lab report:\n\n"
            f"---\n{raw_text}\n---\n\n"
            "Please analyze and extract all PCOS-relevant hormone values you can identify, then provide your structured JSON response."
        )

        messages = [{"role": "user", "content": prompt}]
        raw_response = await ollama_service.chat(messages, system_prompt=system_prompt)

        # Clean any markdown formatting
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = lines[1:] if lines[0].startswith("```") else lines
            lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
            cleaned = "\n".join(lines).strip()

        try:
            result = json.loads(cleaned)
            return result
        except json.JSONDecodeError:
            # Return graceful fallback with the raw text as summary
            return {
                "extracted_values": {},
                "summary": raw_response,
                "key_findings": ["AI generated a text report (JSON parsing failed)."],
                "suggested_followup": ["Please consult your doctor to review these results in detail."]
            }


lab_analyzer = LabAnalyzerAgent()
