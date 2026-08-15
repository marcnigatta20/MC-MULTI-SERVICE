import { AppShell, requireAuth } from "@/lib/auth";
import { PaymentsClient } from "@/components/payments/payments-client";
import { getBarbers, getBarberPayments } from "@/services/barber.service";
import { getBarberBalances } from "@/services/dashboard.service";

export default async function BarberPaymentsPage() {
  const profile = await requireAuth(["ADMIN"]);
  const [barbers, payments, balances] = await Promise.all([
    getBarbers(),
    getBarberPayments(),
    getBarberBalances(),
  ]);

  return (
    <AppShell
      profile={profile}
      title="Paiements barbiers"
      subtitle="Enregistrement des paiements physiques effectués — aucun transfert électronique"
    >
      <PaymentsClient barbers={barbers} payments={payments} balances={balances} userId={profile.id} />
    </AppShell>
  );
}
