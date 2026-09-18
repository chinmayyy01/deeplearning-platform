from app.pipeline.datasets.registry import DATASET_SPECS, remote_dataset_names
from app.pipeline.models.registry import MODEL_SPECS, model_config_schema
from app.pipeline.registry.node_registry import NODE_REGISTRY

VALID_TYPES = {"integer", "float", "boolean", "string"}


def test_model_param_types_are_valid():
    for spec in MODEL_SPECS.values():
        for param in spec.params:
            assert param.type in VALID_TYPES, (spec.name, param.name)


def test_model_schema_defaults_are_valid():
    schema = model_config_schema()
    for name, field in schema.items():
        if field["type"] == "string" and "options" in field:
            assert field["default"] in field["options"], name
        if "min" in field:
            assert field["default"] >= field["min"], name
        if "max" in field:
            assert field["default"] <= field["max"], name


def test_every_model_param_appears_in_schema():
    schema = model_config_schema()
    for spec in MODEL_SPECS.values():
        for param in spec.params:
            assert param.name in schema, (spec.name, param.name)
            assert schema[param.name]["type"] == param.type


def test_model_schema_algorithm_options_match_specs():
    schema = model_config_schema()
    assert set(schema["algorithm"]["options"]) == set(MODEL_SPECS)
    assert schema["algorithm"]["default"] in MODEL_SPECS


def test_dataset_options_match_node_registry():
    options = NODE_REGISTRY["dataset"]["metadata"]["config_schema"]["dataset"][
        "options"
    ]
    assert set(options) == set(DATASET_SPECS)


def test_remote_datasets_carry_image_metadata():
    for name in remote_dataset_names():
        spec = DATASET_SPECS[name]
        assert spec.torchvision_loader, name
        assert spec.image_channels, name
        assert spec.image_height, name
        assert spec.image_width, name


def test_every_node_config_field_has_a_known_type():
    for node_type, entry in NODE_REGISTRY.items():
        schema = entry["metadata"].get("config_schema", {})
        for field_name, field in schema.items():
            assert field["type"] in VALID_TYPES, (node_type, field_name)


def test_node_registry_options_reference_declared_defaults():
    for node_type, entry in NODE_REGISTRY.items():
        schema = entry["metadata"].get("config_schema", {})
        for field_name, field in schema.items():
            if "options" in field and "default" in field:
                assert field["default"] in field["options"], (node_type, field_name)
