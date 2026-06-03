from datetime import datetime
from uuid import UUID
from beanie import PydanticObjectId
from pydantic import BaseModel, EmailStr


class ChatRequest(BaseModel):
    query: str
    user_id: PydanticObjectId
    chat_id: UUID


class ChatResponse(BaseModel):
    output: str


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime


class SignupBody(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str
