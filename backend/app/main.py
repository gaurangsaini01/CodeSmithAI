from contextlib import asynccontextmanager
from pymongo import MongoClient, AsyncMongoClient
from fastapi import FastAPI
from app.routes import chats, auth
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.mongodb import MongoDBSaver
from beanie import init_beanie
from app.config import settings
from app.graph import build_graph
from app.models import ModelsList
from arq import create_pool
from arq.connections import RedisSettings
from app.memory import get_memory


@asynccontextmanager
async def lifespan(app: FastAPI):
    # redis and arq setup
    redis = await create_pool(RedisSettings())
    app.state.redis = redis
    # Beanie Setup
    beanie_client = AsyncMongoClient(settings.mongo_db_uri)

    await init_beanie(
        database=beanie_client[settings.mongo_db_name], document_models=ModelsList
    )
    # Mongo Setup
    mongo_client = MongoClient(settings.mongo_db_uri)
    checkpointer = MongoDBSaver(mongo_client, db_name=settings.mongo_db_name)
    app.state.graph = build_graph(checkpointer)
    memory = get_memory()
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


app.include_router(chats.router,tags=["chats"])
app.include_router(auth.router,tags=["auth"])
@app.get("/health")
def health():
    return {"status": "ok"}
