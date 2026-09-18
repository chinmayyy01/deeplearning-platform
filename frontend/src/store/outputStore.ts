import { create } from "zustand";
import {
  getDatasetName,
  getModelType,
  getTaskType,
} from "@/lib/resultAnalytics";

type MetricsMap = Record<string, number | string | null>;

type RunSummary = {
  model?: string;
  task_type?: string;
};

export type PipelineOutput = {
  model_name?: string;
  predictions?: unknown[];
  predictions_preview?: unknown[];
  y_test_preview?: number[];
  y_test?: number[];
  metrics?: MetricsMap;
  config_used?: Record<string, unknown>;
  training_summary?: Record<string, unknown>;
  loss_history?: number[];
  run_summary?: RunSummary;
};

export type RunMetadata = {
  dataset?: string;
};

export type PipelineExecutionResult = {
  status?: string;
  execution_time?: number;
  final_node?: string;
  pipeline_summary?: {
    total_nodes?: number;
    total_edges?: number;
  };
  output?: PipelineOutput;
  generated_code?: string;
  runMetadata?: RunMetadata;
};

export type SavedRun = {
  id: string;
  timestamp: string;
  dataset: string;
  modelName: string;
  taskType: string;
  metrics: MetricsMap;
  configUsed: Record<string, unknown>;
  executionTime: number;
  lossHistory?: number[];
};

type OutputTab = "results" | "code" | "compare";

interface OutputStore {
  latestResult: PipelineExecutionResult | null;
  loading: boolean;
  error: string | null;
  errorNodeId: string | null;
  errorNodeType: string | null;
  activeTab: OutputTab;
  savedRuns: SavedRun[];
  selectedCompareIds: string[];
  startExecution: () => void;
  setExecutionResult: (result: PipelineExecutionResult) => void;
  setExecutionError: (payload: {
    message: string;
    nodeId?: string | null;
    nodeType?: string | null;
  }) => void;
  setActiveTab: (tab: OutputTab) => void;
  toggleCompareRun: (id: string) => void;
}

export const buildSavedRun = (
  result: PipelineExecutionResult,
): SavedRun | null => {
  const output = result.output;
  if (!output) return null;
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    dataset: getDatasetName(output, result.runMetadata),
    modelName: getModelType(output),
    taskType: getTaskType(output),
    metrics: output.metrics ?? {},
    configUsed: output.config_used ?? {},
    executionTime: result.execution_time ?? 0,
    lossHistory: output.loss_history,
  };
};

export const useOutputStore = create<OutputStore>((set) => ({
  latestResult: null,
  loading: false,
  error: null,
  errorNodeId: null,
  errorNodeType: null,
  activeTab: "results",
  savedRuns: [],
  selectedCompareIds: [],
  startExecution: () =>
    set(() => ({
      loading: true,
      error: null,
      errorNodeId: null,
      errorNodeType: null,
      activeTab: "results",
    })),
  setExecutionResult: (result) => {
    const run = buildSavedRun(result);
    set((state) => ({
      latestResult: result,
      loading: false,
      error: null,
      errorNodeId: null,
      errorNodeType: null,
      activeTab: "results",
      savedRuns: run ? [run, ...state.savedRuns] : state.savedRuns,
      selectedCompareIds: run
        ? [run.id, ...state.selectedCompareIds.filter((id) => id !== run.id)].slice(
            0,
            3,
          )
        : state.selectedCompareIds,
    }));
  },
  setExecutionError: ({ message, nodeId, nodeType }) =>
    set(() => ({
      error: message,
      loading: false,
      errorNodeId: nodeId ?? null,
      errorNodeType: nodeType ?? null,
      activeTab: "results",
    })),
  setActiveTab: (tab) => set(() => ({ activeTab: tab })),
  toggleCompareRun: (id) =>
    set((state) => {
      const alreadySelected = state.selectedCompareIds.includes(id);
      if (alreadySelected) {
        return {
          selectedCompareIds: state.selectedCompareIds.filter(
            (runId) => runId !== id,
          ),
        };
      }
      return { selectedCompareIds: [...state.selectedCompareIds, id] };
    }),
}));
