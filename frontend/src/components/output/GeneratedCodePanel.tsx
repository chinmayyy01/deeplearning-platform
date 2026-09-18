"use client";
import { useState } from "react";
import { useToastStore } from "@/store/toastStore";

const tokenizedPython = (code: string) => {
  const keywords = new Set([
    "def",
    "class",
    "import",
    "from",
    "as",
    "return",
    "if",
    "elif",
    "else",
    "for",
    "while",
    "try",
    "except",
    "with",
    "True",
    "False",
    "None",
    "in",
    "and",
    "or",
    "not",
    "print",
  ]);
  return code.split("\n").map((line, lineIndex) => {
    const parts: Array<{ type: string; value: string }> = [];
    let buffer = "",
      inString: "single" | "double" | null = null,
      i = 0;
    while (i < line.length) {
      const char = line[i];
      if (!inString && char === "#") {
        if (buffer) {
          parts.push({ type: "plain", value: buffer });
          buffer = "";
        }
        parts.push({ type: "comment", value: line.slice(i) });
        break;
      }
      if (!inString && (char === "'" || char === '"')) {
        if (buffer) {
          parts.push({ type: "plain", value: buffer });
          buffer = "";
        }
        inString = char === "'" ? "single" : "double";
        buffer += char;
        i++;
        continue;
      }
      if (inString) {
        buffer += char;
        if (
          (inString === "single" && char === "'") ||
          (inString === "double" && char === '"')
        ) {
          parts.push({ type: "string", value: buffer });
          buffer = "";
          inString = null;
        }
        i++;
        continue;
      }
      if (/[A-Za-z_]/.test(char)) {
        if (buffer && !/[A-Za-z0-9_]/.test(buffer[buffer.length - 1])) {
          parts.push({ type: "plain", value: buffer });
          buffer = "";
        }
        let word = char;
        i++;
        while (i < line.length && /[A-Za-z0-9_]/.test(line[i])) {
          word += line[i];
          i++;
        }
        parts.push({
          type: keywords.has(word) ? "keyword" : "plain",
          value: word,
        });
        continue;
      }
      buffer += char;
      i++;
    }
    if (buffer) parts.push({ type: "plain", value: buffer });
    return (
      <div key={`line-${lineIndex}`} className="whitespace-pre">
        {parts.map((part, pi) =>
          part.type === "keyword" ? (
            <span key={pi} className="text-[#9aa2f0]">
              {part.value}
            </span>
          ) : part.type === "string" ? (
            <span key={pi} className="text-[#7ee08d]">
              {part.value}
            </span>
          ) : part.type === "comment" ? (
            <span key={pi} className="text-ink-4">
              {part.value}
            </span>
          ) : (
            <span key={pi}>{part.value}</span>
          ),
        )}
      </div>
    );
  });
};

type GeneratedCodePanelProps = {
  code: string;
  embedded?: boolean;
};

export default function GeneratedCodePanel({
  code,
  embedded = false,
}: GeneratedCodePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  if (!code) {
    return (
      <div className="rounded-lg border border-line bg-elevated px-5 py-6 text-ink-3 text-[12.5px]">
        Run a pipeline to generate exportable Python code.
      </div>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    addToast("Code copied!");
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pipeline_generated.py";
    anchor.click();
    URL.revokeObjectURL(url);
    addToast("Code downloaded!");
  };

  const maxHeight = expanded ? "max-h-[70vh]" : embedded ? "max-h-48" : "max-h-64";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-ink-2">Generated pipeline code</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="h-8 px-3 rounded-md border border-line bg-elevated text-[12px] text-ink-2 hover:text-ink hover:bg-hover transition-colors cursor-pointer"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
          <button
            onClick={handleDownload}
            className="h-8 px-3 rounded-md border border-line bg-elevated text-[12px] text-ink-2 hover:text-ink hover:bg-hover transition-colors cursor-pointer"
          >
            Download
          </button>
          <button
            onClick={handleCopy}
            className="h-8 px-3 rounded-md border border-line bg-elevated text-[12px] text-ink-2 hover:text-ink hover:bg-hover transition-colors cursor-pointer"
          >
            Copy
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-line bg-inset">
        <div
          className={`${maxHeight} overflow-auto px-4 py-3 font-mono text-[12px] leading-relaxed text-ink`}
        >
          {tokenizedPython(code)}
        </div>
      </div>
    </div>
  );
}
