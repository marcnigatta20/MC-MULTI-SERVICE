import { AppShell, requireAuth } from "@/lib/auth";
import { ExpensesClient } from "@/components/expenses/expenses-client";
import { getExpenses } from "@/services/barber.service";

export default async function ExpensesPage() {
  const profile = await requireAuth(["ADMIN", "CAISSIERE", "COMPTABLE"]);
  const expenses = await getExpenses();
  const canCreate = profile.role === "ADMIN" || profile.role === "CAISSIERE";

  return (
    <AppShell profile={profile} title="Dépenses" subtitle="Suivi des dépenses du barber shop">
      <ExpensesClient expenses={expenses} userId={profile.id} canCreate={canCreate} />
    </AppShell>
  );
}
