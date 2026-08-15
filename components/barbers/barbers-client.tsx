"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BarberFormFields } from "@/components/barbers/barber-form-fields";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BarberBalance, Profile } from "@/types";
import { createBarberAction, updateBarberAction } from "@/lib/actions/admin";

export function BarbersClient({
  barbers,
  profiles,
}: {
  barbers: BarberBalance[];
  profiles: Profile[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    commissionRate: "40",
    userId: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createBarberAction({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        email: form.email || undefined,
        commissionRate: parseFloat(form.commissionRate),
        userId: form.userId || undefined,
      });
      toast.success("Barber créé");
      setOpen(false);
      setForm({ firstName: "", lastName: "", phone: "", email: "", commissionRate: "40", userId: "" });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setLoading(true);
    try {
      await updateBarberAction(editId, {
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        email: form.email,
        commission_rate: parseFloat(form.commissionRate),
        user_id: form.userId || null,
      });
      toast.success("Barber mis à jour");
      setEditId(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  function openEdit(b: BarberBalance) {
    setEditId(b.barber_id);
    setForm({
      firstName: b.first_name || b.full_name.split(" ")[0] || "",
      lastName: b.last_name || b.full_name.split(" ").slice(1).join(" ") || "",
      phone: b.phone || "",
      email: b.email || "",
      commissionRate: String(b.commission_rate),
      userId: b.user_id || "",
    });
  }

  async function toggleActive(barber: BarberBalance) {
    try {
      await updateBarberAction(barber.barber_id, { is_active: !barber.is_active });
      toast.success(barber.is_active ? "Barber désactivé" : "Barber activé");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nouveau barber</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un barber</DialogTitle></DialogHeader>
            <BarberFormFields
              form={form}
              setForm={setForm}
              profiles={profiles}
              loading={loading}
              onSubmit={handleCreate}
              submitLabel={loading ? "Création..." : "Créer"}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le barber</DialogTitle></DialogHeader>
          <BarberFormFields
            form={form}
            setForm={setForm}
            profiles={profiles}
            loading={loading}
            onSubmit={handleUpdate}
            submitLabel={loading ? "Mise à jour..." : "Enregistrer"}
          />
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Barber</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead className="text-right">CA</TableHead>
            <TableHead className="text-right">Services</TableHead>
            <TableHead className="text-right">Commissions</TableHead>
            <TableHead className="text-right">Payé</TableHead>
            <TableHead className="text-right">Reste dû</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {barbers.map((b) => {
            const isActive = Boolean(b.is_active);

            return (
              <TableRow key={b.barber_id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-sm font-bold text-gold">
                      {(b.first_name?.[0] || b.full_name[0])}{(b.last_name?.[0] || "")}
                    </div>
                    <div>
                      <p className="font-medium">{b.full_name}</p>
                      {b.created_at && (
                        <p className="text-xs text-zinc-500">Depuis {formatDate(b.created_at)}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{b.phone || "—"}</p>
                  <p className="text-xs text-zinc-500">{b.email || "—"}</p>
                </TableCell>
                <TableCell>{b.commission_rate}%</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(b.total_revenue))}</TableCell>
                <TableCell className="text-right">{b.service_count}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(b.total_commissions))}</TableCell>
                <TableCell className="text-right text-emerald-400">{formatCurrency(Number(b.total_paid))}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={Number(b.balance_due) > 0 ? "warning" : "success"}>
                    {formatCurrency(Number(b.balance_due))}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={isActive ? "success" : "secondary"}>
                      {isActive ? "Actif" : "Inactif"}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant={isActive ? "secondary" : "default"}
                      className="min-w-[54px]"
                      onClick={() => toggleActive(b)}
                    >
                      {isActive ? "Off" : "On"}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
