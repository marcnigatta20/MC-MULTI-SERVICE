import { redirect } from "next/navigation";
import { AppShell, requireAuth } from "@/lib/auth";
import { createCategoryAction } from "@/lib/actions/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCategories } from "@/services/store.service";

async function submitCategory(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!name) return;
  await createCategoryAction({ name, description: description || undefined });
  redirect("/dashboard/store/categories");
}

export default async function StoreCategoriesPage() {
  const profile = await requireAuth(["ADMIN"]);
  const categories = await getCategories(false);

  return (
    <AppShell profile={profile} title="Catégories" subtitle="Gestion des familles de produits">
      {profile.role === "ADMIN" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ajouter une catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submitCategory} className="grid gap-4 md:grid-cols-2">
              <input name="name" placeholder="Nom" required className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white" />
              <input name="description" placeholder="Description" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white" />
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit">Créer</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Catégories existantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <div>
                <p className="font-medium text-white">{category.name}</p>
                <p className="text-sm text-zinc-400">{category.description || "Aucune description"}</p>
              </div>
              <Badge variant={category.is_active ? "success" : "secondary"}>
                {category.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
