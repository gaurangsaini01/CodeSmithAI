from beanie import (
    Document,
    before_event,
    Insert,
    Replace,
    Update,
    PydanticObjectId,
    Indexed,
)
from uuid import UUID
from datetime import datetime, timezone
from pydantic import Field, EmailStr
from typing import Annotated


def utcnow():
    return datetime.now(timezone.utc)


class TimestampedDocument(Document):
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    @before_event(Insert, Replace, Update)
    def _touch_updated_at(self):
        self.updated_at = utcnow()


class Chat(TimestampedDocument):
    id: UUID
    user_id: PydanticObjectId
    title: str = "New Chat"

    class Settings:
        name = "chats"
        indexes = ["user_id"]


class Message(TimestampedDocument):
    message: str
    user_id: PydanticObjectId
    chat_id: UUID
    role: str

    class Settings:
        name = "messages"
        indexes = ["chat_id", "user_id"]


class User(TimestampedDocument):
    name: str
    email: Annotated[EmailStr, Indexed(unique=True)]
    password: str

    class Settings:
        name = "users"


class UserDocument(TimestampedDocument):
    id: UUID
    original_name: str
    stored_name: str
    user_id: PydanticObjectId
    # Stays None until the user actually sends a message with this document
    # attached; retrieval only ever sees documents that have a chat_id.
    chat_id: UUID | None = None
    status: str
    size_bytes: int = 0
    page_count: int | None = None
    chunk_count: int | None = None
    error: str | None = None

    class Settings:
        name = "user_documents"
        indexes = ["user_id", "chat_id", "status"]


ModelsList = [Chat, Message, User, UserDocument]
