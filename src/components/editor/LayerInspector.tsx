"use client";

import type { Layer } from "@/lib/layer-types";
import { normalizeName } from "@/lib/layer-types";

const inp =
  "w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm outline-none focus:border-sky-500";
const lbl = "mb-1 block text-[11px] uppercase tracking-wide text-neutral-500";

export function LayerInspector({
  layer,
  fontFamilies,
  onChange,
}: {
  layer: Layer | null;
  fontFamilies: string[];
  onChange: (id: string, patch: Partial<Layer>) => void;
}) {
  if (!layer)
    return (
      <div className="p-4 text-sm text-neutral-600">
        Select a layer to edit its properties.
      </div>
    );

  const set = (patch: Partial<Layer>) => onChange(layer.id, patch);
  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="space-y-4 overflow-auto p-4">
      <div>
        <label className={lbl}>Layer name (API key)</label>
        <input
          className={inp}
          defaultValue={layer.name}
          key={layer.id + layer.name}
          onBlur={(e) => set({ name: normalizeName(e.target.value) || layer.name })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={layer.isDynamic}
          onChange={(e) => set({ isDynamic: e.target.checked })}
        />
        Dynamic (value supplied via API)
      </label>

      <div>
        <label className={lbl}>
          {layer.type === "text" ? "Default text" : "Default image URL"}
        </label>
        <input
          className={inp}
          value={layer.defaultValue ?? ""}
          onChange={(e) => set({ defaultValue: e.target.value || null })}
        />
      </div>

      {/* geometry */}
      <div className="grid grid-cols-4 gap-2">
        <Field label="X"><input className={inp} type="number" value={layer.x} onChange={(e) => set({ x: num(e.target.value) })} /></Field>
        <Field label="Y"><input className={inp} type="number" value={layer.y} onChange={(e) => set({ y: num(e.target.value) })} /></Field>
        <Field label="W"><input className={inp} type="number" value={layer.width} onChange={(e) => set({ width: num(e.target.value) })} /></Field>
        <Field label="H"><input className={inp} type="number" value={layer.height} onChange={(e) => set({ height: num(e.target.value) })} /></Field>
      </div>

      <div>
        <label className={lbl}>Opacity ({layer.opacity}%)</label>
        <input
          type="range"
          min={0}
          max={100}
          value={layer.opacity}
          onChange={(e) => set({ opacity: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {layer.type === "text" ? (
        <TextProps layer={layer} fontFamilies={fontFamilies} set={set} num={num} />
      ) : (
        <ImageProps layer={layer} set={set} num={num} />
      )}
    </div>
  );
}

function TextProps({
  layer,
  fontFamilies,
  set,
  num,
}: {
  layer: Layer;
  fontFamilies: string[];
  set: (p: Partial<Layer>) => void;
  num: (v: string) => number;
}) {
  return (
    <div className="space-y-4 border-t border-neutral-800 pt-4">
      <div>
        <label className={lbl}>Font family</label>
        <select
          className={inp}
          value={layer.fontFamily ?? ""}
          onChange={(e) => set({ fontFamily: e.target.value || null })}
        >
          <option value="">System default</option>
          {fontFamilies.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Size (px)"><input className={inp} type="number" value={layer.fontSize ?? 0} onChange={(e) => set({ fontSize: num(e.target.value) })} /></Field>
        <Field label="Weight">
          <select className={inp} value={layer.fontWeight ?? 400} onChange={(e) => set({ fontWeight: Number(e.target.value) })}>
            {[100,200,300,400,500,600,700,800,900].map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Color">
          <input className="h-8 w-full rounded-md border border-neutral-700 bg-neutral-800" type="color" value={layer.fontColor ?? "#ffffff"} onChange={(e) => set({ fontColor: e.target.value })} />
        </Field>
        <Field label="Align">
          <select className={inp} value={layer.alignment ?? "left"} onChange={(e) => set({ alignment: e.target.value as Layer["alignment"] })}>
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Vertical align">
          <select className={inp} value={layer.verticalAlign ?? "top"} onChange={(e) => set({ verticalAlign: e.target.value as Layer["verticalAlign"] })}>
            <option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option>
          </select>
        </Field>
        <Field label="Line height">
          <input className={inp} type="number" step="0.05" value={layer.lineHeight ?? 1.2} onChange={(e) => set({ lineHeight: Number(e.target.value) })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Letter spacing"><input className={inp} type="number" step="0.5" value={layer.letterSpacing ?? 0} onChange={(e) => set({ letterSpacing: Number(e.target.value) })} /></Field>
        <Field label="Max lines"><input className={inp} type="number" value={layer.maxLines ?? 0} onChange={(e) => set({ maxLines: num(e.target.value) })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Overflow">
          <select className={inp} value={layer.overflowMode ?? "scale_down"} onChange={(e) => set({ overflowMode: e.target.value as Layer["overflowMode"] })}>
            <option value="scale_down">Scale down</option><option value="truncate">Truncate</option><option value="expand_height">Expand height</option>
          </select>
        </Field>
        <Field label="Auto resize">
          <label className="flex h-8 items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" checked={!!layer.autoResize} onChange={(e) => set({ autoResize: e.target.checked })} /> Enabled
          </label>
        </Field>
      </div>
    </div>
  );
}

function ImageProps({
  layer,
  set,
  num,
}: {
  layer: Layer;
  set: (p: Partial<Layer>) => void;
  num: (v: string) => number;
}) {
  return (
    <div className="space-y-4 border-t border-neutral-800 pt-4">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Fit mode">
          <select className={inp} value={layer.fitMode ?? "cover"} onChange={(e) => set({ fitMode: e.target.value as Layer["fitMode"] })}>
            <option value="cover">Cover</option><option value="contain">Contain</option><option value="stretch">Stretch</option>
          </select>
        </Field>
        <Field label="Border radius"><input className={inp} type="number" value={layer.borderRadius ?? 0} onChange={(e) => set({ borderRadius: num(e.target.value) })} /></Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      {children}
    </div>
  );
}
