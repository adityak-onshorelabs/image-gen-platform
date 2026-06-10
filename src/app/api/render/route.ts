import { checkApiKey, apiError } from "@/lib/api-auth";
import { env } from "@/lib/env";
import { resolveTarget, renderAndPersist } from "@/lib/render/service";
import { RenderError } from "@/lib/render/engine";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel: allow render + asset upload headroom

type RenderBody = {
  project?: string;
  template?: string;
  format?: string;
  layers?: Record<string, string>;
  options?: { quality?: string; cache?: boolean };
};

export async function POST(req: Request) {
  if (!checkApiKey(req)) {
    return apiError(401, "UNAUTHORIZED", "Missing or invalid API key.");
  }

  let body: RenderBody;
  try {
    body = (await req.json()) as RenderBody;
  } catch {
    return apiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }

  if (!body.project || !body.template) {
    return apiError(400, "BAD_REQUEST", "Both 'project' and 'template' are required.");
  }

  const target = await resolveTarget(body.project, body.template);
  if (!target) {
    return apiError(404, "TEMPLATE_NOT_FOUND", "Unknown project or template slug.", {
      project: body.project,
      template: body.template,
    });
  }

  const values: Record<string, string | undefined> = body.layers ?? {};

  try {
    const out = await renderAndPersist({
      target,
      values,
      format: body.format,
      quality: body.options?.quality,
      cache: body.options?.cache ?? false,
    });

    // imageUrl is an absolute Supabase Storage URL; older local rows are relative
    const base = env.publicBaseUrl().replace(/\/+$/, "");
    const fullUrl = /^https?:\/\//i.test(out.imageUrl)
      ? out.imageUrl
      : `${base}${out.imageUrl}`;
    return Response.json({
      success: true,
      imageUrl: out.imageUrl,
      fullUrl,
      renderId: out.renderId,
      width: out.width,
      height: out.height,
      format: out.format,
      cached: out.cached,
      durationMs: out.durationMs,
    });
  } catch (e) {
    if (e instanceof RenderError) {
      const status =
        e.code === "MISSING_LAYER_VALUE" || e.code === "INVALID_IMAGE_SOURCE" ? 422 : 500;
      return apiError(status, e.code, e.message, e.details);
    }
    if (e instanceof Error && e.message === "RATE_LIMITED") {
      return apiError(429, "RATE_LIMITED", "Render capacity reached. Retry shortly.");
    }
    const msg = e instanceof Error ? e.message : "Unknown render error.";
    return apiError(500, "RENDER_FAILED", msg);
  }
}
