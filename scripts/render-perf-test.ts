import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// Concurrency / perf check (M8.4): fire N renders at once, report timings.
const BASE = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const KEY = process.env.RENDER_API_KEY!;
const N = Number(process.argv[2] ?? 20);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

(async () => {
  await sb.from("projects").delete().eq("slug", "perftest");
  const { data: p } = await sb
    .from("projects")
    .insert({ name: "Perf", slug: "perftest" })
    .select("*")
    .single();
  const { data: t } = await sb
    .from("templates")
    .insert({ project_id: p!.id, name: "Card", slug: "card", width: 1080, height: 1080 })
    .select("*")
    .single();
  await sb.from("layers").insert({
    id: randomUUID(),
    template_id: t!.id,
    name: "headline",
    type: "text",
    is_dynamic: true,
    x: 60,
    y: 60,
    width: 960,
    height: 300,
    z_index: 0,
    font_size: 90,
    font_weight: 700,
    font_color: "#ffffff",
    alignment: "left",
    auto_resize: true,
    overflow_mode: "scale_down",
  });

  const t0 = performance.now();
  const results = await Promise.all(
    Array.from({ length: N }, (_, i) =>
      fetch(`${BASE}/api/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          project: "perftest",
          template: "card",
          layers: { headline: `Concurrent render #${i}` },
        }),
      }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))
    )
  );
  const wall = Math.round(performance.now() - t0);

  const ok = results.filter((r) => r.status === 200);
  const rate = results.filter((r) => r.status === 429);
  const durations = ok.map((r) => r.json?.durationMs ?? 0).sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length / 2)] ?? 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0;

  console.log(`Fired ${N} concurrent renders → ${BASE}`);
  console.log(`  wall time:     ${wall}ms`);
  console.log(`  200 ok:        ${ok.length}`);
  console.log(`  429 limited:   ${rate.length}`);
  console.log(`  render p50:    ${p50}ms`);
  console.log(`  render p95:    ${p95}ms`);

  await sb.from("projects").delete().eq("slug", "perftest");
  process.exit(0);
})();
