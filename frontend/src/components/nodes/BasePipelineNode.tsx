"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getNodePresentation, getConfigSummary } from "@/lib/nodePresentation";
import { useSettingsStore } from "@/store/settingsStore";

type PipelineNodeData = {
  label?: string;
  config?: Record<string, unknown>;
  hasError?: boolean;
};

export default function BasePipelineNode({ type, data, selected }: NodeProps) {
  const nodeType = type ?? "generic";
  const nodeData = (data ?? {}) as PipelineNodeData;
  const presentation = getNodePresentation(nodeType);
  const summary = getConfigSummary(nodeType, nodeData.config ?? {});
  const showNodeLabels = useSettingsStore(
    (state) => state.settings.showNodeLabels,
  );
  const showNodeSummaries = useSettingsStore(
    (state) => state.settings.showNodeSummaries,
  );
  const hasError = Boolean(nodeData.hasError);
  const hasInputs = nodeType !== "dataset";
  const hasOutputs = nodeType !== "model" && nodeType !== "neural_network";

  const borderClass = hasError
    ? "border-danger/70 ring-1 ring-danger/25"
    : selected
      ? "border-accent ring-1 ring-accent/35"
      : "border-line hover:border-line-strong";

  return (
    <div
      className={`group relative w-[200px] rounded-lg border bg-elevated px-3 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.03),0_4px_12px_rgba(0,0,0,0.25)] transition-all ${borderClass}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 right-3 top-0 h-px opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent, ${presentation.color}, transparent)`,
        }}
      />

      {hasInputs && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: presentation.color,
            width: 9,
            height: 9,
            border: "2px solid var(--color-elevated)",
          }}
        />
      )}

      <div
        className={`flex items-center gap-2.5 ${showNodeLabels ? "" : "justify-center"}`}
      >
        <div
          className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0"
          style={{
            background: `${presentation.color}1f`,
            color: presentation.color,
          }}
        >
          {presentation.icon === "neural"
            ? "NN"
            : presentation.label.charAt(0)}
        </div>
        {showNodeLabels && (
          <span className="text-[12.5px] font-medium text-ink truncate">
            {presentation.label}
          </span>
        )}
      </div>

      {showNodeSummaries && (
        <p className="mt-1.5 text-[11px] leading-snug text-ink-3 truncate">
          {summary ?? presentation.desc}
        </p>
      )}

      {hasError && (
        <p className="mt-1.5 text-[11px] font-medium text-danger">
          Validation error
        </p>
      )}

      {hasOutputs && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: presentation.color,
            width: 9,
            height: 9,
            border: "2px solid var(--color-elevated)",
          }}
        />
      )}
    </div>
  );
}
