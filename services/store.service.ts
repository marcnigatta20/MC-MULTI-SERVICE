import { createClient } from "@/lib/supabase/server";
import type {
  Product,
  Category,
  Supplier,
  StoreSale,
  StoreSaleItem,
  StockMovement,
  StoreDashboardStats,
  PaymentMethod,
  Profile,
} from "@/types";
import { getStockStatus } from "@/types";
import { broadcastRealtimeUpdate } from "@/lib/realtime";
import { toLocalDateISO } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const STORE_PATHS = [
  "/dashboard/store",
  "/dashboard/store/products",
  "/dashboard/store/categories",
  "/dashboard/store/suppliers",
  "/dashboard/store/stock",
  "/dashboard/store/sales",
  "/dashboard/store/reports",
  "/cash",
  "/dashboard",
  "/cashier-dashboard",
];

function revalidateStore() {
  STORE_PATHS.forEach((p) => revalidatePath(p));
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  stockFilter?: "all" | "in_stock" | "low" | "out" | "inactive";
  page?: number;
  limit?: number;
}

export interface SaleFilters {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  cashierId?: string;
  status?: string;
  receiptSearch?: string;
  productSearch?: string;
  limit?: number;
}

function startOfDay(date: string) {
  return `${date}T00:00:00.000Z`;
}

function endOfDay(date: string) {
  return `${date}T23:59:59.999Z`;
}

function getWeekStartISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return toLocalDateISO(d);
}

function getMonthStartISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ═══ CATEGORIES ═══
export async function getCategories(activeOnly = false): Promise<Category[]> {
  const supabase = await createClient();
  let query = supabase.from("categories").select("*").order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as Category[];
}

export async function createCategory(input: {
  name: string;
  description?: string;
  userId: string;
}): Promise<Category> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: input.name, description: input.description })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: input.userId,
    action: "CATEGORY_CREATED",
    entity_type: "category",
    entity_id: data.id,
    description: `Catégorie créée : ${input.name}`,
  });

  revalidateStore();
  return data as Category;
}

export async function updateCategory(
  id: string,
  input: Partial<{ name: string; description: string; is_active: boolean }>,
  userId: string
): Promise<Category> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "CATEGORY_UPDATED",
    entity_type: "category",
    entity_id: id,
    description: `Catégorie modifiée : ${data.name}`,
  });

  revalidateStore();
  return data as Category;
}

// ═══ SUPPLIERS ═══
export async function getSuppliers(activeOnly = false): Promise<Supplier[]> {
  const supabase = await createClient();
  let query = supabase.from("suppliers").select("*").order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as Supplier[];
}

export async function createSupplier(
  input: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  },
  userId: string
): Promise<Supplier> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert(input)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "SUPPLIER_CREATED",
    entity_type: "supplier",
    entity_id: data.id,
    description: `Fournisseur créé : ${input.name}`,
  });

  revalidateStore();
  return data as Supplier;
}

export async function updateSupplier(
  id: string,
  input: Partial<{
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    is_active: boolean;
  }>,
  userId: string
): Promise<Supplier> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "SUPPLIER_UPDATED",
    entity_type: "supplier",
    entity_id: id,
    description: `Fournisseur modifié : ${data.name}`,
  });

  revalidateStore();
  return data as Supplier;
}

