import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import (TensorDataset, DataLoader)
from sklearn.metrics import accuracy_score
from modal_service.models.cnn import CNN


def _prepare_image_tensor(values, image_channels):
    tensor = torch.tensor(values, dtype=torch.float32)
    if tensor.max() > 1.0:
        scale_factor = 255.0 if tensor.max() > 16.0 else 16.0
        tensor = tensor / scale_factor

    if tensor.ndim == 3:
        return tensor.unsqueeze(1)
    if tensor.ndim == 4:
        if tensor.shape[1] == image_channels:
            return tensor
        if tensor.shape[-1] == image_channels:
            return tensor.permute(0, 3, 1, 2)
    raise ValueError(
        "CNN input must be image data shaped as N,H,W, N,H,W,C, or N,C,H,W"
    )


def train(input_data, config):
    image_channels = input_data.get("image_channels", 1)
    image_height = input_data.get("image_height")
    image_width = input_data.get("image_width")

    X_train = _prepare_image_tensor(input_data["X_train"], image_channels)
    X_test = _prepare_image_tensor(input_data["X_test"], image_channels)

    train_labels = [int(label) for label in input_data["y_train"]]
    test_labels = [int(label) for label in input_data["y_test"]]
    classes = sorted(set(train_labels) | set(test_labels))
    class_to_index = {label: index for index, label in enumerate(classes)}

    y_train = torch.tensor(
        [class_to_index[label] for label in train_labels], dtype=torch.long
    )

    epochs = config.get("epochs", 10)
    learning_rate = config.get("learning_rate", 0.001)
    batch_size = config.get("batch_size", 32)
    hidden_size = config.get("hidden_size", 128)
    filters = config.get("filters", 32)
    kernel_size = config.get("kernel_size", 3)
    dropout = config.get("dropout", 0.2)
    optimizer_name = config.get("optimizer", "adam")

    train_dataset = TensorDataset(X_train, y_train)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    model = CNN(
        num_classes=len(classes),
        image_channels=image_channels,
        image_height=image_height or X_train.shape[-2],
        image_width=image_width or X_train.shape[-1],
        filters=filters,
        kernel_size=kernel_size,
        hidden_size=hidden_size,
        dropout=dropout
    )

    criterion = nn.CrossEntropyLoss()

    if optimizer_name == "adam":
        optimizer = optim.Adam(
            model.parameters(),
            lr=learning_rate
        )
    elif optimizer_name == "sgd":
        optimizer = optim.SGD(
            model.parameters(),
            lr=learning_rate
        )
    else:
        raise ValueError(f"Unknown optimizer: {optimizer_name}")

    loss_history = []
    model.train()
    for _ in range(epochs):
        epoch_loss = 0.0
        for batch_X, batch_y in train_loader:
            optimizer.zero_grad()
            outputs = model(batch_X)
            loss = criterion(outputs,batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        loss_history.append(epoch_loss / len(train_loader))
    with torch.no_grad():
        model.eval()
        predictions = model(X_test)
        predicted_classes = (
            predictions.argmax(dim=1)
        )
    predicted_labels = [classes[index] for index in predicted_classes.tolist()]
    final_loss = loss_history[-1]
    best_loss = min(loss_history)
    accuracy = accuracy_score(
        test_labels,
        predicted_labels
    )

    return {
        "model_name": "cnn",
        "predictions": predicted_labels,
        "predictions_preview": predicted_labels[:10],
        "y_test_preview": test_labels[:10],
        "y_test": test_labels,
        "metrics": {
            "accuracy": float(
                accuracy
            ),
            "loss": float(
                final_loss
            )
        },
        "loss_history": loss_history,
        "best_loss": float(best_loss),
        "final_loss": float(final_loss),
        "config_used": config,
        "run_summary": {
            "model": "cnn",
            "task_type": "classification"
        },
        "training_summary": {
            "epochs": epochs,
            "learning_rate": learning_rate,
            "filters": filters,
            "kernel_size": kernel_size,
            "hidden_size": hidden_size,
            "dropout": dropout,
            "batch_size": batch_size,
            "optimizer": optimizer_name
        }
    }
