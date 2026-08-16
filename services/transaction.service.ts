import { createClient } from "@/lib/supabase/server";
import type { Transaction, PaymentMethod, Profile } from "@/types";
import { broadcastRealtimeUpdate } from "@/lib/realtime";
import { calculateCommissionBreakdown } from "@/utils/finance";
import { revalidatePath } from "next/cache";

export interface TransactionFilters {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  barberId?: string;
  cashierId?: string;
  serviceId?: string;
  paymentMethod?: string;
  status?: string;
  receiptSearch?: string;
  limit?: number;
}

export async function getTransactions(
  filters?: TransactionFilters
): Promise<Transaction[]> {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select(
      "*, barber:barbers(*), service:services(*)"
    )
    .order("created_at", { ascending: false });

  // Use created_at timestamps for filtering (transactions table doesn't have transaction_date)
  if (filters?.date) query = query.gte("created_at", `${filters.date}T00:00:00Z`).lte("created_at", `${filters.date}T23:59:59Z`);
  if (filters?.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00Z`);
  if (filters?.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59Z`);
  if (filters?.barberId) query = query.eq("barber_id", filters.barberId);
  if (filters?.cashierId) query = query.eq("cashier_id", filters.cashierId);
  if (filters?.serviceId) query = query.eq("service_id", filters.serviceId);
  if (filters?.paymentMethod) query = query.eq("payment_method", filters.paymentMethod);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.receiptSearch) {
    query = query.ilike("receipt_number", `%${filters.receiptSearch}%`);
  }
  if (filters?.limit) query = query.limit(filters.limit);

  // Execute query and handle possible invalid enum values for `status` gracefully.
  try {
    const result = await query;
    if (result.error) {
      const msg = result.error.message || "";
      if (msg.includes("invalid input value for enum") && filters?.status) {
        // Retry without status filter
        let retry = supabase
          .from("transactions")
          .select(
            "*, barber:barbers(*), service:services(*)"
          )
          .order("created_at", { ascending: false });

        if (filters?.date) retry = retry.gte("created_at", `${filters.date}T00:00:00Z`).lte("created_at", `${filters.date}T23:59:59Z`);
        if (filters?.dateFrom) retry = retry.gte("created_at", `${filters.dateFrom}T00:00:00Z`);
        if (filters?.dateTo) retry = retry.lte("created_at", `${filters.dateTo}T23:59:59Z`);
        if (filters?.barberId) retry = retry.eq("barber_id", filters.barberId);
        if (filters?.cashierId) retry = retry.eq("cashier_id", filters.cashierId);
        if (filters?.serviceId) retry = retry.eq("service_id", filters.serviceId);
        if (filters?.paymentMethod) retry = retry.eq("payment_method", filters.paymentMethod);
        if (filters?.receiptSearch) retry = retry.ilike("receipt_number", `%${filters.receiptSearch}%`);
        if (filters?.limit) retry = retry.limit(filters.limit);

        const { data: data2, error: error2 } = await retry;
        if (error2) throw new Error(error2.message);
        return (await attachCashiersToTransactions(supabase, data2 || [])) as Transaction[];
      }

      throw new Error(result.error.message);
    }

    return (await attachCashiersToTransactions(supabase, result.data || [])) as Transaction[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("invalid input value for enum") && filters?.status) {
      // Rebuild and retry without status filter (catch exceptions too)
      try {
        let retry = supabase
          .from("transactions")
          .select(
            "*, barber:barbers(*), service:services(*)"
          )
          .order("created_at", { ascending: false });

        if (filters?.date) retry = retry.gte("created_at", `${filters.date}T00:00:00Z`).lte("created_at", `${filters.date}T23:59:59Z`);
        if (filters?.dateFrom) retry = retry.gte("created_at", `${filters.dateFrom}T00:00:00Z`);
        if (filters?.dateTo) retry = retry.lte("created_at", `${filters.dateTo}T23:59:59Z`);
        if (filters?.barberId) retry = retry.eq("barber_id", filters.barberId);
        if (filters?.cashierId) retry = retry.eq("cashier_id", filters.cashierId);
        if (filters?.serviceId) retry = retry.eq("service_id", filters.serviceId);
        if (filters?.paymentMethod) retry = retry.eq("payment_method", filters.paymentMethod);
        if (filters?.receiptSearch) retry = retry.ilike("receipt_number", `%${filters.receiptSearch}%`);
        if (filters?.limit) retry = retry.limit(filters.limit);

        const { data: data2, error: error2 } = await retry;
        if (error2) throw new Error(error2.message);
        return (await attachCashiersToTransactions(supabase, data2 || [])) as Transaction[];
      } catch (e: unknown) {
        throw new Error(e instanceof Error ? e.message : String(e));
      }
    }

    throw err instanceof Error ? err : new Error(String(err));
  }
}

async function attachCashiersToTransactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  transactions: Array<Record<string, unknown> & { cashier_id?: string; cashier?: Profile | undefined }>
) {
  if (!transactions || transactions.length === 0) return transactions;
  const cashierIds = Array.from(
    new Set(transactions.map((t) => t.cashier_id).filter(Boolean))
  );
  if (cashierIds.length === 0) return transactions;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("id", cashierIds);

  if (error || !profiles) return transactions;

  const byId: Record<string, { id: string; full_name: string; role: string }> = {};
  profiles.forEach((p: { id: string; full_name: string; role: string }) => {
    byId[p.id] = p;
  });

  return transactions.map((t) => ({
    ...t,
    cashier: (t.cashier ?? (byId[t.cashier_id ?? ""] as Profile | undefined) ?? undefined) as Profile | undefined,
  }));
}

