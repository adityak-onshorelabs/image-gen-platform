import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";

/**
 * Repair fonts downloaded before the latin-subset fix: re-fetch the LATIN woff2
 * for each stored Google font and overwrite the file on disk. Uploaded fonts
 * Google doesn't recognize are skipped (fetch fails → keep original).
 *
 *   npx tsx scripts/repair-fonts.ts
 *
 * Writes a NEW file + repoints the DB row (the old file may be locked/mmapped by
 * a running server, and a fresh path also bypasses the engine's in-process font
 * cache) — so no restart is needed; the next render registers the latin file.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function pickLatin(css: string): string | null {
  const blocks = [
    ...css.matchAll(/\/\*\s*([^*]+?)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g),
  ];
  const urlOf = (b: string) => b.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1] ?? null;
  let fb: string | null = null;
  for (const m of blocks) {
    const s = m[1].trim().toLowerCase();
    const u = urlOf(m[2]);
    if (!u) continue;
    fb = u;
    if (s === "latin") return u;
  }
  return fb;
}

(async () => {
  const { data, error } = await sb.from("fonts").select("*").order("name");
  if (error) throw error;
  const fonts = data ?? [];
  console.log(`Checking ${fonts.length} font(s)…`);

  for (const f of fonts) {
    const file = basename(f.file_url as string);
    if (!file.endsWith(".woff2")) {
      console.log(`  skip ${f.name} ${f.weight}${f.style} (not woff2)`);
      continue;
    }
    const fam = (f.name as string).replace(/\s+/g, "+");
    const italic = f.style === "italic";
    const url = `https://fonts.googleapis.com/css2?family=${fam}:ital,wght@${
      italic ? 1 : 0
    },${f.weight}&display=swap`;
    try {
      const css = await fetch(url, { headers: { "User-Agent": UA } }).then((r) =>
        r.ok ? r.text() : null
      );
      const latin = css ? pickLatin(css) : null;
      if (!latin) {
        console.log(`  skip ${f.name} ${f.weight}${f.style} (not a Google font)`);
        continue;
      }
      const ab = (await fetch(latin, { headers: { "User-Agent": UA } }).then((r) =>
        r.arrayBuffer()
      )) as ArrayBuffer;
      const buf = new Uint8Array(ab);
      const before = (() => {
        try {
          return statSync(join(process.cwd(), "storage", "fonts", file)).size;
        } catch {
          return 0;
        }
      })();
      // write a fresh filename (old one is likely locked + cached by the engine)
      const stem = file.replace(/\.woff2$/, "");
      const newFile = `${stem}-${Date.now().toString(36)}.woff2`;
      writeFileSync(join(process.cwd(), "storage", "fonts", newFile), buf);
      const { error: upErr } = await sb
        .from("fonts")
        .update({ file_url: `/api/files/fonts/${newFile}` })
        .eq("id", f.id);
      if (upErr) throw upErr;
      console.log(
        `  fixed ${f.name} ${f.weight}${f.style}: ${before} → ${buf.length} bytes (→ ${newFile})`
      );
    } catch (e) {
      console.log(`  ERR  ${f.name} ${f.weight}${f.style}: ${(e as Error).message}`);
    }
  }
  console.log(
    "\nDone. RESTART the server — the old (broken) face is already registered in the\n" +
      "running process and skia can't unregister it, so it shadows the repaired one until restart."
  );
  process.exit(0);
})();
