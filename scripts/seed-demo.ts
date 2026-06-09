import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

(async () => {
  const W = 1080, H = 1080;
  await sb.from("projects").delete().eq("slug", "demo");

  const { data: p } = await sb
    .from("projects")
    .insert({ name: "Demo", slug: "demo", description: "editor test" })
    .select("*").single();

  const { data: t } = await sb
    .from("templates")
    .insert({ project_id: p!.id, name: "Demo Card", slug: "demo-card", width: W, height: H })
    .select("*").single();

  // base image: gradient + accent
  const svg = `<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#1e293b"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="14" fill="#38bdf8"/>
    <text x="56" y="80" fill="#94a3b8" font-family="sans-serif" font-size="30" font-weight="bold">ONSHORE LABS</text></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  mkdirSync("storage/templates", { recursive: true });
  writeFileSync(`storage/templates/${t!.id}.png`, png);

  await sb.from("templates")
    .update({ base_image_url: `/api/files/templates/${t!.id}.png`, version: 2 })
    .eq("id", t!.id);

  console.log(JSON.stringify({ url: `/projects/demo/templates/demo-card`, templateId: t!.id }));
})();
