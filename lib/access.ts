import type { UserRole } from "@/types";

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  ADMIN: "/dashboard",
  CAISSIERE: "/cashier-dashboard",
  BARBER: "/barber",
  COMPTABLE: "/accounting",
};

export const ROLE_ROUTE_ACCESS: Record<string, UserRole[]> = {
  "/dashboard": ["ADMIN"],
  "/cash": ["ADMIN", "CAISSIERE"],
  "/cashier-dashboard": ["CAISSIERE"],
  "/cashier": ["ADMIN", "CAISSIERE"],
  "/transactions": ["ADMIN", "COMPTABLE", "CAISSIERE"],
  "/receipts": ["ADMIN", "CAISSIERE"],
  "/barber": ["ADMIN", "BARBER"],
  "/accounting": ["ADMIN", "COMPTABLE"],
  "/commissions": ["ADMIN", "COMPTABLE"],
  "/barber-payments": ["ADMIN"],
  "/performance": ["ADMIN", "COMPTABLE"],
  "/barbers": ["ADMIN"],
  "/services": ["ADMIN"],
  "/payments": ["ADMIN"],
  "/expenses": ["ADMIN", "CAISSIERE", "COMPTABLE"],
  "/reports": ["ADMIN", "COMPTABLE"],
  "/users": ["ADMIN"],
  "/audit": ["ADMIN", "COMPTABLE"],
  "/logs": ["ADMIN", "COMPTABLE"],
  "/settings": ["ADMIN"],
  "/dashboard/store": ["ADMIN", "CAISSIERE", "COMPTABLE"],
  "/dashboard/store/products": ["ADMIN", "CAISSIERE", "COMPTABLE"],
  "/dashboard/store/products/new": ["ADMIN"],
  "/dashboard/store/categories": ["ADMIN"],
  "/dashboard/store/sales": ["ADMIN", "CAISSIERE"],
  "/dashboard/store/sales/new": ["ADMIN", "CAISSIERE"],
  "/dashboard/store/stock": ["ADMIN", "CAISSIERE"],
};

export function getRoleDashboardPath(role: string): string {
  return ROLE_DASHBOARD_PATHS[role as UserRole] ?? "/login";
}

export function canAccessRoute(role: string, pathname: string): boolean {
  const normalized = pathname.split("?")[0];
  const matchedRoute = Object.keys(ROLE_ROUTE_ACCESS)
    .sort((a, b) => b.length - a.length)
    .find(
      (route) =>
        normalized === route || normalized.startsWith(`${route}/`)
    );

  if (!matchedRoute) {
    return true;
  }

  const allowedRoles = ROLE_ROUTE_ACCESS[matchedRoute];
  return allowedRoles.includes(role as UserRole) || role === "ADMIN";
}
