import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, logAudit } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from '@/lib/mail';
import { getCurrentProfile } from "@/lib/auth";

const UpdateSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN","CAISSIERE","BARBER","COMPTABLE"]).optional(),
  is_active: z.boolean().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PATCH(request: Request, context: any) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const params = context?.params;
  const id = params?.id ?? (await (params instanceof Promise ? params : Promise.resolve(params))).id;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });


  const supabase = createAdminClient();

  // Handle role transitions and profile update
  const updates: Record<string, unknown> = {};
  if (parsed.data.full_name) updates.full_name = parsed.data.full_name;
  if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;
  if (parsed.data.role) updates.role = parsed.data.role;
  if (parsed.data.email) updates.email = parsed.data.email;

  // If email present, also update auth user via admin API
  if (parsed.data.email) {
    const { error: authErr } = await supabase.auth.admin.updateUserById(id, { email: parsed.data.email });
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Manage barber row when role changed
  if (parsed.data.role) {
    if (parsed.data.role === 'BARBER') {
      // create barber if missing
      const { data: existing } = await supabase.from('barbers').select('id').eq('user_id', id).single();
      if (!existing) {
        // fetch profile to get name/phone
          const { data: p } = await supabase.from('profiles').select('full_name,email').eq('id', id).single();
          const { data: setting } = await supabase.from('settings').select('value').eq('key','default_commission_rate').single();
          const commission_rate = setting ? Number(setting.value) || 40 : 40;
          const full_name = p?.full_name ?? 'Nouveau Barber';
          await supabase.from('barbers').insert({ user_id: id, full_name, phone: null, commission_rate, is_active: true });
      }
    } else {
      // if role removed from BARBER, deactivate barber row
      await supabase.from('barbers').update({ is_active: false }).eq('user_id', id);
    }
  }

  await logAudit({ adminId: profile.id, action: 'USER_UPDATED', entity_id: id, details: parsed.data });

  return NextResponse.json({ message: 'Utilisateur mis à jour.' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(request: Request, context: any) {
  // Soft disable user
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  const params = context?.params;
  const id = params?.id ?? (await (params instanceof Promise ? params : Promise.resolve(params))).id;
  const supabase = createAdminClient();

  const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('barbers').update({ is_active: false }).eq('user_id', id);

  await logAudit({ adminId: profile.id, action: 'USER_DISABLED', entity_id: id });

  return NextResponse.json({ message: 'Utilisateur désactivé.' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(request: Request, context: any) {
  // used for sub-actions like reset-password or enable
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  const params = context?.params;
  const id = params?.id ?? (await (params instanceof Promise ? params : Promise.resolve(params))).id;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const supabase = createAdminClient();

  if (action === 'enable') {
    const { error } = await supabase.from('profiles').update({ is_active: true }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.from('barbers').update({ is_active: true }).eq('user_id', id);
    await logAudit({ adminId: profile.id, action: 'USER_ENABLED', entity_id: id });
    return NextResponse.json({ message: 'Utilisateur réactivé.' });
  }

  if (action === 'reset-password') {
    // Generate a temporary password and set it for the user via admin API.
    try {
      const temp = Array.from(crypto.getRandomValues(new Uint8Array(12))).map((b) => (b % 36).toString(36)).join('') + 'A1!';
      const { error: pwErr } = await supabase.auth.admin.updateUserById(id, { password: temp, email_confirm: true });
      if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 500 });

      // Try to email the temporary password to the user
      const { data: p } = await supabase.from('profiles').select('email,full_name').eq('id', id).single();
      let emailed = false;
      try {
        if (p?.email) {
          await sendPasswordResetEmail({ to: p.email, tempPassword: temp, name: p.full_name });
          emailed = true;
        }
      } catch (e: unknown) {
        // Log but don't fail — we'll return temp in fallback
        const msg = e instanceof Error ? e.message : String(e);
        console.error('Failed to send reset email:', msg);
      }

      await logAudit({ adminId: profile.id, action: 'USER_PASSWORD_RESET', entity_id: id, details: { emailed } });

      if (emailed) {
        return NextResponse.json({ message: 'Mot de passe temporaire défini et envoyé par email.' });
      }

      // Fallback: return temporary password to admin — they should transmit it securely to the user.
      return NextResponse.json({ message: 'Mot de passe temporaire défini.', tempPassword: temp });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg || 'Impossible de réinitialiser le mot de passe.' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
}
