"use client";
import type { SavedRun } from "@/store/outputStore";
import { maxOf, minOf } from "@/lib/numeric";

const COLORS = ["#7c86e8", "#4bb3a3", "#d3a04d", "#d170a6"];

type CompareLossCurvesProps = {
  runs: SavedRun[];
};

export default function CompareLossCurves({ runs }: CompareLossCurvesProps) {
  const withHistory = runs.filter((r) => r.lossHistory && r.lossHistory.length > 0);
  if (withHistory.length < 2) return null;

  const maxEpochs = maxOf(withHistory.map((r) => r.lossHistory!.length));
  const allLosses = withHistory.flatMap((r) => r.lossHistory!);
  const minLoss = minOf(allLosses);
  const maxLoss = maxOf(allLosses);
  const yRange = maxLoss - minLoss || 1;

  const width = 640;
  const height = 220;
  const pad = { top: 20, right: 16, bottom: 32, left: 48 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const paths = withHistory.map((run, runIndex) => {
    const history = run.lossHistory!;
    const points = history.map((loss, i) => {
      const x =
        pad.left +
        (maxEpochs === 1 ? chartW / 2 : (i / (maxEpochs - 1)) * chartW);
      const y = pad.top + chartH - ((loss - minLoss) / yRange) * chartH;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    });
    return { id: run.id, label: run.modelName, d: points.join(" "), color: COLORS[runIndex % COLORS.length] };
  });

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] font-semibold text-ink">
        Training Curve Comparison
      </p>
      <div className="rounded-lg border border-line bg-elevated px-4 py-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[280px]">
          <line
            x1={pad.left}
            y1={pad.top + chartH}
            x2={width - pad.right}
            y2={pad.top + chartH}
            stroke="rgba(255,255,255,0.12)"
          />
          <line
            x1={pad.left}
            y1={pad.top}
            x2={pad.left}
            y2={pad.top + chartH}
            stroke="rgba(255,255,255,0.12)"
          />
          {paths.map((p) => (
            <path
              key={p.id}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
          <text
            x={width / 2}
            y={height - 6}
            textAnchor="middle"
            fill="var(--color-ink-3)"
            fontSize={10}
          >
            Epoch
          </text>
        </svg>
        <div className="flex flex-wrap gap-3 mt-2">
          {paths.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 text-[11px] text-ink-2"
            >
              <span
                className="w-3 h-0.5 rounded"
                style={{ background: p.color }}
              />
              {p.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
