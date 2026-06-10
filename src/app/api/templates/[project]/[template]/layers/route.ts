import { checkApiKey, apiError } from "@/lib/api-auth";
import { resolveTarget } from "@/lib/render/service";

export const runtime = "nodejs";

/**
 * Layer discovery for n8n auto-detection. Returns the dynamic layers (the API
 * inputs) for a template so a workflow can build its render payload without
 * hardcoding names. Same Bearer auth as /api/render.
 *
 *   GET /api/templates/{project}/{template}/layers
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ project: string; template: string }> }
) {
  if (!checkApiKey(req)) {
    return apiError(401, "UNAUTHORIZED", "Missing or invalid API key.");
  }

  const { project, template } = await params;
  const target = await resolveTarget(project, template);
  if (!target) {
    return apiError(404, "TEMPLATE_NOT_FOUND", "Unknown project or template slug.", {
      project,
      template,
    });
  }

  const strict = (process.env.RENDER_STRICT_LAYERS ?? "true") !== "false";

  const layers = target.layers
    .filter((l) => l.isDynamic) // only API-fed layers
    .map((l) => {
      const hasDefault = l.defaultValue != null && l.defaultValue !== "";
      return {
        name: l.name,
        type: l.type, // "text" | "image"
        required: strict && !hasDefault,
        default: l.defaultValue ?? null,
      };
    });

  return Response.json({
    success: true,
    project,
    template,
    version: target.template.version,
    width: target.template.width,
    height: target.template.height,
    outputFormat: target.template.outputFormat,
    defaultQuality: target.template.defaultQuality,
    layers,
  });
}
