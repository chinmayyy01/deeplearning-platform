from dataclasses import dataclass
from typing import Callable, Optional

from sklearn.datasets import (
    fetch_california_housing,
    load_breast_cancer,
    load_diabetes,
    load_digits,
    load_iris,
    load_wine,
)


@dataclass(frozen=True)
class DatasetSpec:
    name: str
    task_type: str
    loader: Optional[Callable] = None
    loader_module: Optional[str] = None
    loader_name: Optional[str] = None
    data_attribute: str = "data"
    target_attribute: str = "target"
    data_format: str = "tabular"
    image_channels: Optional[int] = None
    image_height: Optional[int] = None
    image_width: Optional[int] = None
    remote: bool = False
    torchvision_loader: Optional[str] = None


DATASET_SPECS = {
    "iris": DatasetSpec(
        name="iris",
        task_type="classification",
        loader=load_iris,
        loader_module="sklearn.datasets",
        loader_name="load_iris",
    ),
    "wine": DatasetSpec(
        name="wine",
        task_type="classification",
        loader=load_wine,
        loader_module="sklearn.datasets",
        loader_name="load_wine",
    ),
    "breast_cancer": DatasetSpec(
        name="breast_cancer",
        task_type="classification",
        loader=load_breast_cancer,
        loader_module="sklearn.datasets",
        loader_name="load_breast_cancer",
    ),
    "california_housing": DatasetSpec(
        name="california_housing",
        task_type="regression",
        loader=fetch_california_housing,
        loader_module="sklearn.datasets",
        loader_name="fetch_california_housing",
    ),
    "diabetes": DatasetSpec(
        name="diabetes",
        task_type="regression",
        loader=load_diabetes,
        loader_module="sklearn.datasets",
        loader_name="load_diabetes",
    ),
    "digits": DatasetSpec(
        name="digits",
        task_type="classification",
        loader=load_digits,
        loader_module="sklearn.datasets",
        loader_name="load_digits",
        data_attribute="images",
        data_format="image",
        image_channels=1,
        image_height=8,
        image_width=8,
    ),
    "mnist": DatasetSpec(
        name="mnist",
        task_type="classification",
        data_format="image",
        image_channels=1,
        image_height=28,
        image_width=28,
        remote=True,
        torchvision_loader="MNIST",
    ),
    "fashion_mnist": DatasetSpec(
        name="fashion_mnist",
        task_type="classification",
        data_format="image",
        image_channels=1,
        image_height=28,
        image_width=28,
        remote=True,
        torchvision_loader="FashionMNIST",
    ),
    "cifar10": DatasetSpec(
        name="cifar10",
        task_type="classification",
        data_format="image",
        image_channels=3,
        image_height=32,
        image_width=32,
        remote=True,
        torchvision_loader="CIFAR10",
    ),
}

DEFAULT_DATASET = "iris"


def get_dataset_spec(name):
    return DATASET_SPECS.get(name)


def dataset_options():
    return list(DATASET_SPECS)


def remote_dataset_names():
    return [name for name, spec in DATASET_SPECS.items() if spec.remote]


def image_metadata(spec):
    return {
        "data_format": "image",
        "image_channels": spec.image_channels,
        "image_height": spec.image_height,
        "image_width": spec.image_width,
    }
