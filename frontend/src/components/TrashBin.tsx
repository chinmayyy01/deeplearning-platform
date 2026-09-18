"use client";
import { forwardRef } from "react";

interface TrashBinProps {
  isDragging: boolean;
  isOverTrash: boolean;
}

const TrashBin = forwardRef<HTMLDivElement, TrashBinProps>(
  ({ isDragging, isOverTrash }, ref) => (
    <div
      ref={ref}
      className={`mb-5 flex items-center gap-2 rounded-full border px-3.5 py-2 pointer-events-none transition-all duration-200 ${
        isDragging
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4"
      } ${
        isOverTrash
          ? "border-danger/60 bg-danger-soft scale-105"
          : "border-line bg-elevated"
      }`}
      style={{
        boxShadow: isOverTrash
          ? "0 0 0 4px rgba(240,97,109,0.12)"
          : "0 8px 24px rgba(0,0,0,0.5)",
        transition:
          "opacity 0.2s ease, transform 0.2s ease, background 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isOverTrash ? "var(--color-danger)" : "var(--color-ink-2)"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-150"
      >
        <g
          style={{
            transformOrigin: "3px 6px",
            transform: isOverTrash ? "rotate(-35deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </g>
        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
      <span
        className={`text-[11.5px] font-medium ${
          isOverTrash ? "text-danger" : "text-ink-2"
        }`}
      >
        {isOverTrash ? "Release to delete" : "Drag here to delete"}
      </span>
    </div>
  ),
);

TrashBin.displayName = "TrashBin";
export default TrashBin;
