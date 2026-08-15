import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createUserWithProfile, logAudit } from "@/lib/supabase/admin";
import { parseOrThrow } from "@/lib/validate";
import { getCurrentProfile } from "@/lib/auth";

const CreateUserSchema = z.object({
  email: z.string().email({ message: "Email invalide." }),
  full_name: z.string().min(1, { message: "Le nom est requis." }),
  password: z
    .string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." })
    .regex(/(?=.*[A-Z])/, { message: "Le mot de passe doit contenir une majuscule." }),
  role: z.enum(["ADMIN", "CAISSIERE", "BARBER", "COMPTABLE"]),
  phone: z.string().optional(),
});

export async function GET() {
  // List users - only ADMIN
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: data });
}

export async function POST(request: Request) {
  // Create user - only ADMIN
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  try {
    const payload = parseOrThrow(CreateUserSchema, body);

    const result = await createUserWithProfile({
      email: payload.email,
      password: payload.password,
      full_name: payload.full_name,
      role: payload.role,
      phone: payload.phone,
      createdBy: profile.id,
    });

    await logAudit({ adminId: profile.id, action: "USER_CREATED", entity_id: result.id, details: { email: payload.email, role: payload.role } });

    return NextResponse.json({ message: "Utilisateur créé avec succès.", id: result.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Erreur lors de la création." }, { status: 400 });
  }
}
