"use client";

import { maxOf, minOf } from "@/lib/numeric";

type Point = { actual: number; predicted: number };

type ResidualPlotChartProps = {
  points: Point[];
};

export default function ResidualPlotChart({ points }: ResidualPlotChartProps) {
  if (!points.length) return null;

  const residuals = points.map((p) => p.actual - p.predicted);
  const width = 320;
  const height = 200;
  const pad = { top: 16, right: 16, bottom: 36, left: 44 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const predMin = minOf(points.map((p) => p.predicted));
  const predMax = maxOf(points.map((p) => p.predicted));
  const predRange = predMax - predMin || 1;
  const resMin = minOf(residuals);
  const resMax = maxOf(residuals);
  const resRange = resMax - resMin || 1;

  const scaleX = (v: number) =>
    pad.left + ((v - predMin) / predRange) * chartW;
  const scaleY = (v: number) =>
    pad.top + chartH - ((v - resMin) / resRange) * chartH;
  const zeroY = scaleY(0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[240px]">
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
      {zeroY >= pad.top && zeroY <= pad.top + chartH && (
        <line
          x1={pad.left}
          y1={zeroY}
          x2={width - pad.right}
          y2={zeroY}
          stroke="rgba(255,255,255,0.2)"
          strokeDasharray="4 4"
        />
      )}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={scaleX(p.predicted)}
          cy={scaleY(p.actual - p.predicted)}
          r={3.5}
          fill="#d3a04d"
          opacity={0.85}
        />
      ))}
      <text
        x={width / 2}
        y={height - 8}
        textAnchor="middle"
        fill="var(--color-ink-3)"
        fontSize={10}
      >
        Predicted
      </text>
      <text
        x={14}
        y={height / 2}
        textAnchor="middle"
        fill="var(--color-ink-3)"
        fontSize={10}
        transform={`rotate(-90 14 ${height / 2})`}
      >
        Residual
      </text>
    </svg>
  );
}
