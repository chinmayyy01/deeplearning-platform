from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_nodes_endpoint_lists_node_types():
    response = client.get("/nodes")
    assert response.status_code == 200
    body = response.json()
    assert "dataset" in body
    assert "model" in body
    assert "config_schema" in body["dataset"]


def test_run_pipeline_returns_success_envelope():
    payload = {
        "nodes": [
            {"id": "data", "type": "dataset", "config": {"dataset": "iris"}},
            {"id": "split", "type": "train_test_split", "config": {}},
            {
                "id": "model",
                "type": "model",
                "config": {"algorithm": "logistic_regression"},
            },
        ],
        "edges": [
            {"source": "data", "target": "split"},
            {"source": "split", "target": "model"},
        ],
    }
    response = client.post("/run_pipeline", json=payload)
    assert response.status_code == 200
    results = response.json()["results"]
    assert results["status"] == "success"
    assert "accuracy" in results["output"]["metrics"]
    assert results["generated_code"]


def test_run_pipeline_returns_structured_validation_error():
    payload = {
        "nodes": [{"id": "bad", "type": "not_a_node", "config": {}}],
        "edges": [],
    }
    response = client.post("/run_pipeline", json=payload)
    assert response.status_code == 400
    body = response.json()
    assert body["status"] == "error"
    assert body["error"]["type"] == "VALIDATION_ERROR"
    assert body["error"]["node_id"] == "bad"


def test_run_pipeline_rejects_bad_config_with_node_id():
    payload = {
        "nodes": [
            {"id": "nn", "type": "neural_network", "config": {"epochs": -5}}
        ],
        "edges": [],
    }
    response = client.post("/run_pipeline", json=payload)
    assert response.status_code == 400
    body = response.json()
    assert body["error"]["node_id"] == "nn"
    assert body["error"]["node_type"] == "neural_network"
