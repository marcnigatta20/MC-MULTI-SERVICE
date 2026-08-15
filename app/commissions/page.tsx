import { AppShell, requireAuth } from "@/lib/auth";
import { CommissionsClient } from "@/components/commissions/commissions-client";
import { getCommissions } from "@/services/commissions.service";
import { getDateRange, type ReportPeriod } from "@/services/reports.service";

interface PageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}

export default async function CommissionsPage({ searchParams }: PageProps) {
  const profile = await requireAuth(["ADMIN", "COMPTABLE"]);
  const params = await searchParams;
  const period = (params.period as ReportPeriod) || "month";
  const { from, to } = getDateRange(period, params.from, params.to);

  const commissions = await getCommissions(from, to);
  const periodLabel = `${from} → ${to}`;

  return (
    <AppShell profile={profile} title="Commissions" subtitle="Commissions barbiers par période">
      <CommissionsClient commissions={commissions} periodLabel={periodLabel} />
    </AppShell>
  );
}
