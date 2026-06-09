import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("[db-check] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // NOTE: use a real row select — head:true count masks PGRST205 (missing table).
  const { error } = await sb.from("projects").select("id").limit(1);

  if (error) {
    console.log(`[db-check] query failed: ${error.code ?? ""} ${error.message}`);
    if (error.code === "PGRST205" || error.code === "42P01") {
      console.log("[db-check] -> tables NOT created. Run supabase/schema.sql in SQL Editor.");
    }
    process.exit(1);
  }
  console.log(`[db-check] ✓ connected. projects table exists.`);
}
main().catch((e) => {
  console.error("[db-check] error:", e.message);
  process.exit(1);
});
