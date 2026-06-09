import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function main() {
  const sel = await sb.from("projects").select("id,name,slug").limit(1);
  console.log("SELECT:", JSON.stringify({ data: sel.data, error: sel.error }, null, 2));

  const ins = await sb
    .from("projects")
    .insert({ name: "Probe", slug: `probe-${Date.now()}` })
    .select("*")
    .single();
  console.log("INSERT:", JSON.stringify({ data: ins.data, error: ins.error }, null, 2));

  if (ins.data) {
    await sb.from("projects").delete().eq("id", ins.data.id);
    console.log("cleaned up probe row");
  }
}
main();
