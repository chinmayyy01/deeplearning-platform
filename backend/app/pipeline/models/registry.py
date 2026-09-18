import importlib
from dataclasses import dataclass
from typing import Any, Optional, Tuple

from sklearn.metrics import accuracy_score, mean_squared_error, r2_score


@dataclass(frozen=True)
class ParamSpec:
    name: str
    type: str
    default: Any
    label: Optional[str] = None
    options: Optional[Tuple[str, ...]] = None
    min: Optional[float] = None
    max: Optional[float] = None


@dataclass(frozen=True)
class ModelSpec:
    name: str
    task_type: str
    module: str
    class_name: str
    params: Tuple[ParamSpec, ...] = ()
    fixed_params: Tuple[Tuple[str, Any], ...] = ()


DEFAULT_MODEL = "logistic_regression"

MODEL_SPECS = {
    "linear_regression": ModelSpec(
        name="linear_regression",
        task_type="regression",
        module="sklearn.linear_model",
        class_name="LinearRegression",
        params=(
            ParamSpec("fit_intercept", "boolean", True, label="Fit Intercept"),
        ),
    ),
    "logistic_regression": ModelSpec(
        name="logistic_regression",
        task_type="classification",
        module="sklearn.linear_model",
        class_name="LogisticRegression",
        params=(
            ParamSpec("fit_intercept", "boolean", True, label="Fit Intercept"),
            ParamSpec(
                "C",
                "float",
                1.0,
                label="Regularization Strength",
                min=0.0001,
                max=1000,
            ),
            ParamSpec(
                "solver",
                "string",
                "lbfgs",
                label="Solver",
                options=("lbfgs", "liblinear"),
            ),
        ),
        fixed_params=(("max_iter", 1000),),
    ),
    "decision_tree": ModelSpec(
        name="decision_tree",
        task_type="classification",
        module="sklearn.tree",
        class_name="DecisionTreeClassifier",
        params=(
            ParamSpec("max_depth", "integer", 5, label="Max Depth", min=1, max=100),
            ParamSpec(
                "criterion",
                "string",
                "gini",
                label="Criterion",
                options=("gini", "entropy"),
            ),
        ),
        fixed_params=(("random_state", 42),),
    ),
    "random_forest": ModelSpec(
        name="random_forest",
        task_type="classification",
        module="sklearn.ensemble",
        class_name="RandomForestClassifier",
        params=(
            ParamSpec(
                "n_estimators",
                "integer",
                100,
                label="Number of Estimators",
                min=1,
                max=1000,
            ),
            ParamSpec("max_depth", "integer", 5, label="Max Depth", min=1, max=100),
            ParamSpec(
                "criterion",
                "string",
                "gini",
                label="Criterion",
                options=("gini", "entropy"),
            ),
        ),
        fixed_params=(("random_state", 42),),
    ),
}


def resolve_params(spec, config):
    """Resolve a model's constructor kwargs from config defaults + overrides."""
    resolved = {}
    for param in spec.params:
        resolved[param.name] = config.get(param.name, param.default)
    for key, value in spec.fixed_params:
        resolved[key] = value
    return resolved


def build_estimator(spec, config):
    module = importlib.import_module(spec.module)
    estimator_class = getattr(module, spec.class_name)
    return estimator_class(**resolve_params(spec, config))


def _format_value(value):
    if isinstance(value, bool):
        return "True" if value else "False"
    return repr(value)


def _as_list(values):
    if hasattr(values, "tolist"):
        return values.tolist()
    return list(values)


def train(input_data, config):
    algorithm = config.get("algorithm", DEFAULT_MODEL)
    spec = MODEL_SPECS.get(algorithm)
    if spec is None:
        raise ValueError(f"Unknown algorithm: {algorithm}")

    for key in ("X_train", "X_test", "y_train", "y_test"):
        if key not in input_data:
            raise ValueError(f"Missing required input: {key}")

    task_type = input_data.get("task_type")
    if task_type != spec.task_type:
        raise ValueError(
            "Incompatible model and dataset task types: "
            f"{task_type} vs {spec.task_type}"
        )

    estimator = build_estimator(spec, config)
    estimator.fit(input_data["X_train"], input_data["y_train"])
    predictions = _as_list(estimator.predict(input_data["X_test"]))
    y_test = _as_list(input_data["y_test"])

    if spec.task_type == "classification":
        metrics = {"accuracy": float(accuracy_score(y_test, predictions))}
    else:
        metrics = {
            "mse": float(mean_squared_error(y_test, predictions)),
            "r2_score": float(r2_score(y_test, predictions)),
        }

    return {
        "model_name": spec.name,
        "predictions": predictions,
        "predictions_preview": predictions[:10],
        "y_test_preview": y_test[:10],
        "y_test": y_test,
        "metrics": metrics,
        "config_used": config,
        "run_summary": {"model": spec.name, "task_type": spec.task_type},
        "training_summary": resolve_params(spec, config),
    }


def generate_model_code(config):
    algorithm = config.get("algorithm", DEFAULT_MODEL)
    spec = MODEL_SPECS.get(algorithm)
    if spec is None:
        raise ValueError(f"Unknown algorithm: {algorithm}")

    params = resolve_params(spec, config)
    arguments = ", ".join(
        f"{key}={_format_value(value)}" for key, value in params.items()
    )
    imports = {f"from {spec.module} import {spec.class_name}"}
    code = [
        "# Model Training",
        f"model = {spec.class_name}({arguments})",
        "model.fit(X_train, y_train)",
        "predictions = model.predict(X_test)",
        "",
    ]
    return imports, code


def model_config_schema():
    """Build the `model` node's config schema from the model specs."""
    fields = {
        "algorithm": {
            "type": "string",
            "label": "Algorithm",
            "options": list(MODEL_SPECS),
            "default": DEFAULT_MODEL,
        }
    }

    owners = {}
    specs_by_param = {}
    for name, spec in MODEL_SPECS.items():
        for param in spec.params:
            owners.setdefault(param.name, []).append(name)
            specs_by_param.setdefault(param.name, param)

    for param_name, param in specs_by_param.items():
        entry = {"type": param.type}
        if param.label:
            entry["label"] = param.label
        entry["default"] = param.default
        if param.options:
            entry["options"] = list(param.options)
        if param.min is not None:
            entry["min"] = param.min
        if param.max is not None:
            entry["max"] = param.max
        param_owners = owners[param_name]
        if len(param_owners) < len(MODEL_SPECS):
            entry["visible_if"] = {"algorithm": param_owners}
        fields[param_name] = entry

    return fields
