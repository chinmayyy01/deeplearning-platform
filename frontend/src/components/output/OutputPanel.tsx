"use client";
import { useMemo } from "react";
import { useOutputStore, type SavedRun } from "@/store/outputStore";
import {
  getMetricCards,
  getTaskType,
  getConfusionMatrixData,
  isLowerBetterMetric,
  resolvePipelineStatus,
  statusLabel,
} from "@/lib/resultAnalytics";
import TrainingSummaryCard from "./TrainingSummaryCard";
import GeneratedCodePanel from "./GeneratedCodePanel";
import ValidationErrorBanner from "./ValidationErrorBanner";
import MlVisualizations from "./MlVisualizations";
import PredictionsPreviewTable from "./PredictionsPreviewTable";
import CompareLossCurves from "./CompareLossCurves";
import ConfusionMatrixHeatmap from "./charts/ConfusionMatrixHeatmap";

const tabs = [
  { id: "results", label: "Results" },
  { id: "code", label: "Code" },
  { id: "compare", label: "Compare" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const formatMetricValue = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number")
    return Number.isFinite(value) ? value.toFixed(4) : String(value);
  return String(value);
};

const formatCellValue = (value: unknown) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number")
    return Number.isFinite(value) ? value.toFixed(4) : String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const cardClass = "rounded-lg border border-line bg-elevated";

const SectionHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <div className="flex items-baseline gap-2.5">
    <h3 className="text-[12.5px] font-semibold text-ink">{title}</h3>
    {subtitle && <p className="text-[11.5px] text-ink-3">{subtitle}</p>}
  </div>
);

const MetricCard = ({
  label,
  value,
}: {
  label: string;
  value: number | string | null;
}) => (
  <div className={`${cardClass} px-4 py-3 flex flex-col gap-1`}>
    <span className="text-[11px] text-ink-3 font-medium">{label}</span>
    <span className="text-[19px] font-semibold text-ink tabular-nums tracking-[-0.01em]">
      {formatMetricValue(value)}
    </span>
  </div>
);

