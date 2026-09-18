import pytest

from app.pipeline.executor import run_pipeline
from app.pipeline.generators.code_generator import generate_pipeline_code


def _pipeline(dataset, algorithm, model_config=None):
    config = {"algorithm": algorithm}
    if model_config:
        config.update(model_config)
    return {
        "nodes": [
            {"id": "data", "type": "dataset", "config": {"dataset": dataset}},
            {"id": "split", "type": "train_test_split", "config": {}},
            {"id": "model", "type": "model", "config": config},
        ],
        "edges": [
            {"source": "data", "target": "split"},
            {"source": "split", "target": "model"},
        ],
    }


def _execute_generated_code(code):
    namespace = {}
    exec(code, namespace)  # noqa: S102 - generated code is our own output
    return namespace


CLASSIFICATION_CASES = [
    ("iris", "logistic_regression", {}),
    ("iris", "decision_tree", {"max_depth": 4, "criterion": "entropy"}),
    ("iris", "random_forest", {"n_estimators": 10, "max_depth": 3}),
]

REGRESSION_CASES = [
    ("diabetes", "linear_regression", {"fit_intercept": True}),
]


@pytest.mark.parametrize("dataset,algorithm,model_config", CLASSIFICATION_CASES)
def test_generated_code_reproduces_classification_predictions(
    dataset, algorithm, model_config
):
    pipeline = _pipeline(dataset, algorithm, model_config)

    runtime = run_pipeline(pipeline)
    generated = _execute_generated_code(generate_pipeline_code(pipeline))

    assert list(generated["predictions"]) == runtime["output"]["predictions"]
    assert float(generated["accuracy"]) == pytest.approx(
        runtime["output"]["metrics"]["accuracy"]
    )


@pytest.mark.parametrize("dataset,algorithm,model_config", REGRESSION_CASES)
def test_generated_code_reproduces_regression_metrics(
    dataset, algorithm, model_config
):
    pipeline = _pipeline(dataset, algorithm, model_config)

    runtime = run_pipeline(pipeline)
    generated = _execute_generated_code(generate_pipeline_code(pipeline))

    assert list(generated["predictions"]) == pytest.approx(
        runtime["output"]["predictions"]
    )
    assert float(generated["mse"]) == pytest.approx(
        runtime["output"]["metrics"]["mse"]
    )
    assert float(generated["r2"]) == pytest.approx(
        runtime["output"]["metrics"]["r2_score"]
    )
