"use client";

import { maxOf } from "@/lib/numeric";

type ClassDistributionChartProps = {
  data: Array<{ label: string; count: number }>;
  title?: string;
};

export default function ClassDistributionChart({
  data,
  title = "Class Distribution",
}: ClassDistributionChartProps) {
  if (!data.length) return null;
  const max = Math.max(maxOf(data.map((d) => d.count)), 1);
  const barWidth = 28;
  const gap = 12;
  const chartHeight = 120;
  const width = data.length * (barWidth + gap) + 40;
  const height = chartHeight + 48;

  return (
    <div>
      <p className="text-[11px] text-ink-3 mb-2">{title}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[200px]">
        {data.map((item, i) => {
          const barH = (item.count / max) * chartHeight;
          const x = 32 + i * (barWidth + gap);
          const y = chartHeight - barH + 8;
          return (
            <g key={item.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={4}
                fill="#7c86e8"
                opacity={0.85}
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight + 22}
                textAnchor="middle"
                fill="rgba(255,255,255,0.5)"
                fontSize={9}
              >
                {item.label}
              </text>
              <text
                x={x + barWidth / 2}
                y={y - 4}
                textAnchor="middle"
                fill="var(--color-ink-2)"
                fontSize={9}
              >
                {item.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