// ═══ PRODUCTS ═══
export async function getProducts(filters?: ProductFilters): Promise<{
  products: Product[];
  total: number;
}> {
  const supabase = await createClient();
  const limit = filters?.limit ?? 50;
  const page = filters?.page ?? 1;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("products")
    .select("*, category:categories(*), supplier:suppliers(*)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters?.search) {
    const s = `%${filters.search}%`;
    query = query.or(`name.ilike.${s},sku.ilike.${s}`);
  }
  if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);

  if (filters?.stockFilter === "inactive") {
    query = query.eq("is_active", false);
  } else if (filters?.stockFilter === "out") {
    query = query.eq("stock_quantity", 0).eq("is_active", true);
  } else if (filters?.stockFilter === "low") {
    query = query.eq("is_active", true).gt("stock_quantity", 0);
  } else if (filters?.stockFilter === "in_stock") {
    query = query.eq("is_active", true).gt("stock_quantity", 0);
  }

  query = query.range(from, to);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  let products = (data || []) as Product[];

  if (filters?.stockFilter === "low") {
    products = products.filter(
      (p) => getStockStatus(p.stock_quantity, p.minimum_stock) === "STOCK_FAIBLE"
    );
  } else if (filters?.stockFilter === "in_stock") {
    products = products.filter(
      (p) => getStockStatus(p.stock_quantity, p.minimum_stock) === "EN_STOCK"
    );
  }

  return { products, total: count ?? products.length };
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, category:categories(*), supplier:suppliers(*)")
    .eq("id", id)
    .single();
  return (data as Product) || null;
}

export async function searchProductsForSale(query: string): Promise<Product[]> {
  const supabase = await createClient();
  const s = `%${query.trim()}%`;
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("is_active", true)
    .gt("stock_quantity", 0)
    .or(`name.ilike.${s},sku.ilike.${s}`)
    .order("name")
    .limit(20);
  if (error) throw new Error(error.message);
  return (data || []) as Product[];
}

export async function createProduct(
  input: {
    name: string;
    sku?: string;
    description?: string;
    categoryId?: string | null;
    supplierId?: string | null;
    purchasePrice: number;
    sellingPrice: number;
    stockQuantity: number;
    minimumStock: number;
    imageUrl?: string;
    isActive?: boolean;
  },
  userId: string
): Promise<Product> {
  const supabase = await createClient();

  if (input.sku) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("sku", input.sku)
      .maybeSingle();
    if (existing) throw new Error("Cette référence existe déjà.");
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      sku: input.sku || null,
      description: input.description,
      category_id: input.categoryId,
      supplier_id: input.supplierId,
      purchase_price: input.purchasePrice,
      selling_price: input.sellingPrice,
      stock_quantity: input.stockQuantity,
      minimum_stock: input.minimumStock,
      image_url: input.imageUrl,
      is_active: input.isActive ?? true,
    })
    .select("*, category:categories(*), supplier:suppliers(*)")
    .single();
  if (error) throw new Error(error.message);

  if (input.stockQuantity > 0) {
    await supabase.from("stock_movements").insert({
      product_id: data.id,
      movement_type: "INITIAL",
      quantity: input.stockQuantity,
      stock_before: 0,
      stock_after: input.stockQuantity,
      purchase_price: input.purchasePrice,
      reason: "Stock initial",
      created_by: userId,
    });
  }

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "PRODUCT_CREATED",
    entity_type: "product",
    entity_id: data.id,
    description: `Produit créé : ${input.name}`,
    details: { sku: input.sku, selling_price: input.sellingPrice },
  });

  revalidateStore();
  return data as Product;
}

export async function updateProduct(
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
    image_url: string;
    is_active: boolean;
  }>,
  userId: string
): Promise<Product> {
  const supabase = await createClient();

  if (input.sku) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("sku", input.sku)
      .neq("id", id)
      .maybeSingle();
    if (existing) throw new Error("Cette référence existe déjà.");
  }

  const { data, error } = await supabase
    .from("products")
    .update(input)
    .eq("id", id)
    .select("*, category:categories(*), supplier:suppliers(*)")
    .single();
  if (error) throw new Error(error.message);

  const action = input.is_active === false
    ? "PRODUCT_DISABLED"
    : input.is_active === true
      ? "PRODUCT_ENABLED"
      : "PRODUCT_UPDATED";

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action,
    entity_type: "product",
    entity_id: id,
    description: `Produit modifié : ${data.name}`,
  });

  revalidateStore();
  return data as Product;
}

