import Link from "next/link";
import { AppShell, requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreDashboardClient } from "@/components/store/store-dashboard-client";
import { KPIChart } from "@/components/dashboard/kpi-chart";
import { generateHourlyData } from "@/lib/utils/hourly-data";
import {
  getStoreDashboardStats,
  getTopSellingProducts,
  getStoreSales,
  getLowStockProducts,
} from "@/services/store.service";

export default async function StoreDashboardPage() {
  const profile = await requireAuth(["ADMIN", "CAISSIERE", "COMPTABLE"]);

  const [stats, topProducts, recentSales, lowStock] = await Promise.all([
    getStoreDashboardStats(),
    getTopSellingProducts(5),
    getStoreSales({ limit: 6 }),
    getLowStockProducts(),
  ]);

  const totalRevenue = stats.revenueToday || 0;
  const totalSales = stats.productsSoldToday || 0;
  const hourlyData = generateHourlyData(totalRevenue, totalSales);

  return (
    <AppShell
      profile={profile}
      title="Store / Boutique"
      subtitle="Gestion des produits, du stock et des ventes"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/store/products">
            <Button variant="secondary">Produits</Button>
          </Link>
          {profile.role === "ADMIN" && (
            <Link href="/dashboard/store/categories">
              <Button variant="secondary">Catégories</Button>
            </Link>
          )}
          {(profile.role === "ADMIN" || profile.role === "CAISSIERE") && (
            <Link href="/dashboard/store/stock">
              <Button variant="secondary">Stock</Button>
            </Link>
          )}
          {(profile.role === "ADMIN" || profile.role === "CAISSIERE") && (
            <Link href="/dashboard/store/sales">
              <Button variant="secondary">Ventes</Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Charts */}
      <div className="mb-6">
        <KPIChart
          initialData={hourlyData}
          totalRevenue={totalRevenue}
          totalSales={totalSales}
        />
      </div>

      <StoreDashboardClient
        stats={stats}
        weeklyData={[]}
        topProducts={topProducts}
        recentSales={recentSales}
        lowStock={lowStock}
        canSell={profile.role === "ADMIN" || profile.role === "CAISSIERE"}
      />

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Store</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-300">
            <p>• Gestion des produits et des catégories</p>
            <p>• Suivi du stock et des mouvements</p>
            <p>• Historique des ventes et reçus</p>
            <p>• Rapports et bénéfices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Produits</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm text-zinc-300">
            <span>Catalogue actif</span>
            <Link href="/dashboard/store/products" className="text-gold hover:underline">
              Voir
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm text-zinc-300">
            <span>Alertes et réapprovisionnement</span>
            <Link href="/dashboard/store/stock" className="text-gold hover:underline">
              Gérer
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rapports</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm text-zinc-300">
            <span>Ventes et marges</span>
            <Link href="/dashboard/store/reports" className="text-gold hover:underline">
              Ouvrir
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
