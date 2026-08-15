"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStoreSaleAction } from "@/lib/actions/store";
import { formatCurrency } from "@/lib/utils";
import type { CashRegister, Product, Profile } from "@/types";

interface NewStoreSaleFormProps {
  profile: Profile;
  products: Product[];
  openRegister: CashRegister | null;
}

export function NewStoreSaleForm({
  profile,
  products,
  openRegister,
}: NewStoreSaleFormProps) {
  const router = useRouter();
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<"ESPECES" | "AUTRE_COMPTOIR">("ESPECES");
  const [discount, setDiscount] = useState("0");
  const [loading, setLoading] = useState(false);

  const availableProducts = useMemo(
    () => products.filter((product) => product.is_active && product.stock_quantity > 0),
    [products]
  );

  const selectedItems = useMemo(
    () =>
      availableProducts
        .filter((product) => (selectedQuantities[product.id] ?? 0) > 0)
        .map((product) => ({
          product,
          quantity: selectedQuantities[product.id] ?? 0,
        })),
    [availableProducts, selectedQuantities]
  );

  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity,
    0
  );
  const discountValue = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = subtotal - discountValue;
  const canSubmit = !loading && selectedItems.length > 0;

  function updateQuantity(productId: string, quantity: number) {
    setSelectedQuantities((current) => {
      const safeQuantity = Math.max(0, Math.floor(quantity || 0));
      const next = { ...current };
      if (safeQuantity <= 0) {
        delete next[productId];
        return next;
      }
      const product = products.find((item) => item.id === productId);
      const maxAllowed = product?.stock_quantity ?? safeQuantity;
      next[productId] = Math.min(safeQuantity, maxAllowed);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!openRegister) {
      toast.error("Ouvrez d’abord la caisse pour enregistrer une vente.");
      return;
    }

    const items = selectedItems.map(({ product, quantity }) => ({
      productId: product.id,
      quantity,
    }));

    if (items.length === 0) {
      toast.error("Ajoutez au moins un produit à la vente.");
      return;
    }

    setLoading(true);

    try {
      await createStoreSaleAction({
        cashierId: profile.id,
        cashRegisterId: openRegister.id,
        paymentMethod,
        discount: discountValue,
        items,
      });

      toast.success("Vente Store enregistrée.");
      toast.info(`Nouvelle vente validée — ${formatCurrency(total)}`);
      setSelectedQuantities({});
      setDiscount("0");
      setPaymentMethod("ESPECES");
      router.refresh();
      router.push("/dashboard/store/sales");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer la vente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Produits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableProducts.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucun produit disponible pour la vente.</p>
          ) : (
            availableProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-950/60 p-3"
              >
                <div>
                  <p className="font-medium text-white">{product.name}</p>
                  <p className="text-sm text-zinc-400">
                    {formatCurrency(product.selling_price)} • Stock: {product.stock_quantity}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateQuantity(product.id, (selectedQuantities[product.id] ?? 0) - 1)
                    }
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    max={product.stock_quantity}
                    value={selectedQuantities[product.id] ?? 0}
                    onChange={(event) => updateQuantity(product.id, Number(event.target.value))}
                    className="w-20 text-center"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      updateQuantity(product.id, (selectedQuantities[product.id] ?? 0) + 1)
                    }
                  >
                    +
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Résumé de la vente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as "ESPECES" | "AUTRE_COMPTOIR")
                }
                className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none"
              >
                <option value="ESPECES">Espèces</option>
                <option value="AUTRE_COMPTOIR">Autre comptoir</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Remise (HTG)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
            </div>

            <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
              {selectedItems.length === 0 ? (
                <p className="text-zinc-400">Aucun produit sélectionné</p>
              ) : (
                selectedItems.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between gap-3">
                    <span>
                      {product.name} x {quantity}
                    </span>
                    <span>{formatCurrency(product.selling_price * quantity)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Sous-total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Remise</span>
                <span>- {formatCurrency(discountValue)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-gold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {loading ? "Enregistrement..." : "Valider la vente"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
