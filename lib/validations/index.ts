import { z } from "zod";

const uuid = z.string().uuid();
const positiveAmount = z.number().positive("Le montant doit être positif");
const nonNegativeAmount = z.number().min(0, "Le montant ne peut pas être négatif");
const commissionRate = z.number().min(0, "Minimum 0%").max(100, "Maximum 100%");

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe requis"),
});

export const saleSchema = z.object({
  barberId: uuid,
  serviceId: uuid,
  paymentMethod: z.enum(["ESPECES", "AUTRE_COMPTOIR"], {
    error: "Mode de paiement requis",
  }),
  discountAmount: nonNegativeAmount.optional(),
  clientName: z.string().optional(),
  notes: z.string().optional(),
});

export const cancelTransactionSchema = z.object({
  transactionId: uuid,
  reason: z.string().min(5, "Raison requise (min. 5 caractères)"),
});

export const barberSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  commissionRate,
});

export const serviceSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  description: z.string().optional(),
  price: positiveAmount,
  durationMinutes: z.number().positive().optional(),
});

export const expenseSchema = z.object({
  category: z.enum([
    "ELECTRICITE", "EAU", "INTERNET", "PRODUITS", "MATERIEL",
    "ENTRETIEN", "TRANSPORT", "SALAIRES", "FOURNITURES",
    "LOYER", "SALAIRE", "MAINTENANCE", "AUTRE",
  ]),
  amount: positiveAmount,
  description: z.string().min(3, "Description requise"),
  receiptUrl: z.string().url().optional().or(z.literal("")),
});

export const barberPaymentSchema = z.object({
  barberId: uuid,
  amount: positiveAmount,
  paymentMethod: z.enum(["ESPECES", "AUTRE_COMPTOIR"]),
  notes: z.string().optional(),
  allowOverpayment: z.boolean().optional(),
});

export const cashOpenSchema = z.object({
  openingBalance: nonNegativeAmount,
});

export const cashCloseSchema = z.object({
  closingBalance: nonNegativeAmount,
  differenceExplanation: z.string().optional(),
  notes: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  sku: z.string().optional(),
  description: z.string().optional(),
  categoryId: uuid.optional().nullable(),
  supplierId: uuid.optional().nullable(),
  purchasePrice: nonNegativeAmount,
  sellingPrice: z.number().positive("Le prix de vente doit être positif"),
  stockQuantity: z.number().int().min(0, "Stock invalide"),
  minimumStock: z.number().int().min(0, "Stock minimum invalide"),
  isActive: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Nom requis"),
  description: z.string().optional(),
});

export const supplierSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const storeSaleItemSchema = z.object({
  productId: uuid,
  quantity: z.number().int().positive("Quantité invalide"),
});

export const storeSaleSchema = z.object({
  cashierId: uuid,
  cashRegisterId: uuid,
  paymentMethod: z.enum(["ESPECES", "AUTRE_COMPTOIR"]),
  discount: nonNegativeAmount.optional(),
  items: z.array(storeSaleItemSchema).min(1, "Vente vide"),
});

export const cancelStoreSaleSchema = z.object({
  saleId: uuid,
  reason: z.string().min(5, "Raison requise (min. 5 caractères)"),
});

export const addStockSchema = z.object({
  productId: uuid,
  quantity: z.number().int().positive("Quantité invalide"),
  purchasePrice: nonNegativeAmount.optional(),
  supplierId: uuid.optional().nullable(),
  invoiceRef: z.string().optional(),
  reason: z.string().optional(),
});

export const returnProductSchema = z.object({
  saleId: uuid,
  productId: uuid,
  quantity: z.number().int().positive("Quantité invalide"),
  reason: z.string().min(5, "Raison requise"),
});

export const stockAdjustmentSchema = z.object({
  productId: uuid,
  quantity: z.number().int().positive("Quantité invalide"),
  movementType: z.enum(["AJUSTEMENT", "PERTE", "PRODUIT_ENDOMMAGE"]),
  reason: z.string().min(3, "Raison requise"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type StoreSaleInput = z.infer<typeof storeSaleSchema>;
