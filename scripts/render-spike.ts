/**
 * Render spike — Phase 0 engine de-risk (FRD §13/§15, BUILD-PLAN 0.3/0.4).
 *
 * Proves the real rendering path WITHOUT the app/DB:
 *   base image  +  custom registered font
 *   +  wrapped, auto-resized text box
 *   +  composited circular ("cover"-fit) image
 *   ->  PNG + WEBP via Sharp, with DPI metadata.
 *
 * Validates: exact font registration, multi-line wrap, measure-and-shrink
 * auto-resize, truncate overflow, <3s render time.
 *
 * Run:  npm run spike
 */
import {
  createCanvas,
  GlobalFonts,
  type SKRSContext2D,
  type Canvas,
} from "@napi-rs/canvas";
import sharp from "sharp";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "scripts", "out");
const W = 1080;
const H = 1080;

// ---- Font registration (stands in for admin-uploaded Figma fonts) ----
// Phase 0 uses Windows system fonts as the "uploaded" files.
function registerFonts() {
  const candidates: Array<[string, string]> = [
    ["C:\\Windows\\Fonts\\arialbd.ttf", "Brand"], // bold weight -> family "Brand"
    ["C:\\Windows\\Fonts\\arial.ttf", "Brand"],
    ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "Brand"],
    ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "Brand"],
  ];
  let registered = 0;
  for (const [path, family] of candidates) {
    if (existsSync(path)) {
      GlobalFonts.registerFromPath(path, family);
      registered++;
    }
  }
  if (registered === 0) {
    console.warn("[spike] No font files found — falling back to system default.");
  }
  return registered > 0 ? "Brand" : GlobalFonts.families[0]?.family ?? "sans-serif";
}

// ---------------------------------------------------------------------------
// Reusable text layout (this logic moves to the engine in Milestone 5).
// ---------------------------------------------------------------------------
type TextOpts = {
  text: string;
  fontFamily: string;
  fontSize: number; // base size before auto-resize
  fontWeight: number;
  color: string;
  align: "left" | "center" | "right";
  valign: "top" | "middle" | "bottom";
  lineHeight: number; // multiplier
  maxLines?: number;
  autoResize: boolean;
  overflow: "scale_down" | "truncate" | "expand_height";
  minFontSize?: number;
};

