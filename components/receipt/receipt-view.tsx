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
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const [thermalMode, setThermalMode] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedPrinter = window.localStorage.getItem(STORAGE_KEY);
    if (savedPrinter) {
      setPrinterName(savedPrinter);
      setPrinterStatus(`Connectée — ${savedPrinter}`);
    }
  }, []);

  useEffect(() => {
    if (!autoPrintEnabled || !printerName || typeof window === "undefined" || !window.print) {
      return;
    }

    setPrinterStatus(`Impression automatique activée sur ${printerName}`);
    const timer = window.setTimeout(() => {
      window.print();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [autoPrintEnabled, printerName]);

  const serviceName =
    transaction.service_name || transaction.service?.name || "—";
  const barberName = transaction.barber?.full_name || "—";
  const originalPrice =
    transaction.original_price ?? transaction.amount + (transaction.discount_amount ?? 0);
  const discount = transaction.discount_amount ?? 0;
  const date = transaction.created_at ? new Date(transaction.created_at) : new Date();
  const receiptNumber = (transaction.receipt_number || "").toString();

  function saveSelectedPrinter(selected: string) {
    setPrinterName(selected);
    setPrinterStatus(`Connectée — ${selected}`);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, selected);
    }
  }

  function handleConnectPrinter() {
    if (typeof window === "undefined" || !window.print) {
      setPrinterStatus("Le navigateur ne prend pas en charge l’impression locale.");
      return;
    }

    const availablePrinters = ["MC Thermal Printer", "POS-80", "Imprimante caisse"];
    const selected = printerName ?? availablePrinters[0] ?? "Imprimante locale";

    saveSelectedPrinter(selected);

    if (autoPrintEnabled) {
      setPrinterStatus(`Impression automatique sur ${selected}`);
      setTimeout(() => window.print(), 150);
    }
  }

  function handlePrint() {
    if (typeof window === "undefined" || !window.print) {
      setPrinterStatus("Le navigateur ne prend pas en charge l’impression locale.");
      return;
    }

    if (printerName) {
      setPrinterStatus(`Impression en cours sur ${printerName}`);
    } else {
      setPrinterStatus("Boîte d’impression ouverte — sélectionnez votre imprimante.");
    }

    window.print();
  }

  function handleValidateAndPrint() {
    if (printerName) {
      setPrinterStatus(`Validation et impression sur ${printerName}`);
    } else {
      setPrinterStatus("Validation et impression — choisissez votre imprimante");
    }

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
      <div
        className={[
          "receipt-print mx-auto max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-black shadow-[0_18px_45px_rgba(0,0,0,0.12)]",
          thermalMode ? "receipt-thermal" : "",
        ].join(" ")}
      >
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

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => saveSelectedPrinter("MC Thermal Printer")} variant="outline" size="sm">
            Enregistrer l’imprimante
          </Button>
          <Button
            onClick={() => setAutoPrintEnabled((value) => !value)}
            variant={autoPrintEnabled ? "default" : "secondary"}
            size="sm"
          >
            {autoPrintEnabled ? "Auto-print ON" : "Auto-print OFF"}
          </Button>
          <Button onClick={() => setThermalMode((value) => !value)} variant="ghost" size="sm">
            {thermalMode ? "Ticket thermique" : "Ticket standard"}
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={handleValidateAndPrint} className="bg-gold text-black hover:bg-gold/90">
            <Printer className="h-4 w-4" /> Valider et imprimer
          </Button>
          <Button onClick={handleConnectPrinter} variant="outline">
            <Printer className="h-4 w-4" /> Connecter l’imprimante
          </Button>
          <Button onClick={handlePrint} variant="secondary">
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4" /> Télécharger PDF
          </Button>
          {onClose && (
            <Button variant="secondary" onClick={onClose}>
              Nouvelle vente
            </Button>
          )}
        </div>
      </div>

      <style jsx global>{`
        .receipt-thermal {
          max-width: 320px;
          padding: 14px;
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
            width: 100%;
            border: none;
            box-shadow: none;
          }
        }
      `}</style>
    </>
  );
}
