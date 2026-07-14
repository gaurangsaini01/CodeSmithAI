from contextlib import asynccontextmanager
from pymongo import MongoClient, AsyncMongoClient
from fastapi import (
    FastAPI,
    Request,
    HTTPException,
    Path,
    status,
    Query,
    Header,
    Depends,
    Form,
    File,
    UploadFile,
)
from app.utils.utils import save_pdf
import shutil
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.mongodb import MongoDBSaver
from beanie import init_beanie, PydanticObjectId
from app.config import settings
from app.graph import build_graph
from app.schemas import ChatResponse, MessageOut, SignupBody, LoginBody
from app.models import ModelsList, Message, Chat, User
from app.constants import ROLES
import uuid
from uuid import UUID
from mem0 import AsyncMemory
from mem0.configs.base import MemoryConfig
from typing import Optional
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
import pathlib
import asyncio

custom_instructions = """You are responsible for deciding what user information should be stored as long-term memory.

GOAL:
Store information that can improve future conversations and personalization.

STORE:

1. User preferences
Examples:
- Preferred learning style
- Communication style
- Tool preferences
- Programming language preferences

2. User background
Examples:
- Profession
- Education
- Experience level
- Technical stack

3. User skills
Examples:
- MERN developer
- Python developer
- FastAPI experience
- React experience

4. Long-term goals
Examples:
- Wants to become an AI Engineer
- Preparing for software engineering interviews
- Wants to improve DSA

5. Ongoing projects
Examples:
- Building an AI chatbot
- Developing a SaaS product
- Working on a LangGraph application

6. Recurring constraints
Examples:
- Limited study time
- Budget constraints
- Hardware limitations

7. Stable interests
Examples:
- AI
- Backend engineering
- System design
- Powerlifting

DO NOT STORE:

- One-time questions
- Temporary debugging issues
- Single conversation details
- Random facts
- Speculation
- Hypothetical statements
- Assistant assumptions
- Sensitive personal information
- Passwords
- API keys
- Financial information
- Medical information

MEMORY QUALITY RULES:

- Prefer storing useful memories rather than missing important information.
- If uncertain but likely useful in future conversations, store it.
- Do not require perfect certainty.
- Medium confidence memories are allowed.
- Avoid duplicates.
- Update existing memories when newer information replaces older information.

OUTPUT:
Return structured memories only."""


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Beanie Setup
    beanie_client = AsyncMongoClient(settings.mongo_db_uri)
    # Mem0 Config
    config = MemoryConfig(
        vector_store={
            "provider": "qdrant",
            "config": {
                "collection_name": "chatapp",
                "url": settings.qdrant_url,
                "api_key": settings.qdrant_api_key,
            },
        },
        llm={
            "provider": "openai",
            "config": {
                "model": "gpt-4o",
                "temperature": 0.2,
                "max_tokens": 2000,
            },
        },
        embedder={
            "provider": "openai",
            "config": {"model": "text-embedding-3-small"},
        },
        custom_instructions=custom_instructions,
    )
    await init_beanie(
        database=beanie_client[settings.mongo_db_name], document_models=ModelsList
    )
    # Mongo Setup
    mongo_client = MongoClient(settings.mongo_db_uri)
    checkpointer = MongoDBSaver(mongo_client, db_name=settings.mongo_db_name)
    app.state.graph = build_graph(checkpointer)
    memory = AsyncMemory(config=config)
    app.state.memory = memory
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


async def verify_token(authorization: str = Header(None)):
    token = (
        authorization.split(" ", 1)[1]
        if authorization and " " in authorization
        else None
    )
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token Missing"
        )
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
    # Chat.user_id is an ObjectId; convert so Mongo queries/comparisons match.
    payload["id"] = PydanticObjectId(payload["id"])
    return payload


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/signup")
async def signup(body: SignupBody):
    email_exist = await User.find_one(User.email == body.email)
    if email_exist:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists , Please Login",
        )
    pw = body.password.encode("utf-8")[:72]  # bcrypt 72-byte limit
    hashed_pw = bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")
    user = await User(name=body.name, email=body.email, password=hashed_pw).insert()
    user_dict = user.model_dump(mode="json")
    del user_dict["password"]
    return user_dict


@app.post("/login")
async def login(body: LoginBody):
    user = await User.find_one(User.email == body.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User Doesn't exists , Please Signup",
        )
    pw = body.password.encode("utf-8")[:72]
    is_pw_correct = bcrypt.checkpw(pw, user.password.encode("utf-8"))
    if not is_pw_correct:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Password",
        )
    token = jwt.encode(
        {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        },
        settings.secret_key,
        settings.algorithm,
    )
    return {"id": str(user.id), "name": user.name, "email": user.email, "token": token}


@app.get("/chats")
async def get_user_chats(user=Depends(verify_token)):
    chats = await Chat.find(Chat.user_id == user["id"]).sort(-Chat.created_at).to_list()
    return [{"id": str(c.id), "title": c.title} for c in chats]


@app.post("/chat", response_model=ChatResponse)
async def chat(
    query: str = Form(...),
    chat_id: UUID = Form(...),
    file: UploadFile | None = File(None),
    request: Request = None,
    user=Depends(verify_token),
):
    graph = request.app.state.graph
    memory = request.app.state.memory

    chat_exist = await Chat.get(chat_id)
    if not chat_exist:
        await Chat(id=chat_id, user_id=user["id"], title=query[:20]).insert()
    chat_belongs_to_user = await Chat.find_one(
        Chat.id == chat_id, Chat.user_id == user["id"]
    )
    if not chat_belongs_to_user:
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
    result = await memory.add(
        [{"role": "user", "content": query}], user_id=str(user["id"])
    )
    print("\n Memories Added : ", result)
    await Message(
        chat_id=chat_id,
        user_id=user["id"],
        message=ai_response,
        role=ROLES["ai"],
    ).insert()

    return ChatResponse(output=ai_response)


@app.get(
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
