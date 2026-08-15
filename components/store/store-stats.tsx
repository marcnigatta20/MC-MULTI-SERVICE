"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import {
  DollarSign,
  Package,
  AlertTriangle,
  TrendingUp,
  ShoppingBag,
  Box,
} from "lucide-react";
import type { StoreDashboardStats } from "@/types";

export function StoreStats({ stats }: { stats: StoreDashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="CA aujourd'hui" value={stats.revenueToday} icon={DollarSign} variant="gold" />
      <StatCard title="CA cette semaine" value={stats.revenueWeek} icon={TrendingUp} />
      <StatCard title="CA ce mois" value={stats.revenueMonth} icon={DollarSign} />
      <StatCard title="Produits vendus" value={stats.productsSoldToday} icon={ShoppingBag} isCurrency={false} />
      <StatCard title="Produits en stock" value={stats.totalProducts} icon={Package} isCurrency={false} />
      <StatCard title="Stock faible" value={stats.lowStockCount} icon={AlertTriangle} variant="warning" isCurrency={false} />
      <StatCard title="Épuisés" value={stats.outOfStockCount} icon={Box} variant="danger" isCurrency={false} />
      <StatCard title="Bénéfice estimé" value={stats.estimatedProfitToday} icon={TrendingUp} variant="success" />
    </div>
  );
}
