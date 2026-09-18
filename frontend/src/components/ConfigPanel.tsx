"use client";
import type { Node } from "@xyflow/react";
import { useEffect, useState } from "react";
import { usePipelineStore } from "../store/pipelineStore";
import {
  areConfigsEqual,
  normalizeConfig,
  type ConfigFieldSchema,
  type ConfigSchemaMap,
  type NodeMetadataEntry,
} from "@/lib/configSchema";
import { mergeSchemaExtensions } from "@/lib/schemaExtensions";
import { buildDatasetGroups, formatDatasetLabel } from "@/lib/datasetGroups";
import { getNodePresentation } from "@/lib/nodePresentation";

interface ConfigPanelProps {
  nodeMetadata: Record<string, NodeMetadataEntry>;
}

const getConfigValue = (
  schema: ConfigSchemaMap,
  config: Record<string, unknown>,
  key: string,
) => {
  if (Object.prototype.hasOwnProperty.call(config, key)) return config[key];
  return schema[key]?.default;
};

const shouldRenderField = (
  schema: ConfigSchemaMap,
  field: ConfigFieldSchema,
  config: Record<string, unknown>,
) => {
  if (!field.visible_if) return true;
  return Object.entries(field.visible_if).every(([key, allowed]) => {
    const currentValue = getConfigValue(schema, config, key);
    if (Array.isArray(allowed)) return allowed.includes(currentValue);
    return currentValue === allowed;
  });
};

const inputClassName =
  "w-full bg-inset border border-line rounded-md px-2.5 py-2 text-[12.5px] text-ink outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/25 transition-colors placeholder:text-ink-4";

