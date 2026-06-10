import "server-only";
import {
  createCanvas,
  loadImage,
  type SKRSContext2D,
  type Image,
} from "@napi-rs/canvas";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import type { Layer, Align, VAlign, OverflowMode } from "@/lib/layer-types";
import { resolveStoragePath, storageHost } from "@/lib/storage";
import { registerAllFonts } from "./fonts";
import { env } from "@/lib/env";

export type RenderFormat = "png" | "jpeg" | "webp";
export type Quality = "low" | "medium" | "high";

export type RenderTemplate = {
  width: number;
  height: number;
  baseImageUrl: string | null;
  outputFormat: string;
  defaultQuality: string;
  dpi: number;
};

export type RenderResult = {
  buffer: Buffer;
  format: RenderFormat;
  width: number;
  height: number;
  durationMs: number;
};

export class RenderError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

const IMAGE_MAX_BYTES = 15 * 1024 * 1024;

export async function renderTemplate(opts: {
  template: RenderTemplate;
  layers: Layer[];
  values: Record<string, string | undefined>;
  format?: RenderFormat;
  quality?: Quality;
}): Promise<RenderResult> {
  const t0 = performance.now();
  const { template, layers, values } = opts;
  const W = template.width;
  const H = template.height;

  await registerAllFonts();

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // base image (or transparent)
  if (template.baseImageUrl) {
    const buf = await resolveImageBuffer(template.baseImageUrl);
    if (buf) {
      const img = await loadImage(buf);
      ctx.drawImage(img, 0, 0, W, H);
    }
  }

  // layers in z-order, skip hidden
  const ordered = [...layers].filter((l) => !l.hidden).sort((a, b) => a.zIndex - b.zIndex);
  for (const layer of ordered) {
    const value = resolveValue(layer, values);
    if (layer.type === "text") {
      if (value == null || value === "") continue; // empty text → nothing to draw
      drawTextLayer(ctx, layer, value, W, H);
    } else {
      if (value == null || value === "") continue; // no image → leave placeholder empty
      await drawImageLayer(ctx, layer, value);
    }
  }

  const raw = canvas.toBuffer("image/png");
  const format = opts.format ?? normFormat(template.outputFormat);
  const quality = opts.quality ?? normQuality(template.defaultQuality);
  const buffer = await encode(raw, format, quality, template.dpi);

  return {
    buffer,
    format,
    width: W,
    height: H,
    durationMs: Math.round(performance.now() - t0),
  };
}

/** Dynamic layer → API value, else default. Static layer → default. Required check. */
function resolveValue(
  layer: Layer,
  values: Record<string, string | undefined>
): string | null {
  const supplied = layer.isDynamic ? values[layer.name] : undefined;
  const v = supplied ?? layer.defaultValue ?? null;
  if (
    layer.isDynamic &&
    (v == null || v === "") &&
    (layer.defaultValue == null || layer.defaultValue === "")
  ) {
    // dynamic with no supplied value and no default: treat as optional-empty.
    // Strictness is enforced at the API layer (MISSING_LAYER_VALUE) when desired.
    return null;
  }
  return v;
}

