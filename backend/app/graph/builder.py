from langgraph.graph import END, StateGraph

from app.graph.nodes import (
    fix_node,
    general_node,
    optimize_node,
    query_classifier,
    route_query,
)
from app.graph.state import ResponseState


def build_graph(checkpointer):
    builder = StateGraph(ResponseState)

    builder.add_node("QueryClassifier", query_classifier)
    builder.add_node("GeneralNode", general_node)
    builder.add_node("FixNode", fix_node)
    builder.add_node("OptimizeNode", optimize_node)

    builder.set_entry_point("QueryClassifier")

    builder.add_conditional_edges("QueryClassifier", route_query)

    builder.add_edge("GeneralNode", END)
    builder.add_edge("FixNode", END)
    builder.add_edge("OptimizeNode", END)

    return builder.compile(checkpointer=checkpointer)
