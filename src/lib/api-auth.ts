import { env } from "./env";

/** Validates `Authorization: Bearer <RENDER_API_KEY>` for the render API. */
export function checkApiKey(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const provided = match[1].trim();
  const expected = env.renderApiKey();
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++)
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** Standard JSON error envelope (FRD §16.4). */
export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown
): Response {
  return Response.json(
    { success: false, error: { code, message, details } },
    { status }
  );
}
