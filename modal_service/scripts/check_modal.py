import modal

train_mlp = modal.Function.from_name(
    "deep-learning-platform",
    "train_mlp"
)

result = train_mlp.remote(
    {
        "X_train": [[1, 2], [2, 3], [3, 4]],
        "X_test": [[4, 5]],
        "y_train": [0, 1, 0],
        "y_test": [1]
    },
    {
        "epochs": 1
    }
)

print(result)