export async function getFilterOptions() {
  const supabase = await createClient();
  const [barbers, services, cashiers] = await Promise.all([
    supabase.from("barbers").select("id, full_name").eq("is_active", true).order("full_name"),
    supabase.from("services").select("id, name").eq("is_active", true).order("name"),
    supabase.from("profiles").select("id, full_name").in("role", ["ADMIN", "CAISSIERE"]).order("full_name"),
  ]);
  return {
    barbers: barbers.data || [],
    services: services.data || [],
    cashiers: cashiers.data || [],
  };
}

export async function createTransaction(input: {
  barberId: string;
  serviceId: string;
  cashierId: string;
  cashRegisterId?: string;
  paymentMethod: PaymentMethod;
  clientName?: string;
  notes?: string;
  discountAmount?: number;
}) {
  const supabase = await createClient();

  const [{ data: service }, { data: barber }] = await Promise.all([
    supabase.from("services").select("name, price").eq("id", input.serviceId).single(),
    supabase.from("barbers").select("commission_rate").eq("id", input.barberId).single(),
  ]);

  if (!service || !barber) {
    throw new Error("Service ou barber introuvable.");
  }

  const originalPrice = Number(service.price);
  const commissionRate = Number(barber.commission_rate);
  const breakdown = calculateCommissionBreakdown(
    originalPrice,
    commissionRate,
    input.discountAmount ?? 0
  );

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      barber_id: input.barberId,
      service_id: input.serviceId,
      cashier_id: input.cashierId,
      cash_register_id: input.cashRegisterId,
      amount: breakdown.totalAmount,
      original_price: breakdown.originalPrice,
      service_price: breakdown.originalPrice,
      total_amount: breakdown.totalAmount,
      barber_commission: breakdown.commissionAmount,
      discount_amount: breakdown.discountAmount,
      service_name: service.name,
      commission_rate: breakdown.commissionRate,
      commission_amount: breakdown.commissionAmount,
      shop_amount: breakdown.shopAmount,
      payment_method: input.paymentMethod,
      client_name: input.clientName,
      notes: input.notes,
    })
    .select("*, barber:barbers(*), service:services(*)")
    .single();

  if (error) throw new Error(error.message);

  // Ensure cashier profile attached if relation absent
  const created = data as Transaction & { cashier?: Profile };
  if (created && !created.cashier && created.cashier_id) {
    const { data: cashier } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", created.cashier_id)
      .single();
    created.cashier = (cashier as Profile | undefined) ?? undefined;
  }

  await supabase.from("audit_logs").insert({
    user_id: input.cashierId,
    action: "SALE_CREATED",
    entity_type: "transaction",
    entity_id: data.id,
    description: `Transaction ${data.receipt_number} créée — ${breakdown.totalAmount} HTG`,
    details: {
      amount: breakdown.totalAmount,
      commission_rate: breakdown.commissionRate,
      commission_amount: breakdown.commissionAmount,
      shop_amount: breakdown.shopAmount,
      barber_id: input.barberId,
      receipt_number: data.receipt_number,
    },
  });

  revalidatePath("/cash");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/commissions");
  revalidatePath("/performance");
  revalidatePath("/reports");
  broadcastRealtimeUpdate("transaction");

  return created as Transaction;
}

export async function cancelTransaction(
  transactionId: string,
  userId: string,
  reason: string
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (!existing) throw new Error("Transaction introuvable.");
  if (existing.status === "CANCELLED") {
    throw new Error("Cette transaction est déjà annulée.");
  }

  const { data, error } = await supabase
    .from("transactions")
    .update({
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
      cancellation_reason: reason,
    })
    .eq("id", transactionId)
    .select(
      "*, barber:barbers(*), service:services(*)"
    )
    .single();

  if (error) throw new Error(error.message);

  // Attach cashier profile if missing
  const updated = data as Transaction & { cashier?: Profile };
  if (updated && !updated.cashier && updated.cashier_id) {
    const { data: cashier } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", updated.cashier_id)
      .single();
    updated.cashier = (cashier as Profile | undefined) ?? undefined;
  }

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "SALE_CANCELLED",
    entity_type: "transaction",
    entity_id: transactionId,
    description: `Transaction ${existing.receipt_number} annulée — Raison: ${reason}`,
    details: {
      reason,
      original_amount: existing.amount,
      commission_amount: existing.commission_amount,
      shop_amount: existing.shop_amount,
      receipt_number: existing.receipt_number,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/cash");
  revalidatePath("/commissions");
  revalidatePath("/performance");
  revalidatePath("/reports");
  broadcastRealtimeUpdate("transaction_cancelled");

  return updated as Transaction;
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select(
      "*, barber:barbers(*), service:services(*), cashier:profiles!cashier_id(*)"
    )
    .eq("id", id)
    .single();
  if (!data) return null;

  // attach cashier if relation missing
  const tx = data as Transaction & { cashier?: Profile };
  if (!tx.cashier && tx.cashier_id) {
    const { data: cashier } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", tx.cashier_id)
      .single();
    tx.cashier = (cashier as Profile | undefined) ?? undefined;
  }

  return tx as Transaction | null;
}
