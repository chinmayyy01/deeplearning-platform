"use client";
import { usePipelineStore } from "@/store/pipelineStore";
import { useOutputStore } from "@/store/outputStore";
import { useToastStore } from "@/store/toastStore";
import { useSettingsStore, type CanvasSettings } from "@/store/settingsStore";

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10.5px] font-semibold text-ink-4 uppercase tracking-[0.1em] px-3 pt-4 pb-1">
    {children}
  </p>
);

const Row = ({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-4 px-3 py-2.5 border-b border-line-soft">
    <div className="min-w-0">
      <p className="text-[12px] text-ink">{label}</p>
      {desc && <p className="text-[11px] text-ink-3 mt-0.5">{desc}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Toggle = ({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    onClick={() => onChange(!value)}
    className={`w-9 h-5 rounded-full relative transition-colors shrink-0 cursor-pointer ${
      value ? "bg-accent" : "bg-line"
    }`}
  >
    <span
      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
        value ? "left-[18px]" : "left-0.5"
      }`}
    />
  </button>
);

const selectClassName =
  "bg-inset border border-line rounded-md px-2 py-1 text-[11.5px] text-ink outline-none cursor-pointer focus:border-accent/70 transition-colors";

const dangerButtonClassName =
  "text-[11px] px-2.5 py-1 rounded-md border border-danger/30 text-danger/80 hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer";

export default function SettingsPanel() {
  const addToast = useToastStore((s) => s.addToast);
  const settings = useSettingsStore((state) => state.settings);
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const update = <K extends keyof CanvasSettings>(
    key: K,
    value: CanvasSettings[K],
  ) => {
    updateSetting(key, value);
  };

  const handleClearCanvas = () => {
    usePipelineStore.setState({
      nodes: [],
      edges: [],
      past: [],
      future: [],
      selectedNodeId: null,
      selectedEdgeId: null,
    });
    addToast("Canvas cleared");
  };

  const handleClearRuns = () => {
    useOutputStore.setState({
      savedRuns: [],
      selectedCompareIds: [],
      latestResult: null,
    });
    addToast("All runs cleared");
  };

  const handleClearPipelines = () => {
    localStorage.removeItem("ml_saved_pipelines");
    addToast("Saved pipelines cleared");
  };

  const handleResetSettings = () => {
    resetSettings();
    addToast("Settings reset to defaults");
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-4">
      <SectionLabel>Canvas</SectionLabel>
      <Row label="Background" desc="Canvas grid style">
        <select
          value={settings.canvasBackground}
          onChange={(e) =>
            update(
              "canvasBackground",
              e.target.value as CanvasSettings["canvasBackground"],
            )
          }
          className={selectClassName}
        >
          <option value="dots">Dots</option>
          <option value="lines">Lines</option>
          <option value="none">None</option>
        </select>
      </Row>
      <Row label="Connections" desc="Edge path style">
        <select
          value={settings.connectionLineStyle}
          onChange={(e) =>
            update(
              "connectionLineStyle",
              e.target.value as CanvasSettings["connectionLineStyle"],
            )
          }
          className={selectClassName}
        >
          <option value="bezier">Bezier</option>
          <option value="straight">Straight</option>
          <option value="step">Step</option>
        </select>
      </Row>
      <Row label="Minimap" desc="Show minimap overlay">
        <Toggle
          value={settings.minimap}
          onChange={(v) => update("minimap", v)}
        />
      </Row>
      <Row label="Zoom controls" desc="Display zoom and fit controls">
        <Toggle
          value={settings.showControls}
          onChange={(v) => update("showControls", v)}
        />
      </Row>
      <Row label="Animate edges" desc="Animated dashed edges">
        <Toggle
          value={settings.animateEdges}
          onChange={(v) => update("animateEdges", v)}
        />
      </Row>
      <Row label="Node labels" desc="Display labels on nodes">
        <Toggle
          value={settings.showNodeLabels}
          onChange={(v) => update("showNodeLabels", v)}
        />
      </Row>
      <Row label="Node summaries" desc="Display helper text on nodes">
        <Toggle
          value={settings.showNodeSummaries}
          onChange={(v) => update("showNodeSummaries", v)}
        />
      </Row>

      <SectionLabel>Data</SectionLabel>
      <Row label="Clear canvas" desc="Remove all nodes and edges">
        <button onClick={handleClearCanvas} className={dangerButtonClassName}>
          Clear
        </button>
      </Row>
      <Row label="Clear all runs" desc="Delete all saved run history">
        <button onClick={handleClearRuns} className={dangerButtonClassName}>
          Clear
        </button>
      </Row>
      <Row label="Clear saved pipelines" desc="Delete locally saved pipelines">
        <button
          onClick={handleClearPipelines}
          className={dangerButtonClassName}
        >
          Clear
        </button>
      </Row>
      <Row label="Reset settings" desc="Restore default preferences">
        <button
          onClick={handleResetSettings}
          className={dangerButtonClassName}
        >
          Reset
        </button>
      </Row>
    </div>
  );
}