// ---------------------------------------------------------------- text
function drawTextLayer(
  ctx: SKRSContext2D,
  l: Layer,
  text: string,
  canvasW: number,
  canvasH: number
) {
  const family = l.fontFamily ? `"${l.fontFamily}"` : "sans-serif";
  const weight = l.fontWeight ?? 400;
  const baseSize = l.fontSize ?? 24;
  const lineHeightMul = l.lineHeight ?? 1.2;
  const align = l.alignment ?? "left";
  const valign = l.verticalAlign ?? "top";
  const overflow = l.overflowMode ?? "scale_down";
  const autoResize = l.autoResize ?? false;
  const minSize = 12;

  const transform = l.textTransform ?? "none";
  const style = l.fontStyle === "italic" ? "italic " : "";
  // case transforms change the string; small-caps is emulated (skia ignores the
  // small-caps font-variant), so it keeps the string and renders per-char below.
  text = applyTextTransform(text, transform);

  ctx.save();
  ctx.globalAlpha = (l.opacity ?? 100) / 100;
  // letter spacing (skia supports the property)
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${l.letterSpacing ?? 0}px`;
  } catch {
    /* not supported — ignore */
  }

  // CSS font shorthand: [style] [weight] size family
  const fontAt = (size: number) => `${style}${weight} ${size}px ${family}`;

  if (transform === "small_caps") {
    ctx.fillStyle = l.fontColor ?? "#000000";
    drawSmallCaps(ctx, l, text, fontAt, {
      baseSize,
      lineHeightMul,
      align,
      valign,
      overflow,
      autoResize,
      minSize,
    });
    ctx.restore();
    return;
  }

  const measureAt = (size: number) => {
    ctx.font = fontAt(size);
    const lines = wrap(ctx, text, l.width);
    const lineH = size * lineHeightMul;
    return { lines, lineH, totalH: lines.length * lineH };
  };

  let size = baseSize;
  let result = measureAt(size);

  if (autoResize || overflow === "scale_down") {
    while (size > minSize) {
      const fitsH = result.totalH <= l.height;
      const fitsLines = !l.maxLines || result.lines.length <= l.maxLines;
      if (fitsH && fitsLines) break;
      size -= 2;
      result = measureAt(size);
    }
  }

  let lines = result.lines;
  const lineH = result.lineH;
  const maxByH = Math.max(1, Math.floor(l.height / lineH));
  const cap =
    overflow === "expand_height"
      ? lines.length
      : Math.min(l.maxLines ?? Infinity, maxByH);

  if (overflow === "truncate" || (overflow === "scale_down" && lines.length > cap)) {
    lines = ellipsize(ctx, lines, cap === Infinity ? lines.length : cap, l.width);
  } else if (l.maxLines && lines.length > l.maxLines && overflow !== "expand_height") {
    lines = lines.slice(0, l.maxLines);
  }

  ctx.font = fontAt(size);
  ctx.fillStyle = l.fontColor ?? "#000000";
  ctx.textBaseline = "top";
  ctx.textAlign = align;

  const totalH = lines.length * lineH;
  let oy = l.y;
  if (valign === "middle") oy = l.y + (l.height - totalH) / 2;
  else if (valign === "bottom") oy = l.y + (l.height - totalH);

  const ax = align === "left" ? l.x : align === "right" ? l.x + l.width : l.x + l.width / 2;
  lines.forEach((line, i) => {
    const ly = oy + i * lineH + (lineH - size) / 2;
    ctx.fillText(line, ax, ly, canvasW); // canvasW as a sane maxWidth guard
  });
  void canvasH;
  ctx.restore();
}

/**
 * Emulated small-caps: lowercase letters become uppercase glyphs at a reduced
 * size; everything else stays full size. Skia ignores the small-caps font
 * variant, so we lay out and draw per character. Honors wrap, scale_down,
 * alignment, and vertical align (letter-spacing applies via ctx property).
 */
const CAP_SCALE = 0.78;
function isLowerLetter(ch: string): boolean {
  return ch.toLowerCase() === ch && ch.toUpperCase() !== ch;
}

function drawSmallCaps(
  ctx: SKRSContext2D,
  l: Layer,
  text: string,
  fontAt: (size: number) => string,
  o: {
    baseSize: number;
    lineHeightMul: number;
    align: Align;
    valign: VAlign;
    overflow: OverflowMode;
    autoResize: boolean;
    minSize: number;
  }
) {
  const glyph = (ch: string) => (isLowerLetter(ch) ? ch.toUpperCase() : ch);
  const setFontFor = (ch: string, size: number) =>
    (ctx.font = fontAt(isLowerLetter(ch) ? size * CAP_SCALE : size));

  const measure = (token: string, size: number) => {
    let w = 0;
    for (const ch of token) {
      setFontFor(ch, size);
      w += ctx.measureText(glyph(ch)).width;
    }
    return w;
  };

  const wrapSC = (size: number): string[] => {
    const lines: string[] = [];
    for (const para of text.split("\n")) {
      const words = para.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        lines.push("");
        continue;
      }
      let line = words[0];
      for (let i = 1; i < words.length; i++) {
        const test = `${line} ${words[i]}`;
        if (measure(test, size) <= l.width) line = test;
        else {
          lines.push(line);
          line = words[i];
        }
      }
      lines.push(line);
    }
    return lines;
  };

  let size = o.baseSize;
  let lines = wrapSC(size);
  if (o.autoResize || o.overflow === "scale_down") {
    while (size > o.minSize) {
      const totalH = lines.length * size * o.lineHeightMul;
      const fitsH = totalH <= l.height;
      const fitsLines = !l.maxLines || lines.length <= l.maxLines;
      if (fitsH && fitsLines) break;
      size -= 2;
      lines = wrapSC(size);
    }
  }
  if (l.maxLines && lines.length > l.maxLines && o.overflow !== "expand_height") {
    lines = lines.slice(0, l.maxLines);
  }

  const lineH = size * o.lineHeightMul;
  const totalH = lines.length * lineH;
  let oy = l.y;
  if (o.valign === "middle") oy = l.y + (l.height - totalH) / 2;
  else if (o.valign === "bottom") oy = l.y + (l.height - totalH);

  ctx.textBaseline = "top";
  ctx.textAlign = "left"; // chars are placed manually

  lines.forEach((line, i) => {
    const lineW = measure(line, size);
    const startX =
      o.align === "left"
        ? l.x
        : o.align === "right"
          ? l.x + l.width - lineW
          : l.x + (l.width - lineW) / 2;
    const ly = oy + i * lineH + (lineH - size) / 2;
    let x = startX;
    for (const ch of line) {
      const lower = isLowerLetter(ch);
      const chSize = lower ? size * CAP_SCALE : size;
      setFontFor(ch, size);
      const g = glyph(ch);
      // bottom-align smaller caps to share the baseline with full-size glyphs
      ctx.fillText(g, x, ly + (size - chSize));
      x += ctx.measureText(g).width;
    }
  });
}

function applyTextTransform(text: string, transform: string): string {
  switch (transform) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "titlecase":
      // capitalize first letter of each word; lowercase the rest
      return text.replace(
        /\p{L}[\p{L}\p{M}'’]*/gu,
        (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      );
    // "small_caps" handled via the font-variant token; "none" → unchanged
    default:
      return text;
  }
}

function wrap(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const test = `${line} ${words[i]}`;
      if (ctx.measureText(test).width <= maxWidth) line = test;
      else {
        lines.push(line);
        line = words[i];
      }
    }
    lines.push(line);
  }
  return lines;
}

function ellipsize(
  ctx: SKRSContext2D,
  lines: string[],
  maxLines: number,
  maxWidth: number
): string[] {
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.length > 0 && ctx.measureText(last + "…").width > maxWidth) {
    last = last.slice(0, -1);
  }
  kept[maxLines - 1] = last.replace(/\s+$/, "") + "…";
  return kept;
}

// --------------------------------------------------------------- images
async function drawImageLayer(ctx: SKRSContext2D, l: Layer, src: string) {
  const buf = await resolveImageBuffer(src);
  if (!buf) return;
  let img: Image;
  try {
    img = await loadImage(buf);
  } catch {
    throw new RenderError("INVALID_IMAGE_SOURCE", `Could not decode image for layer "${l.name}".`);
  }

  const radius = l.borderRadius ?? 0;
  ctx.save();
  ctx.globalAlpha = (l.opacity ?? 100) / 100;

  // clip to (rounded) box
  ctx.beginPath();
  if (radius > 0) ctx.roundRect(l.x, l.y, l.width, l.height, radius);
  else ctx.rect(l.x, l.y, l.width, l.height);
  ctx.clip();

  const fit = l.fitMode ?? "cover";
  if (fit === "stretch") {
    ctx.drawImage(img, l.x, l.y, l.width, l.height);
  } else {
    const scale =
      fit === "cover"
        ? Math.max(l.width / img.width, l.height / img.height)
        : Math.min(l.width / img.width, l.height / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = l.x + (l.width - dw) / 2;
    const dy = l.y + (l.height - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  ctx.restore();
}

/** Resolve any allowed image source to a Buffer. */
async function resolveImageBuffer(src: string): Promise<Buffer | null> {
  if (!src) return null;

  // data URI
  if (src.startsWith("data:")) {
    const comma = src.indexOf(",");
    if (comma < 0) throw new RenderError("INVALID_IMAGE_SOURCE", "Malformed data URI.");
    return Buffer.from(src.slice(comma + 1), "base64");
  }

  // internal file route → local storage
  if (src.startsWith("/api/files/")) {
    const parts = src.replace(/^\/api\/files\//, "").split("?")[0].split("/");
    const abs = resolveStoragePath(parts);
    if (!abs) throw new RenderError("INVALID_IMAGE_SOURCE", "Bad internal image path.");
    try {
      return await readFile(abs);
    } catch {
      throw new RenderError("INVALID_IMAGE_SOURCE", "Internal image not found.");
    }
  }

  // remote URL — allowlist + size/type guard
  if (/^https?:\/\//i.test(src)) {
    let url: URL;
    try {
      url = new URL(src);
    } catch {
      throw new RenderError("INVALID_IMAGE_SOURCE", "Invalid image URL.");
    }
    // our own Supabase Storage host (base images / assets) is always allowed
    const ownHost = storageHost();
    const host = url.hostname.toLowerCase();
    const allow = env.imageAllowlist();
    if (host !== ownHost && allow.length > 0 && !allow.includes(host)) {
      throw new RenderError(
        "INVALID_IMAGE_SOURCE",
        `Image host not allowed: ${url.hostname}`,
        { host: url.hostname }
      );
    }
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok)
      throw new RenderError("INVALID_IMAGE_SOURCE", `Image fetch failed (${res.status}).`);
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/"))
      throw new RenderError("INVALID_IMAGE_SOURCE", `Not an image (${type}).`);
    const ab = await res.arrayBuffer();
    if (ab.byteLength > IMAGE_MAX_BYTES)
      throw new RenderError("INVALID_IMAGE_SOURCE", "Image too large.");
    return Buffer.from(ab);
  }

  throw new RenderError("INVALID_IMAGE_SOURCE", `Unsupported image source: ${src.slice(0, 40)}`);
}

// --------------------------------------------------------------- encode
function normFormat(f: string): RenderFormat {
  return f === "jpeg" || f === "jpg" ? "jpeg" : f === "webp" ? "webp" : "png";
}
function normQuality(q: string): Quality {
  return q === "low" || q === "medium" ? q : "high";
}

async function encode(
  raw: Buffer,
  format: RenderFormat,
  quality: Quality,
  dpi: number
): Promise<Buffer> {
  const q = quality === "low" ? 60 : quality === "medium" ? 80 : 92;
  let s = sharp(raw).withMetadata({ density: dpi });
  if (format === "jpeg") s = s.jpeg({ quality: q });
  else if (format === "webp") s = s.webp({ quality: q });
  else s = s.png({ compressionLevel: quality === "low" ? 9 : 6 });
  return s.toBuffer();
}
