import type { PipelineOutput } from "@/store/outputStore";

export type TaskType = "classification" | "regression" | "unknown";

export type MetricEntry = {
  key: string;
  label: string;
  value: number | string | null;
};

export type PredictionRow = {
  index: number;
  actual: string | null;
  predicted: string;
};

export type ConfusionMatrixData = {
  labels: string[];
  matrix: number[][];
};

export const getTaskType = (output?: PipelineOutput): TaskType => {
  const task = output?.run_summary?.task_type;
  if (task === "classification" || task === "regression") return task;
  const metrics = output?.metrics ?? {};
  if (metrics.accuracy !== undefined) return "classification";
  if (
    metrics.mse !== undefined ||
    metrics.r2_score !== undefined ||
    metrics.rmse !== undefined
  )
    return "regression";
  if (output?.loss_history?.length) return "classification";
  return "unknown";
};

export const getMetricCards = (output?: PipelineOutput): MetricEntry[] => {
  const metrics = output?.metrics ?? {};
  const taskType = getTaskType(output);
  const entries: MetricEntry[] = [];

  if (taskType === "classification") {
    if (metrics.accuracy !== undefined)
      entries.push({ key: "accuracy", label: "Accuracy", value: metrics.accuracy });
    if (metrics.loss !== undefined)
      entries.push({ key: "loss", label: "Loss", value: metrics.loss });
  } else if (taskType === "regression") {
    if (metrics.mse !== undefined)
      entries.push({ key: "mse", label: "MSE", value: metrics.mse });
    if (metrics.rmse !== undefined) {
      entries.push({ key: "rmse", label: "RMSE", value: metrics.rmse });
    } else if (typeof metrics.mse === "number" && Number.isFinite(metrics.mse)) {
      entries.push({
        key: "rmse",
        label: "RMSE",
        value: Math.sqrt(metrics.mse),
      });
    }
    const r2 = metrics.r2_score ?? metrics.r2;
    if (r2 !== undefined)
      entries.push({ key: "r2", label: "R²", value: r2 });
  }

  const used = new Set(entries.map((e) => e.key));
  Object.entries(metrics).forEach(([key, value]) => {
    if (!used.has(key) && key !== "r2_score")
      entries.push({ key, label: key.replace(/_/g, " "), value });
  });

  return entries;
};

const LOWER_IS_BETTER_TOKENS = ["loss", "mse", "rmse", "mae", "error", "deviance"];

export const isLowerBetterMetric = (key: string): boolean => {
  const normalized = key.toLowerCase();
  return LOWER_IS_BETTER_TOKENS.some((token) => normalized.includes(token));
};

const toNumberArray = (value: unknown): number[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  const numbers = value.map((v) => Number(v));
  return numbers.every((v) => Number.isFinite(v)) ? numbers : null;
};

export const getActualLabels = (output?: PipelineOutput): number[] | null => {
  if (!output) return null;
  const record = output as Record<string, unknown>;
  const full = toNumberArray(record.y_test ?? record.actual);
  if (full) return full;
  return toNumberArray(
    record.y_test_preview ?? record.actual_preview ?? record.y_true_preview,
  );
};

export const getPredictedLabels = (output?: PipelineOutput): number[] | null => {
  if (!output) return null;
  const full = toNumberArray(output.predictions);
  if (full) return full;
  return toNumberArray(output.predictions_preview);
};

export const buildPredictionRows = (output?: PipelineOutput): PredictionRow[] => {
  if (!output) return [];
  const preview = output.predictions_preview ?? output.predictions ?? [];
  if (!Array.isArray(preview) || preview.length === 0) return [];

  const first = preview[0];
  if (first && typeof first === "object" && !Array.isArray(first)) {
    return preview.slice(0, 10).map((row, index) => {
      const record = row as Record<string, unknown>;
      const actual =
        record.actual ?? record.y_true ?? record.label ?? record.y;
      const predicted =
        record.predicted ?? record.prediction ?? record.y_pred ?? record.value;
      return {
        index: index + 1,
        actual: actual != null ? String(actual) : null,
        predicted: predicted != null ? String(predicted) : "-",
      };
    });
  }

  const predicted = preview.slice(0, 10);
  const actual = getActualLabels(output);
  const actualSlice = actual?.slice(0, predicted.length) ?? null;

  return predicted.map((value, index) => ({
    index: index + 1,
    actual: actualSlice ? String(actualSlice[index]) : null,
    predicted: String(value),
  }));
};

