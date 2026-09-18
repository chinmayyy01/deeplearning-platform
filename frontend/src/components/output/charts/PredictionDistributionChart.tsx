"use client";

import { maxOf, minOf } from "@/lib/numeric";

type PredictionDistributionChartProps = {
  values: number[];
};

export default function PredictionDistributionChart({
  values,
}: PredictionDistributionChartProps) {
  if (!values.length) return null;

  const bins = 8;
  const min = minOf(values);
  const max = maxOf(values);
  const range = max - min || 1;
  const counts = Array(bins).fill(0);
  values.forEach((v) => {
    const idx = Math.min(bins - 1, Math.floor(((v - min) / range) * bins));
    counts[idx] += 1;
  });
  const maxCount = Math.max(maxOf(counts), 1);
  const barWidth = 28;
  const gap = 6;
  const chartHeight = 100;
  const width = bins * (barWidth + gap) + 32;
  const height = chartHeight + 40;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[200px]">
      {counts.map((count, i) => {
        const barH = (count / maxCount) * chartHeight;
        const x = 24 + i * (barWidth + gap);
        const y = chartHeight - barH + 8;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barH}
            rx={3}
            fill="#7c86e8"
            opacity={0.8}
          />
        );
      })}
      <text
        x={width / 2}
        y={height - 6}
        textAnchor="middle"
        fill="var(--color-ink-3)"
        fontSize={10}
      >
        Prediction Value
      </text>
    </svg>
  );
}
