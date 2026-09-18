"use client";
import { usePipelineStore } from "@/store/pipelineStore";
import { useOutputStore } from "@/store/outputStore";

export default function ValidationErrorBanner() {
  const { error, errorNodeId, errorNodeType } = useOutputStore();
  const nodes = usePipelineStore((state) => state.nodes);

  if (!error) return null;

  const errorNode = errorNodeId
    ? nodes.find((n) => n.id === errorNodeId)
    : null;
  const nodeLabel =
    (errorNode?.data as { label?: string } | undefined)?.label ??
    errorNodeId ??
    "Unknown node";
  const nodeTypeLabel = errorNodeType ?? errorNode?.type ?? "unknown";

  const title = errorNodeId
    ? "Pipeline execution failed"
    : error.toLowerCase().includes("backend")
      ? "Backend connection error"
      : "Pipeline error";

  return (
    <div className="rounded-lg border border-danger/35 bg-danger-soft px-4 py-3 space-y-2">
      <div className="flex items-start gap-2.5">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-danger)"
          strokeWidth="2"
          strokeLinecap="round"
          className="shrink-0 mt-0.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-danger">{title}</p>
          <p className="text-[12px] text-[#f2a6ad] mt-1 break-words">{error}</p>
        </div>
      </div>
      {(errorNodeId || errorNodeType) && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-danger/30 bg-danger/10 px-2.5 py-0.5 text-[#f2a6ad]">
            Node: {nodeLabel}
          </span>
          <span className="rounded-full border border-danger/30 bg-danger/10 px-2.5 py-0.5 text-[#f2a6ad] capitalize">
            Type: {nodeTypeLabel.replace(/_/g, " ")}
          </span>
        </div>
      )}
    </div>
  );
}
