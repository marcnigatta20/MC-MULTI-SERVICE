import { AppShell, requireAuth } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getTransactions } from "@/services/transaction.service";
import { getStoreSales } from "@/services/store.service";
import { getStoreDashboardStats } from "@/services/store.service";
import { getDashboardStats } from "@/services/dashboard.service";
import { generateHourlyData } from "@/lib/utils/hourly-data";
import { toLocalDateISO } from "@/lib/utils";

export default async function DashboardPage() {
  const profile = await requireAuth(["ADMIN"]);

  const today = toLocalDateISO(new Date());

  const [barberTransactions, storeSales, storeStats, dashboardStats] = await Promise.all([
    getTransactions({ date: today, limit: 50 }),
    getStoreSales({ limit: 50 }),
    getStoreDashboardStats(),
    getDashboardStats(today),
  ]);

  const totalRevenue = dashboardStats.totalRevenueToday || 0;
  const totalSales = dashboardStats.transactionCount + dashboardStats.storeSaleCount;
  const hourlyData = generateHourlyData(totalRevenue, totalSales);

  return (
    <AppShell
      profile={profile}
      title="Tableau de bord"
      subtitle={`Tickets et revenus — ${new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`}
    >
      <DashboardClient
        barberTransactions={barberTransactions}
        storeSales={storeSales}
        marginToday={storeStats.estimatedProfitToday}
        hourlyData={hourlyData}
        totalRevenue={totalRevenue}
        totalSales={totalSales}
      />
    </AppShell>
  );
}
