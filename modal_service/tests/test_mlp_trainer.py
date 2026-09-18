from modal_service.trainers.mlp_trainer import train


def test_mlp_training_returns_metrics():
    input_data = {
        "X_train": [[1.0, 2.0], [2.0, 3.0], [3.0, 4.0]],
        "X_test": [[1.5, 2.5]],
        "y_train": [0, 1, 1],
        "y_test": [1]
    }
    config = {
        "hidden_size": 16,
        "epochs": 5,
        "learning_rate": 0.001,
        "batch_size": 32,
        "optimizer": "adam"
    }
    result = train(input_data, config)

    assert "metrics" in result
    assert "accuracy" in result["metrics"]
    assert "loss" in result["metrics"]


def test_loss_history_matches_epochs():
    input_data = {
        "X_train": [[1.0, 2.0], [2.0, 3.0], [3.0, 4.0]],
        "X_test": [[1.5, 2.5]],
        "y_train": [0, 1, 1],
        "y_test": [1]
    }
    config = {
        "epochs": 10
    }

    result = train(input_data, config)
    assert len(result["loss_history"]) == 10


def test_mlp_handles_non_contiguous_labels():
    input_data = {
        "X_train": [[1.0, 2.0], [2.0, 3.0], [3.0, 4.0], [4.0, 5.0]],
        "X_test": [[1.5, 2.5], [3.5, 4.5]],
        "y_train": [0, 1, 3, 3],
        "y_test": [0, 3],
    }
    config = {"epochs": 2}

    result = train(input_data, config)

    assert set(result["predictions"]).issubset({0, 1, 3})
    assert result["y_test"] == [0, 3]
    assert len(result["predictions"]) == 2
