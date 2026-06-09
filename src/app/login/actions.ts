"use server";

import { redirect } from "next/navigation";
import { checkCredentials, createSession } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard") || "/dashboard";

  if (!checkCredentials(email, password)) {
    return { error: "Invalid email or password." };
  }
  await createSession(email);
  redirect(next.startsWith("/") ? next : "/dashboard");
}
