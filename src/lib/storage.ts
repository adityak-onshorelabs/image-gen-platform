import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, normalize, sep } from "node:path";

export type Bucket = "templates" | "generated" | "assets" | "fonts";

const ROOT = join(process.cwd(), "storage");

/** Absolute path for a bucket, ensuring the dir exists. */
async function bucketDir(bucket: Bucket): Promise<string> {
  const dir = join(ROOT, bucket);
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Save bytes; returns the public URL path (served by /api/files). */
export async function saveFile(
  bucket: Bucket,
  filename: string,
  data: Buffer
): Promise<string> {
  const dir = await bucketDir(bucket);
  await writeFile(join(dir, filename), data);
  return `/api/files/${bucket}/${filename}`;
}

export async function deleteFile(bucket: Bucket, filename: string): Promise<void> {
  try {
    await unlink(join(ROOT, bucket, filename));
  } catch {
    // already gone — ignore
  }
}

/**
 * Resolve a request path (["templates","x.png"]) to an absolute path INSIDE
 * the storage root. Returns null on traversal attempts.
 */
export function resolveStoragePath(parts: string[]): string | null {
  const rel = normalize(parts.join("/"));
  if (rel.startsWith("..") || rel.includes(`..${sep}`)) return null;
  const abs = join(ROOT, rel);
  if (!abs.startsWith(ROOT + sep)) return null;
  return abs;
}

export { ROOT as STORAGE_ROOT };
