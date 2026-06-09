"use client";

import type { Layer } from "@/lib/layer-types";

export function LayersPanel({
  layers,
  selectedId,
  onSelect,
  onToggleHidden,
  onDuplicate,
  onDelete,
  onReorder,
}: {
  layers: Layer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, dir: -1 | 1) => void;
}) {
  // top of list = top of stack (highest z). Render reversed (array end = top z).
  const ordered = [...layers].reverse();

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Layers
      </div>
      <div className="flex-1 overflow-auto px-2">
        {ordered.length === 0 && (
          <p className="px-2 py-4 text-xs text-neutral-600">
            No layers. Use the toolbar to add text or image layers.
          </p>
        )}
        {ordered.map((l) => (
          <div
            key={l.id}
            onClick={() => onSelect(l.id)}
            className={`mb-1 flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${
              l.id === selectedId
                ? "bg-sky-500/20 text-white"
                : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <span className="text-xs text-neutral-500">
              {l.type === "text" ? "T" : "▦"}
            </span>
            <span className="flex-1 truncate">{l.name}</span>
            <button
              title="Up"
              onClick={(e) => { e.stopPropagation(); onReorder(l.id, 1); }}
              className="px-1 text-neutral-500 hover:text-white"
            >
              ↑
            </button>
            <button
              title="Down"
              onClick={(e) => { e.stopPropagation(); onReorder(l.id, -1); }}
              className="px-1 text-neutral-500 hover:text-white"
            >
              ↓
            </button>
            <button
              title={l.hidden ? "Show" : "Hide"}
              onClick={(e) => { e.stopPropagation(); onToggleHidden(l.id); }}
              className="px-1 text-neutral-500 hover:text-white"
            >
              {l.hidden ? "🚫" : "👁"}
            </button>
            <button
              title="Duplicate"
              onClick={(e) => { e.stopPropagation(); onDuplicate(l.id); }}
              className="px-1 text-neutral-500 hover:text-white"
            >
              ⧉
            </button>
            <button
              title="Delete"
              onClick={(e) => { e.stopPropagation(); onDelete(l.id); }}
              className="px-1 text-neutral-500 hover:text-red-400"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
