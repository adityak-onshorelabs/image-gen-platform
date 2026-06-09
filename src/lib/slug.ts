/** URL/API-safe slug from arbitrary text. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Append -2, -3, ... until unique against the taken set. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const s = base || "untitled";
  if (!taken.has(s)) return s;
  let i = 2;
  while (taken.has(`${s}-${i}`)) i++;
  return `${s}-${i}`;
}
