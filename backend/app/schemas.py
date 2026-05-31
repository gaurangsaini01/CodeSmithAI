from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ChatRequest(BaseModel):
    query: str
    user_id: int
    chat_id: UUID


class ChatResponse(BaseModel):
    output: str


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
