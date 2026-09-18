def _label_mapping_lines():
    return [
        "classes = sorted(set(y_train) | set(y_test))",
        "class_to_index = {label: index for index, label in enumerate(classes)}",
        "y_train_tensor = torch.tensor(",
        "    [class_to_index[label] for label in y_train], dtype=torch.long",
        ")",
        "y_test_tensor = torch.tensor(",
        "    [class_to_index[label] for label in y_test], dtype=torch.long",
        ")",
    ]


def _optimizer_lines(optimizer, learning_rate):
    return [
        f"optimizer_name = {optimizer!r}",
        "if optimizer_name == 'adam':",
        f"    optimizer = optim.Adam(model.parameters(), lr={learning_rate})",
        "elif optimizer_name == 'sgd':",
        f"    optimizer = optim.SGD(model.parameters(), lr={learning_rate})",
        "else:",
        "    raise ValueError(f'Unknown optimizer: {optimizer_name}')",
    ]


def _training_loop_lines(epochs, batch_size, tensor_variables):
    lines = [
        "train_dataset = TensorDataset(",
        *[f"    {variable}," for variable in tensor_variables],
        ")",
        "",
        "train_loader = DataLoader(",
        "    train_dataset,",
        f"    batch_size={batch_size},",
        "    shuffle=True",
        ")",
        "",
        "loss_history = []",
        "model.train()",
        f"for epoch in range({epochs}):",
        "    epoch_loss = 0.0",
        "    for batch_X, batch_y in train_loader:",
        "        optimizer.zero_grad()",
        "        outputs = model(batch_X)",
        "        loss = criterion(outputs, batch_y)",
        "        loss.backward()",
        "        optimizer.step()",
        "        epoch_loss += loss.item()",
        "    loss_history.append(epoch_loss / len(train_loader))",
    ]
    return lines


def _evaluation_lines():
    return [
        "with torch.no_grad():",
        "    model.eval()",
        "    outputs = model(X_test_tensor)",
        "    predicted_classes = outputs.argmax(dim=1)",
        "",
        "predictions = [classes[index] for index in predicted_classes.tolist()]",
        "",
        "# Evaluation",
        "final_loss = loss_history[-1]",
        "best_loss = min(loss_history)",
        "accuracy = accuracy_score(y_test, predictions)",
        "",
        "print(f'Accuracy: {accuracy:.4f}')",
        "print(f'Final Loss: {final_loss:.4f}')",
        "print(f'Best Loss: {best_loss:.4f}')",
        "",
    ]


COMMON_IMPORTS = {
    "import torch",
    "import torch.nn as nn",
    "import torch.optim as optim",
    "from sklearn.metrics import accuracy_score",
    "from torch.utils.data import TensorDataset, DataLoader",
}


