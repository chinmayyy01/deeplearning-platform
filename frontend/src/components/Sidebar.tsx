"use client";
import { useMemo, useState } from "react";
import { usePipelineStore } from "@/store/pipelineStore";
import { buildSidebarCategories } from "@/lib/nodePresentation";
import type { NodeMetadataEntry } from "@/lib/configSchema";

interface SidebarProps {
  nodeMetadata: Record<string, NodeMetadataEntry>;
}

export default function Sidebar({ nodeMetadata }: SidebarProps) {
  const categories = useMemo(
    () => buildSidebarCategories(nodeMetadata),
    [nodeMetadata],
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const { addNode, nodes } = usePipelineStore();

  const toggle = (label: string) =>
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));

  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData("nodeType", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDoubleClick = (nodeType: string) => {
    const step = nodes.length;
    addNode(nodeType, {
      x: 200 + ((step * 28) % 240),
      y: 150 + ((step * 24) % 200),
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        nodes: cat.nodes.filter(
          ({ presentation }) =>
            presentation.label.toLowerCase().includes(q) ||
            presentation.desc.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.nodes.length > 0);
  }, [categories, query]);

  if (!categories.length) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <p className="text-[12px] text-ink-3 text-center">
          Loading available nodes...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4 pointer-events-none"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes"
            className="w-full bg-inset border border-line rounded-md pl-8 pr-2.5 py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-4 focus:border-accent/60 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filtered.length === 0 && (
          <p className="text-[12px] text-ink-3 text-center pt-8">
            No nodes match “{query}”.
          </p>
        )}
        {filtered.map((cat) => {
          const isCollapsed = collapsed[cat.label] ?? false;
          return (
            <div key={cat.label} className="mb-3">
              <button
                onClick={() => toggle(cat.label)}
                className="w-full flex items-center justify-between py-1.5 text-ink-4 hover:text-ink-2 text-[11px] font-semibold tracking-[0.08em] uppercase transition-colors cursor-pointer"
              >
                <span>{cat.label}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{
                    transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {!isCollapsed && (
                <div className="flex flex-col gap-1.5 mt-1.5">
                  {cat.nodes.map(({ type, presentation }) => (
                    <div
                      key={type}
                      draggable
                      onDragStart={(e) => onDragStart(e, type)}
                      onDoubleClick={() => onDoubleClick(type)}
                      title="Drag onto the canvas, or double-click to add"
                      className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-line bg-elevated hover:border-line-strong hover:bg-hover transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-[11px] font-semibold"
                        style={{
                          background: `${presentation.color}1f`,
                          color: presentation.color,
                        }}
                      >
                        {presentation.label.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-medium text-ink truncate">
                          {presentation.label}
                        </p>
                        <p className="text-[11px] text-ink-3 truncate">
                          {presentation.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
