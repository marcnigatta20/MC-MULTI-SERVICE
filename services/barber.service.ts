import { createClient } from "@/lib/supabase/server";
import type { Barber, Service, BarberPayment, Expense, ExpenseCategory, PaymentMethod, BarberBalance } from "@/types";
import { revalidatePath } from "next/cache";

export function normalizeServices(rows: Array<Partial<Service> & { id?: string }>): Service[] {
  return (rows || [])
    .filter((row) => !!row?.id)
    .map((row) => ({
      id: row.id!,
      name: row.name ?? "Service",
      description: row.description ?? null,
      price: Number(row.price ?? 0),
      duration_minutes: Number(row.duration_minutes ?? 0),
      is_active: row.is_active ?? true,
      created_at: row.created_at ?? new Date().toISOString(),
      updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    }));
}

export function mergeBarberStats(
  barbers: Barber[],
  summaryRows: Array<Partial<BarberBalance> & { barber_id?: string }>
): BarberBalance[] {
  const byId = new Map<string, Partial<BarberBalance>>();
  for (const row of summaryRows) {
    if (row.barber_id) byId.set(row.barber_id, row);
  }

  return barbers.map((barber) => {
    const summary = byId.get(barber.id) ?? {};

    return {
      barber_id: barber.id,
      full_name: barber.full_name || `${barber.first_name ?? ""} ${barber.last_name ?? ""}`.trim(),
      first_name: barber.first_name ?? summary.first_name ?? null,
      last_name: barber.last_name ?? summary.last_name ?? null,
      email: barber.email ?? summary.email ?? null,
      phone: barber.phone ?? summary.phone ?? null,
      photo_url: barber.photo_url ?? summary.photo_url ?? null,
      commission_rate: Number(barber.commission_rate ?? summary.commission_rate ?? 0),
      is_active: barber.is_active ?? summary.is_active ?? true,
      created_at: barber.created_at ?? summary.created_at ?? new Date().toISOString(),
      user_id: barber.user_id ?? summary.user_id ?? null,
      total_revenue: Number(summary.total_revenue ?? 0),
      service_count: Number(summary.service_count ?? 0),
      total_commissions: Number(summary.total_commissions ?? 0),
      total_paid: Number(summary.total_paid ?? 0),
      balance_due: Number(summary.balance_due ?? 0),
    };
  });
}

