import { AppShell, requireAuth } from "@/lib/auth";
import { getStoreSales } from "@/services/store.service";
import { StoreSalesList } from "@/components/store/store-sales-list";

export default async function StoreSalesPage() {
  const profile = await requireAuth(["ADMIN", "CAISSIERE"]);
  const sales = await getStoreSales({ limit: 30 });

  return (
    <AppShell profile={profile} title="Ventes" subtitle="Historique des ventes Store">
      <StoreSalesList sales={sales} />
    </AppShell>
  );
}