export async function deleteProductIfAllowed(id: string): Promise<void> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("store_sale_items")
    .select("*", { count: "exact", head: true })
    .eq("product_id", id);
  if (count && count > 0) {
    throw new Error("Impossible de supprimer un produit utilisé dans des ventes.");
  }
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateStore();
}

// ═══ STOCK ═══
export async function getStockOverview(): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(error.message);
  return (data || []) as Product[];
}

export async function getStockMovements(limit = 100): Promise<StockMovement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*, product:products(id, name, sku)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const movements = (data || []) as StockMovement[];
  const userIds = [...new Set(movements.map((m) => m.created_by).filter(Boolean))];
  if (userIds.length === 0) return movements;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds as string[]);

  const byId: Record<string, Profile> = {};
  profiles?.forEach((p) => {
    byId[p.id] = p as Profile;
  });

  return movements.map((m) => ({
    ...m,
    creator: m.created_by ? (byId[m.created_by] as Profile | undefined) : undefined,
  })) as StockMovement[];
}

export async function addStock(
  input: {
    productId: string;
    quantity: number;
    purchasePrice?: number;
    supplierId?: string | null;
    invoiceRef?: string;
    reason?: string;
    userId: string;
  }
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_product_stock", {
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_purchase_price: input.purchasePrice ?? null,
    p_user_id: input.userId,
    p_reason: input.reason ?? null,
    p_supplier_id: input.supplierId ?? null,
    p_invoice_ref: input.invoiceRef ?? null,
  });
  if (error) throw new Error(error.message);
  revalidateStore();
}

export async function adjustStock(
  input: {
    productId: string;
    quantity: number;
    movementType: "AJUSTEMENT" | "PERTE" | "PRODUIT_ENDOMMAGE";
    reason: string;
    userId: string;
    increase?: boolean;
  }
): Promise<void> {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("stock_quantity, purchase_price, name")
    .eq("id", input.productId)
    .single();
  if (!product) throw new Error("Produit introuvable.");

  const stockBefore = product.stock_quantity;
  const delta = input.increase ? input.quantity : -input.quantity;
  const stockAfter = stockBefore + delta;
  if (stockAfter < 0) throw new Error("Stock insuffisant.");

  await supabase
    .from("products")
    .update({ stock_quantity: stockAfter })
    .eq("id", input.productId);

  await supabase.from("stock_movements").insert({
    product_id: input.productId,
    movement_type: input.movementType,
    quantity: input.quantity,
    stock_before: stockBefore,
    stock_after: stockAfter,
    purchase_price: product.purchase_price,
    reason: input.reason,
    created_by: input.userId,
  });

  await supabase.from("audit_logs").insert({
    user_id: input.userId,
    action: "STOCK_ADJUSTED",
    entity_type: "product",
    entity_id: input.productId,
    description: `Stock ajusté (${input.movementType}) : ${product.name}`,
    details: { quantity: input.quantity, stock_after: stockAfter },
  });

  revalidateStore();
}

// ═══ SALES ═══
export async function createStoreSale(input: {
  cashierId: string;
  cashRegisterId: string;
  paymentMethod: PaymentMethod;
  discount?: number;
  items: { productId: string; quantity: number }[];
}): Promise<StoreSale> {
  const supabase = await createClient();

  const itemsJson = input.items.map((i) => ({
    product_id: i.productId,
    quantity: i.quantity,
  }));

  const { data: saleId, error } = await supabase.rpc("process_store_sale", {
    p_cashier_id: input.cashierId,
    p_cash_register_id: input.cashRegisterId,
    p_payment_method: input.paymentMethod,
    p_discount: input.discount ?? 0,
    p_items: itemsJson,
  });

  if (error) throw new Error(error.message);

  const sale = await getStoreSaleById(saleId as string);
  if (!sale) throw new Error("Vente créée mais introuvable.");

  revalidateStore();
  broadcastRealtimeUpdate("store_sale");
  return sale;
}

