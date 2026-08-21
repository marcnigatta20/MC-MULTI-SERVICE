import { AppShell, requireAuth } from "@/lib/auth";
import { AccountingClient } from "@/components/accounting/accounting-client";
import {
  getDashboardStats,
  getWeeklyRevenue,
  getBarberBalances,
} from "@/services/dashboard.service";
import { getExpenses, getBarberPayments } from "@/services/barber.service";
import { getTransactions } from "@/services/transaction.service";
import { generateHourlyData } from "@/lib/utils/hourly-data";

export default async function AccountingPage() {
  const profile = await requireAuth(["ADMIN", "COMPTABLE"]);

  const [stats, weeklyData, barberBalances, expenses, payments, transactions] =
    await Promise.all([
      getDashboardStats(),
      getWeeklyRevenue(),
      getBarberBalances(),
      getExpenses(),
      getBarberPayments(),
      getTransactions({ limit: 50 }),
    ]);

  const totalRevenue = stats.totalRevenueToday || 0;
  const totalSales = stats.transactionCount + stats.storeSaleCount;
  const hourlyData = generateHourlyData(totalRevenue, totalSales);

  return (
    <AppShell
      profile={profile}
      title="Comptabilité"
      subtitle="Vue financière en lecture seule"
    >
      <AccountingClient
        stats={stats}
        weeklyData={weeklyData}
        barberBalances={barberBalances}
        expenses={expenses}
        payments={payments}
        transactions={transactions}
        hourlyData={hourlyData}
        totalRevenue={totalRevenue}
        totalSales={totalSales}
      />
    </AppShell>
  );
}