export async function getBarbers(activeOnly = true): Promise<Barber[]> {
  const supabase = await createClient();
  let query = supabase.from("barbers").select("*").order("full_name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data } = await query;
  return (data || []) as Barber[];
}

export async function getBarberByUserId(userId: string): Promise<Barber | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("barbers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data as Barber | null;
}

export async function createBarber(input: {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  commissionRate: number;
  userId?: string;
}) {
  const supabase = await createClient();
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const { data, error } = await supabase
    .from("barbers")
    .insert({
      full_name: fullName,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      email: input.email,
      photo_url: input.photoUrl,
      commission_rate: input.commissionRate,
      user_id: input.userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/barbers");
  return data as Barber;
}

export async function updateBarber(
  id: string,
  input: Partial<{
    full_name: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    photo_url: string;
    commission_rate: number;
    is_active: boolean;
    user_id: string | null;
  }>
) {
  const supabase = await createClient();
  const updates = { ...input, updated_at: new Date().toISOString() };
  if (input.first_name || input.last_name) {
    const { data: current } = await supabase.from("barbers").select("first_name, last_name").eq("id", id).single();
    const first = input.first_name ?? current?.first_name ?? "";
    const last = input.last_name ?? current?.last_name ?? "";
    updates.full_name = `${first} ${last}`.trim();
  }
  const { data, error } = await supabase
    .from("barbers")
    .update(updates)
    .eq("id", id)
    .select("*, user:profiles!user_id(*)")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/barbers");
  return data as Barber;
}

export async function getBarbersWithStats(): Promise<BarberBalance[]> {
  const supabase = await createClient();

  const [barbersResult, summaryResult] = await Promise.all([
    supabase.from("barbers").select("*").order("full_name"),
    supabase.from("barber_balances").select("*")
  ]);

  const barbers = (barbersResult.data || []) as Barber[];
  const summaryRows = (summaryResult.data || []) as Array<Partial<BarberBalance> & { barber_id?: string }>;

  return mergeBarberStats(barbers, summaryRows).sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function getServices(activeOnly = true): Promise<Service[]> {
  const supabase = await createClient();
  let query = supabase.from("services").select("*").order("name");
  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  const rows = (data || []) as Array<Partial<Service> & { id?: string }>;

  if (error) {
    console.error("getServices failed", error.message);
    return [];
  }

  return normalizeServices(rows).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createService(input: {
  name: string;
  description?: string;
  price: number;
  durationMinutes?: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      name: input.name,
      description: input.description,
      price: input.price,
      duration_minutes: input.durationMinutes || 30,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/services");
  return data as Service;
}

export async function updateService(
  id: string,
  input: Partial<{ name: string; description: string; price: number; duration_minutes: number; is_active: boolean }>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/services");
  return data as Service;
}

export async function createBarberPayment(input: {
  barberId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidBy: string;
  notes?: string;
  allowOverpayment?: boolean;
}) {
  const supabase = await createClient();

  const { data: balance } = await supabase
    .from("barber_balances")
    .select("balance_due, full_name")
    .eq("barber_id", input.barberId)
    .maybeSingle();

  const balanceDue = Number(balance?.balance_due || 0);
  if (input.amount > balanceDue && !input.allowOverpayment) {
    throw new Error(
      `Le montant (${input.amount} HTG) dépasse le solde dû (${balanceDue} HTG). Autorisation admin requise.`
    );
  }

  const { data, error } = await supabase
    .from("barber_payments")
    .insert({
      barber_id: input.barberId,
      amount: input.amount,
      payment_method: input.paymentMethod,
      paid_by: input.paidBy,
      notes: input.notes,
    })
    .select("*, barber:barbers(*)")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: input.paidBy,
    action: "BARBER_PAYMENT",
    entity_type: "barber_payment",
    entity_id: data.id,
    description: `Paiement barber ${balance?.full_name || ""} — ${input.amount} HTG`,
    details: { amount: input.amount, barber_id: input.barberId, notes: input.notes },
  });

  revalidatePath("/barber-payments");
  revalidatePath("/payments");
  revalidatePath("/commissions");
  revalidatePath("/dashboard");
  return data as BarberPayment;
}

export async function getBarberPayments(barberId?: string): Promise<BarberPayment[]> {
  const supabase = await createClient();
  let query = supabase
    .from("barber_payments")
    .select("*, barber:barbers(*)")
    .order("created_at", { ascending: false });
  if (barberId) query = query.eq("barber_id", barberId);
  const { data } = await query;
  return (data || []) as BarberPayment[];
}

export async function createExpense(input: {
  category: ExpenseCategory;
  amount: number;
  description: string;
  recordedBy: string;
  cashRegisterId?: string;
  receiptUrl?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      category: input.category,
      amount: input.amount,
      description: input.description,
      recorded_by: input.recordedBy,
      cash_register_id: input.cashRegisterId,
      receipt_url: input.receiptUrl,
    })
    .select("*, recorder:profiles!recorded_by(*)")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: input.recordedBy,
    action: "EXPENSE_CREATED",
    entity_type: "expense",
    entity_id: data.id,
    description: `Dépense ${input.category} — ${input.amount} HTG`,
    details: { amount: input.amount, category: input.category },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return data as Expense;
}

export async function getExpenses(filters?: {
  date?: string;
  category?: string;
}): Promise<Expense[]> {
  const supabase = await createClient();
  let query = supabase
    .from("expenses")
    .select("*, recorder:profiles!recorded_by(*)")
    .order("created_at", { ascending: false });
  if (filters?.date) query = query.eq("expense_date", filters.date);
  if (filters?.category) query = query.eq("category", filters.category);
  const { data } = await query;
  return (data || []) as Expense[];
}

export async function getAuditLogs(limit = 100) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*, user:profiles(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getProfiles() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");
  return data || [];
}

export async function updateProfileRole(id: string, role: string, isActive: boolean) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role, is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/users");
  return data;
}
