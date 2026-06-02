from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(ENV_PATH)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongo_db_uri: str
    mongo_db_name: str = "chat_app"
    chat_model: str = "openai:gpt-5.4-mini"
    classifier_model: str = "openai:gpt-5.4-nano"
    qdrant_url: str
    qdrant_api_key: str
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5180",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5180",
    ]


settings = Settings()
