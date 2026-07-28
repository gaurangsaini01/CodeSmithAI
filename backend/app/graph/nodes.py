from langchain.chat_models import init_chat_model
from langchain_core.messages import SystemMessage
from langchain_core.messages.utils import trim_messages, count_tokens_approximately

from app.config import settings
from app.graph.state import QueryClassification, ResponseState

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
        # include_system=False: each node injects its own node-specific system message.
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


async def query_classifier(state: ResponseState):
    """Decide general vs coding, and the coding intent, in one call."""
    llm = classifier_client.with_structured_output(QueryClassification)
    res = await llm.ainvoke(
        [
            SystemMessage(content="""
                Classify the user query.

                query_type:
                - General
                  (normal chat, questions, anything not about code)

                - Coding
                  (bug fixing, debugging, errors, exceptions,
                   correcting code, performance improvements,
                   code quality, refactoring, best practices)

                coding_type: set this ONLY when query_type is Coding,
                otherwise leave it null.

                - Fix
                  (bug fixing, debugging, errors,
                   exceptions, correcting code)

                - Optimize
                  (performance improvements,
                   code quality, refactoring,
                   best practices)
                """),
            *state.get("messages", [])[-2:],
        ]
    )

    return {"query_type": res.query_type, "coding_type": res.coding_type}


def route_query(state: ResponseState):
    if state["query_type"] != "Coding":
        return "GeneralNode"

    return "FixNode" if state["coding_type"] == "Fix" else "OptimizeNode"


async def general_node(state: ResponseState, config):
    """Handle normal chat."""
    res = await client.ainvoke(
        [
            system_with_memory("You are a helpful AI assistant.", config),
            *recent(state["messages"]),
        ]
    )

    return {"final_response": res.content, "messages": [res]}


async def fix_node(state: ResponseState, config):
    """Debugging agent."""
    res = await client.ainvoke(
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


async def optimize_node(state: ResponseState, config):
    """Optimization agent."""
    res = await client.ainvoke(
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
