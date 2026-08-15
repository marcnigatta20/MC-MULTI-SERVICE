import { AppShell, requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStockOverview } from "@/services/store.service";
import { formatCurrency } from "@/lib/utils";
import { getStockStatus } from "@/types";

export default async function StoreStockPage() {
  const profile = await requireAuth(["ADMIN", "CAISSIERE"]);
  const products = await getStockOverview();

  return (
    <AppShell profile={profile} title="Stock" subtitle="Suivi du stock du store">
      <Card>
        <CardHeader>
          <CardTitle>État du stock</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-zinc-200">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="py-3 pr-4">Produit</th>
                <th className="py-3 pr-4">SKU</th>
                <th className="py-3 pr-4">Stock</th>
                <th className="py-3 pr-4">Min</th>
                <th className="py-3 pr-4">Valeur</th>
                <th className="py-3 pr-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const status = getStockStatus(product.stock_quantity, product.minimum_stock);
                const value = product.stock_quantity * product.purchase_price;
                return (
                  <tr key={product.id} className="border-b border-zinc-800/80">
                    <td className="py-3 pr-4 font-medium text-white">{product.name}</td>
                    <td className="py-3 pr-4">{product.sku || "—"}</td>
                    <td className="py-3 pr-4">{product.stock_quantity}</td>
                    <td className="py-3 pr-4">{product.minimum_stock}</td>
                    <td className="py-3 pr-4">{formatCurrency(value)}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={
                          status === "EN_STOCK"
                            ? "success"
                            : status === "STOCK_FAIBLE"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {status === "EN_STOCK"
                          ? "En stock"
                          : status === "STOCK_FAIBLE"
                            ? "Stock faible"
                            : "Épuisé"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
