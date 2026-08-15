"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createProductAction } from "@/lib/actions/store";
import { getUserFacingErrorMessage } from "@/lib/utils";
import type { Category, Supplier } from "@/types";

interface ProductFormProps {
  categories: Category[];
  suppliers: Supplier[];
}

export function ProductForm({ categories, suppliers }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    categoryId: "",
    supplierId: "",
    purchasePrice: "0",
    sellingPrice: "0",
    stockQuantity: "0",
    minimumStock: "0",
    isActive: true,
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      await createProductAction({
        name: form.name,
        sku: form.sku || undefined,
        description: form.description || undefined,
        categoryId: form.categoryId || null,
        supplierId: form.supplierId || null,
        purchasePrice: Number(form.purchasePrice || 0),
        sellingPrice: Number(form.sellingPrice || 0),
        stockQuantity: Number(form.stockQuantity || 0),
        minimumStock: Number(form.minimumStock || 0),
        isActive: form.isActive,
      });

      toast.success("Produit créé avec succès.");
      router.push("/dashboard/store/products");
    } catch (error) {
      const message = getUserFacingErrorMessage(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter un produit</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-zinc-300">Nom du produit</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-zinc-300">SKU / Référence</span>
            <input
              value={form.sku}
              onChange={(event) => setForm({ ...form, sku: event.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Catégorie</span>
            <select
              value={form.categoryId}
              onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            >
              <option value="">Aucune</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-zinc-300">Description</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Fournisseur</span>
            <select
              value={form.supplierId}
              onChange={(event) => setForm({ ...form, supplierId: event.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            >
              <option value="">Aucun</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Statut</span>
            <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              />
              Actif
            </label>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Prix d&apos;achat</span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.purchasePrice}
              onChange={(event) => setForm({ ...form, purchasePrice: event.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Prix de vente</span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.sellingPrice}
              onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Stock initial</span>
            <input
              type="number"
              step="1"
              min={0}
              value={form.stockQuantity}
              onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Stock minimum</span>
            <input
              type="number"
              step="1"
              min={0}
              value={form.minimumStock}
              onChange={(event) => setForm({ ...form, minimumStock: event.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={loading || !form.name.trim()}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
