import { AppShell, requireAuth } from "@/lib/auth";
import { getTransactions } from "@/services/transaction.service";
import { TransactionsClient } from "@/components/transactions/transactions-client";
import { getFilterOptions } from "@/services/transaction.service";
import { getTodayISO } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { DollarSign, Receipt } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function CashierDashboardPage() {
  const profile = await requireAuth(["CAISSIERE"]);
  const today = getTodayISO();

  const [todayTx, filterOptions] = await Promise.all([
    getTransactions({ date: today, cashierId: profile.id }),
    getFilterOptions(),
  ]);

  const activeTx = todayTx.filter((t) => t.status === "ACTIVE");
  const todayTotal = activeTx.reduce((s, t) => s + Number(t.amount), 0);

  return (
    <AppShell profile={profile} title="Dashboard" subtitle="Votre activité du jour">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Link href="/transactions/new">
            <Button size="lg"><Plus className="h-4 w-4" /> Nouvelle vente</Button>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard title="Ventes aujourd'hui" value={todayTotal} icon={DollarSign} variant="gold" />
          <StatCard title="Transactions" value={activeTx.length} icon={Receipt} isCurrency={false} />
        </div>
        <TransactionsClient
          transactions={todayTx.slice(0, 10)}
          filterOptions={filterOptions}
          canCancel={false}
          userId={profile.id}
          showCommissionColumns={false}
        />
      </div>
    </AppShell>
  );
}
