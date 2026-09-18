from fastapi import APIRouter

from app.pipeline.executor import run_pipeline
from app.pipeline.schemas import Pipeline
from app.pipeline.registry.node_registry import NODE_REGISTRY

router = APIRouter()


@router.post("/run_pipeline")
def execute_pipeline(pipeline: Pipeline):
    results = run_pipeline(pipeline.model_dump())
    return {
        "results": results
    }


@router.get("/nodes")
def get_nodes():
    node_data = {}
    for node_type, node_info in NODE_REGISTRY.items():
        node_data[node_type] = node_info["metadata"]
    return node_data
