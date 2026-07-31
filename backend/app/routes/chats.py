from fastapi import APIRouter
from fastapi import (
    Request,
    HTTPException,
    Path,
    Query,
    Depends,
    Form,
    File,
    UploadFile,
)
from app.utils.utils import save_pdf
from langchain_core.messages import HumanMessage
from app.schemas import ChatResponse, MessageOut
from app.models import  Message, Chat
from app.constants import ROLES
import uuid
from uuid import UUID
from typing import Optional
from datetime import datetime
import pathlib
import asyncio
from arq import  ArqRedis
from app.dependencies.auth import verify_token
router = APIRouter()


@router.get("/chats")
async def get_user_chats(user=Depends(verify_token)):
    chats = await Chat.find(Chat.user_id == user["id"]).sort(-Chat.created_at).to_list()
    return [{"id": str(c.id), "title": c.title} for c in chats]


@router.post("/chat", response_model=ChatResponse)
async def chat(
    query: str = Form(...),
    chat_id: UUID = Form(...),
    file: UploadFile | None = File(None),
    request: Request = None,
    user=Depends(verify_token),
):
    graph = request.app.state.graph
    memory = request.app.state.memory

    chat = await Chat.get(chat_id)
    if chat is None:
        await Chat(id=chat_id, user_id=user["id"], title=query[:20]).insert()
    elif chat.user_id != user["id"]:
        raise HTTPException(
            status_code=403, detail="This conversation id doesn't belong to this user"
        )
    if file:
        folder = pathlib.Path("uploads")
        folder = folder / str(user["id"])
        folder.mkdir(parents=True, exist_ok=True)
        new_file_name = f"{uuid.uuid4()}.pdf"
        file_path = folder / new_file_name
        await asyncio.to_thread(save_pdf, file.file, file_path)

    await Message(
        chat_id=chat_id,
        user_id=user["id"],
        message=query,
        role=ROLES["user"],
    ).insert()

    memories = await memory.search(query, filters={"user_id": str(user["id"])}, top_k=5)
    relevantMemories = [m["memory"] for m in memories.get("results", [])]
    memory_block = "\n".join(f"- {m}" for m in relevantMemories)
    print("\n RelevantSearches : ", relevantMemories)
    result = await graph.ainvoke(
        {"messages": [HumanMessage(content=query)]},
        config={
            "configurable": {
                "thread_id": str(chat_id),
                "memory_context": memory_block,
            }
        },
    )
    ai_response = result["final_response"]
    redis: ArqRedis = request.app.state.redis
    jobenqres = await redis.enqueue_job("add_memory", query, str(user["id"]))
    print(jobenqres)
    print("\n Memories Added : ", result)
    await Message(
        chat_id=chat_id,
        user_id=user["id"],
        message=ai_response,
        role=ROLES["ai"],
    ).insert()

    return ChatResponse(output=ai_response)


@router.get(
    "/get-chat-history/{chat_id}",
    response_model=list[MessageOut],
)
async def get_chat_history(
    chat_id: UUID = Path(...),
    cursor: Optional[datetime] = Query(None),
    user=Depends(verify_token),
):
    chat = await Chat.get(chat_id)
    if chat is None:
        # Fresh/unused conversation -> no messages yet (not an error).
        return []
    if chat.user_id != user["id"]:
        raise HTTPException(
            status_code=403, detail="This chat doesn't belong to this user"
        )
    page_size = 10
    messages = None
    if cursor is None:
        messages = (
            await Message.find(Message.chat_id == chat_id)
            .sort(-Message.created_at)
            .limit(page_size)
            .to_list()
        )
    else:
        messages = (
            await Message.find(Message.chat_id == chat_id, Message.created_at < cursor)
            .sort(-Message.created_at)
            .limit(page_size)
            .to_list()
        )
    messages.reverse()

    # Map internal docs -> clean API shape (role lowercased, `message` -> `content`).
    return [
        MessageOut(
            id=str(message.id),
            role=message.role.lower(),
            content=message.message,
            created_at=message.created_at,
        )
        for message in messages
    ]
