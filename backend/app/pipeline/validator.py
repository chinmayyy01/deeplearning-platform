from app.pipeline.registry.node_registry import NODE_REGISTRY
from app.pipeline.utils import topological_sort
from app.pipeline.error_handler import PipelineError


def _config_error(node, message):
    return PipelineError(
        "VALIDATION_ERROR",
        message,
        node_id=node["id"],
        node_type=node["type"],
    )


def _validate_node_config(node):
    metadata = NODE_REGISTRY[node["type"]]["metadata"]
    schema = metadata.get("config_schema", {})
    config = node.get("config") or {}

    for key, field in schema.items():
        if key not in config:
            continue

        value = config[key]
        expected = field.get("type")

        if expected == "integer":
            valid = isinstance(value, int) and not isinstance(value, bool)
        elif expected == "float":
            valid = isinstance(value, (int, float)) and not isinstance(value, bool)
        elif expected == "boolean":
            valid = isinstance(value, bool)
        elif expected == "string":
            valid = isinstance(value, str)
        else:
            valid = True

        if not valid:
            raise _config_error(
                node,
                f"Config '{key}' must be of type {expected}",
            )

        options = field.get("options")
        if options and value not in options:
            raise _config_error(
                node,
                f"Config '{key}' must be one of {options}, got {value!r}",
            )

        if isinstance(value, (int, float)) and not isinstance(value, bool):
            if "min" in field and value < field["min"]:
                raise _config_error(
                    node,
                    f"Config '{key}' must be >= {field['min']}, got {value}",
                )
            if "max" in field and value > field["max"]:
                raise _config_error(
                    node,
                    f"Config '{key}' must be <= {field['max']}, got {value}",
                )


def validate_pipeline(pipeline):
    if "nodes" not in pipeline or not pipeline["nodes"]:
        raise PipelineError("VALIDATION_ERROR", "Pipeline must contain at least one node")
    if "edges" not in pipeline:
        raise PipelineError("VALIDATION_ERROR", "Pipeline missing edges")

    node_map = {node["id"]: node for node in pipeline["nodes"]}
    if len(node_map) != len(pipeline["nodes"]):
        raise PipelineError(
            "VALIDATION_ERROR",
            "Pipeline contains duplicate node ids",
        )

    for node in pipeline["nodes"]:
        node_type = node["type"]
        if node_type not in NODE_REGISTRY:
            raise PipelineError(
                "VALIDATION_ERROR",
                f"Unknown node type: {node_type}",
                node_id=node["id"],
                node_type=node_type,
            )
        _validate_node_config(node)

    topological_sort(pipeline)
    parent_map = {node_id: [] for node_id in node_map}

    for edge in pipeline["edges"]:
        source = edge["source"]
        target = edge["target"]
        if source not in node_map or target not in node_map:
            raise PipelineError(
                "VALIDATION_ERROR",
                f"Invalid edge: {source} -> {target}",
            )
        parent_map[target].append(source)

    for node_id, node in node_map.items():
        node_type = node["type"]
        metadata = NODE_REGISTRY[node_type]["metadata"]
        required_inputs = metadata.get("inputs", [])
        available_outputs = []
        for parent_id in parent_map[node_id]:
            parent_type = node_map[parent_id]["type"]
            parent_outputs = NODE_REGISTRY[parent_type]["metadata"].get("outputs", [])
            available_outputs.extend(parent_outputs)
        missing_inputs = [
            input_name
            for input_name in required_inputs
            if input_name not in available_outputs
        ]
        if missing_inputs:
            raise PipelineError(
                "VALIDATION_ERROR",
                f"{node_type} node missing required inputs: {missing_inputs}",
                node_id=node_id,
                node_type=node_type,
            )
    return True
