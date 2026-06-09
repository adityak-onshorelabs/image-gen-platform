/** Centralized env access with fail-fast for required secrets (server-side only). */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  adminEmail: () => required("ADMIN_EMAIL"),
  adminPassword: () => required("ADMIN_PASSWORD"),
  sessionSecret: () => required("SESSION_SECRET"),
  renderApiKey: () => required("RENDER_API_KEY"),
  publicBaseUrl: () => process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",
  imageAllowlist: () =>
    (process.env.IMAGE_SOURCE_ALLOWLIST ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
};
