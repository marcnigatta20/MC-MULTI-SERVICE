import { AppShell, requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/services/store.service";
import { getOpenCashRegister } from "@/services/cash.service";
import { NewStoreSaleForm } from "@/components/store/new-store-sale-form";
import type { Product } from "@/types";

export default async function NewStoreSalePage() {
  const profile = await requireAuth(["ADMIN", "CAISSIERE"]);
  const { products } = await getProducts({ limit: 200 });
  const openRegister = await getOpenCashRegister(profile.id);

  return (
    <AppShell profile={profile} title="Nouvelle vente" subtitle="Créer une vente Store">
      <NewStoreSaleForm
        profile={profile}
        products={products}
        openRegister={openRegister}
      />
    </AppShell>
  );
}
