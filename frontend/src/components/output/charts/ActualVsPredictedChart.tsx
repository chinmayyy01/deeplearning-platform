"use client";

import { maxOf, minOf } from "@/lib/numeric";

type Point = { actual: number; predicted: number };

type ActualVsPredictedChartProps = {
  points: Point[];
};

export default function ActualVsPredictedChart({
  points,
}: ActualVsPredictedChartProps) {
  if (!points.length) return null;

  const width = 320;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 36, left: 44 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const allValues = points.flatMap((p) => [p.actual, p.predicted]);
  const min = minOf(allValues);
  const max = maxOf(allValues);
  const range = max - min || 1;

  const scale = (v: number) => pad.top + chartH - ((v - min) / range) * chartH;
  const scaleX = (v: number) => pad.left + ((v - min) / range) * chartW;

  const diagonal = `M ${scaleX(min)} ${scale(min)} L ${scaleX(max)} ${scale(max)}`;

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
      <path
        d={diagonal}
        stroke="rgba(255,255,255,0.2)"
        strokeDasharray="4 4"
        fill="none"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={scaleX(p.actual)}
          cy={scale(p.predicted)}
          r={3.5}
          fill="#52b06b"
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
        Actual
      </text>
      <text
        x={14}
        y={height / 2}
        textAnchor="middle"
        fill="var(--color-ink-3)"
        fontSize={10}
        transform={`rotate(-90 14 ${height / 2})`}
      >
        Predicted
      </text>
    </svg>
  );
}
