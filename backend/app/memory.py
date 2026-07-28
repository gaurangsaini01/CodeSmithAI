from mem0.configs.base import MemoryConfig
from app.config import settings
from mem0 import AsyncMemory

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


def get_memory():
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
    memory = AsyncMemory(config=config)
    return memory
