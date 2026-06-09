# Phase 0 Spike Notes — Rendering Engine

**Date:** 2026-06-09
**Result:** ✅ PASS — exit gate cleared. Proceed to Phase 1.

## What was tested

`npm run spike` → `scripts/render-spike.ts`. Self-contained (no DB/app). Renders 1080×1080:
base template + custom-registered font + 3 wrapped/auto-resized text layers + circular cover-fit image → PNG + WEBP via Sharp.

## Findings

| Risk (FRD §25 #1) | Result |
| ----------------- | ------ |
| Exact font registration | ✅ `GlobalFonts.registerFromPath(file, "Brand")` works; text renders in registered family, not system default. |
| Multi-line wrap | ✅ Greedy word-wrap on `measureText`; honors explicit `\n`. |
| Auto-resize (measure-and-shrink) | ✅ Headline shrinks until it fits box height + maxLines. |
| Overflow truncate | ✅ Ellipsizes last line at char level when over maxLines. |
| Circular cover-fit image | ✅ Clip-arc + max-scale cover; no distortion. |
| Encode PNG/WEBP + DPI | ✅ Sharp `.withMetadata({density})` + `.webp({quality})`. |
| **Render time** | ✅ **209 ms** (target <3000). Huge headroom for 20 concurrent. |

## Decision confirmed

`@napi-rs/canvas` (text layout/measurement) + Sharp (encode) is the engine. **No pivot to satori needed.** Canvas gives exact control over absolute-positioned boxes + shrink loops — fits Placid model.

## Carries into Milestone 5 (productionize)

The spike's `wrap` / `layoutText` / `drawText` / `drawCircularCover` move into `src/lib/render/`. Add: `expand_height` reflow note (fixed canvas — does not push other layers), letter-spacing via `ctx.letterSpacing`, real image fetch (allowlist) replacing synthesized profile, per-layer opacity, z-order iteration from DB.

## Open follow-ups

- Emoji / non-Latin: not yet tested — verify when real fonts uploaded (may need fallback font chain).
- Min-font-size floor currently 14px; expose per-layer.
