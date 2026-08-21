"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart,
  Line,
  Area,
  AreaChart,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useRealtimeTable } from "@/lib/hooks/use-realtime-table";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, ShoppingCart } from "lucide-react";

interface KPIChartProps {
  initialData: Array<{
    hour: string;
    revenue: number;
    sales: number;
  }>;
  totalRevenue: number;
  totalSales: number;
}

export function KPIChart({
  initialData,
  totalRevenue,
  totalSales,
}: KPIChartProps) {
  const [data, setData] = useState(initialData);
  const [isLive, setIsLive] = useState(false);

  useRealtimeTable({
    source: ["transaction", "store_sales"],
    refreshOnChange: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLiveSync = () => {
      setIsLive(true);
      const timer = window.setTimeout(() => setIsLive(false), 1200);
      return () => window.clearTimeout(timer);
    };

    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<{ source?: string }>;
      if (customEvent.detail?.source && !customEvent.detail.source.includes("store") && !customEvent.detail.source.includes("transaction")) {
        return;
      }
      handleLiveSync();
    };

    window.addEventListener("mc-live-sync", listener);
    window.addEventListener("storage", listener as EventListener);

    return () => {
      window.removeEventListener("mc-live-sync", listener);
      window.removeEventListener("storage", listener as EventListener);
    };
  }, []);

  // Simulate real-time updates for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            revenue: updated[lastIdx].revenue + Math.random() * 500,
            sales: updated[lastIdx].sales + (Math.random() > 0.7 ? 1 : 0),
          };
        }
        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Revenue KPI */}
      <Card
        className={[
          "min-w-0 border-gold/20 bg-linear-to-br from-zinc-900 to-zinc-950 transition-all duration-500",
          isLive ? "ring-1 ring-gold/40 shadow-[0_0_18px_rgba(212,175,55,0.18)]" : "",
        ].join(" ")}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-gold text-sm sm:text-base">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="leading-tight">Chiffre d&apos;affaires en temps réel</span>
            </CardTitle>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-gold animate-pulse sm:px-2 sm:py-1 sm:text-[10px]">
                LIVE
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="text-2xl font-bold text-gold sm:text-4xl">
            {formatCurrency(totalRevenue)}
          </div>
          <p className="text-xs text-zinc-400 sm:text-sm">Aujourd&apos;hui</p>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="hour"
                stroke="#a1a1aa"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #d4af37",
                  borderRadius: "8px",
                }}
                cursor={{ stroke: "#d4af37", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                fill="url(#colorRevenue)"
                stroke="#d4af37"
                strokeWidth={2}
                dot={false}
                name="Revenu (HTG)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sales Count KPI */}
      <Card
        className={[
          "min-w-0 border-emerald-500/20 bg-linear-to-br from-zinc-900 to-zinc-950 transition-all duration-500",
          isLive ? "ring-1 ring-emerald-400/40 shadow-[0_0_18px_rgba(16,185,129,0.18)]" : "",
        ].join(" ")}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-emerald-400 text-sm sm:text-base">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="leading-tight">Nombre de ventes en temps réel</span>
            </CardTitle>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-emerald-300 animate-pulse sm:px-2 sm:py-1 sm:text-[10px]">
                LIVE
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="text-2xl font-bold text-emerald-400 sm:text-4xl">
            {totalSales}
          </div>
          <p className="text-xs text-zinc-400 sm:text-sm">Transactions aujourd&apos;hui</p>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="hour"
                stroke="#a1a1aa"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#a1a1aa" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #10b981",
                  borderRadius: "8px",
                }}
                cursor={{ stroke: "#10b981", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                fill="url(#colorSales)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Ventes"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Combined Premium Chart */}
      <Card
        className={[
          "min-w-0 border-amber-500/20 bg-linear-to-br from-zinc-900 to-zinc-950 transition-all duration-500 lg:col-span-2",
          isLive ? "ring-1 ring-amber-400/40 shadow-[0_0_18px_rgba(251,191,36,0.15)]" : "",
        ].join(" ")}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-amber-400 text-sm sm:text-base">
                Vue consolidée — Revenu &amp; Ventes
              </CardTitle>
              <p className="text-xs text-zinc-400 sm:text-sm">Graphiques superposés en temps réel</p>
            </div>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-amber-300 animate-pulse sm:px-2 sm:py-1 sm:text-[10px]">
                LIVE
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenueCombo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4af37" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSalesCombo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="hour"
                stroke="#a1a1aa"
                style={{ fontSize: "12px" }}
              />
              <YAxis yAxisId="left" stroke="#d4af37" style={{ fontSize: "12px" }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#10b981"
                style={{ fontSize: "12px" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #d4af37",
                  borderRadius: "8px",
                }}
                cursor={{ stroke: "#999", strokeWidth: 2 }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                fill="url(#colorRevenueCombo)"
                stroke="#d4af37"
                strokeWidth={2.5}
                dot={false}
                name="Revenu (HTG)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="sales"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
                name="Nombre de ventes"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
