"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { AlertTriangle, ShoppingCart, BellRing } from "lucide-react";
import { toast } from "sonner";
import {
  getStoreNotificationMessages,
  readStoreNotificationSummary,
  summarizeStoreNotifications,
  writeStoreNotificationSummary,
  type StoreNotificationSummary,
} from "@/lib/notifications";

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
  const chartData = weeklyData.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
  }));

  const [persistedSummary, setPersistedSummary] = useState<StoreNotificationSummary | null>(null);

  useEffect(() => {
    setPersistedSummary(readStoreNotificationSummary());
  }, []);

  const liveSummary = useMemo(
    () => summarizeStoreNotifications(recentSales.length, lowStock),
    [recentSales.length, lowStock]
  );

  const effectiveSummary = persistedSummary && persistedSummary.updatedAt > liveSummary.updatedAt ? persistedSummary : liveSummary;
  const notifications = useMemo(() => getStoreNotificationMessages(effectiveSummary), [effectiveSummary]);

  useEffect(() => {
    if (!liveSummary) return;

    writeStoreNotificationSummary(liveSummary);
    setPersistedSummary((current) => {
      if (current && current.updatedAt >= liveSummary.updatedAt) {
        return current;
      }
      return liveSummary;
    });

    if (lowStock.length > 0) {
      const hasLowStockAlert = sessionStorage.getItem("mc-store-low-stock-alert") !== "shown";
      if (hasLowStockAlert) {
        sessionStorage.setItem("mc-store-low-stock-alert", "shown");
        toast.warning(`Stock faible : ${lowStock.slice(0, 2).map((p) => p.name).join(", ")}`);
      }
    }
  }, [liveSummary, lowStock]);

  return (
    <div className="space-y-6">
      {notifications.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-50">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <BellRing className="h-4 w-4" />
            Notifications
          </div>
          <ul className="space-y-1 text-sm text-amber-100/90">
            {notifications.map((message) => (
              <li key={message}>• {message}</li>
            ))}
          </ul>
        </div>
      )}
      {canSell && (
        <div className="flex justify-end">
          <Link href="/dashboard/store/sales/new">
            <Button size="lg" className="gap-2">
              <ShoppingCart className="h-5 w-5" />
              Nouvelle vente
            </Button>
          </Link>
        </div>
      )}

      <StoreStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Évolution des ventes — 7 jours</CardTitle></CardHeader>
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

        <Card>
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
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <CardTitle>Alertes stock</CardTitle>
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

        <Card>
          <CardHeader><CardTitle>Ventes récentes</CardTitle></CardHeader>
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
