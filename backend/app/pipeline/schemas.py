from pydantic import BaseModel, Field


class Node(BaseModel):
    id: str = Field(min_length=1)
    type: str = Field(min_length=1)
    config: dict = Field(default_factory=dict)


class Edge(BaseModel):
    source: str = Field(min_length=1)
    target: str = Field(min_length=1)


class Pipeline(BaseModel):
    nodes: list[Node] = Field(min_length=1)
    edges: list[Edge]
