import { AppShell, requireAuth } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import {
  getDashboardStats,
  getWeeklyRevenue,
  getTopBarbers,
  getBarberBalances,
} from "@/services/dashboard.service";
import { getTransactions } from "@/services/transaction.service";
import { getTodayISO } from "@/lib/utils";

export default async function DashboardPage() {
  const profile = await requireAuth(["ADMIN"]);

  const [stats, weeklyData, topBarbers, barberBalances, recentTransactions] =
    await Promise.all([
      getDashboardStats(),
      getWeeklyRevenue(),
      getTopBarbers(),
      getBarberBalances(),
      getTransactions({ date: getTodayISO(), limit: 10 }),
    ]);

  return (
    <AppShell
      profile={profile}
      title="Tableau de bord"
      subtitle={`Aperçu financier — ${new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`}
    >
      <DashboardClient
        stats={stats}
        weeklyData={weeklyData}
        topBarbers={topBarbers}
        barberBalances={barberBalances}
        recentTransactions={recentTransactions}
      />
    </AppShell>
  );
}
