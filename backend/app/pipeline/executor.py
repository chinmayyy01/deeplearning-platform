import time
from app.pipeline.utils import topological_sort
from app.pipeline.validator import validate_pipeline
from app.pipeline.error_handler import PipelineError
from app.pipeline.registry.node_registry import NODE_REGISTRY
from app.pipeline.generators.code_generator import generate_pipeline_code
from app.pipeline.tracker import create_execution_record, mark_execution_success, mark_execution_failed

def run_pipeline(pipeline):
    start_time = time.perf_counter()
    validate_pipeline(pipeline)
    order = topological_sort(pipeline)
    node_map = {node["id"]: node for node in pipeline["nodes"]}
    results = {}
    execution_details = {}
    parents = {node_id: [] for node_id in node_map}
    for edge in pipeline["edges"]:
        parents[edge["target"]].append(edge["source"])
    for node_id in order:
        node_start_time = time.perf_counter()
        node = node_map[node_id]
        node_type = node["type"]
        input_data = {}
        for parent in parents[node_id]:
            input_data.update(results[parent])
        config = node.get("config", {})
        executor = NODE_REGISTRY[node_type]["executor"]
        try:
            output = executor(input_data, config)
            results[node_id] = output
            execution_record = create_execution_record(node_id, node_type)
            execution_details[node_id] = mark_execution_success(
                execution_record,
                round(time.time() - node_start_time, 4)
            )
        except Exception as e:
            execution_record = create_execution_record(node_id, node_type)
            execution_details[node_id] = mark_execution_failed(
                execution_record,
                round(time.perf_counter() - node_start_time, 4),
                e
            )
            raise PipelineError(
                "NODE_EXECUTION_ERROR", str(e), node_id=node_id, node_type=node_type
            ) from e
    final_node = order[-1]
    execution_time = round(time.perf_counter() - start_time, 4)
    try:
        generated_code = generate_pipeline_code(pipeline)
    except Exception as e:
        raise PipelineError(
            "CODE_GENERATION_ERROR",
            f"Failed to generate pipeline code: {e}",
            node_id=final_node,
        )
    return {
        "status": "success",
        "execution_time": execution_time,
        "final_node": final_node,
        "pipeline_summary": {
            "total_nodes": len(pipeline["nodes"]),
            "total_edges": len(pipeline["edges"])
        },
        "execution_details": execution_details,
        "output": results[final_node],
        "generated_code": generated_code
    }