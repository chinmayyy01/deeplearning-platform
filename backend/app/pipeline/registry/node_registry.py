from app.pipeline.nodes import (
    dataset_node,
    model_node,
    neural_network_node,
    preprocess_node,
    train_test_split_node,
)
from app.pipeline.datasets.registry import (
    DEFAULT_DATASET,
    dataset_options,
    remote_dataset_names,
)
from app.pipeline.models.registry import model_config_schema

NODE_REGISTRY = {
    "dataset": {
        "executor": dataset_node.run,
        "metadata": {
            "display_name": "Dataset Node",
            "description": "Loads dataset into the pipeline",
            "inputs": [],
            "outputs": ["X", "y"],
            "config_schema": {
                "dataset": {
                    "type": "string",
                    "options": dataset_options(),
                    "default": DEFAULT_DATASET,
                },
                "max_samples": {
                    "type": "integer",
                    "label": "Max Samples",
                    "default": 2000,
                    "min": 100,
                    "max": 60000,
                    "visible_if": {
                        "dataset": remote_dataset_names(),
                    },
                },
            },
        },
    },

    "train_test_split": {
        "executor": train_test_split_node.run,
        "metadata": {
            "display_name": "Train-Test Split Node",
            "description": "Splits dataset into training and testing sets",
            "inputs": ["X", "y"],
            "outputs": ["X_train", "X_test", "y_train", "y_test"],
            "config_schema": {
                "test_size": {
                    "type": "float",
                    "default": 0.2,
                    "min": 0.05,
                    "max": 0.95,
                },
                "random_state": {
                    "type": "integer",
                    "default": 42,
                },
            },
        },
    },

    "preprocess": {
        "executor": preprocess_node.run,
        "metadata": {
            "display_name": "Preprocess Node",
            "description": "Applies preprocessing transformations",
            "inputs": ["X_train", "X_test", "y_train", "y_test"],
            "outputs": ["X_train", "X_test", "y_train", "y_test"],
            "config_schema": {
                "scaler_type": {
                    "type": "string",
                    "options": ["standard", "minmax", "robust"],
                    "default": "standard",
                }
            },
        },
    },

    "model": {
        "executor": model_node.run,
        "metadata": {
            "display_name": "Model Node",
            "description": "Trains machine learning model",
            "inputs": ["X_train", "X_test", "y_train", "y_test"],
            "outputs": ["predictions", "metrics"],
            "config_schema": model_config_schema(),
        },
    },

    "neural_network": {
        "executor": neural_network_node.run,
        "metadata": {
            "display_name": "Neural Network",
            "description": "Train Deep Learning Models",
            "inputs": ["X_train", "X_test", "y_train", "y_test"],
            "outputs": ["predictions", "metrics"],
            "config_schema": {
                "architecture": {
                    "type": "string",
                    "options": ["mlp", "cnn"],
                    "default": "mlp",
                },
                "hidden_size": {
                    "type": "integer",
                    "default": 128,
                    "min": 1,
                    "max": 4096,
                },
                "filters": {
                    "type": "integer",
                    "label": "Filters",
                    "default": 32,
                    "min": 1,
                    "max": 512,
                    "visible_if": {
                        "architecture": ["cnn"],
                    },
                },
                "kernel_size": {
                    "type": "integer",
                    "label": "Kernel Size",
                    "default": 3,
                    "min": 1,
                    "max": 11,
                    "visible_if": {
                        "architecture": ["cnn"],
                    },
                },
                "dropout": {
                    "type": "float",
                    "label": "Dropout",
                    "default": 0.2,
                    "min": 0,
                    "max": 1,
                    "visible_if": {
                        "architecture": ["cnn"],
                    },
                },
                "epochs": {
                    "type": "integer",
                    "default": 10,
                    "min": 1,
                    "max": 1000,
                },
                "learning_rate": {
                    "type": "float",
                    "default": 0.001,
                    "min": 0.000001,
                    "max": 1,
                },
                "batch_size": {
                    "type": "integer",
                    "label": "Batch Size",
                    "default": 32,
                    "min": 1,
                    "max": 1024,
                },
                "optimizer": {
                    "type": "string",
                    "label": "Optimizer",
                    "options": ["adam", "sgd"],
                    "default": "adam",
                },
            },
        },
    },
}
