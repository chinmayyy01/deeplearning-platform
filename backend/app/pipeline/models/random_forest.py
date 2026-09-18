from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

def train(input_data, config):
    X_train = input_data["X_train"]
    X_test = input_data["X_test"]
    y_train = input_data["y_train"]
    y_test = input_data["y_test"]
    
    model = RandomForestClassifier(
        n_estimators=config.get("n_estimators", 100),
        max_depth=config.get("max_depth", 5),
        random_state=42
    )
    model.fit(X_train, y_train)
    
    predictions = model.predict(X_test)
    
    accuracy = accuracy_score(y_test, predictions)
    
    return {
        "model_name": "random_forest",
        "predictions": predictions.tolist(),
        "predictions_preview": predictions[:10].tolist(),
        "y_test_preview": list(y_test[:10]),
        "y_test": list(y_test),
        "metrics": {
            "accuracy": float(accuracy)
        },
        "config_used": config,
        "run_summary": {
            "model": "random_forest",
            "task_type": "classification"
        }
    }