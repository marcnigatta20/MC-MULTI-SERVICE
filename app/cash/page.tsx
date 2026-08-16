import { AppShell, requireAuth } from "@/lib/auth";
import { CashClient } from "@/components/cash/cash-client";
import { getOpenCashRegister, getCashRegisterSummary } from "@/services/cash.service";

export default async function CashPage() {
  const profile = await requireAuth(["ADMIN", "CAISSIERE"]);

  const openRegister = await getOpenCashRegister(profile.id);
  const summary = openRegister
    ? await getCashRegisterSummary(openRegister.id)
    : null;

  return (
    <AppShell
      profile={profile}
      title="Caisse"
      subtitle="Gestion journalière — ouverture et fermeture"
    >
      <CashClient
        profileId={profile.id}
        profileRole={profile.role}
        openRegister={openRegister}
        summary={summary}
      />
    </AppShell>
  );
}
