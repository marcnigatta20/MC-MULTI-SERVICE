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
import { EXPENSE_CATEGORY_LABELS, type Expense, type ExpenseCategory } from "@/types";
import { createExpenseAction } from "@/lib/actions/admin";

export function ExpensesClient({
  expenses,
  userId,
  canCreate,
}: {
  expenses: Expense[];
  userId: string;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    category: "AUTRE" as import("@/types").ExpenseCategory,
    amount: "",
    description: "",
    receiptUrl: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createExpenseAction({
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description,
        recordedBy: userId,
        receiptUrl: form.receiptUrl || undefined,
      });
      toast.success("Dépense enregistrée");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2">
          <span className="text-sm text-zinc-400">Total dépenses : </span>
          <span className="font-bold text-gold">{formatCurrency(total)}</span>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Nouvelle dépense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Enregistrer une dépense</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ExpenseCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Montant (HTG)</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Justificatif (URL, facultatif)</Label>
                  <Input value={form.receiptUrl} onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })} placeholder="https://..." />
                </div>
                <Button type="submit" disabled={loading} className="w-full">Enregistrer</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Enregistré par</TableHead>
            <TableHead className="text-right">Montant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{formatDate(e.expense_date)}</TableCell>
              <TableCell><Badge variant="outline">{EXPENSE_CATEGORY_LABELS[e.category]}</Badge></TableCell>
              <TableCell>{e.description}</TableCell>
              <TableCell>{e.recorder?.full_name || "—"}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
