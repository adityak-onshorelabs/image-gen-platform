"use client";

import { useMemo, useState, useTransition } from "react";
import type { Layer } from "@/lib/layer-types";
import { previewAction } from "@/app/(admin)/projects/[slug]/templates/[tslug]/preview-actions";

/**
 * M6 preview panel. Lists one input per dynamic layer (prefilled with its
 * default), renders the current editor layer state in-memory, shows the image.
 */
export function PreviewPanel({
  templateId,
  layers,
}: {
  templateId: string;
  layers: Layer[];
}) {
  const dynamicLayers = useMemo(
    () => layers.filter((l) => l.isDynamic),
    [layers]
  );

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(dynamicLayers.map((l) => [l.name, l.defaultValue ?? ""]))
  );
  const [img, setImg] = useState<string | null>(null);
  const [dur, setDur] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function generate() {
    setErr(null);
    start(async () => {
      // include defaults for any layer the user didn't touch
      const merged: Record<string, string> = {};
      for (const l of dynamicLayers) {
        const v = values[l.name];
        merged[l.name] = v != null && v !== "" ? v : l.defaultValue ?? "";
      }
      const res = await previewAction(templateId, layers, merged);
      if (res.ok) {
        setImg(res.dataUri);
        setDur(res.durationMs);
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 px-4 py-3">
        <div className="text-sm font-medium text-neutral-200">Preview</div>
        <div className="text-xs text-neutral-500">
          In-memory render of current layers. Not saved.
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {dynamicLayers.length === 0 && (
          <p className="text-xs text-neutral-500">
            No dynamic layers. Mark a layer dynamic to feed it preview values.
          </p>
        )}
        {dynamicLayers.map((l) => (
          <label key={l.id} className="block">
            <span className="mb-1 block text-xs text-neutral-400">
              {l.name}
              <span className="ml-1 text-neutral-600">({l.type})</span>
            </span>
            <input
              value={values[l.name] ?? ""}
              onChange={(e) =>
                setValues((p) => ({ ...p, [l.name]: e.target.value }))
              }
              placeholder={
                l.type === "image" ? "image URL or data URI" : l.defaultValue ?? ""
              }
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-sky-500"
            />
          </label>
        ))}

        <button
          onClick={generate}
          disabled={pending}
          className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-sky-400 disabled:opacity-50"
        >
          {pending ? "Rendering…" : "Generate Preview"}
        </button>

        {err && <p className="text-xs text-red-400">{err}</p>}

        {img && (
          <div className="space-y-2">
            {dur != null && (
              <div className="text-xs text-neutral-500">Rendered in {dur}ms</div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt="preview"
              className="w-full rounded-lg border border-neutral-800"
            />
            <a
              href={img}
              download="preview.png"
              className="block rounded-md border border-neutral-700 px-3 py-1.5 text-center text-xs text-neutral-300 transition hover:bg-neutral-900"
            >
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
