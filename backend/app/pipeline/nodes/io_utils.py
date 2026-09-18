METADATA_KEYS = (
    "data_format",
    "dataset_name",
    "image_channels",
    "image_height",
    "image_width",
)


def passthrough_metadata(source, target):
    """Copy dataset/image metadata keys that should flow through a node."""
    for key in METADATA_KEYS:
        if key in source:
            target[key] = source[key]
    return target


def require_inputs(node_name, input_data, keys):
    missing = [key for key in keys if key not in input_data]
    if missing:
        raise ValueError(f"{node_name} node missing required inputs: {missing}")
