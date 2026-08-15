import Link from "next/link";
import { AppShell, requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProducts } from "@/services/store.service";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { calcMargin, getStockStatus } from "@/types";

export default async function StoreProductsPage() {
  const profile = await requireAuth(["ADMIN", "CAISSIERE", "COMPTABLE"]);
  const { products } = await getProducts({ limit: 100 });

  return (
    <AppShell profile={profile} title="Produits" subtitle="Catalogue du Store">
      <div className="mb-4 flex justify-end">
        {profile.role === "ADMIN" && (
          <Link href="/dashboard/store/products/new">
            <Button>Ajouter un produit</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalogue</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-zinc-200">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="py-3 pr-4">Nom</th>
                <th className="py-3 pr-4">SKU</th>
                <th className="py-3 pr-4">Catégorie</th>
                <th className="py-3 pr-4">Achat</th>
                <th className="py-3 pr-4">Vente</th>
                <th className="py-3 pr-4">Stock</th>
                <th className="py-3 pr-4">Marge</th>
                <th className="py-3 pr-4">Statut</th>
                <th className="py-3 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const status = getStockStatus(product.stock_quantity, product.minimum_stock);
                const margin = calcMargin(product.purchase_price, product.selling_price);
                return (
                  <tr key={product.id} className="border-b border-zinc-800/80">
                    <td className="py-3 pr-4 font-medium text-white">
                      <Link href={`/dashboard/store/products/${product.id}`} className="text-gold hover:underline">
                        {product.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{product.sku || "—"}</td>
                    <td className="py-3 pr-4">{product.category?.name || "—"}</td>
                    <td className="py-3 pr-4">{formatCurrency(product.purchase_price)}</td>
                    <td className="py-3 pr-4">{formatCurrency(product.selling_price)}</td>
                    <td className="py-3 pr-4">{product.stock_quantity}</td>
                    <td className="py-3 pr-4">
                      {formatCurrency(margin.unit)} ({margin.percent.toFixed(1)}%)
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={status === "EN_STOCK" ? "success" : status === "STOCK_FAIBLE" ? "warning" : "destructive"}>
                        {status === "EN_STOCK" ? "Actif" : status === "STOCK_FAIBLE" ? "Stock faible" : "Épuisé"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">{formatDateTime(product.created_at)}</td>
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
