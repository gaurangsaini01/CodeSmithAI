from arq.connections import RedisSettings
from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.config import settings
from app.memory import get_memory
from app.models import ModelsList
from app.tasks.document_ingest import ingest_document
from app.tasks.memory_add import add_memory
from app.vectorstore import ensure_collection, get_embeddings, get_qdrant


async def startup(ctx):
    ctx["memory"] = get_memory()
    mongo = AsyncMongoClient(settings.mongo_db_uri)
    await init_beanie(
        database=mongo[settings.mongo_db_name], document_models=ModelsList
    )
    ctx["mongo"] = mongo

    qdrant = get_qdrant()
    await ensure_collection(qdrant)
    ctx["qdrant"] = qdrant
    ctx["embeddings"] = get_embeddings()


async def shutdown(ctx):
    await ctx["mongo"].close()
    await ctx["qdrant"].close()


class WorkerSettings:
    functions = [add_memory, ingest_document]
    redis_settings = RedisSettings(host=settings.redis_host)
    on_startup = startup
    on_shutdown = shutdown
    allow_abort_jobs = True
    job_timeout = 600
