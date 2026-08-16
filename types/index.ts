export type UserRole = "ADMIN" | "CAISSIERE" | "BARBER" | "COMPTABLE";
export type PaymentMethod = "ESPECES" | "AUTRE_COMPTOIR";
export type TransactionStatus = "ACTIVE" | "CANCELLED";
export type CashRegisterStatus = "OPEN" | "CLOSED";
export type ExpenseCategory =
  | "ELECTRICITE"
  | "EAU"
  | "INTERNET"
  | "PRODUITS"
  | "MATERIEL"
  | "ENTRETIEN"
  | "TRANSPORT"
  | "SALAIRES"
  | "FOURNITURES"
  | "LOYER"
  | "SALAIRE"
  | "MAINTENANCE"
  | "AUTRE";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Barber {
  id: string;
  user_id?: string | null;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: Profile;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashRegister {
  id: string;
  cashier_id: string;
  status: CashRegisterStatus;
  opening_balance: number;
  closing_balance?: number | null;
  expected_balance?: number | null;
  difference?: number | null;
  difference_explanation?: string | null;
  opened_at: string;
  closed_at?: string | null;
  notes?: string | null;
  created_at: string;
  cashier?: Profile;
}

export interface Transaction {
  id: string;
  receipt_number: string;
  barber_id: string;
  service_id: string;
  cashier_id: string;
  cash_register_id?: string | null;
  amount: number;
  original_price?: number | null;
  service_price?: number | null;
  total_amount?: number | null;
  discount_amount?: number | null;
  service_name?: string | null;
  commission_rate: number;
  commission_amount: number;
  shop_amount: number;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  client_name?: string | null;
  notes?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  transaction_date: string;
  created_at: string;
  barber?: Barber;
  service?: Service;
  cashier?: Profile;
}

export interface BarberPayment {
  id: string;
  barber_id: string;
  amount: number;
  payment_method: PaymentMethod;
  paid_by: string;
  notes?: string | null;
  payment_date: string;
  created_at: string;
  barber?: Barber;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  recorded_by: string;
  cash_register_id?: string | null;
  expense_date: string;
  receipt_url?: string | null;
  created_at: string;
  recorder?: Profile;
}

export interface BarberBalance {
  barber_id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  commission_rate: number;
  is_active?: boolean;
  created_at?: string;
  user_id?: string | null;
  total_revenue: number;
  service_count: number;
  total_commissions: number;
  total_paid: number;
  balance_due: number;
}

export type StoreSaleStatus = "VALIDEE" | "ANNULEE";
export type StockMovementType =
  | "INITIAL"
  | "ACHAT"
  | "VENTE"
  | "AJUSTEMENT"
  | "RETOUR"
  | "PERTE"
  | "PRODUIT_ENDOMMAGE";
export type StockStatus = "EN_STOCK" | "STOCK_FAIBLE" | "EPUISE";

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id?: string | null;
  supplier_id?: string | null;
  name: string;
  sku?: string | null;
  description?: string | null;
  image_url?: string | null;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  supplier?: Supplier;
}

export interface StoreSale {
  id: string;
  receipt_number: string;
  cashier_id: string;
  cash_register_id?: string | null;
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  status: StoreSaleStatus;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  cashier?: Profile;
  items?: StoreSaleItem[];
}

export interface StoreSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  sku?: string | null;
  quantity: number;
  unit_purchase_price: number;
  unit_selling_price: number;
  subtotal: number;
  profit: number;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  purchase_price?: number | null;
  reference_id?: string | null;
  reason?: string | null;
  created_by?: string | null;
  created_at: string;
  product?: Product;
  creator?: Profile;
}

export interface StoreDashboardStats {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  productsSoldToday: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  estimatedProfitToday: number;
  estimatedProfitMonth: number;
}

export interface DashboardStats {
  revenueToday: number;
  commissionsToday: number;
  shopShareToday: number;
  storeRevenueToday: number;
  totalRevenueToday: number;
  expensesToday: number;
  netProfitToday: number;
  storeProfitToday: number;
  barbersOwed: number;
  transactionCount: number;
  storeSaleCount: number;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  description?: string | null;
  details?: Record<string, unknown>;
  created_at: string;
  user?: Profile;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrateur",
  CAISSIERE: "Caissière",
  BARBER: "Barber",
  COMPTABLE: "Comptable",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  ESPECES: "Espèces",
  AUTRE_COMPTOIR: "Autre paiement comptoir",
};

export const STORE_SALE_STATUS_LABELS: Record<StoreSaleStatus, string> = {
  VALIDEE: "Validée",
  ANNULEE: "Annulée",
};

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  INITIAL: "Stock initial",
  ACHAT: "Achat / Réappro",
  VENTE: "Vente",
  AJUSTEMENT: "Ajustement",
  RETOUR: "Retour",
  PERTE: "Perte",
  PRODUIT_ENDOMMAGE: "Produit endommagé",
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  EN_STOCK: "En stock",
  STOCK_FAIBLE: "Stock faible",
  EPUISE: "Épuisé",
};

export function getStockStatus(
  stock: number,
  minimum: number
): StockStatus {
  if (stock === 0) return "EPUISE";
  if (stock <= minimum) return "STOCK_FAIBLE";
  return "EN_STOCK";
}

export function calcMargin(purchase: number, selling: number) {
  const unit = selling - purchase;
  const percent = selling > 0 ? (unit / selling) * 100 : 0;
  return { unit, percent };
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  ELECTRICITE: "Électricité",
  EAU: "Eau",
  INTERNET: "Internet",
  PRODUITS: "Produits",
  MATERIEL: "Matériel",
  ENTRETIEN: "Entretien",
  TRANSPORT: "Transport",
  SALAIRES: "Salaires",
  FOURNITURES: "Fournitures",
  LOYER: "Loyer",
  SALAIRE: "Salaire",
  MAINTENANCE: "Maintenance",
  AUTRE: "Autre",
};
