export type NodePresentation = {
  label: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
  category: string;
  icon: "dataset" | "split" | "preprocess" | "model" | "neural" | "generic";
};

const PRESENTATION: Record<string, NodePresentation> = {
  dataset: {
    label: "Dataset",
    desc: "Load a dataset",
    color: "#7c86e8",
    bg: "rgba(124,134,232,0.10)",
    border: "rgba(124,134,232,0.24)",
    category: "Data",
    icon: "dataset",
  },
  train_test_split: {
    label: "Train-Test Split",
    desc: "Split data into train and test sets",
    color: "#4bb3a3",
    bg: "rgba(75,179,163,0.10)",
    border: "rgba(75,179,163,0.24)",
    category: "Data",
    icon: "split",
  },
  preprocess: {
    label: "Preprocess",
    desc: "Scale and preprocess data",
    color: "#d3a04d",
    bg: "rgba(211,160,77,0.10)",
    border: "rgba(211,160,77,0.24)",
    category: "Preprocessing",
    icon: "preprocess",
  },
  model: {
    label: "Model",
    desc: "Train a machine learning model",
    color: "#52b06b",
    bg: "rgba(82,176,107,0.10)",
    border: "rgba(82,176,107,0.24)",
    category: "Model",
    icon: "model",
  },
  neural_network: {
    label: "Neural Network",
    desc: "Train deep learning models",
    color: "#d170a6",
    bg: "rgba(209,112,166,0.10)",
    border: "rgba(209,112,166,0.24)",
    category: "Model",
    icon: "neural",
  },
};

const CATEGORY_ORDER = ["Data", "Preprocessing", "Model", "Other"];

const GENERIC: NodePresentation = {
  label: "Node",
  desc: "Pipeline node",
  color: "#8a8a94",
  bg: "rgba(138,138,148,0.10)",
  border: "rgba(138,138,148,0.24)",
  category: "Other",
  icon: "generic",
};

export const getNodePresentation = (
  nodeType: string,
  metadata?: { display_name?: string; description?: string },
): NodePresentation => {
  const base = PRESENTATION[nodeType] ?? GENERIC;
  return {
    ...base,
    label: metadata?.display_name ?? base.label,
    desc: metadata?.description ?? base.desc,
  };
};

export type SidebarCategory = {
  label: string;
  nodes: Array<{ type: string; presentation: NodePresentation }>;
};

export const buildSidebarCategories = (
  nodeMetadata: Record<string, { display_name?: string; description?: string }>,
): SidebarCategory[] => {
  const byCategory = new Map<string, SidebarCategory["nodes"]>();

  for (const [type, meta] of Object.entries(nodeMetadata)) {
    const presentation = getNodePresentation(type, meta);
    const category = presentation.category;
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push({ type, presentation });
  }

  return CATEGORY_ORDER.filter((c) => byCategory.has(c))
    .map((label) => ({ label, nodes: byCategory.get(label)! }))
    .concat(
      [...byCategory.entries()]
        .filter(([c]) => !CATEGORY_ORDER.includes(c))
        .map(([label, nodes]) => ({ label, nodes })),
    );
};

export const getConfigSummary = (
  nodeType: string,
  config: Record<string, unknown>,
): string | null => {
  if (nodeType === "dataset" && config.dataset) return String(config.dataset);
  if (nodeType === "model" && config.algorithm) return String(config.algorithm);
  if (nodeType === "neural_network" && config.architecture)
    return String(config.architecture).toUpperCase();
  if (nodeType === "preprocess" && config.scaler_type)
    return String(config.scaler_type);
  if (nodeType === "train_test_split" && config.test_size != null)
    return `test: ${config.test_size}`;
  return null;
};
