import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  // Do not throw at import time to avoid breaking non-server environments,
  // but log for developer awareness in server runtime.
  // This module MUST only be used on the server.
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(url, key, {
    // server-side only client, no browser options
  });
}

export async function createUserWithProfile({
  email,
  password,
  full_name,
  role,
  phone,
  createdBy,
}: {
  email: string;
  password: string;
  full_name: string;
  role: string;
  phone?: string | null;
  createdBy?: string | null;
}) {
  const supabase = createAdminClient();

  // Create auth user
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role, phone },
  });

  if (createError || !userData?.user) {
    throw new Error(createError?.message || "Impossible de créer l'utilisateur.");
  }

  const user = userData.user;

  // Insert profile
  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    email,
    full_name,
    role,
    is_active: true,
  });

  if (profileError) {
    // Attempt to clean up created auth user? For now report error.
    throw new Error(profileError.message || "Impossible de créer le profil utilisateur.");
  }

  // If role is BARBER, create barbers row
  if (role === "BARBER") {
    // get default commission
    const { data: setting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "default_commission_rate")
      .single();

    const commission_rate = setting ? Number(setting.value) || 40 : 40;

    const barberInsert = {
      user_id: user.id,
      full_name,
      phone: phone || null,
      commission_rate,
      is_active: true,
    };

    const { error: barberError } = await supabase.from("barbers").insert(barberInsert);
    if (barberError) {
      throw new Error(barberError.message || "Impossible de créer le barber.");
    }
  }

  // Insert audit log
  await supabase.from("audit_logs").insert({
    user_id: createdBy || null,
    action: "USER_CREATED",
    entity_type: "profiles",
    entity_id: user.id,
    details: { email, role },
  });

  return { id: user.id };
}

export async function logAudit({
  adminId,
  action,
  entity_type,
  entity_id,
  details,
}: {
  adminId?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
}) {
  const supabase = createAdminClient();
  await supabase.from("audit_logs").insert({
    user_id: adminId || null,
    action,
    entity_type: entity_type || null,
    entity_id: entity_id || null,
    details: details || {},
  });
}
