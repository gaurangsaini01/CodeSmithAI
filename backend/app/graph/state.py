from typing import Annotated, List, Literal, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel


class QueryType(BaseModel):
    query_type: Literal["General", "Coding"]


class CodingType(BaseModel):
    coding_type: Literal["Fix", "Optimize"]


class ResponseState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]

    query_type: Literal["General", "Coding"] | None
    coding_type: Literal["Fix", "Optimize"] | None

    final_response: str | None
