import asyncio
import os
import sys

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.rag_service import rag_service
from app.agents.companion import companion_agent

# Reconfigure stdout to print UTF-8 emojis on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

async def test_rag_and_chatbot():
    # 1. Test RAG Context Retrieval
    query = "What is the role of carbohydrates in a PCOS diet?"
    print(f"\n[Test] Query: '{query}'")
    print("-" * 50)
    print("[Test] Retrieving context from pgvector...")
    
    context = rag_service.retrieve_context(query)
    print("\n[Test] Retrieved Context:")
    print(context[:1000] + ("..." if len(context) > 1000 else ""))
    print("-" * 50)
    
    # 2. Test Companion Agent Response (Ollama Cloud)
    print("[Test] Sending request to Companion Agent (Ollama Cloud)...")
    user_profile = {
        "display_name": "Riya",
        "age": 26,
        "pcos_diagnosed": True,
        "goals": ["Weight management", "Better energy"]
    }
    
    response = await companion_agent.respond(
        message=query,
        chat_history=[],
        language="en",
        user_profile=user_profile
    )
    
    print("\n[Test] Sakhi's Response:")
    print(response)
    print("-" * 50)

if __name__ == "__main__":
    asyncio.run(test_rag_and_chatbot())
