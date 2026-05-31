from contextlib import asynccontextmanager
from pymongo import MongoClient, AsyncMongoClient
from fastapi import FastAPI, Request, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.mongodb import MongoDBSaver
from beanie import init_beanie
from app.config import settings
from app.graph import build_graph
from app.schemas import ChatRequest, ChatResponse, MessageOut
from app.models import ModelsList, Message, Chat
from app.constants import ROLES
from uuid import UUID


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Beanie Setup
    beanie_client = AsyncMongoClient(settings.mongo_db_uri)
    await init_beanie(
        database=beanie_client[settings.mongo_db_name], document_models=ModelsList
    )
    # Mongo Setup
    mongo_client = MongoClient(settings.mongo_db_uri)
    checkpointer = MongoDBSaver(mongo_client, db_name=settings.mongo_db_name)
    app.state.graph = build_graph(checkpointer)
    try:
        yield
    finally:
        mongo_client.close()
        await beanie_client.close()


app = FastAPI(title="Chat Application", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, request: Request):
    graph = request.app.state.graph
    chat_exist = await Chat.get(body.chat_id)
    if not chat_exist:
        await Chat(
            id=body.chat_id, user_id=body.user_id, title=body.query[:20]
        ).insert()
    chat_belongs_to_user = await Chat.find_one(
        Chat.id == body.chat_id, Chat.user_id == body.user_id
    )
    if not chat_belongs_to_user:
        raise HTTPException(
            status_code=403, detail="This conversation id doesn't belong to this user"
        )
    await Message(
        chat_id=body.chat_id,
        user_id=body.user_id,
        message=body.query,
        role=ROLES["user"],
    ).insert()
    result = await graph.ainvoke(
        {"messages": [HumanMessage(content=body.query)]},
        config={"configurable": {"thread_id": str(body.chat_id)}},
    )
    await Message(
        chat_id=body.chat_id,
        user_id=body.user_id,
        message=result["final_response"],
        role=ROLES["ai"],
    ).insert()

    return ChatResponse(output=result["final_response"])


@app.get("/get-chat-history/{chat_id}/{user_id}", response_model=list[MessageOut])
async def get_chat_history(chat_id: UUID = Path(...), user_id: int = Path(...)):
    chat = await Chat.get(chat_id)
    if chat is None:
        # Fresh/unused conversation -> no messages yet (not an error).
        return []
    if chat.user_id != user_id:
        raise HTTPException(
            status_code=403, detail="This chat doesn't belong to this user"
        )

    messages = (
        await Message.find(Message.chat_id == chat_id)
        .sort(Message.created_at)
        .to_list()
    )

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
