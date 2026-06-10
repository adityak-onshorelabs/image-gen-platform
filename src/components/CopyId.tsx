"use client";

import { useState } from "react";

/**
 * Monospace ID chip with a click-to-copy button. Used to surface template /
 * project UUIDs (referenced from code and the render API).
 */
export function CopyId({
  id,
  label,
  full = false,
}: {
  id: string;
  label?: string;
  full?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    // guard against navigating when nested inside a link/card
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  const shown = full ? id : `${id.slice(0, 8)}…${id.slice(-4)}`;

  return (
    <button
      type="button"
      onClick={(e) => copy(e)}
      title={`Copy ${label ?? "ID"}: ${id}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 font-mono text-xs text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-200"
    >
      {label && <span className="text-neutral-600">{label}</span>}
      <span className="text-neutral-300">{shown}</span>
      <span className={copied ? "text-emerald-400" : "text-neutral-500"}>
        {copied ? "✓ copied" : "⧉"}
      </span>
    </button>
  );
}
