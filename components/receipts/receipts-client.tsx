"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/loading";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateReceiptPDF, downloadPDF } from "@/utils/pdf";
import { Download, Receipt } from "lucide-react";
import { toast } from "sonner";
import type { Transaction } from "@/types";

export function ReceiptsClient({ transactions }: { transactions: Transaction[] }) {
  function handleDownload(t: Transaction) {
    const doc = generateReceiptPDF(t);
    downloadPDF(doc, `recu-${t.receipt_number}.pdf`);
    toast.success("Reçu généré.");
  }

  if (transactions.length === 0) {
    return (
      <EmptyState title="Aucun reçu" description="Aucune transaction enregistrée." icon={Receipt} />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {transactions.map((t) => (
        <div key={t.id} className="rounded-xl border border-zinc-800 p-4 space-y-3">
          <div className="flex justify-between">
            <span className="font-mono text-gold">{t.receipt_number}</span>
            <span className="text-sm text-zinc-500">{formatDate(t.transaction_date)}</span>
          </div>
          <p className="font-bold">{formatCurrency(t.amount)}</p>
          <p className="text-sm text-zinc-400">
            {t.barber?.full_name} — {t.service_name || t.service?.name}
          </p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => handleDownload(t)}>
            <Download className="h-4 w-4" /> Télécharger PDF
          </Button>
        </div>
      ))}
    </div>
  );
}