const Toggle = ({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    type="button"
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

export default function ConfigPanel({ nodeMetadata }: ConfigPanelProps) {
  const { nodes, selectedNodeId, updateNodeConfig } = usePipelineStore();
  const selectedNode = nodes.find((node: Node) => node.id === selectedNodeId);
  const selectedType = selectedNode?.type;
  const rawSchema = selectedType
    ? nodeMetadata[selectedType]?.config_schema
    : undefined;
  const configSchema =
    selectedType && rawSchema
      ? mergeSchemaExtensions(selectedType, rawSchema as ConfigSchemaMap)
      : undefined;
  const nodeConfig =
    ((selectedNode?.data as { config?: Record<string, unknown> } | undefined)
      ?.config as Record<string, unknown>) ?? {};
  const resolvedConfig = configSchema
    ? normalizeConfig(configSchema, nodeConfig)
    : nodeConfig;
  const visibleConfigEntries = configSchema
    ? Object.entries(configSchema).filter(([, field]) =>
        shouldRenderField(configSchema, field, {
          ...nodeConfig,
          ...resolvedConfig,
        }),
      )
    : [];

  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!selectedNode || !configSchema) return;
    const nextConfig = normalizeConfig(configSchema, nodeConfig);
    if (!areConfigsEqual(nextConfig, nodeConfig)) {
      updateNodeConfig(selectedNode.id, nextConfig, { replace: true });
    }
  }, [
    selectedNodeId,
    selectedNode?.type,
    configSchema,
    nodeConfig,
    updateNodeConfig,
  ]);

  const handleConfigChange = (key: string, value: unknown) => {
    if (!selectedNode) return;
    if (!configSchema) {
      updateNodeConfig(selectedNode.id, { [key]: value });
      return;
    }
    const nextConfig = normalizeConfig(configSchema, {
      ...nodeConfig,
      [key]: value,
    });
    updateNodeConfig(selectedNode.id, nextConfig, { replace: true });
  };

  const optionClassName = "bg-elevated text-ink";

  const renderSelectField = (
    key: string,
    field: ConfigFieldSchema,
    resolvedValue: unknown,
    label: string,
  ) => {
    const options = field.options ?? [];
    const isDatasetField =
      selectedNode?.type === "dataset" &&
      key === "dataset" &&
      options.length > 0;
    const groups = isDatasetField ? buildDatasetGroups(options) : null;

    if (groups && groups.length > 0) {
      return (
        <select
          value={(resolvedValue as string | undefined) ?? ""}
          onChange={(e) => handleConfigChange(key, e.target.value)}
          className={inputClassName}
        >
          <option value="" className={optionClassName}>
            Select dataset
          </option>
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option} value={option} className={optionClassName}>
                  {formatDatasetLabel(option)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      );
    }

    return (
      <select
        value={(resolvedValue as string | undefined) ?? ""}
        onChange={(e) => handleConfigChange(key, e.target.value)}
        className={inputClassName}
      >
        <option value="" className={optionClassName}>
          Select {label.toLowerCase()}
        </option>
        {options.map((option) => (
          <option key={option} value={option} className={optionClassName}>
            {option.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    );
  };

  const renderField = (
    key: string,
    field: ConfigFieldSchema,
    resolvedValue: unknown,
  ) => {
    const fieldType = field.type ?? "string";
    const hasOptions = Array.isArray(field.options) && field.options.length > 0;
    const label = field.label ?? key;
    const minValue = typeof field.min === "number" ? field.min : undefined;
    const maxValue = typeof field.max === "number" ? field.max : undefined;
    const showRange =
      typeof minValue === "number" && typeof maxValue === "number";

    if (fieldType === "boolean") {
      return (
        <label className="flex items-center justify-between gap-3 rounded-md border border-line bg-inset px-2.5 py-2 cursor-pointer">
          <span className="text-[12.5px] text-ink">{label}</span>
          <Toggle
            value={Boolean(resolvedValue ?? false)}
            onChange={(v) => handleConfigChange(key, v)}
          />
        </label>
      );
    }

    if (hasOptions) {
      return renderSelectField(key, field, resolvedValue, label);
    }

    if (fieldType === "integer" || fieldType === "float") {
      const step = fieldType === "integer" ? 1 : "any";
      const numericValue =
        typeof resolvedValue === "number" ? resolvedValue : undefined;
      return (
        <div className="flex flex-col gap-2">
          {showRange ? (
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={minValue}
                max={maxValue}
                step={step}
                value={numericValue ?? minValue ?? 0}
                onChange={(e) =>
                  handleConfigChange(key, Number(e.target.value))
                }
                className="flex-1 accent-accent cursor-pointer"
              />
              <input
                type="number"
                step={step}
                min={minValue}
                max={maxValue}
                value={
                  typeof numericValue === "number" ? String(numericValue) : ""
                }
                onChange={(e) =>
                  handleConfigChange(
                    key,
                    e.target.value === ""
                      ? undefined
                      : fieldType === "integer"
                        ? Number.parseInt(e.target.value, 10)
                        : Number.parseFloat(e.target.value),
                  )
                }
                placeholder={
                  field.default !== undefined ? String(field.default) : ""
                }
                className="w-20 bg-inset border border-line rounded-md px-2 py-1.5 text-[12.5px] text-ink outline-none focus:border-accent/70 transition-colors"
              />
            </div>
          ) : (
            <input
              type="number"
              step={step}
              min={minValue}
              max={maxValue}
              value={
                typeof numericValue === "number" ? String(numericValue) : ""
              }
              onChange={(e) =>
                handleConfigChange(
                  key,
                  e.target.value === ""
                    ? undefined
                    : fieldType === "integer"
                      ? Number.parseInt(e.target.value, 10)
                      : Number.parseFloat(e.target.value),
                )
              }
              placeholder={
                field.default !== undefined ? String(field.default) : ""
              }
              className={inputClassName}
            />
          )}
          {showRange && (
            <div className="text-[11px] text-ink-3">
              Range: {minValue} – {maxValue}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type="text"
        value={(resolvedValue as string | undefined) ?? ""}
        onChange={(e) => handleConfigChange(key, e.target.value)}
        placeholder={field.default !== undefined ? String(field.default) : ""}
        className={inputClassName}
      />
    );
  };

  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="w-10 h-10 rounded-lg bg-elevated border border-line flex items-center justify-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-ink-3)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </div>
        <p className="text-[12.5px] text-ink-2">No node selected</p>
        <p className="text-[11.5px] text-ink-3 max-w-[200px]">
          Select a node on the canvas to edit its configuration.
        </p>
      </div>
    );
  }

  const presentation = getNodePresentation(selectedNode.type ?? "generic");
  const displayName =
    selectedNode.type && nodeMetadata[selectedNode.type]?.display_name
      ? nodeMetadata[selectedNode.type].display_name
      : selectedNode.type?.replace(/_/g, " ");

  return (
    <div className="text-ink">
      {/* Node header */}
      <div className="px-4 pt-4 pb-3 border-b border-line-soft">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[13px] font-semibold"
            style={{
              background: `${presentation.color}1f`,
              color: presentation.color,
            }}
          >
            {presentation.icon === "neural"
              ? "NN"
              : presentation.label.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-ink capitalize truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-ink-3 font-mono truncate">
              {selectedNode.type}
            </p>
          </div>
        </div>
        {selectedNode.type && nodeMetadata[selectedNode.type]?.description && (
          <p className="text-[11.5px] text-ink-2 mt-2.5 leading-relaxed">
            {nodeMetadata[selectedNode.type].description}
          </p>
        )}
      </div>

      {/* Fields */}
      <div className="p-4 space-y-3">
        {configSchema && visibleConfigEntries.length === 0 && (
          <p className="text-[12px] text-ink-3">
            This node has no configurable fields.
          </p>
        )}
        {configSchema &&
          visibleConfigEntries.map(([key, field]) => {
            const typedField = field as ConfigFieldSchema;
            const resolvedValue = resolvedConfig[key] ?? typedField.default;
            const label = typedField.label ?? key;
            const isBoolean = (typedField.type ?? "string") === "boolean";
            return (
              <div key={key} className="flex flex-col gap-1.5">
                {!isBoolean && (
                  <label className="text-[12px] font-medium text-ink-2">
                    {label}
                  </label>
                )}
                {renderField(key, typedField, resolvedValue)}
              </div>
            );
          })}

        {configSchema && visibleConfigEntries.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] text-ink-3 hover:text-ink-2 transition-colors cursor-pointer"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{
                  transform: showRaw ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s",
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Raw configuration
            </button>
            {showRaw && (
              <pre className="mt-2 bg-inset border border-line rounded-md p-3 text-[11px] leading-relaxed text-ink-2 font-mono overflow-x-auto">
                {JSON.stringify(resolvedConfig, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
