from app.pipeline.models.registry import MODEL_SPECS, train


def run(input_data, config):
    if input_data.get("lazy_image"):
        raise ValueError(
            "Remote image datasets (mnist, fashion_mnist, cifar10) are trained "
            "on Modal and can only be used with a Neural Network node."
        )

    algorithm = config.get("algorithm")
    if not algorithm:
        raise ValueError("Algorithm not specified")
    if algorithm not in MODEL_SPECS:
        raise ValueError(f"Unknown algorithm: {algorithm}")

    return train(input_data, config)
