"use client";
import { useState } from "react";
import { usePipelineStore } from "@/store/pipelineStore";
import { useToastStore } from "@/store/toastStore";

type SavedPipeline = {
  id: string;
  name: string;
  savedAt: string;
  nodeCount: number;
  edgeCount: number;
  nodes: unknown[];
  edges: unknown[];
};

const STORAGE_KEY = "ml_saved_pipelines";

const loadPipelines = (): SavedPipeline[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as SavedPipeline[]) : [];
  } catch {
    return [];
  }
};

const savePipelines = (pipelines: SavedPipeline[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pipelines));
};

export default function HistoryPanel() {
  const { nodes, edges } = usePipelineStore();
  const addToast = useToastStore((s) => s.addToast);
  const [pipelines, setPipelines] = useState<SavedPipeline[]>(() =>
    loadPipelines(),
  );
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    const pipeline: SavedPipeline = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: name.trim(),
      savedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes,
      edges,
    };
    const updated = [pipeline, ...pipelines];
    savePipelines(updated);
    setPipelines(updated);
    setName("");
    setSaving(false);
    addToast("Pipeline saved!");
  };

  const handleLoad = (pipeline: SavedPipeline) => {
    usePipelineStore.setState({
      nodes: pipeline.nodes as never,
      edges: pipeline.edges as never,
      past: [],
      future: [],
    });
    addToast(`Loaded "${pipeline.name}"`);
  };

  const handleDelete = (id: string) => {
    const updated = pipelines.filter((p) => p.id !== id);
    savePipelines(updated);
    setPipelines(updated);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2.5 shrink-0">
        {saving ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setSaving(false);
              }}
              placeholder="Pipeline name..."
              className="flex-1 min-w-0 bg-inset border border-line rounded-md px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent/70 transition-colors placeholder:text-ink-4"
            />
            <button
              onClick={handleSave}
              className="text-[11px] px-2.5 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-white font-medium transition-colors cursor-pointer"
            >
              Save
            </button>
            <button
              onClick={() => setSaving(false)}
              className="text-[11px] px-2.5 py-1.5 rounded-md border border-line text-ink-2 hover:text-ink hover:bg-elevated transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (nodes.length === 0) {
                addToast("Canvas is empty", "error");
                return;
              }
              setSaving(true);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-line text-[11.5px] text-ink-2 hover:text-ink hover:bg-elevated transition-colors cursor-pointer"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            >
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save current pipeline
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5">
        {pipelines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div className="w-10 h-10 rounded-lg bg-elevated border border-line flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-ink-3)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-[12.5px] text-ink-2">No saved pipelines</p>
            <p className="text-[11.5px] text-ink-3 max-w-[190px]">
              Save your current canvas to reload it later.
            </p>
          </div>
        ) : (
          pipelines.map((p) => (
            <div
              key={p.id}
              className="group rounded-lg border border-line bg-elevated hover:border-line-strong hover:bg-hover transition-colors px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-medium text-ink truncate">
                  {p.name}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => handleLoad(p)}
                    className="text-[10.5px] px-2 py-0.5 rounded border border-line text-ink-2 hover:text-ink hover:bg-panel transition-colors cursor-pointer"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-[10.5px] px-2 py-0.5 rounded border border-danger/30 text-danger/80 hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-ink-3 mt-1">
                <span>{p.nodeCount} nodes</span>
                <span className="text-ink-4">·</span>
                <span>{p.edgeCount} edges</span>
                <span className="text-ink-4">·</span>
                <span>{new Date(p.savedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
