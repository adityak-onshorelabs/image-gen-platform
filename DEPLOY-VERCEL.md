# Deploying to Vercel

The app is serverless-ready: all assets live in **Supabase Storage** (public
bucket), not local disk. `sharp` + `@napi-rs/canvas` are kept out of the bundle
via `serverExternalPackages` and run as native deps on Vercel's Node runtime.

## 1. Supabase Storage bucket

Create a **public** bucket named `media` (or set `SUPABASE_STORAGE_BUCKET`):
Supabase → Storage → New bucket → name `media`, **Public** on.

Writes use the service-role key (bypasses Storage RLS); reads are public URLs.
Prefixes inside the bucket: `templates/`, `generated/`, `assets/`, `fonts/`.

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

| Var | Notes |
|---|---|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | admin UI login |
| `SESSION_SECRET` | random 32+ bytes |
| `RENDER_API_KEY` | bearer key for `/api/render*` |
| `NEXT_PUBLIC_SUPABASE_URL` | project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public (RLS-blocked) |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret**, server-only — never `NEXT_PUBLIC` |
| `SUPABASE_STORAGE_BUCKET` | `media` |
| `PUBLIC_BASE_URL` | the deployed URL, e.g. `https://imagegen.vercel.app` |
| `IMAGE_SOURCE_ALLOWLIST` | optional CDN hosts for remote image layers (our Supabase host is always allowed) |
| `RENDER_MAX_CONCURRENCY` / `RENDER_QUEUE_TIMEOUT_MS` / `RENDER_STRICT_LAYERS` | optional tuning |

`DATABASE_URL` is **not** needed at runtime (Drizzle is schema-gen only).

## 3. Deploy

Connect the GitHub repo in Vercel, framework auto-detects Next.js. Build
`next build`. Render route has `maxDuration = 60` (well above the ~0.3–1.4s
renders; needs a plan that allows 60s, otherwise lower it).

## Notes / caveats

- **Concurrency** is per-instance (`RENDER_MAX_CONCURRENCY`). Vercel fan-out
  means global concurrency isn't capped — fine for current volume; revisit with
  a queue if you push heavy batches.
- **Cold starts** re-fetch + re-register fonts from Storage on first render of
  each instance (small woff2s, ~tens of ms each). Cached for the instance after.
- Legacy `/api/files/*` route still exists for local dev but is unused in prod
  (all rows were migrated to Supabase URLs).
- Generated images are **public** (public bucket). If marketing assets must be
  private, switch the bucket to private + signed URLs (engine fetch + n8n would
  need the signed URL).
