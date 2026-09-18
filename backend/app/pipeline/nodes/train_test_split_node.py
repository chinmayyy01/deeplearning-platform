from sklearn.model_selection import train_test_split

from app.pipeline.nodes.io_utils import passthrough_metadata, require_inputs


def run(input_data, config):
    test_size = config.get("test_size", 0.2)
    random_state = config.get("random_state", 42)

    # Remote image datasets are split inside Modal at train time. Keep the
    # descriptor intact and record the split settings for the neural network.
    if input_data.get("lazy_image"):
        output = dict(input_data)
        output["split_test_size"] = test_size
        output["split_random_state"] = random_state
        return output

    require_inputs("train_test_split", input_data, ["X", "y"])

    X_train, X_test, y_train, y_test = train_test_split(
        input_data["X"],
        input_data["y"],
        test_size=test_size,
        random_state=random_state,
    )

    output = {
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "task_type": input_data.get("task_type"),
        "split_test_size": test_size,
        "split_random_state": random_state,
    }

    passthrough_metadata(input_data, output)
    return output
