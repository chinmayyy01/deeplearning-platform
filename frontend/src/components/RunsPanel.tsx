"use client";
import { useOutputStore } from "@/store/outputStore";

const fmtNum = (v: number | string | null | undefined) => {
  if (v == null) return "-";
  if (typeof v === "number")
    return Number.isFinite(v) ? v.toFixed(3) : String(v);
  return String(v);
};

export default function RunsPanel() {
  const { savedRuns, selectedCompareIds, toggleCompareRun } = useOutputStore();

  if (!savedRuns.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
        <div className="w-10 h-10 rounded-lg bg-elevated border border-line flex items-center justify-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-ink-3)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          >
            <polygon points="6 4 19 12 6 20 6 4" />
          </svg>
        </div>
        <p className="text-[12.5px] text-ink-2">No runs yet</p>
        <p className="text-[11.5px] text-ink-3 max-w-[190px]">
          Run a pipeline to track its metrics and training curves here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 shrink-0">
        <p className="text-[11px] text-ink-3">
          {savedRuns.length} run{savedRuns.length !== 1 ? "s" : ""} · select to
          compare
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5">
        {savedRuns.map((run) => {
          const selected = selectedCompareIds.includes(run.id);
          const metrics = Object.entries(run.metrics).slice(0, 2);
          return (
            <button
              key={run.id}
              onClick={() => toggleCompareRun(run.id)}
              className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                selected
                  ? "border-accent/60 bg-accent-soft"
                  : "border-line bg-elevated hover:border-line-strong hover:bg-hover"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[12.5px] font-medium text-ink truncate">
                  {run.modelName}
                </span>
                <span
                  className={`shrink-0 w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    selected
                      ? "border-accent bg-accent"
                      : "border-ink-4 bg-transparent"
                  }`}
                >
                  {selected && (
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-ink-3">
                <span className="capitalize">{run.taskType}</span>
                <span className="text-ink-4">·</span>
                <span>{run.executionTime.toFixed(2)}s</span>
                {run.dataset && (
                  <>
                    <span className="text-ink-4">·</span>
                    <span className="truncate">{run.dataset}</span>
                  </>
                )}
              </div>
              {metrics.length > 0 && (
                <div className="flex items-center gap-3 mt-1.5">
                  {metrics.map(([k, v]) => (
                    <div key={k} className="flex items-baseline gap-1">
                      <span className="text-[10.5px] text-ink-4 uppercase tracking-wider">
                        {k}
                      </span>
                      <span className="text-[11px] font-medium text-ink-2">
                        {fmtNum(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10.5px] text-ink-4 mt-1.5">
                {new Date(run.timestamp).toLocaleString()}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
