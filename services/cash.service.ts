import { createClient } from "@/lib/supabase/server";
import type { CashRegister, Profile } from "@/types";
import { calculateTheoreticalBalance } from "@/utils/finance";
import { revalidatePath } from "next/cache";

export async function getOpenCashRegister(
  cashierId: string
): Promise<CashRegister | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cash_registers")
    .select("*")
    .eq("cashier_id", cashierId)
    .eq("status", "OPEN")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const reg = data as CashRegister & { cashier?: Profile };
  if (!reg.cashier && reg.cashier_id) {
    const { data: cashier } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", reg.cashier_id)
      .single();
    reg.cashier = (cashier as Profile | undefined) ?? undefined;
  }

  return reg as CashRegister | null;
}

export async function openCashRegister(
  cashierId: string,
  openingBalance: number
): Promise<CashRegister> {
  const supabase = await createClient();

  const existing = await getOpenCashRegister(cashierId);
  if (existing) {
    throw new Error("Une caisse est déjà ouverte.");
  }

  const { data, error } = await supabase
    .from("cash_registers")
    .insert({
      cashier_id: cashierId,
      opening_balance: openingBalance,
      status: "OPEN",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const created = data as CashRegister & { cashier?: Profile };
  if (created && !created.cashier && created.cashier_id) {
    const { data: cashier } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", created.cashier_id)
      .single();
    created.cashier = (cashier as Profile | undefined) ?? undefined;
  }

  await supabase.from("audit_logs").insert({
    user_id: cashierId,
    action: "CASH_OPENED",
    entity_type: "cash_register",
    entity_id: data.id,
    details: { opening_balance: openingBalance },
  });

  revalidatePath("/cash");
  revalidatePath("/cashier");
  return data as CashRegister;
}

export async function increaseCashRegisterBalance(
  registerId: string,
  userId: string,
  amount: number,
  reason?: string
): Promise<CashRegister> {
  const supabase = await createClient();

  const { data: register } = await supabase
    .from("cash_registers")
    .select("*")
    .eq("id", registerId)
    .eq("status", "OPEN")
    .single();

  if (!register) {
    throw new Error("Aucune caisse ouverte trouvée.");
  }

  const nextBalance = Number(register.opening_balance || 0) + Number(amount);

  const { data, error } = await supabase
    .from("cash_registers")
    .update({
      opening_balance: nextBalance,
    })
    .eq("id", registerId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "CASH_INCREASED",
    entity_type: "cash_register",
    entity_id: registerId,
    description: `Fonds ajoutés à la caisse : ${amount} HTG`,
    details: {
      amount,
      reason: reason || "Augmentation manuelle du fond de caisse",
      previous_balance: register.opening_balance,
      new_balance: nextBalance,
    },
  });

  revalidatePath("/cash");
  revalidatePath("/cashier");
  revalidatePath("/dashboard");

  return data as CashRegister;
}

export async function closeCashRegister(
  registerId: string,
  cashierId: string,
  closingBalance: number,
  differenceExplanation?: string,
  notes?: string
): Promise<CashRegister> {
  const supabase = await createClient();

  const summary = await getCashRegisterSummary(registerId);
  const { data: register } = await supabase
    .from("cash_registers")
    .select("opening_balance")
    .eq("id", registerId)
    .single();

  const expectedBalance = calculateTheoreticalBalance({
    openingBalance: Number(register?.opening_balance || 0),
    cashSales: summary.cashSales,
    authorizedInflows: summary.authorizedInflows,
    expenses: summary.totalExpenses,
    authorizedOutflows: summary.authorizedOutflows,
  });

  const difference = closingBalance - expectedBalance;

  if (difference !== 0 && !differenceExplanation?.trim()) {
    throw new Error(
      "Une explication est requise lorsque la caisse présente une différence."
    );
  }

  const { data, error } = await supabase
    .from("cash_registers")
    .update({
      status: "CLOSED",
      closing_balance: closingBalance,
      expected_balance: expectedBalance,
      difference,
      difference_explanation: differenceExplanation || null,
      closed_at: new Date().toISOString(),
      notes,
    })
    .eq("id", registerId)
    .eq("cashier_id", cashierId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const updated = data as CashRegister & { cashier?: Profile };
  if (updated && !updated.cashier && updated.cashier_id) {
    const { data: cashier } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", updated.cashier_id)
      .single();
    updated.cashier = (cashier as Profile | undefined) ?? undefined;
  }

  await supabase.from("audit_logs").insert({
    user_id: cashierId,
    action: "CASH_CLOSED",
    entity_type: "cash_register",
    entity_id: registerId,
    details: {
      closing_balance: closingBalance,
      expected_balance: expectedBalance,
      difference,
      difference_explanation: differenceExplanation,
    },
  });

  revalidatePath("/cash");
  revalidatePath("/cashier");
  revalidatePath("/dashboard");
  return data as CashRegister;
}

export async function getCashRegisterHistory(limit = 30): Promise<CashRegister[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cash_registers")
    .select("*")
    .order("opened_at", { ascending: false })
    .limit(limit);

  return (data || []) as CashRegister[];
}

export async function getCashRegisterSummary(registerId: string) {
  const supabase = await createClient();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, payment_method, commission_amount, shop_amount")
    .eq("cash_register_id", registerId)
    .eq("status", "ACTIVE");

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("cash_register_id", registerId);

  const { data: storeSales } = await supabase
    .from("store_sales")
    .select("total_amount, payment_method")
    .eq("cash_register_id", registerId)
    .eq("status", "VALIDEE");

  const barberTotalSales =
    transactions?.reduce((s, t) => s + Number(t.amount), 0) || 0;
  const barberCashSales =
    transactions
      ?.filter((t) => t.payment_method === "ESPECES")
      .reduce((s, t) => s + Number(t.amount), 0) || 0;

  const storeTotalSales =
    storeSales?.reduce((s, t) => s + Number(t.total_amount), 0) || 0;
  const storeCashSales =
    storeSales
      ?.filter((t) => t.payment_method === "ESPECES")
      .reduce((s, t) => s + Number(t.total_amount), 0) || 0;

  const totalSales = barberTotalSales + storeTotalSales;
  const cashSales = barberCashSales + storeCashSales;
  const otherSales = totalSales - cashSales;
  const totalExpenses =
    expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;

  return {
    totalSales,
    cashSales,
    otherSales,
    barberSales: barberTotalSales,
    storeSales: storeTotalSales,
    transactionCount: transactions?.length || 0,
    storeSaleCount: storeSales?.length || 0,
    totalExpenses,
    authorizedInflows: 0,
    authorizedOutflows: 0,
    commissions:
      transactions?.reduce((s, t) => s + Number(t.commission_amount), 0) || 0,
    shopShare:
      transactions?.reduce((s, t) => s + Number(t.shop_amount), 0) || 0,
  };
}

export function getTheoreticalBalance(
  openingBalance: number,
  summary: Awaited<ReturnType<typeof getCashRegisterSummary>>
): number {
  return calculateTheoreticalBalance({
    openingBalance,
    cashSales: summary.cashSales,
    authorizedInflows: summary.authorizedInflows,
    expenses: summary.totalExpenses,
    authorizedOutflows: summary.authorizedOutflows,
  });
}
