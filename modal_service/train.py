import modal

app = modal.App("deep-learning-platform")

# Persistent cache for downloaded datasets so containers don't re-download
# the same data on every cold start.
data_volume = modal.Volume.from_name(
    "deep-learning-platform-data", create_if_missing=True
)
DATA_DIR = "/data"

image = (
    modal.Image.debian_slim()
    .pip_install(
        "torch",
        "torchvision",
        "scikit-learn",
        "numpy"
    )
    .add_local_dir(".", remote_path="/root/modal_service")
)

# The official CIFAR-10 host (cs.toronto.edu) is frequently unreachable or
# extremely slow, which makes the dataset download time out. Try a fast
# mirror first and fall back to the official URL.
CIFAR10_MIRRORS = [
    "https://data.brainchip.com/dataset-mirror/cifar10/cifar-10-python.tar.gz",
    "https://www.cs.toronto.edu/~kriz/cifar-10-python.tar.gz",
]

IMAGE_METADATA = {
    "mnist": (1, 28, 28),
    "fashion_mnist": (1, 28, 28),
    "cifar10": (3, 32, 32),
}


def _load_cifar10():
    from torchvision import datasets

    last_error = None
    for mirror in CIFAR10_MIRRORS:
        try:
            datasets.CIFAR10.url = mirror
            return datasets.CIFAR10(root=DATA_DIR, train=True, download=True)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    raise RuntimeError(
        f"Failed to download CIFAR-10 from any configured mirror: {last_error}"
    )


def _load_image_dataset(dataset_name):
    from torchvision import datasets

    if dataset_name == "mnist":
        return datasets.MNIST(root=DATA_DIR, train=True, download=True)
    if dataset_name == "fashion_mnist":
        return datasets.FashionMNIST(root=DATA_DIR, train=True, download=True)
    if dataset_name == "cifar10":
        return _load_cifar10()
    raise ValueError(f"Unknown image dataset: {dataset_name}")


def _labels_to_list(labels):
    if hasattr(labels, "tolist"):
        return labels.tolist()
    return list(labels)


def _commit_data_volume():
    try:
        data_volume.commit()
    except Exception:  # noqa: BLE001 - commit is best effort
        pass


def _load_dataset_response(dataset_name, max_samples):
    dataset = _load_image_dataset(dataset_name)
    _commit_data_volume()
    channels, height, width = IMAGE_METADATA[dataset_name]
    return {
        "X": dataset.data[:max_samples].tolist(),
        "y": _labels_to_list(dataset.targets[:max_samples]),
        "dataset_name": dataset_name,
        "task_type": "classification",
        "data_format": "image",
        "image_channels": channels,
        "image_height": height,
        "image_width": width,
    }


@app.function(image=image, cpu=2)
def train_mlp(input_data, config):
    import sys
    sys.path.insert(0, "/root/modal_service")
    from trainers.mlp_trainer import train
    return train(input_data, config)


@app.function(image=image, cpu=2)
def train_cnn(input_data, config):
    import sys
    sys.path.insert(0, "/root/modal_service")
    from trainers.cnn_trainer import train
    return train(input_data, config)


@app.function(image=image, volumes={DATA_DIR: data_volume})
def load_mnist(max_samples=2000):
    return _load_dataset_response("mnist", max_samples)


@app.function(image=image, volumes={DATA_DIR: data_volume})
def load_fashion_mnist(max_samples=2000):
    return _load_dataset_response("fashion_mnist", max_samples)


@app.function(image=image, volumes={DATA_DIR: data_volume})
def load_cifar10(max_samples=2000):
    return _load_dataset_response("cifar10", max_samples)


@app.function(image=image, cpu=2, volumes={DATA_DIR: data_volume})
def split_and_train_mlp(dataset_name, max_samples, split_config, train_config):
    import numpy as np
    from sklearn.model_selection import train_test_split as tts

    # Load dataset inside Modal — never sent to backend
    dataset = _load_image_dataset(dataset_name)
    _commit_data_volume()
    X = np.array(dataset.data[:max_samples])
    y = np.array(dataset.targets[:max_samples])
    channels, height, width = IMAGE_METADATA[dataset_name]
    meta = {
        "data_format": "image",
        "image_channels": channels,
        "image_height": height,
        "image_width": width,
    }

    test_size = split_config.get("test_size", 0.2)
    random_state = split_config.get("random_state", 42)
    X_train, X_test, y_train, y_test = tts(X, y, test_size=test_size, random_state=random_state)

    input_data = {
        "X_train": X_train.tolist(),
        "X_test": X_test.tolist(),
        "y_train": y_train.tolist(),
        "y_test": y_test.tolist(),
        "task_type": "classification",
        "dataset_name": dataset_name,
        **meta,
    }

    import sys
    sys.path.insert(0, "/root/modal_service")
    from trainers.mlp_trainer import train
    return train(input_data, train_config)


@app.function(image=image, cpu=2, volumes={DATA_DIR: data_volume})
def split_and_train_cnn(dataset_name, max_samples, split_config, train_config):
    import numpy as np
    from sklearn.model_selection import train_test_split as tts

    dataset = _load_image_dataset(dataset_name)
    _commit_data_volume()
    X = np.array(dataset.data[:max_samples])
    y = np.array(dataset.targets[:max_samples])
    channels, height, width = IMAGE_METADATA[dataset_name]
    meta = {
        "data_format": "image",
        "image_channels": channels,
        "image_height": height,
        "image_width": width,
    }

    test_size = split_config.get("test_size", 0.2)
    random_state = split_config.get("random_state", 42)
    X_train, X_test, y_train, y_test = tts(X, y, test_size=test_size, random_state=random_state)

    input_data = {
        "X_train": X_train.tolist(),
        "X_test": X_test.tolist(),
        "y_train": y_train.tolist(),
        "y_test": y_test.tolist(),
        "task_type": "classification",
        "dataset_name": dataset_name,
        **meta,
    }

    import sys
    sys.path.insert(0, "/root/modal_service")
    from trainers.cnn_trainer import train
    return train(input_data, train_config)


@app.function()
def hello():
    return "Modal is working"
