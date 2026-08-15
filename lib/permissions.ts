import type { UserRole } from "@/types";
import { getCurrentProfile } from "@/lib/auth";

export class PermissionError extends Error {
  constructor(message = "Accès refusé.") {
    super(message);
    this.name = "PermissionError";
  }
}

export async function assertRole(allowedRoles: UserRole[]): Promise<{
  id: string;
  role: UserRole;
  full_name: string;
}> {
  const profile = await getCurrentProfile();
  if (!profile) throw new PermissionError("Non authentifié.");
  if (!profile.is_active) throw new PermissionError("Compte désactivé.");
  if (!allowedRoles.includes(profile.role)) {
    throw new PermissionError("Accès refusé.");
  }
  return profile;
}

export async function assertAdmin() {
  return assertRole(["ADMIN"]);
}

export async function assertCashierOrAdmin() {
  return assertRole(["ADMIN", "CAISSIERE"]);
}

export async function assertCanCancelTransaction(userId: string) {
  const profile = await assertAdmin();
  if (profile.id !== userId) {
    throw new PermissionError("Accès refusé.");
  }
  return profile;
}

export async function assertCanRecordBarberPayment() {
  return assertAdmin();
}

export async function assertCanCreateExpense(userId: string) {
  const profile = await assertRole(["ADMIN", "CAISSIERE"]);
  if (profile.id !== userId) {
    throw new PermissionError("Accès refusé.");
  }
  return profile;
}

export function canReadFinancialReports(role: UserRole): boolean {
  return role === "ADMIN" || role === "COMPTABLE";
}

export function canModifyBarbers(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canCreateTransaction(role: UserRole): boolean {
  return role === "ADMIN" || role === "CAISSIERE";
}

export async function assertStoreAdmin() {
  return assertRole(["ADMIN"]);
}

export async function assertStoreCashierOrAdmin() {
  return assertRole(["ADMIN", "CAISSIERE"]);
}

export async function assertStoreReadAccess() {
  return assertRole(["ADMIN", "CAISSIERE", "COMPTABLE"]);
}

export async function assertCanCancelStoreSale(userId: string) {
  const profile = await assertAdmin();
  if (profile.id !== userId) {
    throw new PermissionError("Accès refusé.");
  }
  return profile;
}

export function canManageStoreProducts(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canCreateStoreSale(role: UserRole): boolean {
  return role === "ADMIN" || role === "CAISSIERE";
}

export function canReadStoreReports(role: UserRole): boolean {
  return role === "ADMIN" || role === "COMPTABLE";
}