function wrap(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number
): string[] {
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
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
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

type Layout = { lines: string[]; size: number; lineH: number; boxH: number };

function layoutText(
  ctx: SKRSContext2D,
  o: TextOpts,
  boxW: number,
  boxH: number
): Layout {
  const min = o.minFontSize ?? 14;
  let size = o.fontSize;

  const measureAt = (s: number) => {
    ctx.font = `${o.fontWeight} ${s}px "${o.fontFamily}"`;
    const lines = wrap(ctx, o.text, boxW);
    const lineH = s * o.lineHeight;
    return { lines, lineH, totalH: lines.length * lineH };
  };

  if (o.autoResize || o.overflow === "scale_down") {
    while (size >= min) {
      const { lines, lineH, totalH } = measureAt(size);
      const fitsH = totalH <= boxH;
      const fitsLines = !o.maxLines || lines.length <= o.maxLines;
      if (fitsH && fitsLines) return { lines, size, lineH, boxH };
      size -= 2;
    }
  }

  // Hit floor (or no auto-resize): apply overflow mode at min size.
  const { lines, lineH } = measureAt(Math.max(size, min));
  const maxByH = Math.max(1, Math.floor(boxH / lineH));
  const cap = Math.min(o.maxLines ?? Infinity, maxByH);

  if (o.overflow === "expand_height") {
    return { lines, size: Math.max(size, min), lineH, boxH: lines.length * lineH };
  }
  // truncate (also the safety fallback for scale_down that never fit)
  const trimmed = ellipsize(ctx, lines, cap === Infinity ? lines.length : cap, boxW);
  return { lines: trimmed, size: Math.max(size, min), lineH, boxH };
}

function drawText(
  ctx: SKRSContext2D,
  o: TextOpts,
  x: number,
  y: number,
  boxW: number,
  boxH: number
): Layout {
  const lay = layoutText(ctx, o, boxW, boxH);
  ctx.fillStyle = o.color;
  ctx.font = `${o.fontWeight} ${lay.size}px "${o.fontFamily}"`;
  ctx.textBaseline = "top";
  ctx.textAlign = o.align;

  const totalH = lay.lines.length * lay.lineH;
  let oy = y;
  if (o.valign === "middle") oy = y + (boxH - totalH) / 2;
  else if (o.valign === "bottom") oy = y + (boxH - totalH);

  const ax = o.align === "left" ? x : o.align === "right" ? x + boxW : x + boxW / 2;
  lay.lines.forEach((line, i) => {
    // vertically center text within its line box
    const ly = oy + i * lay.lineH + (lay.lineH - lay.size) / 2;
    ctx.fillText(line, ax, ly);
  });
  return lay;
}

// ---- circular "cover"-fit image composite ----
function drawCircularCover(
  ctx: SKRSContext2D,
  img: Canvas,
  cx: number,
  cy: number,
  d: number
) {
  const r = d / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx + r, cy + r, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  // cover: scale source to fill the circle's bounding box
  const scale = Math.max(d / img.width, d / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  ctx.drawImage(img, cx + (d - sw) / 2, cy + (d - sh) / 2, sw, sh);
  ctx.restore();
}

// ---- synthesize a base template (stands in for Figma export) ----
function makeBaseTemplate(family: string): Canvas {
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0f172a");
  g.addColorStop(1, "#1e293b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // accent bar
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(0, 0, W, 12);
  // brand mark
  ctx.fillStyle = "#94a3b8";
  ctx.font = `700 28px "${family}"`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("ONSHORE LABS", 72, 64);
  return c;
}

// ---- synthesize a profile image (stands in for a fetched remote image) ----
function makeProfileImage(family: string): Canvas {
  const c = createCanvas(400, 400);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(0, 0, 400, 400);
  ctx.fillStyle = "#1e293b";
  ctx.font = `700 180px "${family}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("AK", 200, 210);
  return c;
}

async function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const t0 = performance.now();

  const family = registerFonts();
  console.log(`[spike] font family: "${family}"`);

  // 1. base template
  const canvas = makeBaseTemplate(family);
  const ctx = canvas.getContext("2d");

  // 2. dynamic text layers
  drawText(
    ctx,
    {
      text: "YOUR TRIP IS FUNDED",
      fontFamily: family,
      fontSize: 96,
      fontWeight: 800,
      color: "#f8fafc",
      align: "left",
      valign: "top",
      lineHeight: 1.05,
      maxLines: 2,
      autoResize: true,
      overflow: "scale_down",
    },
    72,
    220,
    760,
    260
  );

  drawText(
    ctx,
    {
      text: "You already have the money.",
      fontFamily: family,
      fontSize: 44,
      fontWeight: 600,
      color: "#38bdf8",
      align: "left",
      valign: "top",
      lineHeight: 1.2,
      maxLines: 2,
      autoResize: true,
      overflow: "scale_down",
    },
    72,
    500,
    760,
    120
  );

  // long content — exercises wrap + auto-resize + truncate fallback
  drawText(
    ctx,
    {
      text:
        "Most people earning $70k+ are sitting on $200-400 a month in forgotten subscriptions, " +
        "duplicate fees, and silent price creep. MoneyPath finds it, cancels it, and routes the " +
        "savings straight into your next trip — automatically, every single month, no spreadsheets.",
      fontFamily: family,
      fontSize: 40,
      fontWeight: 400,
      color: "#cbd5e1",
      align: "left",
      valign: "top",
      lineHeight: 1.35,
      maxLines: 6,
      autoResize: true,
      overflow: "truncate",
    },
    72,
    660,
    760,
    300
  );

  // 3. circular profile image (cover fit)
  const profile = makeProfileImage(family);
  drawCircularCover(ctx, profile, 880, 64, 128);

  // 4. encode via Sharp (PNG + WEBP) with DPI metadata
  const raw = canvas.toBuffer("image/png");
  const png = await sharp(raw).withMetadata({ density: 72 }).png().toBuffer();
  const webp = await sharp(raw).webp({ quality: 90 }).toBuffer();

  writeFileSync(join(OUT, "spike.png"), png);
  writeFileSync(join(OUT, "spike.webp"), webp);

  const ms = Math.round(performance.now() - t0);
  console.log(`[spike] PNG  ${(png.length / 1024).toFixed(0)} KB`);
  console.log(`[spike] WEBP ${(webp.length / 1024).toFixed(0)} KB`);
  console.log(`[spike] total render time: ${ms} ms (target <3000)`);
  console.log(`[spike] output: ${OUT}`);
  if (ms > 3000) {
    console.warn("[spike] ⚠ exceeded 3s target — investigate before Milestone 5.");
    process.exitCode = 1;
  } else {
    console.log("[spike] ✓ within 3s target");
  }
}

main().catch((e) => {
  console.error("[spike] FAILED:", e);
  process.exit(1);
});
