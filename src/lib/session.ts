/**
 * Stateless signed-session token. HMAC-SHA256 over a JSON payload.
 * Uses Web Crypto (globalThis.crypto.subtle) so it runs in BOTH the Node
 * runtime (server actions/API) and the Edge runtime (middleware).
 */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type Payload = { sub: string; iat: number; exp: number };

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Encode a string to bytes typed as BufferSource (avoids TS ArrayBufferLike mismatch). */
function enc(s: string): BufferSource {
  return new TextEncoder().encode(s) as unknown as BufferSource;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(email: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Payload = { sub: email, iat: now, exp: now + SESSION_TTL_SECONDS };
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc(body));
  return `${body}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string
): Promise<string | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sig) as unknown as BufferSource,
      enc(body)
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as Payload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "session";
