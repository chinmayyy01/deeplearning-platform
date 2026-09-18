import pytest

from app.pipeline.error_handler import PipelineError
from app.pipeline.executor import run_pipeline
from app.pipeline.generators.dataset_generator import generate_dataset_code
from app.pipeline.generators.neural_network_generator import generate_neural_network_code
from app.pipeline.nodes import neural_network_node
from app.pipeline.nodes.dataset_node import run as run_dataset
from app.pipeline.nodes.model_node import run as run_model
from app.pipeline.nodes.preprocess_node import run as run_preprocess
from app.pipeline.nodes.train_test_split_node import run as run_split


def test_digits_dataset_returns_images_with_metadata():
    result = run_dataset({}, {"dataset": "digits"})

    assert result["dataset_name"] == "digits"
    assert result["task_type"] == "classification"
    assert result["data_format"] == "image"
    assert result["image_channels"] == 1
    assert result["image_height"] == 8
    assert result["image_width"] == 8
    assert len(result["X"][0]) == 8
    assert len(result["X"][0][0]) == 8


@pytest.mark.parametrize(
    "dataset_name,channels,height,width",
    [
        ("mnist", 1, 28, 28),
        ("fashion_mnist", 1, 28, 28),
        ("cifar10", 3, 32, 32),
    ]
)
def test_torchvision_image_datasets_are_lazy(
    dataset_name,
    channels,
    height,
    width
):
    result = run_dataset({}, {"dataset": dataset_name, "max_samples": 512})

    assert result["dataset_name"] == dataset_name
    assert result["task_type"] == "classification"
    assert result["data_format"] == "image"
    assert result["image_channels"] == channels
    assert result["image_height"] == height
    assert result["image_width"] == width
    assert result["max_samples"] == 512
    assert result["lazy_image"] is True
    # The pixel arrays are loaded on Modal at train time, never here.
    assert "X" not in result
    assert "y" not in result


def test_lazy_image_descriptor_survives_split_and_preprocess():
    descriptor = run_dataset({}, {"dataset": "cifar10", "max_samples": 500})

    split = run_split(descriptor, {"test_size": 0.3, "random_state": 7})

    assert split["lazy_image"] is True
    assert split["max_samples"] == 500
    assert split["split_test_size"] == 0.3
    assert split["split_random_state"] == 7
    assert "X_train" not in split

    preprocessed = run_preprocess(split, {})

    assert preprocessed["lazy_image"] is True
    assert preprocessed["max_samples"] == 500
    assert "X_train" not in preprocessed


def test_classical_model_rejects_lazy_image_dataset():
    descriptor = run_dataset({}, {"dataset": "cifar10"})

    with pytest.raises(ValueError) as exc_info:
        run_model(descriptor, {"algorithm": "logistic_regression"})

    assert "Neural Network" in str(exc_info.value)


def test_cnn_digits_pipeline_execution():
    pipeline = {
        "nodes": [
            {
                "id": "dataset",
                "type": "dataset",
                "config": {
                    "dataset": "digits"
                }
            },
            {
                "id": "split",
                "type": "train_test_split",
                "config": {
                    "test_size": 0.2,
                    "random_state": 42
                }
            },
            {
                "id": "nn",
                "type": "neural_network",
                "config": {
                    "architecture": "cnn",
                    "filters": 8,
                    "kernel_size": 3,
                    "hidden_size": 32,
                    "dropout": 0.2,
                    "epochs": 1,
                    "learning_rate": 0.001,
                    "batch_size": 64,
                    "optimizer": "adam"
                }
            }
        ],
        "edges": [
            {
                "source": "dataset",
                "target": "split"
            },
            {
                "source": "split",
                "target": "nn"
            }
        ]
    }

    result = run_pipeline(pipeline)

    assert result["status"] == "success"
    assert result["output"]["model_name"] == "cnn"
    assert "accuracy" in result["output"]["metrics"]
    assert "loss" in result["output"]["metrics"]
    assert "best_loss" in result["output"]
    assert "final_loss" in result["output"]
    assert len(result["output"]["loss_history"]) == 1
    assert "class CNN" in result["generated_code"]
    assert "nn.Conv2d(image_channels, filters" in result["generated_code"]
    assert "DataLoader" in result["generated_code"]


