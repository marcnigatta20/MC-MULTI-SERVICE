import { AppShell, requireAuth } from "@/lib/auth";
import { TransactionsClient } from "@/components/transactions/transactions-client";
import { getTransactions, getFilterOptions } from "@/services/transaction.service";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui/loading";

interface PageProps {
  searchParams: Promise<{
    date?: string;
    barber?: string;
    cashier?: string;
    service?: string;
    payment?: string;
    status?: string;
    receipt?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const profile = await requireAuth(["ADMIN", "COMPTABLE", "CAISSIERE"]);
  const params = await searchParams;

  const filters = {
    date: params.date,
    barberId: params.barber,
    cashierId: profile.role === "CAISSIERE" ? profile.id : params.cashier,
    serviceId: params.service,
    paymentMethod: params.payment,
    status: params.status,
    receiptSearch: params.receipt,
    limit: 200,
  };

  const [transactions, filterOptions] = await Promise.all([
    getTransactions(filters),
    getFilterOptions(),
  ]);

  const showCommissionColumns = profile.role !== "CAISSIERE";

  return (
    <AppShell profile={profile} title="Transactions" subtitle="Historique complet des ventes">
      <Suspense fallback={<PageLoader />}>
        <TransactionsClient
          transactions={transactions}
          filterOptions={filterOptions}
          canCancel={profile.role === "ADMIN"}
          userId={profile.id}
          showCommissionColumns={showCommissionColumns}
        />
      </Suspense>
    </AppShell>
  );
}
