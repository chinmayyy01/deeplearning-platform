import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.metrics import accuracy_score
from modal_service.models.mlp import MLP
from torch.utils.data import TensorDataset, DataLoader

def train(input_data, config):
    X_train = torch.tensor(input_data["X_train"], dtype=torch.float32)
    X_test = torch.tensor(input_data["X_test"], dtype=torch.float32)
    
    if input_data.get("data_format") == "image" or X_train.ndim > 2:
        if X_train.max() > 1.0:
            scale_factor = 255.0 if X_train.max() > 16.0 else 16.0
            X_train = X_train / scale_factor
            X_test = X_test / scale_factor

    train_labels = [int(label) for label in input_data["y_train"]]
    test_labels = [int(label) for label in input_data["y_test"]]
    classes = sorted(set(train_labels) | set(test_labels))
    class_to_index = {label: index for index, label in enumerate(classes)}

    y_train = torch.tensor(
        [class_to_index[label] for label in train_labels], dtype=torch.long
    )

    if X_train.ndim > 2:
        X_train = torch.flatten(X_train, start_dim=1)
        X_test = torch.flatten(X_test, start_dim=1)

    input_size = X_train.shape[1]
    output_size = len(classes)
    hidden_size = config.get("hidden_size", 128)
    epochs = config.get("epochs", 10)
    learning_rate = config.get("learning_rate", 0.001)
    batch_size = config.get("batch_size", 32)
    optimizer_name = config.get("optimizer", "adam")
    train_dataset = TensorDataset(X_train, y_train)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

    model = MLP(
        input_size=input_size,
        hidden_size=hidden_size,
        output_size=output_size
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
    for _ in range(epochs):
        epoch_loss = 0.0
        for batch_X, batch_y in train_loader:
            optimizer.zero_grad()
            outputs = model(batch_X)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        loss_history.append(
            epoch_loss / len(train_loader)
        )

    with torch.no_grad():
        model.eval()
        predictions = model(X_test)
        predicted_classes = predictions.argmax(dim=1)

    predicted_labels = [classes[index] for index in predicted_classes.tolist()]

    accuracy = accuracy_score(
        test_labels,
        predicted_labels
    )

    return {
        "model_name": "mlp",
        "predictions": predicted_labels,
        "predictions_preview": predicted_labels[:10],
        "y_test_preview": test_labels[:10],
        "y_test": test_labels,
        "metrics": {
            "accuracy": float(accuracy),
            "loss": float(loss_history[-1])
        },
        "loss_history": loss_history,
        "config_used": config,
        "run_summary": {
            "model": "mlp",
            "task_type": "classification"
        },
        "training_summary": {
            "epochs": epochs,
            "learning_rate": learning_rate,
            "hidden_size": hidden_size,
            "batch_size": batch_size,
            "optimizer": optimizer_name
        }
    }
