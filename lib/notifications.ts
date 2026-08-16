export const STORE_NOTIFICATION_STORAGE_KEY = "mc-store-notifications";
export const STORE_NOTIFICATION_READ_KEY = "mc-store-notifications-read";
export const STORE_NOTIFICATION_HISTORY_KEY = "mc-store-notifications-history";

import type { UserRole } from "@/types";

export interface StoreNotificationSummary {
  recentSalesCount: number;
  lowStockCount: number;
  lowStockNames: string[];
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "sale" | "stock";
  createdAt: string;
  read: boolean;
  role: UserRole;
}

export function summarizeStoreNotifications(
  recentSalesCount: number,
  lowStockItems: Array<{ name: string }>
): StoreNotificationSummary {
  return {
    recentSalesCount,
    lowStockCount: lowStockItems.length,
    lowStockNames: lowStockItems.slice(0, 3).map((item) => item.name),
    updatedAt: new Date().toISOString(),
  };
}

export function mergeStoreSaleNotification(
  current: StoreNotificationSummary | null | undefined,
  addedSales = 1
): StoreNotificationSummary {
  return {
    recentSalesCount: Math.max(0, (current?.recentSalesCount ?? 0) + addedSales),
    lowStockCount: current?.lowStockCount ?? 0,
    lowStockNames: current?.lowStockNames ?? [],
    updatedAt: new Date().toISOString(),
  };
}

export function playNotificationTone() {
  if (typeof window === "undefined") return;

  const AudioCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return;

  try {
    const audioContext = new AudioCtor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(620, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.06, audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.26);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.28);
  } catch {
    // Ignore browser audio issues silently.
  }
}

export function notifyStoreSaleCreated() {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(STORE_NOTIFICATION_STORAGE_KEY);
    const current = raw ? (JSON.parse(raw) as StoreNotificationSummary) : null;
    const next = mergeStoreSaleNotification(current, 1);
    window.localStorage.setItem(STORE_NOTIFICATION_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent("storage", { key: STORE_NOTIFICATION_STORAGE_KEY, newValue: JSON.stringify(next) }));
    playNotificationTone();
  } catch {
    // Ignore storage issues silently.
  }
}

export function readStoreNotificationSummary(): StoreNotificationSummary | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORE_NOTIFICATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoreNotificationSummary;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoreNotificationSummary(summary: StoreNotificationSummary) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORE_NOTIFICATION_STORAGE_KEY, JSON.stringify(summary));
  } catch {
    // Ignore storage issues silently.
  }
}

export function getStoreNotificationMessages(summary: StoreNotificationSummary) {
  const messages: string[] = [];

  if (summary.recentSalesCount > 0) {
    messages.push(
      summary.recentSalesCount === 1
        ? "1 vente récente enregistrée."
        : `${summary.recentSalesCount} ventes récentes enregistrées.`
    );
  }

  if (summary.lowStockCount > 0) {
    const names = summary.lowStockNames.length
      ? summary.lowStockNames.join(", ")
      : "certains produits";

    messages.push(
      summary.lowStockCount === 1
        ? `Stock faible : ${names}.`
        : `Stock faible : ${summary.lowStockCount} produits (${names}).`
    );
  }

  return messages;
}

export function isSaleNotificationVisibleForRole(role: UserRole): boolean {
  return role === "ADMIN";
}

export function isStockNotificationVisibleForRole(role: UserRole): boolean {
  return role === "ADMIN" || role === "CAISSIERE";
}

export function buildNotificationItems(summary: StoreNotificationSummary, role: UserRole = "ADMIN"): NotificationItem[] {
  const items: NotificationItem[] = [];

  if (isSaleNotificationVisibleForRole(role) && summary.recentSalesCount > 0) {
    items.push({
      id: `sale-${summary.updatedAt}`,
      title: "Vente",
      message:
        summary.recentSalesCount === 1
          ? "1 vente récente a été enregistrée."
          : `${summary.recentSalesCount} ventes récentes ont été enregistrées.`,
      type: "sale",
      createdAt: summary.updatedAt,
      read: false,
      role,
    });
  }

  if (isStockNotificationVisibleForRole(role) && summary.lowStockCount > 0) {
    const names = summary.lowStockNames.length ? summary.lowStockNames.join(", ") : "Plusieurs produits";
    items.push({
      id: `stock-${summary.updatedAt}`,
      title: "Stock faible",
      message:
        summary.lowStockCount === 1
          ? `Le produit ${names} est en stock faible.`
          : `${summary.lowStockCount} produits sont en stock faible (${names}).`,
      type: "stock",
      createdAt: summary.updatedAt,
      read: false,
      role,
    });
  }

  return items;
}

export function readNotificationItems(): NotificationItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORE_NOTIFICATION_HISTORY_KEY) || window.localStorage.getItem(STORE_NOTIFICATION_READ_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotificationItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeNotificationItems(items: NotificationItem[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORE_NOTIFICATION_HISTORY_KEY, JSON.stringify(items));
    window.localStorage.setItem(STORE_NOTIFICATION_READ_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage issues silently.
  }
}

export function appendNotificationItems(role: UserRole, items: NotificationItem[]) {
  if (typeof window === "undefined") return [] as NotificationItem[];

  try {
    const stored = readNotificationItems();
    const merged = [...stored, ...items.filter((item) => item.role === role)];
    const unique = merged.filter(
      (item, index, arr) => arr.findIndex((entry) => entry.id === item.id) === index
    );
    const trimmed = unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);
    writeNotificationItems(trimmed);
    return trimmed;
  } catch {
    return [] as NotificationItem[];
  }
}
