"use server";

import {
  getCategories,
  createCategory,
  updateCategory,
  getSuppliers,
  createSupplier,
  updateSupplier,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProductIfAllowed,
  searchProductsForSale,
  getStockOverview,
  getStockMovements,
  addStock,
  adjustStock,
  createStoreSale,
  cancelStoreSale,
  returnStoreProduct,
  getStoreSales,
  getStoreSaleById,
  uploadProductImage,
} from "@/services/store.service";
import {
  assertStoreAdmin,
  assertStoreCashierOrAdmin,
  assertCanCancelStoreSale,
} from "@/lib/permissions";
import {
  productSchema,
  categorySchema,
  supplierSchema,
  storeSaleSchema,
  cancelStoreSaleSchema,
  addStockSchema,
  returnProductSchema,
  stockAdjustmentSchema,
} from "@/lib/validations";
import { parseOrThrow } from "@/lib/validate";
import type { PaymentMethod } from "@/types";

export async function createProductAction(input: {
  name: string;
  sku?: string;
  description?: string;
  categoryId?: string | null;
  supplierId?: string | null;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minimumStock: number;
  isActive?: boolean;
}) {
  const profile = await assertStoreAdmin();
  const data = parseOrThrow(productSchema, {
    name: input.name,
    sku: input.sku,
    description: input.description,
    categoryId: input.categoryId,
    supplierId: input.supplierId,
    purchasePrice: input.purchasePrice,
    sellingPrice: input.sellingPrice,
    stockQuantity: input.stockQuantity,
    minimumStock: input.minimumStock,
    isActive: input.isActive,
  });
  return createProduct(
    {
      name: data.name,
      sku: data.sku,
      description: data.description,
      categoryId: data.categoryId,
      supplierId: data.supplierId,
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      stockQuantity: data.stockQuantity,
      minimumStock: data.minimumStock,
      isActive: data.isActive,
    },
    profile.id
  );
}

export async function updateProductAction(
  id: string,
  input: Partial<{
    name: string;
    sku: string;
    description: string;
    category_id: string;
    supplier_id: string;
    purchase_price: number;
    selling_price: number;
    minimum_stock: number;
    is_active: boolean;
  }>
) {
  const profile = await assertStoreAdmin();
  return updateProduct(id, input, profile.id);
}

export async function toggleProductAction(id: string, isActive: boolean) {
  const profile = await assertStoreAdmin();
  return updateProduct(id, { is_active: isActive }, profile.id);
}

export async function deleteProductAction(id: string) {
  await assertStoreAdmin();
  return deleteProductIfAllowed(id);
}

export async function createCategoryAction(input: { name: string; description?: string }) {
  const profile = await assertStoreAdmin();
  const data = parseOrThrow(categorySchema, input);
  return createCategory({ ...data, userId: profile.id });
}

export async function updateCategoryAction(
  id: string,
  input: Partial<{ name: string; description: string; is_active: boolean }>
) {
  const profile = await assertStoreAdmin();
  return updateCategory(id, input, profile.id);
}

export async function createSupplierAction(input: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}) {
  const profile = await assertStoreAdmin();
  const data = parseOrThrow(supplierSchema, input);
  return createSupplier(data, profile.id);
}

export async function updateSupplierAction(
  id: string,
  input: Partial<{
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    is_active: boolean;
  }>
) {
  const profile = await assertStoreAdmin();
  return updateSupplier(id, input, profile.id);
}

export async function addStockAction(input: {
  productId: string;
  quantity: number;
  purchasePrice?: number;
  supplierId?: string | null;
  invoiceRef?: string;
  reason?: string;
}) {
  const profile = await assertStoreAdmin();
  const data = parseOrThrow(addStockSchema, input);
  return addStock({ ...data, userId: profile.id });
}

export async function adjustStockAction(input: {
  productId: string;
  quantity: number;
  movementType: "AJUSTEMENT" | "PERTE" | "PRODUIT_ENDOMMAGE";
  reason: string;
  increase?: boolean;
}) {
  const profile = await assertStoreAdmin();
  const data = parseOrThrow(stockAdjustmentSchema, input);
  return adjustStock({ ...data, userId: profile.id, increase: input.increase });
}

export async function createStoreSaleAction(input: {
  cashierId: string;
  cashRegisterId: string;
  paymentMethod: PaymentMethod;
  discount?: number;
  items: { productId: string; quantity: number }[];
}) {
  const profile = await assertStoreCashierOrAdmin();
  if (profile.id !== input.cashierId) throw new Error("Accès refusé.");

  parseOrThrow(storeSaleSchema, {
    cashierId: input.cashierId,
    cashRegisterId: input.cashRegisterId,
    paymentMethod: input.paymentMethod,
    discount: input.discount,
    items: input.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
  });

  return createStoreSale(input);
}

export async function cancelStoreSaleAction(input: {
  saleId: string;
  userId: string;
  reason: string;
}) {
  await assertCanCancelStoreSale(input.userId);
  const data = parseOrThrow(cancelStoreSaleSchema, {
    saleId: input.saleId,
    reason: input.reason,
  });
  return cancelStoreSale(data.saleId, input.userId, data.reason);
}

export async function returnProductAction(input: {
  saleId: string;
  productId: string;
  quantity: number;
  reason: string;
}) {
  const profile = await assertStoreCashierOrAdmin();
  const data = parseOrThrow(returnProductSchema, input);
  return returnStoreProduct({ ...data, userId: profile.id });
}

export async function searchProductsAction(query: string) {
  await assertStoreCashierOrAdmin();
  return searchProductsForSale(query);
}

export async function uploadProductImageAction(formData: FormData) {
  const profile = await assertStoreAdmin();
  const productId = formData.get("productId") as string;
  const file = formData.get("file") as File;
  if (!productId || !file) throw new Error("Fichier ou produit manquant.");
  return uploadProductImage(productId, file, profile.id);
}

export {
  getCategories,
  getSuppliers,
  getProducts,
  getProductById,
  getStockOverview,
  getStockMovements,
  getStoreSales,
  getStoreSaleById,
};
