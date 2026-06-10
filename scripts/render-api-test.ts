import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/**
 * End-to-end test for POST /api/render (M7/M8.2).
 * Requires the dev/prod server running at PUBLIC_BASE_URL.
 *   npm run dev   # (separate terminal)
 *   npx tsx scripts/render-api-test.ts
 */

const BASE = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const KEY = process.env.RENDER_API_KEY!;
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}`, extra ?? "");
  }
}

async function seed() {
  await sb.from("projects").delete().eq("slug", "apitest");
  const { data: p } = await sb
    .from("projects")
    .insert({ name: "API Test", slug: "apitest" })
    .select("*")
    .single();
  const { data: t } = await sb
    .from("templates")
    .insert({
      project_id: p!.id,
      name: "Card",
      slug: "card",
      width: 600,
      height: 400,
      version: 1,
    })
    .select("*")
    .single();
  // one required dynamic text layer (no default) + one with a default
  await sb.from("layers").insert([
    {
      id: randomUUID(),
      template_id: t!.id,
      name: "headline",
      type: "text",
      is_dynamic: true,
      default_value: null,
      x: 40,
      y: 40,
      width: 520,
      height: 120,
      z_index: 0,
      font_size: 48,
      font_weight: 700,
      font_color: "#ffffff",
      alignment: "left",
      vertical_align: "top",
      line_height: 1.2,
      auto_resize: true,
      overflow_mode: "scale_down",
    },
    {
      id: randomUUID(),
      template_id: t!.id,
      name: "subtitle",
      type: "text",
      is_dynamic: true,
      default_value: "default subtitle",
      x: 40,
      y: 180,
      width: 520,
      height: 80,
      z_index: 1,
      font_size: 28,
      font_color: "#94a3b8",
      alignment: "left",
      vertical_align: "top",
      line_height: 1.2,
    },
  ]);
  return { projectId: p!.id };
}

async function render(body: unknown, key = KEY) {
  const res = await fetch(`${BASE}/api/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

(async () => {
  console.log(`Target: ${BASE}`);
  if (!KEY) throw new Error("RENDER_API_KEY not set in env.");

  // health
  const h = await fetch(`${BASE}/api/health`).then((r) => r.json());
  check("GET /api/health ok", h?.status === "ok", h);

  await seed();

  // layer discovery (n8n auto-detect)
  const disc = await fetch(`${BASE}/api/templates/apitest/card/layers`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  const discJson = await disc.json().catch(() => null);
  check("discovery 200", disc.status === 200 && discJson?.success === true, discJson);
  const names = (discJson?.layers ?? []).map((l: { name: string }) => l.name).sort();
  check("discovery lists dynamic layers", JSON.stringify(names) === JSON.stringify(["headline", "subtitle"]), names);
  const headline = (discJson?.layers ?? []).find((l: { name: string }) => l.name === "headline");
  const subtitle = (discJson?.layers ?? []).find((l: { name: string }) => l.name === "subtitle");
  check("headline marked required (no default)", headline?.required === true, headline);
  check("subtitle not required (has default)", subtitle?.required === false, subtitle);
  const discUnauth = await fetch(`${BASE}/api/templates/apitest/card/layers`, {
    headers: { Authorization: "Bearer wrong" },
  });
  check("discovery 401 on bad key", discUnauth.status === 401);

  // happy path
  const ok = await render({
    project: "apitest",
    template: "card",
    layers: { headline: "YOUR TRIP IS FUNDED" },
    options: { quality: "high", cache: true },
  });
  check("200 render success", ok.status === 200 && ok.json?.success === true, ok.json);
  check("returns imageUrl", typeof ok.json?.imageUrl === "string", ok.json?.imageUrl);
  check("returns fullUrl", typeof ok.json?.fullUrl === "string", ok.json?.fullUrl);
  check("dimensions echo template", ok.json?.width === 600 && ok.json?.height === 400);
  check("not cached on first render", ok.json?.cached === false);

  // image actually reachable + non-trivial
  if (ok.json?.imageUrl) {
    const abs = /^https?:\/\//.test(ok.json.imageUrl)
      ? ok.json.imageUrl
      : `${BASE}${ok.json.imageUrl}`;
    const img = await fetch(abs);
    const buf = Buffer.from(await img.arrayBuffer());
    check("image reachable", img.status === 200, img.status);
    check("image has bytes", buf.length > 1000, buf.length);
    check("content-type is image", (img.headers.get("content-type") ?? "").startsWith("image/"));
  }

  // cache hit (identical payload)
  const cached = await render({
    project: "apitest",
    template: "card",
    layers: { headline: "YOUR TRIP IS FUNDED" },
    options: { quality: "high", cache: true },
  });
  check("cache hit returns cached:true", cached.json?.cached === true, cached.json);

  // 401 bad key
  const unauth = await render(
    { project: "apitest", template: "card", layers: { headline: "x" } },
    "wrong-key"
  );
  check("401 on bad key", unauth.status === 401 && unauth.json?.error?.code === "UNAUTHORIZED");

  // 404 unknown template
  const notFound = await render({
    project: "apitest",
    template: "nope",
    layers: { headline: "x" },
  });
  check(
    "404 on unknown template",
    notFound.status === 404 && notFound.json?.error?.code === "TEMPLATE_NOT_FOUND"
  );

  // 422 missing required layer (headline has no default, none supplied)
  const missing = await render({
    project: "apitest",
    template: "card",
    layers: { subtitle: "only subtitle" },
  });
  check(
    "422 on missing required layer",
    missing.status === 422 && missing.json?.error?.code === "MISSING_LAYER_VALUE",
    missing.json
  );

  // cleanup
  await sb.from("projects").delete().eq("slug", "apitest");

  console.log(`\n${pass} passed, ${fail} failed.`);
  process.exit(fail > 0 ? 1 : 0);
})();
