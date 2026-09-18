from sklearn.preprocessing import MinMaxScaler, RobustScaler, StandardScaler

from app.pipeline.nodes.io_utils import passthrough_metadata, require_inputs

SCALER_REGISTRY = {
    "standard": StandardScaler,
    "minmax": MinMaxScaler,
    "robust": RobustScaler,
}


def run(input_data, config):
    # Remote image datasets are loaded and split inside Modal, so there is
    # nothing to transform here — pass the descriptor through untouched.
    if input_data.get("lazy_image"):
        output = dict(input_data)
        output["preprocessing"] = {"scaler_type": "none"}
        return output

    if input_data.get("data_format") == "image":
        require_inputs(
            "preprocess",
            input_data,
            ["X_train", "X_test", "y_train", "y_test", "task_type"],
        )
        output = {
            "X_train": input_data["X_train"],
            "X_test": input_data["X_test"],
            "y_train": input_data["y_train"],
            "y_test": input_data["y_test"],
            "task_type": input_data["task_type"],
            "preprocessing": {"scaler_type": "none"},
        }
        passthrough_metadata(input_data, output)
        return output

    scaler_type = config.get("scaler_type", "standard")
    if scaler_type not in SCALER_REGISTRY:
        raise ValueError(f"Unknown scaler type: {scaler_type}")

    require_inputs(
        "preprocess",
        input_data,
        ["X_train", "X_test", "y_train", "y_test", "task_type"],
    )

    scaler = SCALER_REGISTRY[scaler_type]()
    scaled_X_train = scaler.fit_transform(input_data["X_train"])
    scaled_X_test = scaler.transform(input_data["X_test"])

    output = {
        "X_train": scaled_X_train,
        "X_test": scaled_X_test,
        "y_train": input_data["y_train"],
        "y_test": input_data["y_test"],
        "task_type": input_data["task_type"],
        "preprocessing": {"scaler_type": scaler_type},
    }

    passthrough_metadata(input_data, output)
    return output
