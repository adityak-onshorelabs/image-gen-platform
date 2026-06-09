"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  type Layer,
  newTextLayer,
  newImageLayer,
  duplicateLayer,
} from "@/lib/layer-types";
import { saveLayersAction } from "@/app/(admin)/projects/[slug]/templates/[tslug]/editor-actions";
import { EditorCanvas } from "./EditorCanvas";
import { LayersPanel } from "./LayersPanel";
import { LayerInspector } from "./LayerInspector";

type Tool = "select" | "text" | "image";
type FontDef = { name: string; weight: number; style: string; fileUrl: string };

export function TemplateEditor({
  templateId,
  projectSlug,
  tslug,
  width,
  height,
  baseImageUrl,
  version,
  initialLayers,
  fonts,
}: {
  templateId: string;
  projectSlug: string;
  tslug: string;
  width: number;
  height: number;
  baseImageUrl: string | null;
  version: number;
  initialLayers: Layer[];
  fonts: FontDef[];
}) {
  const [layers, setLayers] = useState<Layer[]>(initialLayers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fontFamilies = useMemo(
    () => [...new Set(fonts.map((f) => f.name))],
    [fonts]
  );
  const selected = layers.find((l) => l.id === selectedId) ?? null;

  const mutate = useCallback((fn: (prev: Layer[]) => Layer[]) => {
    setLayers((prev) => fn(prev));
    setDirty(true);
    setMsg(null);
  }, []);

  const onChange = useCallback(
    (id: string, patch: Partial<Layer>) =>
      mutate((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l))),
    [mutate]
  );

  const onCreate = useCallback(
    (box: { x: number; y: number; width: number; height: number }) => {
      mutate((prev) => {
        const names = new Set(prev.map((l) => l.name));
        const z = prev.length;
        const layer =
          tool === "text"
            ? newTextLayer(box, z, names, fontFamilies[0] ?? null)
            : newImageLayer(box, z, names);
        setSelectedId(layer.id);
        return [...prev, layer];
      });
      setTool("select");
    },
    [mutate, tool, fontFamilies]
  );

  const onDuplicate = useCallback(
    (id: string) =>
      mutate((prev) => {
        const src = prev.find((l) => l.id === id);
        if (!src) return prev;
        const copy = duplicateLayer(src, prev.length, new Set(prev.map((l) => l.name)));
        setSelectedId(copy.id);
        return [...prev, copy];
      }),
    [mutate]
  );

  const onDelete = useCallback(
    (id: string) =>
      mutate((prev) => {
        setSelectedId((s) => (s === id ? null : s));
        return prev.filter((l) => l.id !== id);
      }),
    [mutate]
  );

  const onToggleHidden = useCallback(
    (id: string) =>
      mutate((prev) => prev.map((l) => (l.id === id ? { ...l, hidden: !l.hidden } : l))),
    [mutate]
  );

  // dir +1 = up in stack (toward array end / higher z)
  const onReorder = useCallback(
    (id: string, dir: -1 | 1) =>
      mutate((prev) => {
        const i = prev.findIndex((l) => l.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= prev.length) return prev;
        const next = [...prev];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      }),
    [mutate]
  );

  // keyboard delete
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"))
        return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        onDelete(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, onDelete]);

  function save() {
    startTransition(async () => {
      const res = await saveLayersAction(templateId, projectSlug, tslug, layers);
      if (res.ok) {
        setDirty(false);
        setMsg("Saved.");
      } else {
        setMsg(res.error ?? "Save failed.");
      }
    });
  }

  const fontFaces = fonts
    .map(
      (f) =>
        `@font-face{font-family:"${f.name}";font-weight:${f.weight};font-style:${f.style};src:url("${f.fileUrl}");font-display:swap;}`
    )
    .join("\n");

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800">
      {fontFaces && <style dangerouslySetInnerHTML={{ __html: fontFaces }} />}

      {/* toolbar */}
      <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-3 py-2">
        <ToolBtn active={tool === "select"} onClick={() => setTool("select")}>Select</ToolBtn>
        <ToolBtn active={tool === "text"} onClick={() => setTool("text")}>+ Text</ToolBtn>
        <ToolBtn active={tool === "image"} onClick={() => setTool("image")}>+ Image</ToolBtn>
        {tool !== "select" && (
          <span className="text-xs text-sky-400">Draw a box on the canvas…</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {msg && <span className="text-xs text-neutral-400">{msg}</span>}
          {dirty && <span className="text-xs text-amber-400">Unsaved</span>}
          <button
            onClick={save}
            disabled={pending || !dirty}
            className="rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-medium text-neutral-950 transition hover:bg-sky-400 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* 3-pane */}
      <div className="grid grid-cols-[200px_1fr_300px]">
        <div className="border-r border-neutral-800 bg-neutral-950">
          <LayersPanel
            layers={layers}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggleHidden={onToggleHidden}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onReorder={onReorder}
          />
        </div>
        <div className="bg-neutral-900 p-6">
          <EditorCanvas
            width={width}
            height={height}
            baseImageUrl={baseImageUrl}
            version={version}
            layers={layers}
            selectedId={selectedId}
            tool={tool}
            onSelect={setSelectedId}
            onChange={onChange}
            onCreate={onCreate}
          />
        </div>
        <div className="border-l border-neutral-800 bg-neutral-950">
          <LayerInspector layer={selected} fontFamilies={fontFamilies} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm transition ${
        active ? "bg-neutral-700 text-white" : "text-neutral-400 hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}
