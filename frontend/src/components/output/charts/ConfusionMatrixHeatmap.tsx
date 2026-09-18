"use client";
import type { ConfusionMatrixData } from "@/lib/resultAnalytics";
import { maxOf } from "@/lib/numeric";

type ConfusionMatrixHeatmapProps = {
  data: ConfusionMatrixData;
};

export default function ConfusionMatrixHeatmap({
  data,
}: ConfusionMatrixHeatmapProps) {
  const { labels, matrix } = data;
  const max = Math.max(maxOf(matrix.flat()), 1);
  const cellSize = 36;
  const labelPad = 48;
  const width = labelPad + labels.length * cellSize + 16;
  const height = labelPad + labels.length * cellSize + 24;

  const colorFor = (value: number) => {
    const t = value / max;
    const r = Math.round(24 + t * (124 - 24));
    const g = Math.round(24 + t * (134 - 24));
    const b = Math.round(34 + t * (232 - 34));
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[240px]">
        <text
          x={labelPad + (labels.length * cellSize) / 2}
          y={14}
          textAnchor="middle"
          fill="var(--color-ink-3)"
          fontSize={10}
        >
          Predicted
        </text>
        <text
          x={12}
          y={labelPad + (labels.length * cellSize) / 2}
          textAnchor="middle"
          fill="var(--color-ink-3)"
          fontSize={10}
          transform={`rotate(-90 12 ${labelPad + (labels.length * cellSize) / 2})`}
        >
          Actual
        </text>
        {labels.map((label, col) => (
          <text
            key={`col-${label}`}
            x={labelPad + col * cellSize + cellSize / 2}
            y={labelPad - 8}
            textAnchor="middle"
            fill="var(--color-ink-2)"
            fontSize={9}
          >
            {label}
          </text>
        ))}
        {labels.map((label, row) => (
          <text
            key={`row-${label}`}
            x={labelPad - 8}
            y={labelPad + row * cellSize + cellSize / 2 + 3}
            textAnchor="end"
            fill="var(--color-ink-2)"
            fontSize={9}
          >
            {label}
          </text>
        ))}
        {matrix.map((row, ri) =>
          row.map((value, ci) => (
            <g key={`${ri}-${ci}`}>
              <rect
                x={labelPad + ci * cellSize}
                y={labelPad + ri * cellSize}
                width={cellSize - 2}
                height={cellSize - 2}
                rx={4}
                fill={colorFor(value)}
                stroke="rgba(255,255,255,0.08)"
              />
              <text
                x={labelPad + ci * cellSize + cellSize / 2}
                y={labelPad + ri * cellSize + cellSize / 2 + 4}
                textAnchor="middle"
                fill="white"
                fontSize={10}
                fontWeight={600}
              >
                {value}
              </text>
            </g>
          )),
        )}
      </svg>
    </div>
  );
}
