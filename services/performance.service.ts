import { createClient } from "@/lib/supabase/server";

export interface BarberPerformance {
  barber_id: string;
  full_name: string;
  total_revenue: number;
  service_count: number;
  total_commissions: number;
  rank: number;
}

export async function getBarberPerformance(
  dateFrom?: string,
  dateTo?: string
): Promise<BarberPerformance[]> {
  const supabase = await createClient();

  const { data: barbers } = await supabase
    .from("barbers")
    .select("id, full_name")
    .eq("is_active", true);

  if (!barbers?.length) return [];

  const stats = await Promise.all(
    barbers.map(async (barber) => {
      let query = supabase
        .from("transactions")
        .select("amount, commission_amount")
        .eq("barber_id", barber.id)
        .eq("status", "ACTIVE");

      if (dateFrom) query = query.gte("transaction_date", dateFrom);
      if (dateTo) query = query.lte("transaction_date", dateTo);

      const { data: txs } = await query;

      return {
        barber_id: barber.id,
        full_name: barber.full_name,
        total_revenue: txs?.reduce((s, t) => s + Number(t.amount), 0) || 0,
        service_count: txs?.length || 0,
        total_commissions:
          txs?.reduce((s, t) => s + Number(t.commission_amount), 0) || 0,
      };
    })
  );

  return stats
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}
