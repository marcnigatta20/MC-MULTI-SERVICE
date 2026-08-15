import { createClient } from "@/lib/supabase/server";
import type { BarberBalance } from "@/types";

export async function getCommissions(dateFrom?: string, dateTo?: string): Promise<
  (BarberBalance & { period_revenue: number; period_commission: number })[]
> {
  const supabase = await createClient();

  const { data: barbers } = await supabase
    .from("barbers")
    .select("id, full_name, commission_rate")
    .eq("is_active", true)
    .order("full_name");

  if (!barbers?.length) return [];

  const results = await Promise.all(
    barbers.map(async (barber) => {
      let txQuery = supabase
        .from("transactions")
        .select("amount, commission_amount")
        .eq("barber_id", barber.id)
        .eq("status", "ACTIVE");

      if (dateFrom) txQuery = txQuery.gte("transaction_date", dateFrom);
      if (dateTo) txQuery = txQuery.lte("transaction_date", dateTo);

      const { data: transactions } = await txQuery;

      const { data: balance } = await supabase
        .from("barber_balances")
        .select("total_commissions, total_paid, balance_due, total_revenue, service_count")
        .eq("barber_id", barber.id)
        .maybeSingle();

      const periodRevenue =
        transactions?.reduce((s, t) => s + Number(t.amount), 0) || 0;
      const periodCommission =
        transactions?.reduce((s, t) => s + Number(t.commission_amount), 0) || 0;

      return {
        barber_id: barber.id,
        full_name: barber.full_name,
        commission_rate: barber.commission_rate,
        total_revenue: Number(balance?.total_revenue || 0),
        service_count: Number(balance?.service_count || 0),
        total_commissions: Number(balance?.total_commissions || 0),
        total_paid: Number(balance?.total_paid || 0),
        balance_due: Number(balance?.balance_due || 0),
        period_revenue: periodRevenue,
        period_commission: periodCommission,
      };
    })
  );

  return results;
}
