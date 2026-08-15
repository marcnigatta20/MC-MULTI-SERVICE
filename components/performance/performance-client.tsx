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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/loading";
import { formatCurrency } from "@/lib/utils";
import { Trophy } from "lucide-react";
import type { BarberPerformance } from "@/services/performance.service";

export function PerformanceClient({
  performance,
}: {
  performance: BarberPerformance[];
}) {
  if (performance.length === 0) {
    return (
      <EmptyState
        title="Aucune performance"
        description="Aucune transaction enregistrée sur cette période."
        icon={Trophy}
      />
    );
  }

  const chartData = performance.map((p) => ({
    name: p.full_name.split(" ")[0],
    ca: p.total_revenue,
    services: p.service_count,
    commissions: p.total_commissions,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            Classement barbiers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {performance.map((p) => (
            <div
              key={p.barber_id}
              className="flex items-center gap-4 rounded-xl border border-zinc-800 p-4"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                  p.rank === 1
                    ? "bg-gold text-black"
                    : p.rank === 2
                    ? "bg-zinc-400 text-black"
                    : p.rank === 3
                    ? "bg-amber-700 text-white"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {p.rank}
              </div>
              <div className="flex-1">
                <p className="font-medium">{p.full_name}</p>
                <p className="text-sm text-zinc-500">{p.service_count} services</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gold">{formatCurrency(p.total_revenue)}</p>
                <p className="text-xs text-zinc-500">
                  Comm. {formatCurrency(p.total_commissions)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>CA par barber</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" />
                <YAxis stroke="#71717a" tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
                  formatter={(v) => [formatCurrency(Number(v)), "CA"]}
                />
                <Bar dataKey="ca" fill="#d4af37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Commissions par barber</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" />
                <YAxis stroke="#71717a" tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
                  formatter={(v) => [formatCurrency(Number(v)), "Commission"]}
                />
                <Bar dataKey="commissions" fill="#71717a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
