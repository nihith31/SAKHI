from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatRequestSchema, ChatResponseSchema
from app.agents.orchestrator import orchestrator
from app.agents.companion import companion_agent

router = APIRouter(
    prefix="/api/chat",
    tags=["chat"]
)

@router.post("", response_model=ChatResponseSchema)
async def chat_endpoint(request: ChatRequestSchema):
    try:
        # 1. Route message using Orchestrator
        agent_type = await orchestrator.route(request.message)
        
        # 2. Intercept and handle unrelated off-topic queries immediately
        if agent_type == 'unrelated':
            declines = {
                "en": "I'm sorry, I am specialized in PCOS and women's health wellness. Please let me know how I can help you with nutrition, cycle tracking, or symptoms! 🌸",
                "hi": "मुझे खेद है, मैं विशेष रूप से पीसीओएस (PCOS) और महिला स्वास्थ्य कल्याण में सहायता के लिए हूँ। कृपया मुझे बताएं कि मैं पोषण, साइकिल ट्रैकिंग या लक्षणों के साथ आपकी कैसे मदद कर सकती हूँ! 🌸",
                "te": "క్షమించండి, నేను పిసిఒఎస్ (PCOS) మరియు మహిళల ఆరోగ్య సంరక్షణ కోసం ప్రత్యేకంగా సహాయపడతాను. పోషకాహారం, పీరియడ్స్ ట్రాకింగ్ లేదా లక్షణాల గురించి మీకు ఏమైనా ప్రశ్నలు ఉంటే నన్ను అడగండి! 🌸"
            }
            lang = (request.language or 'en').split('-')[0].lower()
            return ChatResponseSchema(
                response=declines.get(lang, declines["en"]),
                routed_agent="unrelated"
            )
        
        # 3. Map routing to specific agents
        history_list = [msg.model_dump() for msg in request.chat_history]
        user_profile_dict = request.user_profile.model_dump() if request.user_profile else {}
        
        response_text = await companion_agent.respond(
            message=request.message,
            chat_history=history_list,
            language=request.language,
            user_profile=user_profile_dict
        )
        
        return ChatResponseSchema(
            response=response_text,
            routed_agent=agent_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process chat: {str(e)}")
