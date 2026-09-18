EXECUTION_ERROR_TYPES = {"NODE_EXECUTION_ERROR", "CODE_GENERATION_ERROR"}


class PipelineError(Exception):
    def __init__(self, error_type, message=None, node_id=None, node_type=None):
        if message is None:
            # Backward-compatible: PipelineError("single message")
            error_type, message = "VALIDATION_ERROR", error_type
        self.error_type = error_type
        self.message = message
        self.node_id = node_id
        self.node_type = node_type
        super().__init__(message)

    @property
    def status_code(self):
        return 500 if self.error_type in EXECUTION_ERROR_TYPES else 400

    def to_dict(self):
        return {
            "status": "error",
            "error": {
                "type": self.error_type,
                "node_id": self.node_id,
                "node_type": self.node_type,
                "message": self.message,
            },
        }
