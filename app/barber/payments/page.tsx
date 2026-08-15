import { AppShell, requireAuth } from "@/lib/auth";
import { getBarberByUserId, getBarberPayments } from "@/services/barber.service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function BarberPaymentsPage() {
  const profile = await requireAuth(["BARBER"]);
  const barber = await getBarberByUserId(profile.id);
  const payments = barber ? await getBarberPayments(barber.id) : [];

  return (
    <AppShell profile={profile} title="Mes paiements">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Note</TableHead>
            <TableHead className="text-right">Montant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{formatDate(p.payment_date)}</TableCell>
              <TableCell className="text-zinc-400">{p.notes || "—"}</TableCell>
              <TableCell className="text-right text-emerald-400">{formatCurrency(p.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AppShell>
  );
}
