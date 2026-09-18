from app.pipeline.datasets.registry import DEFAULT_DATASET, get_dataset_spec


def _remote_dataset_code(spec, config):
    max_samples = config.get("max_samples", 2000)
    imports = {"from torchvision import datasets"}
    code = [
        f"dataset = datasets.{spec.torchvision_loader}(",
        "    root='data',",
        "    train=True,",
        "    download=True",
        ")",
        "X = dataset.data",
        "if hasattr(X, 'numpy'):",
        "    X = X.numpy()",
        f"X = X[:{max_samples}]",
        "X = X.tolist()",
        "y = dataset.targets",
        "if hasattr(y, 'numpy'):",
        "    y = y.numpy()",
        f"y = y[:{max_samples}]",
        "if hasattr(y, 'tolist'):",
        "    y = y.tolist()",
        "data_format = 'image'",
        f"image_channels = {spec.image_channels}",
        f"image_height = {spec.image_height}",
        f"image_width = {spec.image_width}",
        "",
    ]
    return imports, code


def generate_dataset_code(config):
    dataset_name = config.get("dataset", DEFAULT_DATASET)
    spec = get_dataset_spec(dataset_name)
    if spec is None:
        raise ValueError(f"Unknown dataset '{dataset_name}'")

    if spec.remote:
        return _remote_dataset_code(spec, config)

    imports = {f"from {spec.loader_module} import {spec.loader_name}"}
    code = [
        f"dataset = {spec.loader_name}()",
        f"X = dataset.{spec.data_attribute}",
        f"y = dataset.{spec.target_attribute}",
    ]

    if spec.data_format == "image":
        code.extend(
            [
                "data_format = 'image'",
                f"image_channels = {spec.image_channels}",
                f"image_height = {spec.image_height}",
                f"image_width = {spec.image_width}",
            ]
        )

    code.append("")
    return imports, code
