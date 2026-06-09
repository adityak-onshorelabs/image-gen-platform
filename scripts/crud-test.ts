import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const pubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

let pass = 0,
  fail = 0;
const check = (name: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
};

async function main() {
  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- create project ---
  const { data: proj, error: e1 } = await sb
    .from("projects")
    .insert({ name: "CRUD Test", slug: `crud-test-${Date.now()}`, description: "tmp" })
    .select("*")
    .single();
  check("create project", !e1 && !!proj, e1?.message ?? "");
  if (!proj) return finish();

  // --- create template (FK) ---
  const { data: tpl, error: e2 } = await sb
    .from("templates")
    .insert({ project_id: proj.id, name: "LinkedIn", slug: "linkedin", width: 1080, height: 1080 })
    .select("*")
    .single();
  check("create template w/ FK", !e2 && !!tpl, e2?.message ?? "");
  check("template defaults applied", tpl?.output_format === "png" && tpl?.version === 1);

  // --- unique (project_id, slug) violation ---
  const { error: e3 } = await sb
    .from("templates")
    .insert({ project_id: proj.id, name: "Dup", slug: "linkedin", width: 1, height: 1 });
  check("duplicate template slug rejected", !!e3 && e3.code === "23505", e3?.code ?? "no error");

  // --- update project ---
  const { data: upd } = await sb
    .from("projects")
    .update({ name: "CRUD Test 2" })
    .eq("id", proj.id)
    .select("*")
    .single();
  check("update project", upd?.name === "CRUD Test 2");

  // --- cascade delete: deleting project removes templates ---
  await sb.from("projects").delete().eq("id", proj.id);
  const { count: tplLeft } = await sb
    .from("templates")
    .select("*", { count: "exact", head: true })
    .eq("project_id", proj.id);
  check("cascade delete removed templates", (tplLeft ?? 0) === 0, `left=${tplLeft}`);

  // --- RLS: publishable key must be blocked ---
  const pub = createClient(url, pubKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: pubRows, error: pubErr } = await pub.from("projects").select("*");
  check(
    "publishable key blocked by RLS",
    (pubRows?.length ?? 0) === 0,
    pubErr ? `(err: ${pubErr.message})` : `(returned ${pubRows?.length} rows!)`
  );

  finish();
}

function finish() {
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("crud-test error:", e.message);
  process.exit(1);
});
