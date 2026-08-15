"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRoleDashboardPath } from "@/lib/utils";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Email ou mot de passe incorrect." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { error: "Votre compte est désactivé." };
  }

  await supabase.from("audit_logs").insert({
    user_id: data.user.id,
    action: "LOGIN",
    details: { email },
  });

  redirect(getRoleDashboardPath(profile.role));
}

export async function signOut() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "LOGOUT",
    });
  }

  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetPassword(formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/reset-password`,
  });

  if (error) {
    return { error: "Impossible d'envoyer l'email de réinitialisation." };
  }

  return { success: "Un email de réinitialisation a été envoyé." };
}

export async function updateProfileAvatarAction(avatarUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Session invalide.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  return avatarUrl;
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "Impossible de mettre à jour le mot de passe." };
  }

  redirect("/login?message=password_updated");
}
