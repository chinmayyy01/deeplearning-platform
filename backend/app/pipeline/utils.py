from collections import deque

from app.pipeline.error_handler import PipelineError


def build_graph(pipeline):
    graph = {}
    in_degree = {}

    for node in pipeline["nodes"]:
        node_id = node["id"]
        graph[node_id] = []
        in_degree[node_id] = 0

    for edge in pipeline["edges"]:
        src = edge["source"]
        dest = edge["target"]
        if src not in graph or dest not in graph:
            raise PipelineError("VALIDATION_ERROR", f"Invalid edge: {src} -> {dest}")
        graph[src].append(dest)
        in_degree[dest] += 1

    return graph, in_degree


def topological_sort(pipeline):
    graph, in_degree = build_graph(pipeline)
    queue = deque([node for node in in_degree if in_degree[node] == 0])
    order = []

    while queue:
        current = queue.popleft()
        order.append(current)
        for neighbor in graph[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    if len(order) != len(graph):
        raise PipelineError("VALIDATION_ERROR", "Cycle detected in the pipeline")
    return order