const StatusBar = ({
  pipelineStatus,
  executionTime,
}: {
  pipelineStatus: ReturnType<typeof resolvePipelineStatus>;
  executionTime?: number;
}) => {
  const styles: Record<string, string> = {
    running: "border-accent/40 bg-accent-soft text-[#a9b1f5]",
    success: "border-success/35 bg-success-soft text-[#7ee08d]",
    failed: "border-danger/35 bg-danger-soft text-[#f5949c]",
    idle: "border-line bg-panel text-ink-3",
  };

  return (
    <div className={`${cardClass} flex flex-wrap items-center justify-between gap-3 px-4 py-3`}>
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium rounded-full px-2.5 py-0.5 border ${styles[pipelineStatus]}`}
        >
          {pipelineStatus === "running" && (
            <span className="h-2.5 w-2.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          )}
          {statusLabel[pipelineStatus]}
        </span>
      </div>
      <span className="text-[11.5px] text-ink-3">
        Execution time
        <span className="text-ink-2 font-medium ml-1.5 tabular-nums">
          {executionTime != null ? `${executionTime.toFixed(3)}s` : "—"}
        </span>
      </span>
    </div>
  );
};

const EmptySection = ({ message }: { message: string }) => (
  <div className={`${cardClass} px-4 py-3.5 text-[12px] text-ink-3`}>
    {message}
  </div>
);

const ResultsTab = () => {
  const { latestResult, loading, error } = useOutputStore();
  const output = latestResult?.output;
  const runMetadata = latestResult?.runMetadata;
  const pipelineStatus = resolvePipelineStatus(
    loading,
    error,
    latestResult?.status,
  );
  const metricCards = useMemo(() => getMetricCards(output), [output]);
  const taskType = getTaskType(output);
  const confusionMatrix = getConfusionMatrixData(output);
  const hasResult = Boolean(latestResult && !error && !loading);

  const vizTitle =
    output?.loss_history?.length
      ? "Training loss curve"
      : taskType === "classification"
        ? "Classification visualizations"
        : taskType === "regression"
          ? "Regression visualizations"
          : "Model visualizations";

  return (
    <div className="space-y-6">
      <StatusBar
        pipelineStatus={pipelineStatus}
        executionTime={latestResult?.execution_time}
      />

      {pipelineStatus === "failed" && <ValidationErrorBanner />}

      {pipelineStatus === "idle" && (
        <EmptySection message="Build a pipeline on the canvas and run it to see metrics, visualizations, and predictions here." />
      )}

      {pipelineStatus === "running" && (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-elevated border border-line" />
            ))}
          </div>
          <div className="h-32 rounded-lg bg-elevated border border-line" />
          <div className="h-40 rounded-lg bg-elevated border border-line" />
        </div>
      )}

      <section>
        <SectionHeader
          title="Metrics"
          subtitle={
            hasResult
              ? taskType === "classification"
                ? "Classification performance"
                : taskType === "regression"
                  ? "Regression performance"
                  : "Model performance"
              : "Awaiting execution"
          }
        />
        <div className="mt-3">
          {hasResult && metricCards.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {metricCards.map(({ key, label, value }) => (
                <MetricCard
                  key={key}
                  label={label}
                  value={value as number | string | null}
                />
              ))}
            </div>
          ) : (
            <EmptySection
              message={
                pipelineStatus === "failed"
                  ? "Metrics unavailable due to pipeline failure."
                  : "Metrics will populate after a successful run."
              }
            />
          )}
        </div>
      </section>

      {taskType === "classification" && (
        <section>
          <SectionHeader
            title="Confusion Matrix"
            subtitle={
              confusionMatrix
                ? "Classification error breakdown"
                : "Requires actual labels in pipeline output"
            }
          />
          <div className="mt-3">
            {hasResult && confusionMatrix ? (
              <div className={`${cardClass} px-4 py-4`}>
                <ConfusionMatrixHeatmap data={confusionMatrix} />
              </div>
            ) : (
              <EmptySection
                message={
                  hasResult
                    ? "Confusion matrix will render when actual and predicted labels are available."
                    : "Confusion matrix appears for classification tasks after execution."
                }
              />
            )}
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          title="Training Summary"
          subtitle="Model and hyperparameter configuration"
        />
        <div className="mt-3">
          <TrainingSummaryCard output={output} runMetadata={runMetadata} />
        </div>
      </section>

      <section>
        <SectionHeader title="Visualizations" subtitle={vizTitle} />
        <div className={`mt-3 ${cardClass} px-4 py-4`}>
          {hasResult ? (
            <MlVisualizations output={output} />
          ) : (
            <EmptySection message="Loss curves, distribution charts, and regression plots appear here based on model type." />
          )}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Predictions Preview"
          subtitle="Sample model outputs on test data"
        />
        <div className="mt-3">
          {hasResult ? (
            <PredictionsPreviewTable output={output} />
          ) : (
            <EmptySection message="First predictions will be shown in a table with actual and predicted values when available." />
          )}
        </div>
      </section>
    </div>
  );
};

const CompareRunsTab = () => {
  const { savedRuns, selectedCompareIds, toggleCompareRun } = useOutputStore();
  const selectedRuns = savedRuns.filter((r) =>
    selectedCompareIds.includes(r.id),
  );
  const bestMetrics = useMemo(() => {
    const best: Record<string, number> = {};
    selectedRuns.forEach((run) =>
      Object.entries(run.metrics).forEach(([m, v]) => {
        if (typeof v !== "number" || !Number.isFinite(v)) return;
        const current = best[m];
        const isBetter =
          current === undefined ||
          (isLowerBetterMetric(m) ? v < current : v > current);
        if (isBetter) best[m] = v;
      }),
    );
    return best;
  }, [selectedRuns]);

  if (!savedRuns.length) {
    return (
      <EmptySection message="Run history is empty. Execute a pipeline to automatically track experiments here." />
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Run History"
        subtitle="Select runs to compare metrics and training curves"
      />
      <div className={`overflow-x-auto ${cardClass}`}>
        <table className="w-full text-left text-[12px]">
          <thead className="text-ink-3 border-b border-line">
            <tr>
              <th className="px-3 py-2.5 font-medium w-10" />
              <th className="px-3 py-2.5 font-medium">Dataset</th>
              <th className="px-3 py-2.5 font-medium">Model</th>
              <th className="px-3 py-2.5 font-medium">Accuracy</th>
              <th className="px-3 py-2.5 font-medium">Loss</th>
              <th className="px-3 py-2.5 font-medium">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {savedRuns.map((run) => (
              <tr key={run.id} className="text-ink-2">
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selectedCompareIds.includes(run.id)}
                    onChange={() => toggleCompareRun(run.id)}
                    className="accent-accent cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2.5 capitalize">{run.dataset}</td>
                <td className="px-3 py-2.5 capitalize text-ink">
                  {run.modelName}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {formatMetricValue(run.metrics.accuracy)}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {formatMetricValue(run.metrics.loss)}
                </td>
                <td className="px-3 py-2.5 text-ink-3">
                  {new Date(run.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRuns.length > 0 && (
        <>
          <CompareLossCurves runs={selectedRuns} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {selectedRuns.map((run) => (
              <RunCompareCard
                key={run.id}
                run={run}
                bestMetrics={bestMetrics}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const RunCompareCard = ({
  run,
  bestMetrics,
}: {
  run: SavedRun;
  bestMetrics: Record<string, number>;
}) => (
  <div className={`${cardClass} p-4`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[14px] font-semibold text-ink capitalize">
          {run.modelName}
        </p>
        <p className="text-[11.5px] text-ink-3 capitalize mt-0.5">
          {run.dataset} · {run.taskType}
        </p>
      </div>
      <div className="text-right text-[11px] text-ink-3 shrink-0">
        <p>{new Date(run.timestamp).toLocaleString()}</p>
        <p className="text-ink-2 font-medium mt-0.5 tabular-nums">
          {run.executionTime.toFixed(3)}s
        </p>
      </div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2">
      {Object.entries(run.metrics).map(([metric, value]) => {
        const highlight =
          typeof value === "number" &&
          Number.isFinite(value) &&
          bestMetrics[metric] === value;
        return (
          <div
            key={metric}
            className={`rounded-md border px-3 py-2 ${
              highlight
                ? "border-success/35 bg-success-soft"
                : "border-line bg-panel"
            }`}
          >
            <p className="text-ink-3 text-[10.5px] capitalize">{metric}</p>
            <p
              className={`text-[13px] font-semibold mt-0.5 tabular-nums ${
                highlight ? "text-[#7ee08d]" : "text-ink"
              }`}
            >
              {formatMetricValue(value)}
            </p>
          </div>
        );
      })}
    </div>
    <div className="mt-4 space-y-1.5 text-[11.5px]">
      {Object.entries(run.configUsed)
        .slice(0, 6)
        .map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4">
            <span className="text-ink-3 truncate">{k}</span>
            <span className="text-ink-2 truncate">{formatCellValue(v)}</span>
          </div>
        ))}
    </div>
  </div>
);

export default function OutputPanel() {
  const { activeTab, setActiveTab, latestResult, error } = useOutputStore();

  return (
    <div className="w-full h-full px-5 py-4 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-inset p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`px-3 h-7 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-elevated text-ink shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                  : "text-ink-3 hover:text-ink-2"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {activeTab === "results" && <ResultsTab />}
      {activeTab === "code" && (
        <GeneratedCodePanel code={latestResult?.generated_code ?? ""} />
      )}
      {activeTab === "compare" && <CompareRunsTab />}
      {error && activeTab === "code" && (
        <div className="mt-4">
          <ValidationErrorBanner />
        </div>
      )}
    </div>
  );
}
