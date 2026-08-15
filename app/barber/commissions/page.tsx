import { AppShell, requireAuth } from "@/lib/auth";
import { getBarberByUserId } from "@/services/barber.service";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { DollarSign, Percent, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function BarberCommissionsPage() {
  const profile = await requireAuth(["BARBER"]);
  const barber = await getBarberByUserId(profile.id);
  const supabase = await createClient();

  const { data: balance } = barber
    ? await supabase.from("barber_balances").select("*").eq("barber_id", barber.id).single()
    : { data: null };

  return (
    <AppShell profile={profile} title="Mes commissions">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Taux commission" value={`${barber?.commission_rate || 0} %`} icon={Percent} isCurrency={false} />
        <StatCard title="Commissions totales" value={Number(balance?.total_commissions || 0)} icon={DollarSign} />
        <StatCard title="Reste à percevoir" value={Number(balance?.balance_due || 0)} icon={Wallet} variant="warning" />
      </div>
      <div className="mt-6 rounded-xl border border-zinc-800 p-6">
        <p className="text-zinc-400">Déjà payé</p>
        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(Number(balance?.total_paid || 0))}</p>
      </div>
    </AppShell>
  );
}
