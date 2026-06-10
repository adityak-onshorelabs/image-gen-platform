import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getProjectBySlug } from "@/lib/data/projects";
import { getTemplate, type Template } from "@/lib/data/templates";
import { listLayers } from "@/lib/data/layers";
import type { Layer } from "@/lib/layer-types";
import { saveFile } from "@/lib/storage";
import { findCachedRender, recordRender } from "@/lib/data/generated";
import {
  renderTemplate,
  RenderError,
  type RenderFormat,
  type Quality,
} from "./engine";
import { withRenderSlot } from "./semaphore";

export type RenderOutcome = {
  imageUrl: string;
  renderId: string;
  width: number;
  height: number;
  cached: boolean;
  durationMs: number;
  format: RenderFormat;
};

function normFormat(f: string | undefined, fallback: string): RenderFormat {
  const v = (f ?? fallback).toLowerCase();
  return v === "jpeg" || v === "jpg" ? "jpeg" : v === "webp" ? "webp" : "png";
}
function normQuality(q: string | undefined, fallback: string): Quality {
  const v = (q ?? fallback).toLowerCase();
  return v === "low" || v === "medium" ? v : "high";
}

const EXT: Record<RenderFormat, string> = { png: "png", jpeg: "jpg", webp: "webp" };

/**
 * Validate required dynamic layers (FRD §15/§16.4). A dynamic layer with no
 * supplied value AND no default is a missing required value when strict mode
 * is on (default). Throws RenderError("MISSING_LAYER_VALUE").
 */
function validateRequired(layers: Layer[], values: Record<string, string | undefined>) {
  const strict = (process.env.RENDER_STRICT_LAYERS ?? "true") !== "false";
  if (!strict) return;
  for (const l of layers) {
    if (!l.isDynamic || l.hidden) continue;
    const supplied = values[l.name];
    const hasValue = supplied != null && supplied !== "";
    const hasDefault = l.defaultValue != null && l.defaultValue !== "";
    if (!hasValue && !hasDefault) {
      throw new RenderError(
        "MISSING_LAYER_VALUE",
        `Required layer '${l.name}' has no value and no default.`,
        { layer: l.name }
      );
    }
  }
}

/** sha256 over the cache-relevant inputs (FRD §16.5). */
function payloadHash(
  templateId: string,
  version: number,
  values: Record<string, string | undefined>,
  format: RenderFormat,
  quality: Quality
): string {
  const sortedValues = Object.keys(values)
    .sort()
    .reduce<Record<string, string | undefined>>((acc, k) => {
      acc[k] = values[k];
      return acc;
    }, {});
  const blob = JSON.stringify({ templateId, version, values: sortedValues, format, quality });
  return createHash("sha256").update(blob).digest("hex");
}

export type ResolvedTarget = { template: Template; layers: Layer[] };

/** Resolve project+template slugs to a template and its layers, or null. */
export async function resolveTarget(
  projectSlug: string,
  templateSlug: string
): Promise<ResolvedTarget | null> {
  const project = await getProjectBySlug(projectSlug);
  if (!project) return null;
  const template = await getTemplate(project.id, templateSlug);
  if (!template) return null;
  const layers = await listLayers(template.id);
  return { template, layers };
}

/**
 * Full synchronous render: validate → (cache) → render in pool → persist to
 * /generated → record row. Throws RenderError for known failure codes and
 * Error("RATE_LIMITED") when the concurrency gate times out.
 */
export async function renderAndPersist(opts: {
  target: ResolvedTarget;
  values: Record<string, string | undefined>;
  format?: string;
  quality?: string;
  cache?: boolean;
}): Promise<RenderOutcome> {
  const { template, layers } = opts.target;
  const format = normFormat(opts.format, template.outputFormat);
  const quality = normQuality(opts.quality, template.defaultQuality);

  validateRequired(layers, opts.values);

  const hash = payloadHash(template.id, template.version, opts.values, format, quality);

  if (opts.cache) {
    const hit = await findCachedRender(template.id, template.version, hash);
    if (hit) {
      return {
        imageUrl: hit.imageUrl,
        renderId: hit.id,
        width: template.width,
        height: template.height,
        cached: true,
        durationMs: hit.durationMs ?? 0,
        format: format,
      };
    }
  }

  const result = await withRenderSlot(() =>
    renderTemplate({
      template: {
        width: template.width,
        height: template.height,
        baseImageUrl: template.baseImageUrl,
        outputFormat: template.outputFormat,
        defaultQuality: template.defaultQuality,
        dpi: template.dpi,
      },
      layers,
      values: opts.values,
      format,
      quality,
    })
  );

  const renderId = randomUUID();
  const filename = `${renderId}.${EXT[result.format]}`;
  const imageUrl = await saveFile("generated", filename, result.buffer);

  const row = await recordRender({
    templateId: template.id,
    templateVersion: template.version,
    imageUrl,
    renderPayload: opts.values as Record<string, unknown>,
    payloadHash: opts.cache ? hash : null,
    format: result.format,
    durationMs: result.durationMs,
  });

  return {
    imageUrl,
    renderId: row.id,
    width: result.width,
    height: result.height,
    cached: false,
    durationMs: result.durationMs,
    format: result.format,
  };
}

/**
 * In-memory preview render (M6): no validation strictness, no persistence,
 * no cache. Returns a data URI for direct <img> display. Still pool-bounded.
 */
export async function renderPreview(opts: {
  template: Template;
  layers: Layer[];
  values: Record<string, string | undefined>;
  format?: RenderFormat;
}): Promise<{ dataUri: string; durationMs: number; format: RenderFormat }> {
  const format = opts.format ?? normFormat(undefined, opts.template.outputFormat);
  const result = await withRenderSlot(() =>
    renderTemplate({
      template: {
        width: opts.template.width,
        height: opts.template.height,
        baseImageUrl: opts.template.baseImageUrl,
        outputFormat: opts.template.outputFormat,
        defaultQuality: opts.template.defaultQuality,
        dpi: opts.template.dpi,
      },
      layers: opts.layers,
      values: opts.values,
      format,
      quality: "medium",
    })
  );
  const mime = result.format === "jpeg" ? "image/jpeg" : `image/${result.format}`;
  return {
    dataUri: `data:${mime};base64,${result.buffer.toString("base64")}`,
    durationMs: result.durationMs,
    format: result.format,
  };
}