export async function cancelStoreSale(
  saleId: string,
  userId: string,
  reason: string
): Promise<StoreSale> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_store_sale", {
    p_sale_id: saleId,
    p_user_id: userId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);

  const sale = await getStoreSaleById(saleId);
  if (!sale) throw new Error("Vente introuvable.");
  revalidateStore();
  broadcastRealtimeUpdate("store_sale_cancelled");
  return sale;
}

export async function returnStoreProduct(input: {
  saleId: string;
  productId: string;
  quantity: number;
  reason: string;
  userId: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("return_store_product", {
    p_sale_id: input.saleId,
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_user_id: input.userId,
    p_reason: input.reason,
  });
  if (error) throw new Error(error.message);
  revalidateStore();
}

export async function getStoreSales(filters?: SaleFilters): Promise<StoreSale[]> {
  const supabase = await createClient();
  let query = supabase
    .from("store_sales")
    .select("*, items:store_sale_items(*)")
    .order("created_at", { ascending: false });

  if (filters?.date) {
    query = query
      .gte("created_at", startOfDay(filters.date))
      .lte("created_at", endOfDay(filters.date));
  }
  if (filters?.dateFrom) query = query.gte("created_at", startOfDay(filters.dateFrom));
  if (filters?.dateTo) query = query.lte("created_at", endOfDay(filters.dateTo));
  if (filters?.cashierId) query = query.eq("cashier_id", filters.cashierId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.receiptSearch) {
    query = query.ilike("receipt_number", `%${filters.receiptSearch}%`);
  }
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let sales = (data || []) as StoreSale[];

  if (filters?.productSearch) {
    const ps = filters.productSearch.toLowerCase();
    sales = sales.filter((s) =>
      s.items?.some((i) => i.product_name.toLowerCase().includes(ps))
    );
  }

  const cashierIds = [...new Set(sales.map((s) => s.cashier_id))];
  if (cashierIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", cashierIds);
    const byId: Record<string, Profile> = {};
    profiles?.forEach((p) => {
      byId[p.id] = p as Profile;
    });
    sales = sales.map((s) => ({ ...s, cashier: byId[s.cashier_id] as Profile | undefined }));
  }

  return sales;
}

export async function getStoreSaleById(id: string): Promise<StoreSale | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_sales")
    .select("*, items:store_sale_items(*), cashier:profiles!cashier_id(*)")
    .eq("id", id)
    .single();
  return (data as StoreSale) || null;
}

// ═══ DASHBOARD & REPORTS ═══
export async function getStoreDashboardStats(): Promise<StoreDashboardStats> {
  const supabase = await createClient();
  const today = toLocalDateISO(new Date());
  const weekStart = getWeekStartISO();
  const monthStart = getMonthStartISO();

  const { data: todaySales } = await supabase
    .from("store_sales")
    .select("total_amount, items:store_sale_items(quantity, profit)")
    .eq("status", "VALIDEE")
    .gte("created_at", startOfDay(today))
    .lte("created_at", endOfDay(today));

  const { data: weekSales } = await supabase
    .from("store_sales")
    .select("total_amount")
    .eq("status", "VALIDEE")
    .gte("created_at", startOfDay(weekStart));

  const { data: monthSales } = await supabase
    .from("store_sales")
    .select("total_amount, items:store_sale_items(profit)")
    .eq("status", "VALIDEE")
    .gte("created_at", startOfDay(monthStart));

  const { data: products } = await supabase
    .from("products")
    .select("stock_quantity, minimum_stock, is_active");

  const revenueToday =
    todaySales?.reduce((s, sale) => s + Number(sale.total_amount), 0) || 0;
  const revenueWeek =
    weekSales?.reduce((s, sale) => s + Number(sale.total_amount), 0) || 0;
  const revenueMonth =
    monthSales?.reduce((s, sale) => s + Number(sale.total_amount), 0) || 0;

  let productsSoldToday = 0;
  let estimatedProfitToday = 0;
  todaySales?.forEach((sale) => {
    const items = sale.items as { quantity: number; profit: number }[] | null;
    items?.forEach((i) => {
      productsSoldToday += i.quantity;
      estimatedProfitToday += Number(i.profit);
    });
  });

  let estimatedProfitMonth = 0;
  monthSales?.forEach((sale) => {
    const items = sale.items as { profit: number }[] | null;
    items?.forEach((i) => {
      estimatedProfitMonth += Number(i.profit);
    });
  });

  const activeProducts = products?.filter((p) => p.is_active) || [];
  let lowStockCount = 0;
  let outOfStockCount = 0;
  activeProducts.forEach((p) => {
    const status = getStockStatus(p.stock_quantity, p.minimum_stock);
    if (status === "STOCK_FAIBLE") lowStockCount++;
    if (status === "EPUISE") outOfStockCount++;
  });

  return {
    revenueToday,
    revenueWeek,
    revenueMonth,
    productsSoldToday,
    totalProducts: activeProducts.length,
    lowStockCount,
    outOfStockCount,
    estimatedProfitToday,
    estimatedProfitMonth,
  };
}

