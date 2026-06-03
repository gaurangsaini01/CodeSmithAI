from langchain.chat_models import init_chat_model
from langchain_core.messages import SystemMessage
from langchain_core.messages.utils import trim_messages, count_tokens_approximately

from app.config import settings
from app.graph.state import CodingType, QueryType, ResponseState

client = init_chat_model(settings.chat_model)
classifier_client = init_chat_model(settings.classifier_model)
MAX_CONTEXT_TOKENS = 6000

def recent(messages):
    return trim_messages(
        messages,
        max_tokens=MAX_CONTEXT_TOKENS,
        strategy="last",
        token_counter=count_tokens_approximately,
        start_on="human",
        # We set system message as false here because we are manually inserting system messages specific to each node in their respective nodes
        include_system=False,
    )


def system_with_memory(persona: str, config) -> SystemMessage:
    memory = (config or {}).get("configurable", {}).get("memory_context", "")
    content = (
        persona
        if not memory
        else f"{persona}\n\nWhat you already know about the user:\n{memory}"
    )
    return SystemMessage(content=content)


def query_classifier(state: ResponseState):
    """Decide whether the query is coding-related or general chat."""
    llm = classifier_client.with_structured_output(QueryType)
    res = llm.invoke(
        [
            SystemMessage(
                content="""
                Classify the user query.

                Return ONLY one of:
                - General
                - Coding
                """
            ),
            *state.get("messages", [])[-2:],
        ]
    )

    return {"query_type": res.query_type}


def general_node(state: ResponseState, config):
    """Handle normal chat."""
    res = client.invoke(
        [
            system_with_memory("You are a helpful AI assistant.", config),
            *recent(state["messages"]),
        ]
    )

    return {"final_response": res.content, "messages": [res]}


def coding_node(state: ResponseState):
    """Detect coding intent: Fix or Optimize."""
    llm = classifier_client.with_structured_output(CodingType)

    res = llm.invoke(
        [
            SystemMessage(
                content="""
                You are a coding expert.

                Classify coding requests into:

                - Fix
                  (bug fixing, debugging, errors,
                   exceptions, correcting code)

                - Optimize
                  (performance improvements,
                   code quality, refactoring,
                   best practices)
                """
            ),
            *state.get("messages", [])[-2:],
        ]
    )

    return {"coding_type": res.coding_type}


def fix_node(state: ResponseState, config):
    """Debugging agent."""
    res = client.invoke(
        [
            system_with_memory(
                """
                You are a senior debugging engineer.

                Your task:

                1. Identify the issue.
                2. Explain the root cause.
                3. Provide the corrected code.
                4. Explain the fix.
                """,
                config,
            ),
            *recent(state["messages"]),
        ]
    )

    return {"final_response": res.content, "messages": [res]}


def optimize_node(state: ResponseState, config):
    """Optimization agent."""
    res = client.invoke(
        [
            system_with_memory(
                """
                You are a senior software engineer.

                Optimize code for:

                - readability
                - maintainability
                - performance

                Return:
                1. Issues found
                2. Optimized code
                3. Explanation
                """,
                config,
            ),
            *recent(state["messages"]),
        ]
    )

    return {"final_response": res.content, "messages": [res]}


def check_query_type(state: ResponseState):
    if state["query_type"] == "Coding":
        return "CodingNode"

    return "GeneralNode"


def check_coding_type(state: ResponseState):
    if state["coding_type"] == "Fix":
        return "FixNode"

    return "OptimizeNode"
