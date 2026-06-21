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
        
        # 2. Map routing to specific agents
        # For Phase 2, we route to companion_agent (general and default fallback)
        # We can expand this mapping in future phases for specialized agents (nutrition, fitness)
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
