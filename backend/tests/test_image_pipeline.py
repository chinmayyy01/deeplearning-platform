from app.pipeline.executor import run_pipeline
from app.pipeline.nodes import neural_network_node
from app.pipeline.nodes.dataset_node import run as run_dataset


def test_remote_image_dataset_returns_lazy_descriptor():
    result = run_dataset({}, {"dataset": "mnist", "max_samples": 512})

    assert result["lazy_image"] is True
    assert result["dataset_name"] == "mnist"
    assert result["max_samples"] == 512
    assert "X" not in result
    assert "y" not in result


def test_image_pipeline_propagates_max_samples_and_split(monkeypatch):
    captured = {}

    def fake_split_and_train_mlp(dataset_name, max_samples, split_config, train_config):
        captured["dataset_name"] = dataset_name
        captured["max_samples"] = max_samples
        captured["split_config"] = split_config
        captured["train_config"] = train_config
        return {
            "model_name": "mlp",
            "predictions": [0, 1],
            "predictions_preview": [0, 1],
            "y_test_preview": [0, 1],
            "y_test": [0, 1],
            "metrics": {"accuracy": 0.5, "loss": 0.1},
            "loss_history": [0.1],
            "run_summary": {"model": "mlp", "task_type": "classification"},
        }

    monkeypatch.setattr(
        neural_network_node, "run_split_and_train_mlp", fake_split_and_train_mlp
    )

    pipeline = {
        "nodes": [
            {
                "id": "data",
                "type": "dataset",
                "config": {"dataset": "mnist", "max_samples": 1234},
            },
            {
                "id": "split",
                "type": "train_test_split",
                "config": {"test_size": 0.3, "random_state": 7},
            },
            {"id": "prep", "type": "preprocess", "config": {"scaler_type": "standard"}},
            {
                "id": "nn",
                "type": "neural_network",
                "config": {"architecture": "mlp", "epochs": 1},
            },
        ],
        "edges": [
            {"source": "data", "target": "split"},
            {"source": "split", "target": "prep"},
            {"source": "prep", "target": "nn"},
        ],
    }

    result = run_pipeline(pipeline)

    assert result["status"] == "success"
    assert captured["dataset_name"] == "mnist"
    assert captured["max_samples"] == 1234
    assert captured["split_config"] == {"test_size": 0.3, "random_state": 7}
