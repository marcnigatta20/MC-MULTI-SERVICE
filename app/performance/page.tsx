import { AppShell, requireAuth } from "@/lib/auth";
import { PerformanceClient } from "@/components/performance/performance-client";
import { getBarberPerformance } from "@/services/performance.service";
import { getDateRange, type ReportPeriod } from "@/services/reports.service";

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function PerformancePage({ searchParams }: PageProps) {
  const profile = await requireAuth(["ADMIN", "COMPTABLE"]);
  const params = await searchParams;
  const period = (params.period as ReportPeriod) || "month";
  const { from, to } = getDateRange(period);

  const performance = await getBarberPerformance(from, to);

  return (
    <AppShell profile={profile} title="Performance" subtitle="Classement des barbiers">
      <PerformanceClient performance={performance} />
    </AppShell>
  );
}
