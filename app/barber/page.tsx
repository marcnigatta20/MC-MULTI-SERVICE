import { AppShell, requireAuth } from "@/lib/auth";
import { getBarberByUserId, getBarberPayments } from "@/services/barber.service";
import { getTransactions } from "@/services/transaction.service";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { KPIChart } from "@/components/dashboard/kpi-chart";
import { generateHourlyData } from "@/lib/utils/hourly-data";
import { DollarSign, Percent, Wallet, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getTodayISO } from "@/lib/utils";
import { EmptyState } from "@/components/ui/loading";
import { UserCircle } from "lucide-react";

export default async function BarberPage() {
  const profile = await requireAuth(["ADMIN", "BARBER"]);

  const barber = await getBarberByUserId(profile.id);

  if (!barber && profile.role === "BARBER") {
    return (
      <AppShell profile={profile} title="Mon espace">
        <EmptyState
          title="Profil barber non configuré"
          description="Contactez l'administrateur pour lier votre compte à un profil barber."
          icon={UserCircle}
        />
      </AppShell>
    );
  }

  const barberId = barber!.id;
  const supabase = await createClient();

  const { data: balance } = await supabase
    .from("barber_balances")
    .select("*")
    .eq("barber_id", barberId)
    .single();

  const today = getTodayISO();
  const transactions = await getTransactions({ barberId });
  const todayTransactions = transactions.filter((t) => t.transaction_date === today && t.status === "ACTIVE");
  const payments = await getBarberPayments(barberId);

  const todayRevenue = todayTransactions.reduce((s, t) => s + Number(t.amount), 0);
  const todayCommission = todayTransactions.reduce((s, t) => s + Number(t.commission_amount), 0);
  const hourlyData = generateHourlyData(todayRevenue, todayTransactions.length);

  return (
    <AppShell
      profile={profile}
      title={`Bonjour, ${barber!.full_name}`}
      subtitle="Votre espace personnel"
    >
      <div className="space-y-6">
        {/* KPI Charts */}
        <KPIChart
          initialData={hourlyData}
          totalRevenue={todayRevenue}
          totalSales={todayTransactions.length}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="CA aujourd'hui" value={todayRevenue} icon={DollarSign} variant="gold" />
          <StatCard title="Commission aujourd'hui" value={todayCommission} icon={Percent} />
          <StatCard
            title="Total commissions"
            value={Number(balance?.total_commissions || 0)}
            icon={Receipt}
          />
          <StatCard
            title="Montant restant dû"
            value={Number(balance?.balance_due || 0)}
            icon={Wallet}
            variant="warning"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Services réalisés aujourd&apos;hui</CardTitle>
            </CardHeader>
            <CardContent>
              {todayTransactions.length === 0 ? (
                <p className="py-8 text-center text-zinc-500">Aucun service aujourd&apos;hui</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.service?.name}</TableCell>
                        <TableCell>{formatCurrency(t.commission_amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(t.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paiements reçus</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="py-8 text-center text-zinc-500">Aucun paiement enregistré</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.slice(0, 10).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.payment_date)}</TableCell>
                        <TableCell className="text-zinc-400">{p.notes || "—"}</TableCell>
                        <TableCell className="text-right text-emerald-400">
                          {formatCurrency(p.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historique personnel</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reçu</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 20).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-gold">{t.receipt_number}</TableCell>
                    <TableCell>{t.service?.name}</TableCell>
                    <TableCell>{formatDate(t.transaction_date)}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === "ACTIVE" ? "success" : "destructive"}>
                        {t.status === "ACTIVE" ? "Actif" : "Annulé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(t.commission_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
