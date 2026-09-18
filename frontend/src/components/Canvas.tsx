"use client";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
  useReactFlow,
  type Node,
  type Edge,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { usePipelineStore } from "@/store/pipelineStore";
import BasePipelineNode from "./nodes/BasePipelineNode";
import TrashBin from "./TrashBin";
import { useSettingsStore } from "@/store/settingsStore";

const bgVariantMap = {
  dots: BackgroundVariant.Dots,
  lines: BackgroundVariant.Lines,
  none: null,
};

const connLineMap: Record<string, ConnectionLineType> = {
  bezier: ConnectionLineType.Bezier,
  straight: ConnectionLineType.Straight,
  step: ConnectionLineType.Step,
};

function CanvasViewportSync({ zoom }: { zoom: number }) {
  const { zoomTo } = useReactFlow();

  useEffect(() => {
    zoomTo(zoom, { duration: 150 });
  }, [zoom, zoomTo]);

  return null;
}

export default function Canvas() {
  const {
    nodes,
    edges,
    nodeMetadata,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNode,
    setSelectedEdge,
    deleteNode,
    onNodeDragStop,
  } = usePipelineStore();

  const settings = useSettingsStore((state) => state.settings);

  const nodeTypes = useMemo(() => {
    const types: Record<string, typeof BasePipelineNode> = {};
    const knownTypes = Object.keys(nodeMetadata);
    const typesToRegister =
      knownTypes.length > 0
        ? knownTypes
        : [
            "dataset",
            "train_test_split",
            "preprocess",
            "model",
            "neural_network",
          ];
    typesToRegister.forEach((type) => {
      types[type] = BasePipelineNode;
    });
    return types;
  }, [nodeMetadata]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const draggingNodeId = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const trashRef = useRef<HTMLDivElement>(null);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("nodeType");
      if (!type) return;
      const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
      addNode(type, {
        x: e.clientX - bounds.left - 80,
        y: e.clientY - bounds.top - 40,
      });
    },
    [addNode],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode],
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge.id);
    },
    [setSelectedEdge],
  );

  const handleNodeDragStart = useCallback((_: React.MouseEvent, node: Node) => {
    dragStartPosition.current = { x: node.position.x, y: node.position.y };
    draggingNodeId.current = node.id;
  }, []);

  const handleNodeDrag = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const canvasBounds = canvasRef.current.getBoundingClientRect();
    const nearBottom =
      e.clientY >= canvasBounds.bottom - canvasBounds.height * 0.3;
    setIsDragging(nearBottom);
    if (!trashRef.current || !nearBottom) {
      setIsOverTrash(false);
      return;
    }
    const trash = trashRef.current.getBoundingClientRect();
    const padding = 40;
    setIsOverTrash(
      e.clientX >= trash.left - padding &&
        e.clientX <= trash.right + padding &&
        e.clientY >= trash.top - padding &&
        e.clientY <= trash.bottom + padding,
    );
  }, []);

  const handleNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (isOverTrash && draggingNodeId.current) {
        deleteNode(draggingNodeId.current);
      } else if (dragStartPosition.current) {
        onNodeDragStop(node, dragStartPosition.current);
      }
      dragStartPosition.current = null;
      draggingNodeId.current = null;
      setIsDragging(false);
      setIsOverTrash(false);
    },
    [isOverTrash, deleteNode, onNodeDragStop],
  );

  const bgVariant = bgVariantMap[settings.canvasBackground];

  const renderedEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        animated: settings.animateEdges,
        style: {
          stroke: "rgba(255,255,255,0.14)",
          strokeWidth: settings.edgeWidth,
          ...(edge.style ?? {}),
        },
      })),
    [edges, settings.animateEdges, settings.edgeWidth],
  );

  const edgeOptions = useMemo(
    () => ({
      animated: settings.animateEdges,
      style: {
        stroke: "rgba(255,255,255,0.14)",
        strokeWidth: settings.edgeWidth,
      },
    }),
    [settings.animateEdges, settings.edgeWidth],
  );

  return (
    <div
      ref={canvasRef}
      className="w-full h-full bg-canvas"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={renderedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        minZoom={0.3}
        maxZoom={2}
        snapToGrid={settings.snapToGrid}
        snapGrid={[settings.snapGrid, settings.snapGrid]}
        connectionLineType={connLineMap[settings.connectionLineStyle]}
        defaultEdgeOptions={edgeOptions}
        defaultViewport={{ x: 0, y: 0, zoom: settings.defaultZoom }}
        style={{ background: "var(--color-canvas)" }}
        proOptions={{ hideAttribution: true }}
      >
        <CanvasViewportSync zoom={settings.defaultZoom} />
        {bgVariant && (
          <Background variant={bgVariant} gap={20} size={1.5} color="#22222a" />
        )}
        {settings.showControls && (
          <Controls
            style={{
              background: "var(--color-elevated)",
              border: "1px solid var(--color-line)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          />
        )}
        {settings.minimap && (
          <MiniMap
            style={{
              background: "var(--color-panel)",
              border: "1px solid var(--color-line)",
              borderRadius: 8,
              height: 100,
              width: 150,
            }}
            nodeColor="#3a3a44"
            maskColor="rgba(0,0,0,0.55)"
          />
        )}
        <Panel position="bottom-center">
          <TrashBin
            ref={trashRef}
            isDragging={isDragging}
            isOverTrash={isOverTrash}
          />
        </Panel>
      </ReactFlow>
    </div>
  );
}
