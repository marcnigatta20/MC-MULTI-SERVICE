import { AppShell, requireAuth } from "@/lib/auth";
import { ReportsClient } from "@/components/reports/reports-client";
import {
  getReportData,
  getMonthlyEvolution,
  type ReportPeriod,
  type ReportType,
} from "@/services/reports.service";

interface PageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string; type?: string }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const profile = await requireAuth(["ADMIN", "COMPTABLE"]);
  const params = await searchParams;
  const period = (params.period as ReportPeriod) || "month";
  const reportType = (params.type === "barber" ? "barber" : "store") as ReportType;

  const [reportData, monthlyEvolution] = await Promise.all([
    getReportData(period, params.from, params.to, reportType),
    getMonthlyEvolution(6, reportType),
  ]);

  return (
    <AppShell profile={profile} title="Rapports" subtitle="Analyses financières et graphiques">
      <ReportsClient
        period={period}
        reportType={reportType}
        customFrom={params.from}
        customTo={params.to}
        reportData={reportData}
        monthlyEvolution={monthlyEvolution}
      />
    </AppShell>
  );
}
