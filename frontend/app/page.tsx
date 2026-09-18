"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Canvas from "@/components/Canvas";
import Sidebar from "@/components/Sidebar";
import Toast from "@/components/Toast";
import { usePipelineStore } from "@/store/pipelineStore";
import { runPipeline, getNodes } from "@/lib/api";
import { extractErrorContext, extractErrorMessage } from "@/lib/errors";
import ConfigPanel from "@/components/ConfigPanel";
import OutputPanel from "@/components/output/OutputPanel";
import { useOutputStore } from "@/store/outputStore";
import { useToastStore } from "@/store/toastStore";
import type { NodeMetadataEntry } from "@/lib/configSchema";
import RunsPanel from "@/components/RunsPanel";
import HistoryPanel from "@/components/HistoryPanel";
import SettingsPanel from "@/components/SettingsPanel";

const SIDEBAR_WIDTH = 272;
const MIN_CONFIG = 260;
const MAX_CONFIG = 480;
const MIN_OUTPUT = 140;
const MAX_OUTPUT = 1200;

const PANEL_TITLES: Record<string, string> = {
  Nodes: "Node Library",
  Runs: "Runs",
  History: "Saved Pipelines",
  Settings: "Settings",
};

const ResizeHandle = ({
  direction,
  onMouseDown,
}: {
  direction: "ew" | "ns";
  onMouseDown: (e: React.MouseEvent) => void;
}) => (
  <div
    onMouseDown={onMouseDown}
    className={`shrink-0 bg-transparent hover:bg-accent/50 active:bg-accent/70 transition-colors z-10 ${
      direction === "ew"
        ? "w-[3px] cursor-ew-resize"
        : "h-[3px] w-full cursor-ns-resize"
    }`}
  />
);

