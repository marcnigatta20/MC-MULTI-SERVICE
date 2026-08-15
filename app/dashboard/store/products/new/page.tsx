import { AppShell, requireAuth } from "@/lib/auth";
import { getCategories, getSuppliers } from "@/services/store.service";
import { ProductForm } from "@/components/store/product-form";

export default async function NewStoreProductPage() {
  const profile = await requireAuth(["ADMIN"]);
  const [categories, suppliers] = await Promise.all([getCategories(true), getSuppliers(true)]);

  return (
    <AppShell profile={profile} title="Nouveau produit" subtitle="Créer un produit Store">
      <ProductForm categories={categories} suppliers={suppliers} />
    </AppShell>
  );
}
