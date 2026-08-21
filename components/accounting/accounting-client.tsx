"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/dashboard/stat-card";
import { KPIChart } from "@/components/dashboard/kpi-chart";
import {
  DollarSign,
  Users,
  Building2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  type DashboardStats,
  type BarberBalance,
  type Expense,
  type BarberPayment,
  type Transaction,
} from "@/types";

interface AccountingClientProps {
  stats: DashboardStats;
  weeklyData: { date: string; revenue: number; commissions: number }[];
  barberBalances: BarberBalance[];
  expenses: Expense[];
  payments: BarberPayment[];
  transactions: Transaction[];
  hourlyData?: Array<{
    hour: string;
    revenue: number;
    sales: number;
  }>;
  totalRevenue?: number;
  totalSales?: number;
}

export function AccountingClient({
  stats,
  weeklyData,
  barberBalances,
  expenses,
  payments,
  transactions,
  hourlyData = [],
  totalRevenue = 0,
  totalSales = 0,
}: AccountingClientProps) {
  const chartData = weeklyData.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="space-y-6">
      {/* KPI Charts */}
      <KPIChart
        initialData={hourlyData}
        totalRevenue={totalRevenue}
        totalSales={totalSales}
      />

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
        Mode lecture seule — les transactions originales ne peuvent pas être modifiées.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard title="CA aujourd'hui" value={stats.revenueToday} icon={DollarSign} variant="gold" />
        <StatCard title="Commissions" value={stats.commissionsToday} icon={Users} />
        <StatCard title="Part MC" value={stats.shopShareToday} icon={Building2} variant="success" />
        <StatCard title="Dépenses" value={stats.expensesToday} icon={TrendingDown} variant="warning" />
        <StatCard title="Bénéfice net" value={stats.netProfitToday} icon={TrendingUp} variant="success" />
        <StatCard title="Dû aux barbiers" value={stats.barbersOwed} icon={Wallet} variant="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenus hebdomadaires</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
                formatter={(value) => [formatCurrency(Number(value)), ""]}
              />
              <Bar dataKey="revenue" fill="#d4af37" name="CA" radius={[4, 4, 0, 0]} />
              <Bar dataKey="commissions" fill="#71717a" name="Commissions" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Dépenses récentes</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.slice(0, 10).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.expense_date)}</TableCell>
                    <TableCell>{EXPENSE_CATEGORY_LABELS[e.category]}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(e.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Paiements barbiers</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Barber</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 10).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell>{p.barber?.full_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Soldes barbiers</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barber</TableHead>
                <TableHead>Taux</TableHead>
                <TableHead className="text-right">Commissions</TableHead>
                <TableHead className="text-right">Payé</TableHead>
                <TableHead className="text-right">Dû</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {barberBalances.map((b) => (
                <TableRow key={b.barber_id}>
                  <TableCell>{b.full_name}</TableCell>
                  <TableCell>{b.commission_rate}%</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(b.total_commissions))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(b.total_paid))}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={Number(b.balance_due) > 0 ? "warning" : "success"}>
                      {formatCurrency(Number(b.balance_due))}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reçu</TableHead>
                <TableHead>Barber</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-gold">{t.receipt_number}</TableCell>
                  <TableCell>{t.barber?.full_name}</TableCell>
                  <TableCell>{t.service?.name}</TableCell>
                  <TableCell>{PAYMENT_METHOD_LABELS[t.payment_method]}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "ACTIVE" ? "success" : "destructive"}>
                      {t.status === "ACTIVE" ? "Actif" : "Annulé"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(t.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
