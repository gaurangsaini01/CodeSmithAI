from beanie import Document, before_event, Insert, Replace, Update
from uuid import UUID
from datetime import datetime, timezone
from pydantic import Field

def utcnow():
    return datetime.now(timezone.utc)

class TimestampedDocument(Document):
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    @before_event(Insert, Replace, Update)   # har write se pehle
    def _touch_updated_at(self):
        self.updated_at = utcnow()

class Chat(TimestampedDocument):
    id: UUID
    user_id: int
    title: str = "New Chat"

    class Settings:
        name = "chats"


class Message(TimestampedDocument):
    message: str
    user_id: int
    chat_id: UUID
    role: str

    class Settings:
        name = "messages"


ModelsList = [Chat, Message]
