from langchain.chat_models import init_chat_model
from langchain_core.messages import SystemMessage

from app.config import settings
from app.graph.state import CodingType, QueryType, ResponseState

client = init_chat_model(settings.chat_model)


def query_classifier(state: ResponseState):
    """Decide whether the query is coding-related or general chat."""
    llm = client.with_structured_output(QueryType)

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
            *state["messages"],
        ]
    )

    print("Query Type =>", res.query_type)

    return {"query_type": res.query_type}


def general_node(state: ResponseState):
    """Handle normal chat."""
    res = client.invoke(
        [
            SystemMessage(content="You are a helpful AI assistant."),
            *state["messages"],
        ]
    )

    return {"final_response": res.content}


def coding_node(state: ResponseState):
    """Detect coding intent: Fix or Optimize."""
    llm = client.with_structured_output(CodingType)

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
            *state["messages"],
        ]
    )

    print("Coding Type =>", res.coding_type)

    return {"coding_type": res.coding_type}


def fix_node(state: ResponseState):
    """Debugging agent."""
    res = client.invoke(
        [
            SystemMessage(
                content="""
                You are a senior debugging engineer.

                Your task:

                1. Identify the issue.
                2. Explain the root cause.
                3. Provide the corrected code.
                4. Explain the fix.
                """
            ),
            *state["messages"],
        ]
    )

    return {"final_response": res.content}


def optimize_node(state: ResponseState):
    """Optimization agent."""
    res = client.invoke(
        [
            SystemMessage(
                content="""
                You are a senior software engineer.

                Optimize code for:

                - readability
                - maintainability
                - performance

                Return:
                1. Issues found
                2. Optimized code
                3. Explanation
                """
            ),
            *state["messages"],
        ]
    )

    return {"final_response": res.content}


def check_query_type(state: ResponseState):
    if state["query_type"] == "Coding":
        return "CodingNode"

    return "GeneralNode"


def check_coding_type(state: ResponseState):
    if state["coding_type"] == "Fix":
        return "FixNode"

    return "OptimizeNode"
