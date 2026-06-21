from pydantic import BaseModel, Field
from typing import List, Optional

class ChatMessageSchema(BaseModel):
    role: str = Field(..., description="Role of the sender: 'user' or 'assistant'")
    content: str = Field(..., description="Content of the message")

class UserProfileSchema(BaseModel):
    display_name: Optional[str] = "Friend"
    age: Optional[int] = None
    pcos_diagnosed: Optional[bool] = False
    goals: Optional[List[str]] = []

class ChatRequestSchema(BaseModel):
    message: str = Field(..., description="The new message from the user")
    chat_history: List[ChatMessageSchema] = Field(default=[], description="Previous conversation logs")
    language: str = Field(default="en", description="User preferred language: 'en', 'hi', or 'te'")
    user_profile: Optional[UserProfileSchema] = Field(default_factory=UserProfileSchema)

class ChatResponseSchema(BaseModel):
    response: str
    routed_agent: str
