"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { StoreStats } from "@/components/store/store-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StockBadge } from "@/components/store/stock-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { STORE_SALE_STATUS_LABELS, type StoreDashboardStats, type StoreSale, type Product } from "@/types";
import { AlertTriangle, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useRealtimeTable } from "@/lib/hooks/use-realtime-table";

interface StoreDashboardClientProps {
  stats: StoreDashboardStats;
  weeklyData: { date: string; revenue: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  recentSales: StoreSale[];
  lowStock: Product[];
  canSell: boolean;
}

export function StoreDashboardClient({
  stats,
  weeklyData,
  topProducts,
  recentSales,
  lowStock,
  canSell,
}: StoreDashboardClientProps) {
  const router = useRouter();
  const [isLive, setIsLive] = useState(false);
  useRealtimeTable({
    source: ["store_sale", "store_sale_cancelled"],
    refreshOnChange: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent<{ source?: string }>;
      if (customEvent.detail?.source && !customEvent.detail.source.includes("store")) {
        return;
      }
      setIsLive(true);
      const timeout = window.setTimeout(() => setIsLive(false), 1200);
      return () => window.clearTimeout(timeout);
    };

    window.addEventListener("mc-live-sync", handleSync);
    window.addEventListener("storage", handleSync as EventListener);

    return () => {
      window.removeEventListener("mc-live-sync", handleSync);
      window.removeEventListener("storage", handleSync as EventListener);
    };
  }, []);

  const chartData = weeklyData.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
  }));

  useEffect(() => {
    if (lowStock.length > 0) {
      const hasLowStockAlert = sessionStorage.getItem("mc-store-low-stock-alert") !== "shown";
      if (hasLowStockAlert) {
        sessionStorage.setItem("mc-store-low-stock-alert", "shown");
        toast.warning(`Stock faible : ${lowStock.slice(0, 2).map((p) => p.name).join(", ")}`);
      }
    }
  }, [lowStock]);

  return (
    <div className="space-y-6">
      {canSell && (
        <div className="flex justify-end">
          <Button
            size="lg"
            className="gap-2"
            onClick={() => router.push("/dashboard/store/sales/new")}
          >
            <ShoppingCart className="h-5 w-5" />
            Nouvelle vente
          </Button>
        </div>
      )}

      <StoreStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={[
          "min-w-0",
          "transition-all duration-500",
          isLive ? "ring-1 ring-gold/30 shadow-[0_0_16px_rgba(212,175,55,0.12)]" : "",
        ].join(" ")}>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle>Évolution des ventes — 7 jours</CardTitle>
            {isLive && (
              <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold animate-pulse">
                LIVE
              </span>
            )}
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
                  formatter={(value) => [formatCurrency(Number(value)), "CA"]}
                />
                <Bar dataKey="revenue" fill="#d4af37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader><CardTitle>Produits les plus vendus</CardTitle></CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="py-8 text-center text-zinc-500">Aucune vente récente</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Qté</TableHead>
                    <TableHead className="text-right">CA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p, i) => (
                    <TableRow key={p.name}>
                      <TableCell><span className="mr-2 text-gold">#{i + 1}</span>{p.name}</TableCell>
                      <TableCell>{p.qty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={[
          "min-w-0",
          "transition-all duration-500",
          isLive ? "ring-1 ring-amber-400/30 shadow-[0_0_16px_rgba(251,191,36,0.12)]" : "",
        ].join(" ")}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <CardTitle>Alertes stock</CardTitle>
            </div>
            {isLive && (
              <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300 animate-pulse">
                LIVE
              </span>
            )}
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="py-4 text-center text-zinc-500">Aucune alerte</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.slice(0, 8).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.stock_quantity} / min {p.minimum_stock}</TableCell>
                      <TableCell>
                        <StockBadge stock={p.stock_quantity} minimum={p.minimum_stock} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className={[
          "min-w-0",
          "transition-all duration-500",
          isLive ? "ring-1 ring-emerald-400/30 shadow-[0_0_16px_rgba(16,185,129,0.12)]" : "",
        ].join(" ")}>
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle>Ventes récentes</CardTitle>
            {isLive && (
              <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300 animate-pulse">
                LIVE
              </span>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reçu</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/dashboard/store/sales/${s.id}`} className="font-mono text-gold hover:underline">
                        {s.receipt_number}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDateTime(s.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "VALIDEE" ? "success" : "destructive"}>
                        {STORE_SALE_STATUS_LABELS[s.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(s.total_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
