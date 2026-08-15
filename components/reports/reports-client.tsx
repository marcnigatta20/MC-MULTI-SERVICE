"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  DollarSign,
  Users,
  Building2,
  TrendingDown,
  TrendingUp,
  Wallet,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { generateReportPDF, downloadPDF } from "@/utils/pdf";
import { Download } from "lucide-react";
import { getReportTypeMeta, type ReportType } from "@/lib/report-types";
import type { ReportPeriod } from "@/services/reports.service";

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  today: "Aujourd'hui",
  yesterday: "Hier",
  week: "Cette semaine",
  month: "Ce mois",
  last_month: "Mois précédent",
  custom: "Personnalisé",
};

const COLORS = ["#d4af37", "#71717a", "#10b981", "#3b82f6", "#ef4444", "#a855f7"];

interface ReportsClientProps {
  period: ReportPeriod;
  reportType: ReportType;
  customFrom?: string;
  customTo?: string;
  reportData: Awaited<ReturnType<typeof import("@/services/reports.service").getReportData>>;
  monthlyEvolution: { month: string; revenue: number; expenses: number }[];
}

export function ReportsClient({
  period,
  reportType,
  customFrom,
  customTo,
  reportData,
  monthlyEvolution,
}: ReportsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [from, setFrom] = useState(customFrom || "");
  const [to, setTo] = useState(customTo || "");
  const { summary, dailyChart, barberChart, expenseChart } = reportData;
  const reportTypeMeta = getReportTypeMeta(reportType);
  const isBarberReport = reportType === "barber";

  const summaryCards = isBarberReport
    ? [
        { title: "CA barbiers", value: summary.revenue, icon: DollarSign, variant: "gold" as const },
        { title: "Commissions barbiers", value: summary.commissions, icon: Users },
        { title: "Part MC", value: summary.shopShare, icon: Building2, variant: "success" as const },
        { title: "Paiements", value: summary.barberPayments, icon: CreditCard },
        { title: "Restant dû", value: summary.barbersOwed, icon: Wallet, variant: "warning" as const },
      ]
    : [
        { title: "CA total", value: summary.revenue, icon: DollarSign, variant: "gold" as const },
        { title: "Commissions", value: summary.commissions, icon: Users },
        { title: "Part MC", value: summary.shopShare, icon: Building2, variant: "success" as const },
        { title: "Dépenses", value: summary.expenses, icon: TrendingDown, variant: "warning" as const },
        { title: "Bénéfice", value: summary.netProfit, icon: TrendingUp, variant: "success" as const },
        { title: "Paiements barbiers", value: summary.barberPayments, icon: CreditCard },
        { title: "Restant dû", value: summary.barbersOwed, icon: Wallet, variant: "warning" as const },
      ];

  function setPeriod(p: ReportPeriod) {
    startTransition(() => router.push(`/reports?period=${p}&type=${reportType}`));
  }

  function setReportType(type: ReportType) {
    startTransition(() => router.push(`/reports?period=${period}&type=${type}`));
  }

  function applyCustom() {
    if (from && to) {
      startTransition(() => router.push(`/reports?period=custom&from=${from}&to=${to}&type=${reportType}`));
    }
  }

  function exportPDF() {
    const doc = generateReportPDF(
      `Rapport ${reportTypeMeta.label} — ${PERIOD_LABELS[period]}`,
      ["Indicateur", "Montant"],
      [
        ["CA total", formatCurrency(summary.revenue)],
        ["Commissions", formatCurrency(summary.commissions)],
        ["Part MC", formatCurrency(summary.shopShare)],
        ["Dépenses", formatCurrency(summary.expenses)],
        ["Bénéfice", formatCurrency(summary.netProfit)],
        ["Paiements barbiers", formatCurrency(summary.barberPayments)],
        ["Restant dû", formatCurrency(summary.barbersOwed)],
      ]
    );
    downloadPDF(doc, `rapport-${reportType}-${period}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-400">Type de rapport : {reportTypeMeta.label}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["store", "barber"] as ReportType[]).map((type) => (
          <Button
            key={type}
            variant={reportType === type ? "default" : "outline"}
            size="sm"
            onClick={() => setReportType(type)}
            disabled={isPending}
          >
            {getReportTypeMeta(type).label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(PERIOD_LABELS) as ReportPeriod[]).filter((p) => p !== "custom").map((p) => (
          <Button
            key={p}
            variant={period === p ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(p)}
            disabled={isPending}
          >
            {PERIOD_LABELS[p]}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 p-4">
        <div className="space-y-1">
          <Label className="text-xs">Du</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Au</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="secondary" onClick={applyCustom} disabled={isPending}>
          Période personnalisée
        </Button>
        <Button onClick={exportPDF} className="ml-auto">
          <Download className="h-4 w-4" /> Export PDF
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {summaryCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            variant={card.variant}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>CA par jour</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="#71717a" tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} formatter={(v) => [formatCurrency(Number(v)), "CA"]} />
                <Bar dataKey="revenue" fill="#d4af37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>CA par barber</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barberChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" stroke="#71717a" tickFormatter={(v) => `${v / 1000}k`} />
                <YAxis type="category" dataKey="name" stroke="#71717a" width={80} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} formatter={(v) => [formatCurrency(Number(v)), "CA"]} />
                <Bar dataKey="revenue" fill="#d4af37" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Commissions par barber</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barberChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" />
                <YAxis stroke="#71717a" tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} formatter={(v) => [formatCurrency(Number(v)), "Commission"]} />
                <Bar dataKey="commissions" fill="#71717a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Dépenses par catégorie</CardTitle></CardHeader>
          <CardContent>
            {expenseChart.length === 0 ? (
              <p className="py-12 text-center text-zinc-500">Aucune dépense</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={expenseChart} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={(props) => String(props.name ?? "")}>
                    {expenseChart.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Évolution mensuelle</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#71717a" />
              <YAxis stroke="#71717a" tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} formatter={(v) => formatCurrency(Number(v))} />
              <Line type="monotone" dataKey="revenue" stroke="#d4af37" strokeWidth={2} name="CA" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Dépenses" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
