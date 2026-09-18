from app.pipeline.utils import build_graph, topological_sort
from app.pipeline.error_handler import PipelineError
import pytest


def test_build_graph():
    pipeline = {
        "nodes": [{"id": "A"}, {"id": "B"}],
        "edges": [{"source": "A", "target": "B"}]
    }

    graph, in_degree = build_graph(pipeline)

    assert dict(graph) == {"A": ["B"], "B": []}
    assert dict(in_degree) == {"A": 0, "B": 1}


def test_topological_sort():
    pipeline = {
        "nodes": [{"id": "A"}, {"id": "B"}, {"id": "C"}],
        "edges": [
            {"source": "A", "target": "B"},
            {"source": "B", "target": "C"}
        ]
    }

    order = topological_sort(pipeline)

    assert order == ["A", "B", "C"]


def test_cycle_detection():
    pipeline = {
        "nodes": [{"id": "A"}, {"id": "B"}],
        "edges": [
            {"source": "A", "target": "B"},
            {"source": "B", "target": "A"}
        ]
    }

    with pytest.raises(PipelineError):
        topological_sort(pipeline)


def test_invalid_edge():
    pipeline = {
        "nodes": [{"id": "A"}],
        "edges": [{"source": "A", "target": "X"}]
    }

    with pytest.raises(PipelineError):
        build_graph(pipeline)