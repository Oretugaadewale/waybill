"use server";

import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";

export interface SignInState {
  error: string | null;
  email: string;
}

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password.", email };
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Same message for every failure, so the form does not reveal which emails exist.
    return { error: "That email and password do not match an account.", email };
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
