"use client";

import { useEffect, useState } from "react";
import type { Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { generateReceiptPDF, downloadPDF } from "@/utils/pdf";

const DEFAULT_PRINTER_STATUS = "Aucune imprimante sélectionnée";
const STORAGE_KEY = "mc-multi-service-printer";

interface ReceiptViewProps {
  transaction: Transaction;
  onClose?: () => void;
}

const MC_MULTI_SERVICE_LOGO_URL =
  "https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNmE4MDgwNDFhZWU4ODE5MWJjYWJjYzUxMmUwNjM1YmE6ZmlsZV8wMDAwMDAwMDlmN2M4MWY3ODJhMjA2YjQ2ZGZhMWJhNCIsImdpem1vX2lkIjpudWxsLCJ3aWQiOm51bGwsIm9pZCI6bnVsbCwic2lkIjpudWxsLCJjcyI6bnVsbCwiZm4iOm51bGwsImNkIjpudWxsLCJ0cyI6IjIwNjgwIiwicCI6InB5aSIsImNpZCI6IjEiLCJzaWciOiJlYmVkYTQyMTJkYzczODRlOWJlYjQwNjIyZjI2ZTYzOTQ1NjkwODUwODljNWY5MDUzM2EzYzk3ODg5NTQxN2M1IiwidiI6IjAiLCJjZG4iOm51bGwsImNwIjpudWxsLCJtYSI6bnVsbH0=";

export function ReceiptView({ transaction, onClose }: ReceiptViewProps) {
  const [printerStatus, setPrinterStatus] = useState(DEFAULT_PRINTER_STATUS);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPrinterStatus("Prêt à imprimer");
  }, []);

  const serviceName =
    transaction.service_name || transaction.service?.name || "—";
  const barberName = transaction.barber?.full_name || "—";
  const originalPrice =
    transaction.original_price ?? transaction.amount + (transaction.discount_amount ?? 0);
  const discount = transaction.discount_amount ?? 0;
  const date = transaction.created_at ? new Date(transaction.created_at) : new Date();
  const receiptNumber = (transaction.receipt_number || "").toString();

  function handleValidateAndPrint() {
    setPrinterStatus("Validation et impression en cours...");

    if (typeof window !== "undefined" && window.print) {
      setTimeout(() => window.print(), 150);
    }
  }

  function handleDownload() {
    const doc = generateReceiptPDF(transaction);
    downloadPDF(doc, `recu-${transaction.receipt_number}.pdf`);
  }

  return (
    <>
      <div className="receipt-print mx-auto w-[58mm] rounded-[8px] border border-zinc-200 bg-white p-3 text-black shadow-[0_18px_45px_rgba(0,0,0,0.12)] receipt-thermal">
        <div className="rounded-t-xl bg-black px-4 pb-4 pt-5 text-center text-gold">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-zinc-700 bg-black shadow-sm">
            <img
              src={MC_MULTI_SERVICE_LOGO_URL}
              alt="Logo MC Multi-Service"
              className="h-full w-full object-cover"
              onError={(event) => {
                const target = event.currentTarget;
                target.style.display = "none";
                const fallback = target.nextElementSibling as HTMLElement | null;
                if (fallback) {
                  fallback.style.display = "flex";
                }
              }}
            />
            <div className="hidden h-full w-full items-center justify-center text-xl font-black text-gold">
              MC
            </div>
          </div>
          <h2 className="text-lg font-black tracking-[0.16em]">MC-MULTI-SERVICE</h2>
        </div>

        <div className="my-5 border-y border-dashed border-zinc-300 py-4 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Reçu</span>
            <span className="font-mono font-bold">#{receiptNumber.replace("MC-", "")}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-zinc-500">Date</span>
            <span>{date.toLocaleDateString("fr-FR")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Heure</span>
            <span>{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Barber</span>
            <span className="font-medium">{barberName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Service</span>
            <span>{serviceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Prix</span>
            <span>{formatCurrency(originalPrice)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Remise</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatCurrency(transaction.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Paiement</span>
            <span>{PAYMENT_METHOD_LABELS[transaction.payment_method] ?? transaction.payment_method ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Caissière</span>
            <span>{transaction.cashier?.full_name || "—"}</span>
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-4 text-center text-zinc-600">
          <p className="text-xs font-semibold uppercase tracking-[0.15em]">Merci pour votre confiance !</p>
          <p className="mt-2 text-[10px]">Au plaisir de vous accueillir à nouveau.</p>
          <p className="mt-1 text-[10px] font-medium">MC a votre service.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 print:hidden">
        <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-center text-[11px] text-zinc-600">
          {printerStatus}
        </div>

        <Button onClick={handleValidateAndPrint} className="bg-gold text-black hover:bg-gold/90">
          <Printer className="h-4 w-4" /> Valider et imprimer
        </Button>
      </div>

      <style jsx global>{`
        .receipt-thermal {
          max-width: 58mm;
          width: 58mm;
          padding: 8px;
          border-radius: 8px;
        }

        .receipt-thermal .rounded-t-xl {
          border-radius: 6px 6px 0 0;
        }

        .receipt-thermal .text-lg {
          font-size: 0.95rem;
          letter-spacing: 0.08em;
        }

        .receipt-thermal .text-sm,
        .receipt-thermal .text-[10px],
        .receipt-thermal .text-xs {
          font-size: 10px;
        }

        .receipt-thermal .text-base {
          font-size: 0.9rem;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-print,
          .receipt-print * {
            visibility: visible;
          }
          .receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm;
            border: none;
            box-shadow: none;
          }
        }
      `}</style>
    </>
  );
}
