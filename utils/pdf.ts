import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { StoreSale, Transaction } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/types";

// Couleurs de la marque
const BRAND_COLOR = { r: 212, g: 175, b: 55 }; // Or
const TEXT_DARK = { r: 0, g: 0, b: 0 }; // Noir
const TEXT_GRAY = { r: 100, g: 100, b: 100 }; // Gris

// Fonction pour créer l'entête uniforme
function addReceiptHeader(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Barre noire en haut
  doc.setFillColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
  doc.rect(0, 0, pageWidth, 50, "F");

  // Logo de marque : carré noir avec bordure dorée et lettres MC
  const markX = 18;
  const markY = 8;
  const markSize = 18;
  doc.setFillColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
  doc.roundedRect(markX, markY, markSize, markSize, 2, 2, "F");
  doc.setDrawColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
  doc.setLineWidth(0.8);
  doc.roundedRect(markX, markY, markSize, markSize, 2, 2, "S");
  doc.setTextColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("MC", markX + markSize / 2, markY + 12, { align: "center" });

  // Titre au centre
  doc.setTextColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("MC-Multi-Service", pageWidth / 2, 15, { align: "center" });

  // Sous-titre
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, pageWidth / 2, 30, { align: "center" });

  // Ligne séparatrice
  doc.setDrawColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
  doc.setLineWidth(0.5);
  doc.line(15, 35, pageWidth - 15, 35);
}

// Fonction pour ajouter le pied de page uniforme
function addReceiptFooter(doc: jsPDF, startY: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(10);
  doc.setTextColor(TEXT_GRAY.r, TEXT_GRAY.g, TEXT_GRAY.b);
  doc.text("Merci pour votre confiance !", pageWidth / 2, startY, { align: "center" });
  
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Au plaisir de vous accueillir à nouveau.", pageWidth / 2, startY + 7, { align: "center" });
  doc.text("MC a votre service. — " + formatDateTime(new Date()).split(" ")[0], pageWidth / 2, startY + 14, { align: "center" });
}

export function generateReceiptPDF(transaction: Transaction): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const serviceName = transaction.service_name || transaction.service?.name || "—";
  const originalPrice =
    transaction.original_price ?? transaction.amount + (transaction.discount_amount ?? 0);
  const discount = transaction.discount_amount ?? 0;
  const date = transaction.created_at ? new Date(transaction.created_at) : new Date();
  const receiptNumber = (transaction.receipt_number || "").toString();

  addReceiptHeader(doc, "Reçu de paiement - Barber");

  doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
  doc.setFontSize(11);

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
    startY: 45,
    body: rows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold", textColor: [TEXT_GRAY.r, TEXT_GRAY.g, TEXT_GRAY.b] } },
    margin: { left: 20, right: 20 },
  });

  const last = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  const finalY = (last?.finalY ?? doc.internal.pageSize.getHeight() - 40) + 15;
  addReceiptFooter(doc, finalY);

  return doc;
}

export function generateStoreReceiptPDF(sale: StoreSale): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const date = sale.created_at ? new Date(sale.created_at) : new Date();
  const receiptNumber = (sale.receipt_number || "").toString();

  addReceiptHeader(doc, "Reçu de vente boutique");

  doc.setTextColor(TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b);
  doc.setFontSize(11);

  const rows: string[][] = [
    ["Reçu", `#${receiptNumber.replace("MC-", "")}`],
    ["Date", date.toLocaleDateString("fr-FR")],
    ["Heure", date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })],
    ["Caissière", sale.cashier?.full_name || "—"],
    ["Paiement", PAYMENT_METHOD_LABELS[sale.payment_method] ?? sale.payment_method ?? "—"],
    ["Sous-total", formatCurrency(Number(sale.subtotal || 0))],
  ];

  if (Number(sale.discount || 0) > 0) {
    rows.push(["Remise", `-${formatCurrency(Number(sale.discount || 0))}`]);
  }

  rows.push(["Total", formatCurrency(Number(sale.total_amount || 0))]);

  autoTable(doc, {
    startY: 45,
    body: rows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold", textColor: [TEXT_GRAY.r, TEXT_GRAY.g, TEXT_GRAY.b] } },
    margin: { left: 20, right: 20 },
  });

  const itemRows = (sale.items ?? []).map((item) => [
    item.product_name || "Produit",
    `${item.quantity}`,
    formatCurrency(Number(item.unit_selling_price || 0)),
    formatCurrency(Number(item.subtotal || 0)),
  ]);

  const last = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  const tableStartY = (last?.finalY ?? 60) + 8;

  autoTable(doc, {
    startY: tableStartY,
    head: [["Produit", "Qté", "PU", "Montant"]],
    body: itemRows,
    theme: "striped",
    headStyles: {
      fillColor: [TEXT_DARK.r, TEXT_DARK.g, TEXT_DARK.b],
      textColor: [BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 15, right: 15 },
  });

  const final = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  const finalY = (final?.finalY ?? pageWidth - 40) + 20;
  addReceiptFooter(doc, finalY);

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

export function printPDF(doc: jsPDF, filename = "recu.pdf") {
  if (typeof window === "undefined") {
    downloadPDF(doc, filename);
    return;
  }

  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(blobUrl, "_blank", "noopener,noreferrer");

  if (printWindow) {
    const tryPrint = () => {
      printWindow.focus();
      printWindow.print();
    };

    setTimeout(tryPrint, 500);
  } else {
    downloadPDF(doc, filename);
  }
}