export async function getTopSellingProducts(limit = 5, dateFrom?: string) {
  const supabase = await createClient();
  let salesQuery = supabase
    .from("store_sales")
    .select("id")
    .eq("status", "VALIDEE");
  if (dateFrom) salesQuery = salesQuery.gte("created_at", startOfDay(dateFrom));

  const { data: sales } = await salesQuery;
  const saleIds = sales?.map((s) => s.id) || [];
  if (saleIds.length === 0) return [];

  const { data: items } = await supabase
    .from("store_sale_items")
    .select("product_name, quantity, subtotal")
    .in("sale_id", saleIds);

  const map = new Map<string, { name: string; qty: number; revenue: number }>();
  items?.forEach((i) => {
    const existing = map.get(i.product_name) || { name: i.product_name, qty: 0, revenue: 0 };
    existing.qty += i.quantity;
    existing.revenue += Number(i.subtotal);
    map.set(i.product_name, existing);
  });

  return Array.from(map.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

export async function getStoreRevenueByPeriod(dateFrom: string, dateTo?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("store_sales")
    .select("total_amount, created_at, items:store_sale_items(profit, unit_purchase_price, quantity)")
    .eq("status", "VALIDEE")
    .gte("created_at", startOfDay(dateFrom));
  if (dateTo) query = query.lte("created_at", endOfDay(dateTo));

  const { data } = await query;
  const revenue = data?.reduce((s, sale) => s + Number(sale.total_amount), 0) || 0;
  let cost = 0;
  let profit = 0;
  let itemsSold = 0;

  data?.forEach((sale) => {
    const saleItems = sale.items as StoreSaleItem[] | null;
    saleItems?.forEach((i) => {
      cost += Number(i.unit_purchase_price) * i.quantity;
      profit += Number(i.profit);
      itemsSold += i.quantity;
    });
  });

  return { revenue, cost, profit, itemsSold, saleCount: data?.length || 0 };
}

export async function getStoreWeeklyRevenue() {
  const days: { date: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateISO(d);
    const { revenue } = await getStoreRevenueByPeriod(dateStr, dateStr);
    days.push({ date: dateStr, revenue });
  }
  return days;
}

export async function getStoreRevenueForDate(date: string): Promise<number> {
  const { revenue } = await getStoreRevenueByPeriod(date, date);
  return revenue;
}

export async function getLowStockProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("is_active", true)
    .order("stock_quantity");
  return ((data || []) as Product[]).filter(
    (p) => getStockStatus(p.stock_quantity, p.minimum_stock) !== "EN_STOCK"
  );
}

export async function uploadProductImage(
  productId: string,
  file: File,
  userId: string
): Promise<string> {
  const supabase = await createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${productId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("store-products")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage.from("store-products").getPublicUrl(path);
  const imageUrl = urlData.publicUrl;

  await updateProduct(productId, { image_url: imageUrl }, userId);
  return imageUrl;
}
