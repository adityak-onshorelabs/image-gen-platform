import "server-only";
import { join, normalize, sep } from "node:path";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Object storage on Supabase Storage (works on serverless/Vercel — no local
// disk). One bucket, four path prefixes mirroring the old local folders.
export type Bucket = "templates" | "generated" | "assets" | "fonts";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "media";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  ttf: "font/ttf",
  otf: "font/otf",
  woff2: "font/woff2",
};

function contentTypeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/** Upload bytes to `<prefix>/<filename>`; returns the public URL. */
export async function saveFile(
  prefix: Bucket,
  filename: string,
  data: Buffer
): Promise<string> {
  const sb = supabaseAdmin();
  const path = `${prefix}/${filename}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, data, {
    upsert: true,
    contentType: contentTypeFor(filename),
    cacheControl: "31536000",
  });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deleteFile(prefix: Bucket, filename: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.storage.from(BUCKET).remove([`${prefix}/${filename}`]);
}

/** Hostname of the Supabase Storage origin (so the engine can allowlist it). */
export function storageHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// --- legacy local-disk helpers (pre-Supabase rows served via /api/files) ----
// Kept so old `/api/files/...` URLs still resolve in local dev. New writes go to
// Supabase Storage above. Not used on Vercel (read-only FS).
const ROOT = join(process.cwd(), "storage");

export function resolveStoragePath(parts: string[]): string | null {
  const rel = normalize(parts.join("/"));
  if (rel.startsWith("..") || rel.includes(`..${sep}`)) return null;
  const abs = join(ROOT, rel);
  if (!abs.startsWith(ROOT + sep)) return null;
  return abs;
}

export { ROOT as STORAGE_ROOT };