@pytest.mark.parametrize(
    "dataset_name",
    [
        "mnist",
        "fashion_mnist",
        "cifar10",
    ]
)
def test_torchvision_cnn_pipeline_execution(dataset_name):
    pipeline = {
        "nodes": [
            {
                "id": "dataset",
                "type": "dataset",
                "config": {
                    "dataset": dataset_name
                }
            },
            {
                "id": "split",
                "type": "train_test_split",
                "config": {
                    "test_size": 0.25,
                    "random_state": 42
                }
            },
            {
                "id": "nn",
                "type": "neural_network",
                "config": {
                    "architecture": "cnn",
                    "filters": 4,
                    "kernel_size": 3,
                    "hidden_size": 8,
                    "dropout": 0.1,
                    "epochs": 1,
                    "learning_rate": 0.001,
                    "batch_size": 4,
                    "optimizer": "sgd"
                }
            }
        ],
        "edges": [
            {
                "source": "dataset",
                "target": "split"
            },
            {
                "source": "split",
                "target": "nn"
            }
        ]
    }

    result = run_pipeline(pipeline)

    assert result["status"] == "success"
    assert result["output"]["model_name"] == "cnn"
    assert result["output"]["training_summary"]["optimizer"] == "sgd"
    assert "accuracy" in result["output"]["metrics"]


def test_cnn_pipeline_forwards_dataset_config_to_modal(monkeypatch):
    captured = {}

    def fake_split_and_train_cnn(dataset_name, max_samples, split_config, train_config):
        captured["dataset_name"] = dataset_name
        captured["max_samples"] = max_samples
        captured["split_config"] = split_config
        return {
            "model_name": "cnn",
            "metrics": {"accuracy": 1.0, "loss": 0.0},
            "loss_history": [0.0],
            "predictions": [],
            "y_test": [],
        }

    monkeypatch.setattr(
        neural_network_node, "run_split_and_train_cnn", fake_split_and_train_cnn
    )

    pipeline = {
        "nodes": [
            {
                "id": "dataset",
                "type": "dataset",
                "config": {"dataset": "cifar10", "max_samples": 750},
            },
            {
                "id": "split",
                "type": "train_test_split",
                "config": {"test_size": 0.25, "random_state": 7},
            },
            {
                "id": "nn",
                "type": "neural_network",
                "config": {"architecture": "cnn", "epochs": 1},
            },
        ],
        "edges": [
            {"source": "dataset", "target": "split"},
            {"source": "split", "target": "nn"},
        ],
    }

    result = run_pipeline(pipeline)

    assert result["status"] == "success"
    assert captured["dataset_name"] == "cifar10"
    assert captured["max_samples"] == 750
    assert captured["split_config"] == {"test_size": 0.25, "random_state": 7}


def test_cnn_rejects_non_image_dataset():
    pipeline = {
        "nodes": [
            {
                "id": "dataset",
                "type": "dataset",
                "config": {
                    "dataset": "iris"
                }
            },
            {
                "id": "split",
                "type": "train_test_split",
                "config": {}
            },
            {
                "id": "nn",
                "type": "neural_network",
                "config": {
                    "architecture": "cnn",
                    "epochs": 1
                }
            }
        ],
        "edges": [
            {
                "source": "dataset",
                "target": "split"
            },
            {
                "source": "split",
                "target": "nn"
            }
        ]
    }

    with pytest.raises(PipelineError) as exc_info:
        run_pipeline(pipeline)

    assert "CNN architecture requires an image dataset" in str(exc_info.value)


def test_cnn_code_generation_includes_runtime_components():
    imports, code = generate_neural_network_code(
        {
            "architecture": "cnn",
            "filters": 16,
            "kernel_size": 5,
            "hidden_size": 32,
            "dropout": 0.25,
            "epochs": 1,
            "learning_rate": 0.001,
            "batch_size": 64,
            "optimizer": "sgd",
        }
    )
    generated_code = "\n".join(sorted(imports) + code)

    assert "class CNN" in generated_code
    assert "prepare_image_tensor" in generated_code
    assert "nn.Conv2d(image_channels, filters" in generated_code
    assert "nn.Conv2d(filters, filters * 2" in generated_code
    assert "nn.Dropout(dropout)" in generated_code
    assert "nn.MaxPool2d(kernel_size=2)" in generated_code
    assert "TensorDataset" in generated_code
    assert "DataLoader" in generated_code
    assert "optimizer_name == 'sgd'" in generated_code
    assert "loss_history" in generated_code
    assert "accuracy_score" in generated_code


@pytest.mark.parametrize(
    "dataset_name,loader_name",
    [
        ("mnist", "datasets.MNIST"),
        ("fashion_mnist", "datasets.FashionMNIST"),
        ("cifar10", "datasets.CIFAR10"),
    ]
)
def test_torchvision_dataset_code_generation(dataset_name, loader_name):
    imports, code = generate_dataset_code(
        {
            "dataset": dataset_name,
            "data_dir": "data/images"
        }
    )
    generated_code = "\n".join(sorted(imports) + code)

    assert "from torchvision import datasets" in imports
    assert loader_name in generated_code
    assert "download=True" in generated_code
    assert "data_format = 'image'" in generated_code