export const buildConfusionMatrix = (
  actual: number[],
  predicted: number[],
): ConfusionMatrixData | null => {
  if (!actual.length || actual.length !== predicted.length) return null;
  const labelSet = new Set([...actual, ...predicted]);
  const labels = Array.from(labelSet).sort((a, b) => a - b);
  const index = new Map(labels.map((l, i) => [l, i]));
  const size = labels.length;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));
  actual.forEach((a, i) => {
    const row = index.get(a);
    const col = index.get(predicted[i]);
    if (row !== undefined && col !== undefined) matrix[row][col] += 1;
  });
  return {
    labels: labels.map(String),
    matrix,
  };
};

export const getConfusionMatrixData = (
  output?: PipelineOutput,
): ConfusionMatrixData | null => {
  if (!output) return null;
  const fromApi = (output as Record<string, unknown>).confusion_matrix;
  if (Array.isArray(fromApi) && fromApi.length > 0) {
    const matrix = fromApi as number[][];
    const labels = matrix.map((_, i) => String(i));
    return { labels, matrix };
  }
  const actual = getActualLabels(output);
  const predicted = getPredictedLabels(output);
  if (actual && predicted) {
    const len = Math.min(actual.length, predicted.length);
    return buildConfusionMatrix(actual.slice(0, len), predicted.slice(0, len));
  }
  return null;
};

export const getClassDistribution = (
  values: number[],
): Array<{ label: string; count: number }> => {
  const counts = new Map<string, number>();
  values.forEach((v) => {
    const key = String(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const getRegressionPairs = (
  output?: PipelineOutput,
): Array<{ actual: number; predicted: number }> => {
  const actual = getActualLabels(output);
  const predicted = getPredictedLabels(output);
  if (!actual || !predicted) return [];
  const len = Math.min(actual.length, predicted.length, 200);
  return Array.from({ length: len }, (_, i) => ({
    actual: actual[i],
    predicted: predicted[i],
  }));
};

export const getFeatureCount = (output?: PipelineOutput): number | null => {
  const raw =
    (output as Record<string, unknown>)?.feature_count ??
    (output?.training_summary as Record<string, unknown> | undefined)
      ?.feature_count;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
};

export const getModelType = (output?: PipelineOutput): string => {
  return (
    output?.model_name ??
    output?.run_summary?.model ??
    (output?.training_summary as Record<string, unknown> | undefined)
      ?.architecture as string ??
    "unknown"
  );
};

export const getDatasetName = (
  output?: PipelineOutput,
  runMetadata?: { dataset?: string },
): string => {
  const fromMeta = runMetadata?.dataset;
  if (fromMeta) return fromMeta;
  const fromConfig =
    output?.config_used?.dataset ??
    (output?.training_summary as Record<string, unknown> | undefined)?.dataset;
  return fromConfig ? String(fromConfig) : "-";
};

export type PipelineStatus = "idle" | "running" | "success" | "failed";

export const resolvePipelineStatus = (
  loading: boolean,
  error: string | null,
  resultStatus?: string,
): PipelineStatus => {
  if (loading) return "running";
  if (error) return "failed";
  if (resultStatus === "success" || resultStatus === "completed") return "success";
  if (resultStatus === "error") return "failed";
  return "idle";
};

export const statusLabel: Record<PipelineStatus, string> = {
  idle: "Ready",
  running: "Running",
  success: "Success",
  failed: "Failed",
};
