"use client";

import { maxOf, minOf } from "@/lib/numeric";

type LossCurveChartProps = {
  lossHistory: number[];
};

export default function LossCurveChart({ lossHistory }: LossCurveChartProps) {
  if (!lossHistory.length) return null;

  const width = 640;
  const height = 200;
  const padding = { top: 16, right: 16, bottom: 32, left: 48 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minLoss = minOf(lossHistory);
  const maxLoss = maxOf(lossHistory);
  const yRange = maxLoss - minLoss || 1;

  const points = lossHistory.map((loss, i) => {
    const x =
      padding.left +
      (lossHistory.length === 1 ? chartW / 2 : (i / (lossHistory.length - 1)) * chartW);
    const y = padding.top + chartH - ((loss - minLoss) / yRange) * chartH;
    return { x, y, loss, epoch: i + 1 };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const yTicks = [minLoss, minLoss + yRange / 2, maxLoss];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[320px] max-w-full"
        role="img"
        aria-label="Training loss curve"
      >
        <rect x={0} y={0} width={width} height={height} fill="transparent" />
        {yTicks.map((tick, i) => {
          const y = padding.top + chartH - ((tick - minLoss) / yRange) * chartH;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.35)"
                fontSize={10}
              >
                {tick.toFixed(3)}
              </text>
            </g>
          );
        })}
        <line
          x1={padding.left}
          y1={padding.top + chartH}
          x2={width - padding.right}
          y2={padding.top + chartH}
          stroke="rgba(255,255,255,0.15)"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartH}
          stroke="rgba(255,255,255,0.15)"
        />
        <text
          x={width / 2}
          y={height - 6}
          textAnchor="middle"
          fill="var(--color-ink-3)"
          fontSize={10}
        >
          Epoch
        </text>
        <text
          x={12}
          y={height / 2}
          textAnchor="middle"
          fill="var(--color-ink-3)"
          fontSize={10}
          transform={`rotate(-90 12 ${height / 2})`}
        >
          Loss
        </text>
        <path
          d={linePath}
          fill="none"
          stroke="#7c86e8"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p) => (
          <circle key={p.epoch} cx={p.x} cy={p.y} r={3} fill="#5e6ad2" />
        ))}
      </svg>
    </div>
  );
}
