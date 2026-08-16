import { createClient } from "@/lib/supabase/server";
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from "@/types";
import type { ReportType } from "@/lib/report-types";
import { toLocalDateISO } from "@/lib/utils";

export type { ReportType } from "@/lib/report-types";

export type ReportPeriod =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "last_month"
  | "custom";

export function getDateRange(period: ReportPeriod, customFrom?: string, customTo?: string) {
  const now = new Date();
  const today = toLocalDateISO(now);

  switch (period) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      const y = toLocalDateISO(d);
      return { from: y, to: y };
    }
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: toLocalDateISO(d), to: today };
    }
    case "month": {
      const from = toLocalDateISO(new Date(now.getFullYear(), now.getMonth(), 1));
      return { from, to: today };
    }
    case "last_month": {
      const from = toLocalDateISO(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const to = toLocalDateISO(new Date(now.getFullYear(), now.getMonth(), 0));
      return { from, to };
    }
    case "custom":
      return {
        from: customFrom || today,
        to: customTo || today,
      };
    default:
      return { from: today, to: today };
  }
}

export async function getReportData(
  period: ReportPeriod,
  customFrom?: string,
  customTo?: string,
  reportType: ReportType = "store"
) {
  const supabase = await createClient();
  const { from, to } = getDateRange(period, customFrom, customTo);

  const [
    { data: transactions },
    { data: expenses },
    { data: barberPayments },
    { data: balances },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, commission_amount, shop_amount, transaction_date, barber_id, barber:barbers(full_name)")
      .eq("status", "ACTIVE")
      .gte("transaction_date", from)
      .lte("transaction_date", to),
    supabase
      .from("expenses")
      .select("amount, category, expense_date")
      .gte("expense_date", from)
      .lte("expense_date", to),
    supabase
      .from("barber_payments")
      .select("amount, payment_date")
      .gte("payment_date", from)
      .lte("payment_date", to),
    supabase.from("barber_balances").select("balance_due"),
  ]);

  const revenue = transactions?.reduce((s, t) => s + Number(t.amount), 0) || 0;
  const commissions =
    transactions?.reduce((s, t) => s + Number(t.commission_amount), 0) || 0;
  const shopShare =
    transactions?.reduce((s, t) => s + Number(t.shop_amount), 0) || 0;
  const totalExpenses = expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;
  const barberPaymentsTotal =
    barberPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const barbersOwed =
    balances?.reduce((s, b) => s + Number(b.balance_due), 0) || 0;

  const revenueByDay = new Map<string, number>();
  transactions?.forEach((t) => {
    const d = t.transaction_date;
    revenueByDay.set(d, (revenueByDay.get(d) || 0) + Number(t.amount));
  });

  const revenueByBarber = new Map<string, { name: string; revenue: number; commissions: number }>();
  transactions?.forEach((t) => {
    const barber = t.barber as unknown as { full_name: string } | null;
    const existing = revenueByBarber.get(t.barber_id) || {
      name: barber?.full_name || "Inconnu",
      revenue: 0,
      commissions: 0,
    };
    existing.revenue += Number(t.amount);
    existing.commissions += Number(t.commission_amount);
    revenueByBarber.set(t.barber_id, existing);
  });

  const expensesByCategory = new Map<string, number>();
  expenses?.forEach((e) => {
    const label = EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] || e.category;
    expensesByCategory.set(label, (expensesByCategory.get(label) || 0) + Number(e.amount));
  });

  const dailyChart = Array.from(revenueByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  const barberChart = Array.from(revenueByBarber.values())
    .sort((a, b) => b.revenue - a.revenue);

  const expenseChart = Array.from(expensesByCategory.entries()).map(
    ([category, amount]) => ({ category, amount })
  );

  return {
    reportType,
    period: { from, to },
    summary: {
      revenue,
      commissions,
      shopShare,
      expenses: totalExpenses,
      netProfit: shopShare - totalExpenses,
      barberPayments: barberPaymentsTotal,
      barbersOwed,
      transactionCount: transactions?.length || 0,
    },
    dailyChart,
    barberChart,
    expenseChart,
  };
}

export async function getMonthlyEvolution(months = 6) {
  const supabase = await createClient();
  const data: { month: string; revenue: number; expenses: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const from = toLocalDateISO(new Date(d.getFullYear(), d.getMonth(), 1));
    const to = toLocalDateISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const label = d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });

    const [{ data: txs }, { data: exps }] = await Promise.all([
      supabase
        .from("transactions")
        .select("amount")
        .eq("status", "ACTIVE")
        .gte("transaction_date", from)
        .lte("transaction_date", to),
      supabase
        .from("expenses")
        .select("amount")
        .gte("expense_date", from)
        .lte("expense_date", to),
    ]);

    data.push({
      month: label,
      revenue: txs?.reduce((s, t) => s + Number(t.amount), 0) || 0,
      expenses: exps?.reduce((s, e) => s + Number(e.amount), 0) || 0,
    });
  }

  return data;
}
