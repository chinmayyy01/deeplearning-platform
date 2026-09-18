"use client";
import { buildPredictionRows } from "@/lib/resultAnalytics";
import type { PipelineOutput } from "@/store/outputStore";

const formatCell = (value: string | null) => value ?? "—";

type PredictionsPreviewTableProps = {
  output?: PipelineOutput;
};

export default function PredictionsPreviewTable({
  output,
}: PredictionsPreviewTableProps) {
  const rows = buildPredictionRows(output);
  const hasActual = rows.some((r) => r.actual !== null);

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-line bg-elevated px-4 py-3.5 text-[12px] text-ink-3">
        Predictions preview will appear after execution.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-elevated">
      <div className="max-h-52 overflow-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-panel text-ink-3 sticky top-0">
            <tr>
              <th className="px-3 py-2.5 font-medium">#</th>
              {hasActual && (
                <th className="px-3 py-2.5 font-medium">Actual</th>
              )}
              <th className="px-3 py-2.5 font-medium">Predicted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {rows.map((row) => (
              <tr key={row.index} className="text-ink-2">
                <td className="px-3 py-2 text-ink-4 tabular-nums">
                  {row.index}
                </td>
                {hasActual && (
                  <td className="px-3 py-2 tabular-nums">
                    {formatCell(row.actual)}
                  </td>
                )}
                <td className="px-3 py-2 tabular-nums">
                  {formatCell(row.predicted)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
