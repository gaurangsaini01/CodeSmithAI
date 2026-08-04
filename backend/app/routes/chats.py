import asyncio
from datetime import datetime
from typing import Optional
from uuid import UUID

from arq import ArqRedis
from fastapi import (
    APIRouter,
    Depends,
    Form,
    HTTPException,
    Path,
    Query,
    Request,
)
from langchain_core.messages import HumanMessage

from app.config import settings
from app.constants import DOC_STATUS, ROLES
from app.dependencies.auth import verify_token
from app.models import Chat, Message, UserDocument
from app.schemas import ChatResponse, MessageOut
from app.vectorstore import search_chunks

router = APIRouter()


@router.get("/chats")
async def get_user_chats(user=Depends(verify_token)):
    chats = await Chat.find(Chat.user_id == user["id"]).sort(-Chat.created_at).to_list()
    return [{"id": str(c.id), "title": c.title} for c in chats]


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


async def _attach_document(document_id: UUID, chat_id: UUID, user) -> None:
    """Bind an already-ingested document to this conversation. Until this runs
    the document is invisible to retrieval, which is what makes a cancelled
    upload harmless."""
    doc = await UserDocument.get(document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.user_id != user["id"]:
        raise HTTPException(
            status_code=403, detail="This document doesn't belong to this user"
        )
    if doc.chat_id is None:
        await doc.set({UserDocument.chat_id: chat_id})
    elif doc.chat_id != chat_id:
        raise HTTPException(
            status_code=409, detail="This document is attached to another conversation"
        )


async def _memory_context(memory, query: str, user_id: str) -> str:
    memories = await memory.search(query, filters={"user_id": user_id}, top_k=5)
    return "\n".join(f"- {m['memory']}" for m in memories.get("results", []))


async def _document_context(request: Request, query: str, chat_id: UUID, user) -> str:
    docs = await UserDocument.find(
        UserDocument.user_id == user["id"],
        UserDocument.chat_id == chat_id,
        UserDocument.status == DOC_STATUS["ready"],
    ).to_list()
    if not docs:
        return ""

    embeddings = request.app.state.embeddings
    vector = await embeddings.aembed_query(query)
    payloads = await search_chunks(
        request.app.state.qdrant,
        query_vector=vector,
        user_id=str(user["id"]),
        document_ids=[d.id for d in docs],
        limit=settings.retrieval_top_k,
    )

    names = {str(d.id): d.original_name for d in docs}
    return "\n\n".join(
        f"[{names.get(p['document_id'], 'document')} p.{p['page']}]\n{p['text']}"
        for p in payloads
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: Request,
    query: str = Form(...),
    chat_id: UUID = Form(...),
    document_id: UUID | None = Form(None),
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

    if document_id is not None:
        await _attach_document(document_id, chat_id, user)

    await Message(
        chat_id=chat_id,
        user_id=user["id"],
        message=query,
        role=ROLES["user"],
    ).insert()

   
    memory_block, document_block = await asyncio.gather(
        _memory_context(memory, query, str(user["id"])),
        _document_context(request, query, chat_id, user),
    )

    result = await graph.ainvoke(
        {"messages": [HumanMessage(content=query)]},
        config={
            "configurable": {
                "thread_id": str(chat_id),
                "memory_context": memory_block,
                "document_context": document_block,
            }
        },
    )
    ai_response = result["final_response"]

    redis: ArqRedis = request.app.state.redis
    await redis.enqueue_job("add_memory", query, str(user["id"]))

    await Message(
        chat_id=chat_id,
        user_id=user["id"],
        message=ai_response,
        role=ROLES["ai"],
    ).insert()

    return ChatResponse(output=ai_response)
