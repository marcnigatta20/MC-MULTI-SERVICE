"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/loading";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, type Transaction } from "@/types";
import { cancelTransactionAction } from "@/lib/actions/admin";
import { Download, Search, Receipt, X } from "lucide-react";
import { generateReceiptPDF, downloadPDF } from "@/utils/pdf";

interface FilterOptions {
  barbers: { id: string; full_name: string }[];
  services: { id: string; name: string }[];
  cashiers: { id: string; full_name: string }[];
}

export function TransactionsClient({
  transactions,
  filterOptions,
  canCancel,
  userId,
  showCommissionColumns = true,
}: {
  transactions: Transaction[];
  filterOptions: FilterOptions;
  canCancel: boolean;
  userId: string;
  showCommissionColumns?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`/transactions?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  async function handleCancel() {
    if (!cancelId || !reason.trim()) {
      toast.error("Veuillez indiquer une raison d'annulation.");
      return;
    }
    setLoading(true);
    try {
      await cancelTransactionAction(cancelId, userId, reason);
      toast.success("Transaction annulée.");
      setCancelId(null);
      setReason("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'annuler la transaction.");
    }
    setLoading(false);
  }

  function handleDownloadReceipt(t: Transaction) {
    const doc = generateReceiptPDF(t);
    downloadPDF(doc, `recu-${t.receipt_number}.pdf`);
    toast.success("Reçu généré.");
  }

  function clearFilters() {
    startTransition(() => router.push("/transactions"));
  }

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <div className="space-y-1 xl:col-span-2">
          <Label className="text-xs">Recherche reçu</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              className="pl-9"
              placeholder="N° reçu..."
              defaultValue={searchParams.get("receipt") || ""}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateFilter("receipt", (e.target as HTMLInputElement).value);
                }
              }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            defaultValue={searchParams.get("date") || ""}
            onChange={(e) => updateFilter("date", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Barber</Label>
          <Select
            value={searchParams.get("barber") || "all"}
            onValueChange={(v) => updateFilter("barber", v)}
          >
            <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {filterOptions.barbers.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Caissière</Label>
          <Select
            value={searchParams.get("cashier") || "all"}
            onValueChange={(v) => updateFilter("cashier", v)}
          >
            <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {filterOptions.cashiers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Service</Label>
          <Select
            value={searchParams.get("service") || "all"}
            onValueChange={(v) => updateFilter("service", v)}
          >
            <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {filterOptions.services.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Paiement</Label>
          <Select
            value={searchParams.get("payment") || "all"}
            onValueChange={(v) => updateFilter("payment", v)}
          >
            <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="ESPECES">Espèces</SelectItem>
              <SelectItem value="AUTRE_COMPTOIR">Autre comptoir</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Statut</Label>
          <Select
            value={searchParams.get("status") || "all"}
            onValueChange={(v) => updateFilter("status", v)}
          >
            <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="ACTIVE">Actif</SelectItem>
              <SelectItem value="CANCELLED">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4" /> Effacer les filtres
        </Button>
      )}

      {isPending && (
        <p className="text-sm text-zinc-500">Chargement...</p>
      )}

      {transactions.length === 0 ? (
        <EmptyState
          title="Aucune transaction"
          description="Aucune transaction ne correspond à vos critères."
          icon={Receipt}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reçu</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>Barber</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                {showCommissionColumns && (
                  <>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Part MC</TableHead>
                  </>
                )}
                <TableHead>Paiement</TableHead>
                <TableHead>Caissière</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const time = new Date(t.created_at).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <TableRow key={t.id} className={t.status === "CANCELLED" ? "opacity-60" : ""}>
                    <TableCell className="font-mono text-gold whitespace-nowrap">{t.receipt_number}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(t.transaction_date)}</TableCell>
                    <TableCell>{time}</TableCell>
                    <TableCell>{t.barber?.full_name}</TableCell>
                    <TableCell>{t.service_name || t.service?.name}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(t.amount)}</TableCell>
                    {showCommissionColumns && (
                      <>
                        <TableCell className="text-right text-zinc-400">
                          {formatCurrency(t.commission_amount)}
                          <span className="ml-1 text-xs">({t.commission_rate}%)</span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(t.shop_amount)}</TableCell>
                      </>
                    )}
                    <TableCell className="whitespace-nowrap">{PAYMENT_METHOD_LABELS[t.payment_method]}</TableCell>
                    <TableCell>{t.cashier?.full_name}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === "ACTIVE" ? "success" : "destructive"}>
                        {t.status === "ACTIVE" ? "Actif" : "Annulé"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleDownloadReceipt(t)} title="PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                        {canCancel && t.status === "ACTIVE" && (
                          <Dialog open={cancelId === t.id} onOpenChange={(o) => !o && setCancelId(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="destructive" onClick={() => setCancelId(t.id)}>
                                Annuler
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Annuler la transaction</DialogTitle>
                              </DialogHeader>
                              <p className="text-sm text-zinc-400">
                                La transaction ne sera pas supprimée. Son statut passera à « Annulé »
                                et les statistiques seront recalculées.
                              </p>
                              <div className="rounded-lg bg-zinc-900 p-3 text-sm space-y-1">
                                <p>Reçu : {t.receipt_number}</p>
                                <p>Montant : {formatCurrency(t.amount)}</p>
                                <p>Date : {formatDateTime(t.created_at)}</p>
                              </div>
                              <div className="space-y-2">
                                <Label>Raison de l&apos;annulation *</Label>
                                <Textarea
                                  value={reason}
                                  onChange={(e) => setReason(e.target.value)}
                                  placeholder="Expliquez pourquoi cette transaction est annulée..."
                                  required
                                />
                              </div>
                              <Button variant="destructive" onClick={handleCancel} disabled={loading || !reason.trim()}>
                                {loading ? "Annulation..." : "Confirmer l'annulation"}
                              </Button>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
