// Shared Layer types — client-safe (no server-only imports).
// Single source of truth for editor, data layer, and render engine (M5).

export type LayerType = "text" | "image";
export type Align = "left" | "center" | "right";
export type VAlign = "top" | "middle" | "bottom";
export type OverflowMode = "scale_down" | "truncate" | "expand_height";
export type FitMode = "cover" | "contain" | "stretch";

export interface Layer {
  id: string; // uuid (browser-generated for new layers)
  name: string; // API key; unique within template
  type: LayerType;
  isDynamic: boolean;
  defaultValue: string | null;

  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  opacity: number; // 0..100
  hidden: boolean;

  // text-only
  fontFamily: string | null;
  fontSize: number | null;
  fontWeight: number | null;
  fontColor: string | null;
  alignment: Align | null;
  verticalAlign: VAlign | null;
  lineHeight: number | null;
  letterSpacing: number | null;
  maxLines: number | null;
  autoResize: boolean | null;
  overflowMode: OverflowMode | null;

  // image-only
  fitMode: FitMode | null;
  borderRadius: number | null;
}

let counter = 0;
function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `tmp-${Date.now()}-${counter++}`;
}

/** Unique-ish default name within a set of existing names. */
function freeName(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

export function newTextLayer(
  box: { x: number; y: number; width: number; height: number },
  zIndex: number,
  existingNames: Set<string>,
  fontFamily: string | null
): Layer {
  return {
    id: uid(),
    name: freeName("text", existingNames),
    type: "text",
    isDynamic: true,
    defaultValue: "Text",
    ...box,
    zIndex,
    opacity: 100,
    hidden: false,
    fontFamily,
    fontSize: Math.max(16, Math.round(box.height * 0.6)),
    fontWeight: 600,
    fontColor: "#ffffff",
    alignment: "left",
    verticalAlign: "top",
    lineHeight: 1.2,
    letterSpacing: 0,
    maxLines: 3,
    autoResize: true,
    overflowMode: "scale_down",
    fitMode: null,
    borderRadius: null,
  };
}

export function newImageLayer(
  box: { x: number; y: number; width: number; height: number },
  zIndex: number,
  existingNames: Set<string>
): Layer {
  return {
    id: uid(),
    name: freeName("image", existingNames),
    type: "image",
    isDynamic: true,
    defaultValue: null,
    ...box,
    zIndex,
    opacity: 100,
    hidden: false,
    fontFamily: null,
    fontSize: null,
    fontWeight: null,
    fontColor: null,
    alignment: null,
    verticalAlign: null,
    lineHeight: null,
    letterSpacing: null,
    maxLines: null,
    autoResize: null,
    overflowMode: null,
    fitMode: "cover",
    borderRadius: 0,
  };
}

export function duplicateLayer(
  src: Layer,
  zIndex: number,
  existingNames: Set<string>
): Layer {
  return {
    ...src,
    id: uid(),
    name: freeName(src.name, existingNames),
    x: src.x + 16,
    y: src.y + 16,
    zIndex,
  };
}

/** Normalize a layer name to the API-key rule: lowercase [a-z0-9_]. */
export function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}
