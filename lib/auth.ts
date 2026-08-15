import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}

export async function requireAuth(allowedRoles?: string[]) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.is_active) {
    redirect("/login?error=inactive");
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    redirect(getRoleRedirect(profile.role));
  }

  return profile;
}

function getRoleRedirect(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/dashboard";
    case "CAISSIERE":
      return "/cashier-dashboard";
    case "BARBER":
      return "/barber";
    case "COMPTABLE":
      return "/accounting";
    default:
      return "/login";
  }
}

export { AppShell } from "@/components/layout/app-shell";
