from arq.connections import RedisSettings
from app.tasks.memory_add import add_memory
from app.memory import get_memory


async def startup(ctx):
    ctx["memory"] = get_memory()


class WorkerSettings:
    functions = [add_memory]
    redis_settings = RedisSettings()
    on_startup = startup
