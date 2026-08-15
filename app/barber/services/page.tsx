import { AppShell, requireAuth } from "@/lib/auth";
import { getBarberByUserId } from "@/services/barber.service";
import { getTransactions } from "@/services/transaction.service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/loading";
import { Scissors } from "lucide-react";

export default async function BarberServicesPage() {
  const profile = await requireAuth(["BARBER"]);
  const barber = await getBarberByUserId(profile.id);
  if (!barber) return <AppShell profile={profile} title="Mes services"><EmptyState title="Profil non lié" icon={Scissors} /></AppShell>;

  const transactions = await getTransactions({ barberId: barber.id, status: "ACTIVE" });

  return (
    <AppShell profile={profile} title="Mes services" subtitle="Services que j'ai réalisés">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Service</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead className="text-right">Ma commission</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id}>
              <TableCell>{formatDate(t.transaction_date)}</TableCell>
              <TableCell>{t.service_name || t.service?.name}</TableCell>
              <TableCell className="text-right">{formatCurrency(t.amount)}</TableCell>
              <TableCell className="text-right text-gold">{formatCurrency(t.commission_amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AppShell>
  );
}
