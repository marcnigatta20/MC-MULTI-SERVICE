import { AppShell, requireAuth } from "@/lib/auth";
import { getTransactions } from "@/services/transaction.service";
import { getStoreSales } from "@/services/store.service";
import { ReceiptsClient } from "@/components/receipts/receipts-client";

export default async function ReceiptsPage() {
  const profile = await requireAuth(["CAISSIERE", "ADMIN"]);
  const transactions = await getTransactions({
    cashierId: profile.role === "CAISSIERE" ? profile.id : undefined,
    limit: 50,
    status: "ACTIVE",
  });

  const storeSales = await getStoreSales({
    limit: 50,
    status: "VALIDEE",
    cashierId: profile.role === "CAISSIERE" ? profile.id : undefined,
  });

  return (
    <AppShell profile={profile} title="Reçus" subtitle="Télécharger et imprimer les reçus">
      <ReceiptsClient transactions={transactions} storeSales={storeSales} />
    </AppShell>
  );
}
