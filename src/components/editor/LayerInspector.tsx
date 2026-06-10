"use client";

import { useEffect, useState, useTransition } from "react";
import type { Layer } from "@/lib/layer-types";
import { normalizeName } from "@/lib/layer-types";
import type { AddFontResult } from "@/app/(admin)/projects/[slug]/templates/[tslug]/font-actions";

// Curated popular Google families for the picker datalist (free-type still allowed).
const POPULAR_GOOGLE_FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway",
  "Oswald", "Merriweather", "Playfair Display", "Nunito", "Work Sans",
  "Source Sans 3", "Rubik", "Bebas Neue", "Archivo", "Manrope", "DM Sans",
  "Space Grotesk", "Pacifico", "Lobster", "Caveat", "Dancing Script",
  "Anton", "Josefin Sans", "Quicksand", "Mulish", "Karla", "Figtree",
];

const inp =
  "w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm outline-none focus:border-sky-500";
const lbl = "mb-1 block text-[11px] uppercase tracking-wide text-neutral-500";

export function LayerInspector({
  layer,
  fontFamilies,
  onChange,
  onAddGoogleFont,
}: {
  layer: Layer | null;
  fontFamilies: string[];
  onChange: (id: string, patch: Partial<Layer>) => void;
  onAddGoogleFont: (
    family: string,
    weight: number,
    italic: boolean
  ) => Promise<AddFontResult>;
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
        <TextProps
          layer={layer}
          fontFamilies={fontFamilies}
          set={set}
          num={num}
          onAddGoogleFont={onAddGoogleFont}
        />
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
  onAddGoogleFont,
}: {
  layer: Layer;
  fontFamilies: string[];
  set: (p: Partial<Layer>) => void;
  num: (v: string) => number;
  onAddGoogleFont: (
    family: string,
    weight: number,
    italic: boolean
  ) => Promise<AddFontResult>;
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
        <GoogleFontPicker layer={layer} set={set} onAddGoogleFont={onAddGoogleFont} />
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
          <ColorInput value={layer.fontColor ?? "#ffffff"} onChange={(c) => set({ fontColor: c })} />
        </Field>
        <Field label="Align">
          <select className={inp} value={layer.alignment ?? "left"} onChange={(e) => set({ alignment: e.target.value as Layer["alignment"] })}>
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Style">
          <select className={inp} value={layer.fontStyle ?? "normal"} onChange={(e) => set({ fontStyle: e.target.value as Layer["fontStyle"] })}>
            <option value="normal">Normal</option><option value="italic">Italic</option>
          </select>
        </Field>
        <Field label="Case">
          <select className={inp} value={layer.textTransform ?? "none"} onChange={(e) => set({ textTransform: e.target.value as Layer["textTransform"] })}>
            <option value="none">None</option>
            <option value="uppercase">UPPERCASE</option>
            <option value="lowercase">lowercase</option>
            <option value="titlecase">Title Case</option>
            <option value="small_caps">Sᴍᴀʟʟ Cᴀᴘs</option>
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

/** Inline Google-font add: fetches the family at the layer's weight/style, then selects it. */
function GoogleFontPicker({
  layer,
  set,
  onAddGoogleFont,
}: {
  layer: Layer;
  set: (p: Partial<Layer>) => void;
  onAddGoogleFont: (
    family: string,
    weight: number,
    italic: boolean
  ) => Promise<AddFontResult>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    const family = name.trim();
    if (!family) return;
    setError(null);
    start(async () => {
      const res = await onAddGoogleFont(
        family,
        layer.fontWeight ?? 400,
        layer.fontStyle === "italic"
      );
      if (res.ok) {
        set({ fontFamily: res.font.name });
        setName("");
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <input
          list="google-fonts"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add Google font…"
          spellCheck={false}
          className={inp}
        />
        <datalist id="google-fonts">
          {POPULAR_GOOGLE_FONTS.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={add}
          disabled={pending || !name.trim()}
          className="shrink-0 rounded-md bg-neutral-700 px-3 text-sm text-white transition hover:bg-neutral-600 disabled:opacity-50"
        >
          {pending ? "…" : "Add"}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-neutral-600">
        Pulls the {layer.fontWeight ?? 400}
        {layer.fontStyle === "italic" ? " italic" : ""} weight for this layer.
      </p>
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

/** Expand/validate a user hex string → "#rrggbb" or null. Accepts #rgb, rgb, #rrggbb. */
function normalizeHex(input: string): string | null {
  let h = input.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(h)) h = h.split("").map((c) => c + c).join("");
  if (/^[0-9a-f]{6}$/.test(h)) return `#${h}`;
  return null;
}

/** Color swatch + pasteable hex text field, kept in sync. */
function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [text, setText] = useState(value);

  // reflect external changes (e.g. switching selected layer)
  useEffect(() => setText(value), [value]);

  function commit(raw: string) {
    const hex = normalizeHex(raw);
    if (hex) {
      onChange(hex);
      setText(hex);
    } else {
      setText(value); // revert invalid input
    }
  }

  const valid = normalizeHex(text);

  return (
    <div className="flex gap-2">
      <input
        type="color"
        aria-label="Color picker"
        className="h-8 w-9 shrink-0 rounded-md border border-neutral-700 bg-neutral-800"
        value={valid ?? value}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
        }}
      />
      <input
        className={inp}
        value={text}
        spellCheck={false}
        placeholder="#ffffff"
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
        }}
      />
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
