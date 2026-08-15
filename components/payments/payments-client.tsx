"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, type Barber, type BarberPayment, type BarberBalance } from "@/types";
import { createBarberPaymentAction } from "@/lib/actions/admin";

export function PaymentsClient({
  barbers,
  payments,
  balances,
  userId,
}: {
  barbers: Barber[];
  payments: BarberPayment[];
  balances: BarberBalance[];
  userId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    barberId: "",
    amount: "",
    paymentMethod: "ESPECES" as "ESPECES" | "AUTRE_COMPTOIR",
    notes: "",
  });

  const selectedBalance = balances.find((b) => b.barber_id === form.barberId);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createBarberPaymentAction({
        barberId: form.barberId,
        amount: parseFloat(form.amount),
        paymentMethod: form.paymentMethod,
        paidBy: userId,
        notes: form.notes || undefined,
      });
      toast.success("Paiement du barber enregistré.");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {balances.filter((b) => Number(b.balance_due) > 0).map((b) => (
          <div key={b.barber_id} className="rounded-xl border border-amber-500/20 bg-zinc-950 p-4">
            <p className="font-medium">{b.full_name}</p>
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(Number(b.balance_due))}</p>
            <p className="text-xs text-zinc-500">Montant dû</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Enregistrer un paiement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Paiement à un barber</DialogTitle></DialogHeader>
            <form onSubmit={handlePay} className="space-y-4">
              <div className="space-y-2">
                <Label>Barber</Label>
                <Select value={form.barberId} onValueChange={(v) => setForm({ ...form, barberId: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {barbers.filter((b) => b.is_active).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedBalance && (
                <p className="text-sm text-amber-400">
                  Dû : {formatCurrency(Number(selectedBalance.balance_due))}
                </p>
              )}
              <div className="space-y-2">
                <Label>Montant (HTG)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v as "ESPECES" | "AUTRE_COMPTOIR" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button type="submit" disabled={loading} className="w-full">Enregistrer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Barber</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Montant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{formatDate(p.payment_date)}</TableCell>
              <TableCell>{p.barber?.full_name}</TableCell>
              <TableCell><Badge variant="outline">{PAYMENT_METHOD_LABELS[p.payment_method]}</Badge></TableCell>
              <TableCell className="text-zinc-400">{p.notes || "—"}</TableCell>
              <TableCell className="text-right font-medium text-emerald-400">{formatCurrency(p.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