def _cnn_code(config):
    hidden_size = config.get("hidden_size", 128)
    epochs = config.get("epochs", 10)
    learning_rate = config.get("learning_rate", 0.001)
    batch_size = config.get("batch_size", 32)
    filters = config.get("filters", 32)
    kernel_size = config.get("kernel_size", 3)
    dropout = config.get("dropout", 0.2)
    optimizer = config.get("optimizer", "adam")

    code = [
        "# Neural Network",
        "",
        "def prepare_image_tensor(values, image_channels):",
        "    tensor = torch.tensor(values, dtype=torch.float32)",
        "    if tensor.max() > 1.0:",
        "        scale_factor = 255.0 if tensor.max() > 16.0 else 16.0",
        "        tensor = tensor / scale_factor",
        "    if tensor.ndim == 3:",
        "        return tensor.unsqueeze(1)",
        "    if tensor.ndim == 4:",
        "        if tensor.shape[1] == image_channels:",
        "            return tensor",
        "        if tensor.shape[-1] == image_channels:",
        "            return tensor.permute(0, 3, 1, 2)",
        "    raise ValueError(",
        "        'CNN input must be image data shaped as N,H,W, N,H,W,C, or N,C,H,W'",
        "    )",
        "",
        "class CNN(nn.Module):",
        "    def __init__(",
        "        self,",
        "        num_classes,",
        "        image_channels,",
        "        image_height,",
        "        image_width,",
        "        filters=32,",
        "        kernel_size=3,",
        "        hidden_size=128,",
        "        dropout=0.2",
        "    ):",
        "        super().__init__()",
        "        padding = kernel_size // 2",
        "",
        "        self.features = nn.Sequential(",
        "            nn.Conv2d(image_channels, filters, kernel_size=kernel_size, padding=padding),",
        "            nn.ReLU(),",
        "            nn.MaxPool2d(kernel_size=2),",
        "            nn.Conv2d(filters, filters * 2, kernel_size=kernel_size, padding=padding),",
        "            nn.ReLU(),",
        "            nn.MaxPool2d(kernel_size=2)",
        "        )",
        "",
        "        with torch.no_grad():",
        "            sample = torch.zeros(1, image_channels, image_height, image_width)",
        "            flattened_size = self.features(sample).view(1, -1).shape[1]",
        "",
        "        self.classifier = nn.Sequential(",
        "            nn.Flatten(),",
        "            nn.Linear(flattened_size, hidden_size),",
        "            nn.ReLU(),",
        "            nn.Dropout(dropout),",
        "            nn.Linear(hidden_size, num_classes)",
        "        )",
        "",
        "    def forward(self, x):",
        "        x = self.features(x)",
        "        return self.classifier(x)",
        "",
        "image_channels = globals().get('image_channels', 1)",
        "image_height = globals().get('image_height')",
        "image_width = globals().get('image_width')",
        "X_train_tensor = prepare_image_tensor(X_train, image_channels)",
        "X_test_tensor = prepare_image_tensor(X_test, image_channels)",
        "",
        *_label_mapping_lines(),
        "",
        "model = CNN(",
        "    num_classes=len(classes),",
        "    image_channels=image_channels,",
        "    image_height=image_height or X_train_tensor.shape[-2],",
        "    image_width=image_width or X_train_tensor.shape[-1],",
        f"    filters={filters},",
        f"    kernel_size={kernel_size},",
        f"    hidden_size={hidden_size},",
        f"    dropout={dropout}",
        ")",
        "",
        "criterion = nn.CrossEntropyLoss()",
        *_optimizer_lines(optimizer, learning_rate),
        "",
        *_training_loop_lines(
            epochs, batch_size, ("X_train_tensor", "y_train_tensor")
        ),
        "",
        *_evaluation_lines(),
    ]
    return COMMON_IMPORTS, code


def _mlp_code(config):
    hidden_size = config.get("hidden_size", 128)
    epochs = config.get("epochs", 10)
    learning_rate = config.get("learning_rate", 0.001)
    batch_size = config.get("batch_size", 32)
    optimizer = config.get("optimizer", "adam")

    code = [
        "# Neural Network",
        "",
        "class MLP(nn.Module):",
        "    def __init__(self, input_size, hidden_size, output_size):",
        "        super().__init__()",
        "",
        "        self.network = nn.Sequential(",
        "            nn.Linear(input_size, hidden_size),",
        "            nn.ReLU(),",
        "            nn.Linear(hidden_size, output_size)",
        "        )",
        "",
        "    def forward(self, x):",
        "        return self.network(x)",
        "",
        "X_train_tensor = torch.tensor(X_train, dtype=torch.float32)",
        "X_test_tensor = torch.tensor(X_test, dtype=torch.float32)",
        "",
        "if globals().get('data_format') == 'image' or X_train_tensor.ndim > 2:",
        "    if X_train_tensor.max() > 1.0:",
        "        scale_factor = 255.0 if X_train_tensor.max() > 16.0 else 16.0",
        "        X_train_tensor = X_train_tensor / scale_factor",
        "        X_test_tensor = X_test_tensor / scale_factor",
        "",
        "if X_train_tensor.ndim > 2:",
        "    X_train_tensor = torch.flatten(X_train_tensor, start_dim=1)",
        "    X_test_tensor = torch.flatten(X_test_tensor, start_dim=1)",
        "",
        *_label_mapping_lines(),
        "",
        "model = MLP(",
        "    input_size=X_train_tensor.shape[1],",
        f"    hidden_size={hidden_size},",
        "    output_size=len(classes)",
        ")",
        "",
        "criterion = nn.CrossEntropyLoss()",
        *_optimizer_lines(optimizer, learning_rate),
        "",
        *_training_loop_lines(
            epochs, batch_size, ("X_train_tensor", "y_train_tensor")
        ),
        "",
        *_evaluation_lines(),
    ]
    return COMMON_IMPORTS, code


def generate_neural_network_code(config):
    architecture = config.get("architecture", "mlp")
    if architecture == "cnn":
        return _cnn_code(config)
    return _mlp_code(config)
