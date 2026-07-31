from datetime import datetime
from pydantic import BaseModel, EmailStr

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
