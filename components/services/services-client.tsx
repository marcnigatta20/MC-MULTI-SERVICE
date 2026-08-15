"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ServiceForm } from "@/components/services/service-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Service } from "@/types";
import { createServiceAction, updateServiceAction } from "@/lib/actions/admin";

export function ServicesClient({ services }: { services: Service[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", duration: "" });

  function resetForm() {
    setForm({ name: "", description: "", price: "", duration: "30" });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createServiceAction({
        name: form.name,
        description: form.description || undefined,
        price: parseFloat(form.price),
        durationMinutes: form.duration ? parseInt(form.duration) : undefined,
      });
      toast.success("Service créé");
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editService) return;
    setLoading(true);
    try {
      await updateServiceAction(editService.id, {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        duration_minutes: form.duration ? parseInt(form.duration) : undefined,
      });
      toast.success("Service mis à jour — les transactions passées conservent leur prix historique");
      setEditService(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  async function toggleActive(service: Service) {
    try {
      await updateServiceAction(service.id, { is_active: !service.is_active });
      toast.success(service.is_active ? "Service désactivé" : "Service activé");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Les prix sont modifiables. Chaque transaction enregistre le prix et le nom du service au moment de la vente.
      </p>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}><Plus className="h-4 w-4" /> Nouveau service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un service</DialogTitle></DialogHeader>
            <ServiceForm
              form={form}
              setForm={setForm}
              loading={loading}
              onSubmit={handleCreate}
              label={loading ? "Création..." : "Créer"}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editService} onOpenChange={(o) => !o && setEditService(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le service</DialogTitle></DialogHeader>
          <ServiceForm
            form={form}
            setForm={setForm}
            loading={loading}
            onSubmit={handleUpdate}
            label={loading ? "Mise à jour..." : "Enregistrer"}
          />
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Durée</TableHead>
            <TableHead>Prix</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell className="text-zinc-400">{s.description || "—"}</TableCell>
              <TableCell>{s.duration_minutes ? `${s.duration_minutes} min` : "—"}</TableCell>
              <TableCell className="text-gold">{formatCurrency(s.price)}</TableCell>
              <TableCell>
                <Badge variant={s.is_active ? "success" : "secondary"}>
                  {s.is_active ? "Actif" : "Inactif"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditService(s);
                      setForm({
                        name: s.name,
                        description: s.description || "",
                        price: String(s.price),
                        duration: s.duration_minutes ? String(s.duration_minutes) : "",
                      });
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(s)}>
                    {s.is_active ? "Désactiver" : "Activer"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
