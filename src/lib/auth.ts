import "server-only";
import { cookies } from "next/headers";
import { env } from "./env";
import { SESSION_COOKIE, signSession, verifySession } from "./session";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Constant-time-ish credential check against static env creds. */
export function checkCredentials(email: string, password: string): boolean {
  const okEmail = safeEqual(email.trim().toLowerCase(), env.adminEmail().toLowerCase());
  const okPass = safeEqual(password, env.adminPassword());
  return okEmail && okPass;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession(email: string): Promise<void> {
  const token = await signSession(email, env.sessionSecret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Returns the logged-in admin email, or null. */
export async function getSession(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return verifySession(token, env.sessionSecret());
}
