import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { StoreSale, Transaction } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/types";

export function generateReceiptPDF(transaction: Transaction): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const serviceName = transaction.service_name || transaction.service?.name || "—";
  const originalPrice =
    transaction.original_price ?? transaction.amount + (transaction.discount_amount ?? 0);
  const discount = transaction.discount_amount ?? 0;
  const date = transaction.created_at ? new Date(transaction.created_at) : new Date();
  const receiptNumber = (transaction.receipt_number || "").toString();

  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(212, 175, 55);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MC-Multi-Service", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Reçu de paiement", pageWidth / 2, 28, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);

  const rows: string[][] = [
    ["Reçu", `#${receiptNumber.replace("MC-", "")}`],
    ["Date", date.toLocaleDateString("fr-FR")],
    ["Heure", date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })],
    ["Barber", transaction.barber?.full_name || "—"],
    ["Service", serviceName],
    ["Prix", formatCurrency(originalPrice)],
  ];

  if (discount > 0) {
    rows.push(["Remise", `-${formatCurrency(discount)}`]);
  }

  rows.push(
    ["Total", formatCurrency(transaction.amount)],
    ["Paiement", PAYMENT_METHOD_LABELS[transaction.payment_method] ?? transaction.payment_method ?? "—"],
    ["Caissière", transaction.cashier?.full_name || "—"]
  );

  autoTable(doc, {
    startY: 55,
    body: rows,
    theme: "plain",
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold", textColor: [100, 100, 100] } },
    margin: { left: 25, right: 25 },
  });

  const last = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  const finalY = (last?.finalY ?? doc.internal.pageSize.getHeight() - 40) + 20;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text("Merci pour votre confiance !", pageWidth / 2, finalY, { align: "center" });
  doc.setFontSize(8);
  doc.text("Au plaisir de vous accueillir à nouveau.", pageWidth / 2, finalY + 8, { align: "center" });
  doc.text("MC a votre service.", pageWidth / 2, finalY + 16, { align: "center" });

  return doc;
}

export function generateStoreReceiptPDF(sale: StoreSale): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const date = sale.created_at ? new Date(sale.created_at) : new Date();

  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(212, 175, 55);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MC-Multi-Service", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Reçu de vente boutique", pageWidth / 2, 28, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);

  const summaryRows: string[][] = [
    ["Reçu", sale.receipt_number || "—"],
    ["Date", date.toLocaleDateString("fr-FR")],
    ["Heure", date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })],
    ["Caissière", sale.cashier?.full_name || "—"],
    ["Paiement", PAYMENT_METHOD_LABELS[sale.payment_method] ?? sale.payment_method ?? "—"],
    ["Sous-total", formatCurrency(Number(sale.subtotal || 0))],
    ["Remise", `-${formatCurrency(Number(sale.discount || 0))}`],
    ["Total", formatCurrency(Number(sale.total_amount || 0))],
  ];

  autoTable(doc, {
    startY: 55,
    body: summaryRows,
    theme: "plain",
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold", textColor: [100, 100, 100] } },
    margin: { left: 25, right: 25 },
  });

  const itemRows = (sale.items ?? []).map((item) => [
    item.product_name || "Produit",
    `${item.quantity} x ${formatCurrency(Number(item.unit_selling_price || 0))}`,
    formatCurrency(Number(item.subtotal || 0)),
  ]);

  const last = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  const tableStartY = (last?.finalY ?? 60) + 10;

  autoTable(doc, {
    startY: tableStartY,
    head: [["Produit", "Qté / PU", "Montant"]],
    body: itemRows,
    theme: "striped",
    headStyles: { fillColor: [0, 0, 0], textColor: [212, 175, 55] },
    styles: { fontSize: 9 },
    margin: { left: 15, right: 15 },
  });

  const final = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  const finalY = (final?.finalY ?? doc.internal.pageSize.getHeight() - 40) + 20;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text("Merci pour votre confiance !", pageWidth / 2, finalY, { align: "center" });
  doc.setFontSize(8);
  doc.text("MC a votre service.", pageWidth / 2, finalY + 8, { align: "center" });

  return doc;
}

export function generateReportPDF(
  title: string,
  headers: string[],
  rows: string[][],
  summary?: { label: string; value: string }[]
): jsPDF {
  const doc = new jsPDF();

  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, "F");
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MC Barber Management", 20, 18);
  doc.setFontSize(12);
  doc.text(title, 20, 28);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Généré le ${formatDateTime(new Date())}`, 20, 45);

  autoTable(doc, {
    startY: 55,
    head: [headers],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: [0, 0, 0], textColor: [212, 175, 55] },
    styles: { fontSize: 9 },
    margin: { left: 15, right: 15 },
  });

  if (summary) {
    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    summary.forEach((item, i) => {
      doc.setFont("helvetica", i === summary.length - 1 ? "bold" : "normal");
      doc.text(`${item.label} : ${item.value}`, 20, finalY + i * 8);
    });
  }

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}