const IconButton = ({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default ${
      danger
        ? "text-ink-2 hover:text-danger hover:bg-danger-soft disabled:hover:bg-transparent disabled:hover:text-ink-2"
        : "text-ink-2 hover:text-ink hover:bg-elevated disabled:hover:bg-transparent disabled:hover:text-ink-2"
    }`}
  >
    {children}
  </button>
);

const RAIL_ITEMS = [
  {
    label: "Nodes",
    svg: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  { label: "Runs", svg: <polygon points="6 4 19 12 6 20 6 4" /> },
  {
    label: "History",
    svg: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </>
    ),
  },
  {
    label: "Settings",
    svg: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
  },
];

export default function Home() {
  const [activePanel, setActivePanel] = useState<string | null>("Nodes");
  const {
    nodes,
    edges,
    undo,
    redo,
    past,
    future,
    selectedNodeId,
    selectedEdgeId,
    deleteNode,
    deleteEdge,
    setNodeMetadata,
    setErrorNodeId,
    setSelectedNode,
  } = usePipelineStore();
  const [nodeMetadata, setLocalNodeMetadata] = useState<
    Record<string, NodeMetadataEntry>
  >({});
  const { loading, startExecution, setExecutionResult, setExecutionError } =
    useOutputStore();

  const [configWidth, setConfigWidth] = useState(320);
  const [outputHeight, setOutputHeight] = useState(300);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(true);
  const [outputOpen, setOutputOpen] = useState(true);
  const [canvasName, setCanvasName] = useState("Untitled Workflow");
  const [editingName, setEditingName] = useState(false);
  const [isDragging, setIsDragging] = useState<"config" | "output" | null>(
    null,
  );
  const addToast = useToastStore((state) => state.addToast);

  const dragging = useRef<"config" | "output" | null>(null);
  const startPos = useRef(0);
  const startSize = useRef(0);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    if (dragging.current === "config") {
      setConfigWidth(
        Math.min(
          MAX_CONFIG,
          Math.max(
            MIN_CONFIG,
            startSize.current + (startPos.current - e.clientX),
          ),
        ),
      );
    } else if (dragging.current === "output") {
      setOutputHeight(
        Math.min(
          MAX_OUTPUT,
          Math.max(
            MIN_OUTPUT,
            startSize.current + (startPos.current - e.clientY),
          ),
        ),
      );
    }
  }, []);

  const onMouseUp = useCallback(() => {
    dragging.current = null;
    setIsDragging(null);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const startDrag = (type: "config" | "output", e: React.MouseEvent) => {
    dragging.current = type;
    setIsDragging(type);
    startPos.current = type === "output" ? e.clientY : e.clientX;
    startSize.current = type === "config" ? configWidth : outputHeight;
    document.body.style.cursor = type === "output" ? "ns-resize" : "ew-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };

  const handleRun = async () => {
    startExecution();
    setErrorNodeId(null);
    setOutputOpen(true);
    try {
      const payload = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type as string,
          config:
            ((n.data as { config?: Record<string, unknown> } | undefined)
              ?.config as Record<string, unknown>) ?? {},
        })),
        edges: edges.map((e) => ({ source: e.source, target: e.target })),
      };
      const datasetNode = nodes.find((n) => n.type === "dataset");
      const dataset =
        ((datasetNode?.data as { config?: Record<string, unknown> } | undefined)
          ?.config?.dataset as string | undefined) ?? undefined;
      const res = await runPipeline(payload);
      setExecutionResult({ ...res, runMetadata: { dataset } });
      setErrorNodeId(null);
      addToast("Pipeline executed successfully!");
    } catch (e: unknown) {
      const errorMessage = extractErrorMessage(e);
      const { nodeId, nodeType } = extractErrorContext(e);
      const resolvedNodeType =
        nodeType ??
        (nodeId ? nodes.find((n) => n.id === nodeId)?.type : undefined);
      setExecutionError({
        message: errorMessage,
        nodeId,
        nodeType: resolvedNodeType,
      });
      if (nodeId) {
        setErrorNodeId(nodeId);
        setSelectedNode(nodeId);
        setConfigOpen(true);
      }
      addToast(errorMessage, "error");
    }
  };

  useEffect(() => {
    const fetchNodeMetadata = async () => {
      try {
        const metadata = (await getNodes()) as Record<
          string,
          NodeMetadataEntry
        >;
        setLocalNodeMetadata(metadata);
        setNodeMetadata(metadata);
      } catch (error) {
        console.error("Failed to fetch metadata:", extractErrorMessage(error));
      }
    };
    fetchNodeMetadata();
  }, [setNodeMetadata]);

  useEffect(() => {
    if (editingName && nameInputRef.current) nameInputRef.current.focus();
  }, [editingName]);

  const configPanelOpen = configOpen || Boolean(selectedNodeId);

  const handleDelete = useCallback(() => {
    if (selectedNodeId) deleteNode(selectedNodeId);
    else if (selectedEdgeId) deleteEdge(selectedEdgeId);
  }, [deleteEdge, deleteNode, selectedEdgeId, selectedNodeId]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (!selectedNodeId && !selectedEdgeId) return;
      e.preventDefault();
      handleDelete();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDelete, selectedEdgeId, selectedNodeId]);

  const panelTitle = activePanel ? PANEL_TITLES[activePanel] : "";

  return (
    <div className="flex flex-col h-screen w-screen bg-canvas text-ink overflow-hidden">
      {/* Top bar */}
      <header className="h-12 shrink-0 bg-app border-b border-line flex items-center justify-between gap-4 px-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0 shadow-[0_2px_10px_rgba(94,106,210,0.35)]">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold tracking-[-0.01em] text-ink shrink-0 hidden sm:block">
            Deep Learning Platform
          </span>
          <span className="text-ink-4 shrink-0 hidden sm:block">/</span>
          {editingName ? (
            <input
              ref={nameInputRef}
              value={canvasName}
              onChange={(e) => setCanvasName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape")
                  setEditingName(false);
              }}
              className="bg-inset border border-accent/60 rounded-md px-2 py-1 text-[13px] text-ink outline-none w-52"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="group flex items-center gap-1.5 min-w-0 text-[13px] text-ink-2 hover:text-ink transition-colors cursor-pointer"
            >
              <span className="truncate">{canvasName}</span>
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
              >
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <IconButton label="Undo" onClick={undo} disabled={past.length === 0}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 14L4 9l5-5" />
              <path d="M4 9h10a7 7 0 010 14h-1" />
            </svg>
          </IconButton>
          <IconButton label="Redo" onClick={redo} disabled={future.length === 0}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 14l5-5-5-5" />
              <path d="M20 9H10a7 7 0 000 14h1" />
            </svg>
          </IconButton>
          <IconButton
            label="Delete selected"
            onClick={handleDelete}
            disabled={!selectedNodeId && !selectedEdgeId}
            danger
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </IconButton>
          <div className="w-px h-4 bg-line mx-1.5" />
          <button
            onClick={handleRun}
            disabled={loading}
            className={`h-7 px-3 rounded-md text-white text-[12px] font-medium flex items-center gap-1.5 transition-colors ${
              loading
                ? "bg-accent/60 cursor-not-allowed"
                : "bg-accent hover:bg-accent-hover cursor-pointer"
            }`}
          >
            {loading ? (
              <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            )}
            {loading ? "Running" : "Run Pipeline"}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Icon rail */}
        <nav className="w-12 shrink-0 bg-app border-r border-line flex flex-col items-center py-2 gap-1">
          {RAIL_ITEMS.map((item) => {
            const active = sidebarOpen && activePanel === item.label;
            return (
              <button
                key={item.label}
                title={item.label}
                aria-label={item.label}
                onClick={() => {
                  if (activePanel === item.label && sidebarOpen) {
                    setSidebarOpen(false);
                    setActivePanel(null);
                  } else {
                    setActivePanel(item.label);
                    setSidebarOpen(true);
                  }
                }}
                className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-ink-3 hover:text-ink-2 hover:bg-elevated"
                }`}
              >
                {active && (
                  <span className="absolute -left-[6px] top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-accent" />
                )}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {item.svg}
                </svg>
              </button>
            );
          })}
        </nav>

        {/* Sidebar */}
        <div
          style={{ width: sidebarOpen ? SIDEBAR_WIDTH : 0 }}
          className={`shrink-0 flex flex-col overflow-hidden bg-panel transition-all duration-300 ease-out ${
            sidebarOpen ? "border-r border-line" : ""
          }`}
        >
          <div className="h-10 shrink-0 flex items-center justify-between pl-3 pr-2 border-b border-line-soft">
            <span className="text-[12px] font-semibold text-ink">
              {panelTitle}
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Collapse panel"
              className="h-6 w-6 rounded-md flex items-center justify-center text-ink-3 hover:text-ink hover:bg-elevated transition-colors cursor-pointer"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
          <div
            className="flex-1 overflow-hidden"
            style={{
              opacity: sidebarOpen ? 1 : 0,
              transition: "opacity 0.15s",
              pointerEvents: sidebarOpen ? "auto" : "none",
            }}
          >
            {activePanel === "Nodes" && <Sidebar nodeMetadata={nodeMetadata} />}
            {activePanel === "Runs" && <RunsPanel />}
            {activePanel === "History" && <HistoryPanel />}
            {activePanel === "Settings" && <SettingsPanel />}
          </div>
        </div>

        {/* Main canvas + output */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 relative overflow-hidden">
            <Canvas />
          </div>

          {outputOpen && (
            <ResizeHandle
              direction="ns"
              onMouseDown={(e) => startDrag("output", e)}
            />
          )}
          <div
            className={`shrink-0 bg-panel border-t border-line flex flex-col overflow-hidden ${
              isDragging === "output"
                ? ""
                : "transition-all duration-300 ease-out"
            }`}
            style={{ height: outputOpen ? outputHeight : 40 }}
          >
            <div className="h-10 shrink-0 flex items-center justify-between pl-3 pr-2 border-b border-line-soft">
              <span className="text-[12px] font-semibold text-ink">Output</span>
              <button
                onClick={() => setOutputOpen((v) => !v)}
                aria-label={outputOpen ? "Collapse output" : "Expand output"}
                className="h-6 w-6 rounded-md flex items-center justify-center text-ink-3 hover:text-ink hover:bg-elevated transition-colors cursor-pointer"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{
                    transform: outputOpen ? "rotate(0deg)" : "rotate(180deg)",
                    transition: "transform 0.2s",
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
            {outputOpen && (
              <div className="flex-1 overflow-hidden">
                <OutputPanel />
              </div>
            )}
          </div>
        </div>

        {configPanelOpen && (
          <ResizeHandle
            direction="ew"
            onMouseDown={(e) => startDrag("config", e)}
          />
        )}

        {/* Config panel */}
        <div
          className={`shrink-0 bg-panel border-l border-line flex flex-col overflow-hidden ${
            isDragging === "config"
              ? ""
              : "transition-all duration-300 ease-out"
          }`}
          style={{ width: configPanelOpen ? configWidth : 40 }}
        >
          <div className="h-10 shrink-0 flex items-center pl-2 pr-3 border-b border-line-soft">
            <button
              onClick={() => {
                const next = !configPanelOpen;
                setConfigOpen(next);
                if (!next) setSelectedNode(null);
              }}
              aria-label={configPanelOpen ? "Collapse" : "Expand config"}
              className="h-6 w-6 rounded-md flex items-center justify-center text-ink-3 hover:text-ink hover:bg-elevated transition-colors cursor-pointer shrink-0"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{
                  transform: configPanelOpen
                    ? "rotate(0deg)"
                    : "rotate(180deg)",
                  transition: "transform 0.2s",
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            {configPanelOpen && (
              <span className="text-[12px] font-semibold text-ink ml-1.5 flex-1 min-w-0 truncate">
                Configuration
              </span>
            )}
          </div>
          {configPanelOpen ? (
            <div className="flex-1 overflow-y-auto">
              <ConfigPanel nodeMetadata={nodeMetadata} />
            </div>
          ) : (
            <div className="flex-1 flex items-start justify-center overflow-hidden pt-4">
              <span
                className="text-[11px] text-ink-4 font-medium whitespace-nowrap tracking-wide"
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                }}
              >
                Configuration
              </span>
            </div>
          )}
        </div>
      </div>

      <Toast />
    </div>
  );
}
