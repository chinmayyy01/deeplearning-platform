from app.pipeline.generators.neural_network_generator import (
    generate_neural_network_code,
)


def _render(config):
    imports, code = generate_neural_network_code(config)
    return "\n".join(sorted(imports) + code)


def test_mlp_generated_code_is_valid_python():
    compile(_render({"architecture": "mlp"}), "<mlp>", "exec")


def test_cnn_generated_code_is_valid_python():
    compile(_render({"architecture": "cnn"}), "<cnn>", "exec")


def test_mlp_generated_code_matches_trainer_semantics():
    rendered = _render({"architecture": "mlp", "epochs": 3, "hidden_size": 16})

    assert "classes = sorted(set(y_train) | set(y_test))" in rendered
    assert "model.eval()" in rendered
    assert "loss_history.append" in rendered
    assert "best_loss = min(loss_history)" in rendered
    assert "accuracy_score(y_test, predictions)" in rendered
    assert "output_size=len(classes)" in rendered
    assert "for epoch in range(3)" in rendered
    assert "hidden_size=16" in rendered


def test_cnn_generated_code_matches_trainer_semantics():
    rendered = _render({"architecture": "cnn", "epochs": 2, "filters": 4})

    assert "model.eval()" in rendered
    assert "num_classes=len(classes)" in rendered
    assert "loss_history.append" in rendered
    assert "accuracy_score(y_test, predictions)" in rendered
    assert "filters=4" in rendered
