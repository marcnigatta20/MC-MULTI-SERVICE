"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  DollarSign,
  Users,
  Building2,
  TrendingDown,
  TrendingUp,
  Wallet,
  Receipt,
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
import type { DashboardStats, BarberBalance } from "@/types";

interface DashboardClientProps {
  stats: DashboardStats;
  weeklyData: { date: string; revenue: number; commissions: number }[];
  topBarbers: { id: string; name: string; total: number; count: number }[];
  barberBalances: BarberBalance[];
  recentTransactions: {
    id: string;
    receipt_number: string;
    amount: number;
    created_at: string;
    barber?: { full_name: string };
    service?: { name: string };
    status: string;
  }[];
}

export function DashboardClient({
  stats,
  weeklyData,
  topBarbers,
  barberBalances,
  recentTransactions,
}: DashboardClientProps) {
  const chartData = weeklyData.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          title="CA aujourd'hui"
          value={stats.revenueToday}
          icon={DollarSign}
          variant="gold"
        />
        <StatCard
          title="Commissions barbiers"
          value={stats.commissionsToday}
          icon={Users}
        />
        <StatCard
          title="Part MC Barber"
          value={stats.shopShareToday}
          icon={Building2}
          variant="success"
        />
        <StatCard
          title="Dépenses"
          value={stats.expensesToday}
          icon={TrendingDown}
          variant="warning"
        />
        <StatCard
          title="Bénéfice net"
          value={stats.netProfitToday}
          icon={TrendingUp}
          variant={stats.netProfitToday >= 0 ? "success" : "danger"}
        />
        <StatCard
          title="Argent dû aux barbiers"
          value={stats.barbersOwed}
          icon={Wallet}
          variant="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenus — 7 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), ""]}
                />
                <Bar dataKey="revenue" fill="#d4af37" radius={[4, 4, 0, 0]} name="CA" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commissions — 7 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), "Commissions"]}
                />
                <Line
                  type="monotone"
                  dataKey="commissions"
                  stroke="#d4af37"
                  strokeWidth={2}
                  dot={{ fill: "#d4af37" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top barbiers aujourd&apos;hui</CardTitle>
          </CardHeader>
          <CardContent>
            {topBarbers.length === 0 ? (
              <p className="py-8 text-center text-zinc-500">Aucune vente aujourd&apos;hui</p>
            ) : (
              <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barber</TableHead>
                    <TableHead>Ventes</TableHead>
                    <TableHead className="text-right">CA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topBarbers.map((b, i) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <span className="mr-2 text-gold">#{i + 1}</span>
                        {b.name}
                      </TableCell>
                      <TableCell>{b.count}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(b.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Soldes barbiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barber</TableHead>
                  <TableHead className="text-right">Commission totale</TableHead>
                  <TableHead className="text-right">Dû</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barberBalances.map((b) => (
                  <TableRow key={b.barber_id}>
                    <TableCell>{b.full_name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(b.total_commissions))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={Number(b.balance_due) > 0 ? "warning" : "success"}>
                        {formatCurrency(Number(b.balance_due))}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transactions récentes
          </CardTitle>
          <Badge variant="secondary">{stats.transactionCount} aujourd&apos;hui</Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reçu</TableHead>
                <TableHead>Barber</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-gold">{t.receipt_number}</TableCell>
                  <TableCell>{t.barber?.full_name}</TableCell>
                  <TableCell>{t.service?.name}</TableCell>
                  <TableCell>{formatDate(t.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "ACTIVE" ? "success" : "destructive"}>
                      {t.status === "ACTIVE" ? "Actif" : "Annulé"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(t.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
