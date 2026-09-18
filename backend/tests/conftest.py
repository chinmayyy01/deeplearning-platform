import pytest
import app.services.modal_service
import app.pipeline.nodes.neural_network_node


def _zeros_3d(n, h, w):
    return [[[0.0] * w for _ in range(h)] for _ in range(n)]


def _zeros_4d(n, h, w, c):
    return [[[[0.0] * c for _ in range(w)] for _ in range(h)] for _ in range(n)]


def _split(X, y, test_size=0.2, random_state=42):
    split_idx = max(1, int(len(X) * (1 - test_size)))
    return X[:split_idx], X[split_idx:], y[:split_idx], y[split_idx:]


def _fake_train(architecture, input_data, config):
    """Lightweight stand-in for the Modal trainers.

    Mirrors the output contract (metrics, loss_history, predictions, ...)
    without importing torch, so backend tests stay dependency-free.
    """
    epochs = int(config.get("epochs", 10))
    y_test = list(input_data.get("y_test", []))
    num_classes = len(set(input_data.get("y_train", []))) or 1
    predictions = [index % num_classes for index in range(len(y_test))]
    loss_history = [round(1.0 / (index + 1), 4) for index in range(epochs)]
    final_loss = loss_history[-1] if loss_history else 0.0

    result = {
        "model_name": architecture,
        "predictions": predictions,
        "predictions_preview": predictions[:10],
        "y_test_preview": y_test[:10],
        "y_test": y_test,
        "metrics": {
            "accuracy": 1.0 if y_test else 0.0,
            "loss": final_loss,
        },
        "loss_history": loss_history,
        "config_used": config,
        "run_summary": {"model": architecture, "task_type": "classification"},
        "training_summary": {**config, "epochs": epochs},
    }
    if architecture == "cnn":
        result["best_loss"] = min(loss_history) if loss_history else 0.0
        result["final_loss"] = final_loss
    return result


@pytest.fixture(autouse=True)
def mock_modal_service(monkeypatch):
    def mock_run_mlp(input_data, config):
        return _fake_train("mlp", input_data, config)

    def mock_run_cnn(input_data, config):
        return _fake_train("cnn", input_data, config)

    def _build_split_input(dataset_name, max_samples, split_config):
        test_size = split_config.get("test_size", 0.2)
        if dataset_name == "mnist":
            X = _zeros_3d(max_samples, 28, 28)
            meta = {"data_format": "image", "image_channels": 1, "image_height": 28, "image_width": 28}
        elif dataset_name == "fashion_mnist":
            X = _zeros_3d(max_samples, 28, 28)
            meta = {"data_format": "image", "image_channels": 1, "image_height": 28, "image_width": 28}
        elif dataset_name == "cifar10":
            X = _zeros_4d(max_samples, 32, 32, 3)
            meta = {"data_format": "image", "image_channels": 3, "image_height": 32, "image_width": 32}
        else:
            raise ValueError(f"Unknown dataset: {dataset_name}")
        y = [i % 10 for i in range(max_samples)]
        X_train, X_test, y_train, y_test = _split(X, y, test_size=test_size)
        return {
            "X_train": X_train,
            "X_test": X_test,
            "y_train": y_train,
            "y_test": y_test,
            "task_type": "classification",
            "dataset_name": dataset_name,
            **meta
        }

    def mock_run_split_and_train_mlp(dataset_name, max_samples, split_config, train_config):
        return _fake_train(
            "mlp",
            _build_split_input(dataset_name, max_samples, split_config),
            train_config,
        )

    def mock_run_split_and_train_cnn(dataset_name, max_samples, split_config, train_config):
        return _fake_train(
            "cnn",
            _build_split_input(dataset_name, max_samples, split_config),
            train_config,
        )

    monkeypatch.setattr(app.services.modal_service, "run_mlp", mock_run_mlp)
    monkeypatch.setattr(app.services.modal_service, "run_cnn", mock_run_cnn)
    monkeypatch.setattr(app.services.modal_service, "run_split_and_train_mlp", mock_run_split_and_train_mlp)
    monkeypatch.setattr(app.services.modal_service, "run_split_and_train_cnn", mock_run_split_and_train_cnn)

    monkeypatch.setattr(app.pipeline.nodes.neural_network_node, "run_mlp", mock_run_mlp)
    monkeypatch.setattr(app.pipeline.nodes.neural_network_node, "run_cnn", mock_run_cnn)
    monkeypatch.setattr(app.pipeline.nodes.neural_network_node, "run_split_and_train_mlp", mock_run_split_and_train_mlp)
    monkeypatch.setattr(app.pipeline.nodes.neural_network_node, "run_split_and_train_cnn", mock_run_split_and_train_cnn)
