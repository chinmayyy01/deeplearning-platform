from app.pipeline.datasets.registry import (
    DEFAULT_DATASET,
    get_dataset_spec,
    image_metadata,
)


def _remote_image_descriptor(spec, config):
    return {
        "dataset_name": spec.name,
        "task_type": spec.task_type,
        "max_samples": config.get("max_samples", 2000),
        "lazy_image": True,
        **image_metadata(spec),
    }


def run(input_data, config):
    dataset_name = config.get("dataset", DEFAULT_DATASET)
    spec = get_dataset_spec(dataset_name)
    if spec is None:
        raise ValueError(f"Unknown dataset '{dataset_name}'")

    if spec.remote:
        return _remote_image_descriptor(spec, config)

    dataset = spec.loader()
    X = getattr(dataset, spec.data_attribute)
    y = getattr(dataset, spec.target_attribute)

    output = {
        "X": X.tolist() if hasattr(X, "tolist") else list(X),
        "y": y.tolist() if hasattr(y, "tolist") else list(y),
        "dataset_name": spec.name,
        "task_type": spec.task_type,
    }

    if spec.data_format == "image":
        output.update(image_metadata(spec))

    return output
