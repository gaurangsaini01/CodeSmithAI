from typing import Annotated, List, Literal, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field


class QueryClassification(BaseModel):
    query_type: Literal["General", "Coding"]
    coding_type: Literal["Fix", "Optimize"] | None = Field(
        default=None,
        description="Set only when query_type is Coding; null for General.",
    )


class ResponseState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]

    query_type: Literal["General", "Coding"] | None
    coding_type: Literal["Fix", "Optimize"] | None

    final_response: str | None
