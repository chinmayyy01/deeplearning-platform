import pytest

from app.pipeline.error_handler import PipelineError
from app.pipeline.validator import validate_pipeline


def _single(node_type, config):
    return {"nodes": [{"id": "n", "type": node_type, "config": config}], "edges": []}


def test_rejects_unknown_option():
    with pytest.raises(PipelineError) as exc:
        validate_pipeline(_single("dataset", {"dataset": "not_a_dataset"}))
    assert exc.value.error_type == "VALIDATION_ERROR"
    assert exc.value.node_id == "n"


def test_rejects_wrong_type():
    with pytest.raises(PipelineError) as exc:
        validate_pipeline(_single("neural_network", {"epochs": "many"}))
    assert "type" in exc.value.message


def test_rejects_below_minimum():
    with pytest.raises(PipelineError) as exc:
        validate_pipeline(_single("neural_network", {"epochs": 0}))
    assert ">= 1" in exc.value.message


def test_rejects_above_maximum():
    with pytest.raises(PipelineError) as exc:
        validate_pipeline(_single("dataset", {"max_samples": 999999}))
    assert "<= 60000" in exc.value.message


def test_rejects_duplicate_node_ids():
    pipeline = {
        "nodes": [
            {"id": "dup", "type": "dataset", "config": {"dataset": "iris"}},
            {"id": "dup", "type": "dataset", "config": {"dataset": "wine"}},
        ],
        "edges": [],
    }
    with pytest.raises(PipelineError) as exc:
        validate_pipeline(pipeline)
    assert "duplicate" in exc.value.message.lower()


def test_accepts_valid_config():
    pipeline = {
        "nodes": [
            {"id": "data", "type": "dataset", "config": {"dataset": "iris"}},
            {"id": "split", "type": "train_test_split", "config": {"test_size": 0.3}},
            {
                "id": "model",
                "type": "model",
                "config": {"algorithm": "decision_tree", "max_depth": 10},
            },
        ],
        "edges": [
            {"source": "data", "target": "split"},
            {"source": "split", "target": "model"},
        ],
    }
    assert validate_pipeline(pipeline) is True
