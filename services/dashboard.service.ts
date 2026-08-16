import { createClient } from "@/lib/supabase/server";
import type { DashboardStats, BarberBalance } from "@/types";
import { getTodayISO, toLocalDateISO } from "@/lib/utils";

export async function getDashboardStats(date?: string): Promise<DashboardStats> {
  const supabase = await createClient();
  const targetDate = date || getTodayISO();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, commission_amount, shop_amount, status")
    .eq("transaction_date", targetDate)
    .eq("status", "ACTIVE");

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("expense_date", targetDate);

  const { data: balances } = await supabase
    .from("barber_balances")
    .select("balance_due");

  const { data: storeSalesToday } = await supabase
    .from("store_sales")
    .select("total_amount, items:store_sale_items(profit)")
    .eq("status", "VALIDEE")
    .gte("created_at", `${targetDate}T00:00:00Z`)
    .lte("created_at", `${targetDate}T23:59:59Z`);

  const storeRevenueToday =
    storeSalesToday?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const storeProfitToday =
    storeSalesToday?.reduce((sum, s) => {
      const items = s.items as { profit: number }[] | null;
      return sum + (items?.reduce((is, i) => is + Number(i.profit), 0) || 0);
    }, 0) || 0;

  const revenueToday =
    transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const commissionsToday =
    transactions?.reduce((sum, t) => sum + Number(t.commission_amount), 0) || 0;
  const shopShareToday =
    transactions?.reduce((sum, t) => sum + Number(t.shop_amount), 0) || 0;
  const expensesToday =
    expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const barbersOwed =
    balances?.reduce((sum, b) => sum + Number(b.balance_due), 0) || 0;

  return {
    revenueToday,
    commissionsToday,
    shopShareToday,
    storeRevenueToday,
    totalRevenueToday: revenueToday + storeRevenueToday,
    expensesToday,
    netProfitToday: shopShareToday + storeProfitToday - expensesToday,
    storeProfitToday,
    barbersOwed,
    transactionCount: transactions?.length || 0,
    storeSaleCount: storeSalesToday?.length || 0,
  };
}

export async function getBarberBalances(): Promise<BarberBalance[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("barber_balances")
    .select("*")
    .order("balance_due", { ascending: false });

  return (data || []) as BarberBalance[];
}

export async function getWeeklyRevenue(): Promise<
  { date: string; revenue: number; commissions: number }[]
> {
  const supabase = await createClient();
  const days: { date: string; revenue: number; commissions: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateISO(d);

    const { data } = await supabase
      .from("transactions")
      .select("amount, commission_amount")
      .eq("transaction_date", dateStr)
      .eq("status", "ACTIVE");

    days.push({
      date: dateStr,
      revenue: data?.reduce((s, t) => s + Number(t.amount), 0) || 0,
      commissions:
        data?.reduce((s, t) => s + Number(t.commission_amount), 0) || 0,
    });
  }

  return days;
}

export async function getTopBarbers(limit = 5) {
  const supabase = await createClient();
  const today = getTodayISO();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("barber_id, amount, barber:barbers(full_name)")
    .eq("transaction_date", today)
    .eq("status", "ACTIVE");

  const barberMap = new Map<string, { name: string; total: number; count: number }>();

  transactions?.forEach((t) => {
    const barber = t.barber as unknown as { full_name: string } | null;
    const existing = barberMap.get(t.barber_id) || {
      name: barber?.full_name || "Inconnu",
      total: 0,
      count: 0,
    };
    existing.total += Number(t.amount);
    existing.count += 1;
    barberMap.set(t.barber_id, existing);
  });

  return Array.from(barberMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
