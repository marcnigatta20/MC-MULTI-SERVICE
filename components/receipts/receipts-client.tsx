"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/loading";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateReceiptPDF, generateStoreReceiptPDF, downloadPDF } from "@/utils/pdf";
import { Download, Receipt } from "lucide-react";
import { toast } from "sonner";
import type { Transaction, StoreSale } from "@/types";

export function ReceiptsClient({
  transactions = [],
  storeSales = [],
}: {
  transactions?: Transaction[];
  storeSales?: StoreSale[];
}) {
  function handleTransactionDownload(t: Transaction) {
    const doc = generateReceiptPDF(t);
    downloadPDF(doc, `recu-${t.receipt_number}.pdf`);
    toast.success("Reçu généré.");
  }

  function handleStoreSaleDownload(s: StoreSale) {
    const doc = generateStoreReceiptPDF(s);
    downloadPDF(doc, `recu-store-${s.receipt_number}.pdf`);
    toast.success("Reçu magasin généré.");
  }

  if ((transactions.length === 0) && (storeSales.length === 0)) {
    return (
      <EmptyState title="Aucun reçu" description="Aucun reçu enregistré." icon={Receipt} />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {transactions.map((t) => (
        <div key={`tx-${t.id}`} className="rounded-xl border border-zinc-800 p-4 space-y-3">
          <div className="flex justify-between">
            <span className="font-mono text-gold">{t.receipt_number}</span>
            <span className="text-sm text-zinc-500">{formatDate(t.transaction_date)}</span>
          </div>
          <p className="font-bold">{formatCurrency(t.amount)}</p>
          <p className="text-sm text-zinc-400">
            {t.barber?.full_name} — {t.service_name || t.service?.name}
          </p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => handleTransactionDownload(t)}>
            <Download className="h-4 w-4" /> Télécharger PDF
          </Button>
        </div>
      ))}

      {storeSales.map((s) => (
        <div key={`sale-${s.id}`} className="rounded-xl border border-zinc-800 p-4 space-y-3">
          <div className="flex justify-between">
            <span className="font-mono text-gold">{s.receipt_number}</span>
            <span className="text-sm text-zinc-500">{formatDate(s.created_at || s.created_at)}</span>
          </div>
          <p className="font-bold">{formatCurrency(Number(s.total_amount || 0))}</p>
          <p className="text-sm text-zinc-400">Vente boutique — {s.cashier?.full_name || '—'}</p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => handleStoreSaleDownload(s)}>
            <Download className="h-4 w-4" /> Télécharger PDF
          </Button>
        </div>
      ))}
    </div>
  );
}
