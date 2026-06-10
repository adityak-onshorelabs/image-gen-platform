import "server-only";

// Fetch font files from the Google Fonts CSS API (v2). We request woff2 with a
// modern UA, parse the @font-face src, and download the binary — @napi-rs/canvas
// registers woff2 fine. No API key required.

const MODERN_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

export class GoogleFontError extends Error {}

/**
 * Google's CSS returns one @font-face per unicode subset (cyrillic, latin-ext,
 * latin, …), each preceded by a `/* subset *​/` comment. We must pick the
 * **latin** block — the first block is often cyrillic and has no Latin glyphs
 * (which renders as tofu). Falls back to the last block if no latin label.
 */
function pickLatinWoff2(css: string): string | null {
  const blocks = [
    ...css.matchAll(
      /\/\*\s*([^*]+?)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g
    ),
  ];
  const urlOf = (body: string) =>
    body.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1] ?? null;

  let fallback: string | null = null;
  for (const m of blocks) {
    const subset = m[1].trim().toLowerCase();
    const url = urlOf(m[2]);
    if (!url) continue;
    fallback = url; // last seen
    if (subset === "latin") return url;
  }
  // no labelled blocks at all → first raw woff2 in the file
  return fallback ?? css.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1] ?? null;
}

export type FetchedFont = { buffer: Buffer; ext: "woff2" };

/**
 * Download one Google Font face (family + weight + style) as woff2.
 * Throws GoogleFontError if the family/variant doesn't exist.
 */
export async function fetchGoogleFont(
  family: string,
  weight: number,
  italic: boolean
): Promise<FetchedFont> {
  // css2 wants literal +, :, ,, @ — only the family's spaces become +
  const fam = family.trim().replace(/\s+/g, "+");
  const axis = `ital,wght@${italic ? 1 : 0},${weight}`;
  const url = `https://fonts.googleapis.com/css2?family=${fam}:${axis}&display=swap`;

  const cssRes = await fetch(url, { headers: { "User-Agent": MODERN_UA } });
  if (cssRes.status === 400 || cssRes.status === 404) {
    throw new GoogleFontError(
      `Google has no "${family}" at weight ${weight}${italic ? " italic" : ""}.`
    );
  }
  if (!cssRes.ok) {
    throw new GoogleFontError(`Google Fonts request failed (${cssRes.status}).`);
  }
  const css = await cssRes.text();
  const woff2 = pickLatinWoff2(css);
  if (!woff2) {
    throw new GoogleFontError(
      `No downloadable file for "${family}" ${weight}${italic ? " italic" : ""}.`
    );
  }

  const fontRes = await fetch(woff2, { headers: { "User-Agent": MODERN_UA } });
  if (!fontRes.ok) {
    throw new GoogleFontError(`Could not download font file (${fontRes.status}).`);
  }
  const buffer = Buffer.from(await fontRes.arrayBuffer());
  return { buffer, ext: "woff2" };
}
