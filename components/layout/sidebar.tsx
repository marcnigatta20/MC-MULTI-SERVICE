"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Scissors,
  Wallet,
  CreditCard,
  TrendingDown,
  BarChart3,
  Settings,
  FileText,
  LogOut,
  Menu,
  X,
  UserCircle,
  ClipboardList,
  Percent,
  Trophy,
  History,
  ShoppingBag,
  Bell,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type Profile, type UserRole } from "@/types";
import { useEffect, useMemo, useState } from "react";
import { signOut } from "@/lib/actions/auth";
import {
  STORE_NOTIFICATION_STORAGE_KEY,
  buildNotificationItems,
  readNotificationItems,
  writeNotificationItems,
  type NotificationItem,
} from "@/lib/notifications";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  // Admin
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN"] },
  { href: "/transactions", label: "Transactions", icon: Receipt, roles: ["ADMIN"] },
  { href: "/barbers", label: "Barbiers", icon: Users, roles: ["ADMIN"] },
  { href: "/services", label: "Services", icon: Scissors, roles: ["ADMIN"] },
  { href: "/cash", label: "Caisse", icon: Wallet, roles: ["ADMIN"] },
  { href: "/dashboard/store", label: "Store", icon: ShoppingBag, roles: ["ADMIN", "CAISSIERE", "COMPTABLE"] },
  { href: "/commissions", label: "Commissions", icon: Percent, roles: ["ADMIN"] },
  { href: "/barber-payments", label: "Paiements barbiers", icon: CreditCard, roles: ["ADMIN"] },
  { href: "/expenses", label: "Dépenses", icon: TrendingDown, roles: ["ADMIN"] },
  { href: "/reports", label: "Rapports", icon: FileText, roles: ["ADMIN"] },
  { href: "/performance", label: "Performance", icon: Trophy, roles: ["ADMIN"] },
  { href: "/users", label: "Utilisateurs", icon: Users, roles: ["ADMIN"] },
  { href: "/audit", label: "Journal d'activité", icon: ClipboardList, roles: ["ADMIN"] },
  { href: "/settings", label: "Paramètres", icon: Settings, roles: ["ADMIN"] },

  // Caissière
  { href: "/cashier-dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["CAISSIERE"] },
  { href: "/transactions/new", label: "Nouvelle vente", icon: Receipt, roles: ["CAISSIERE"] },
  { href: "/transactions", label: "Transactions", icon: History, roles: ["CAISSIERE"] },
  { href: "/cash", label: "Ma caisse", icon: Wallet, roles: ["CAISSIERE"] },
  { href: "/receipts", label: "Reçus", icon: FileText, roles: ["CAISSIERE"] },
  { href: "/expenses", label: "Dépenses autorisées", icon: TrendingDown, roles: ["CAISSIERE"] },

  // Barber
  { href: "/barber", label: "Mon dashboard", icon: LayoutDashboard, roles: ["BARBER"] },
  { href: "/barber/services", label: "Mes services", icon: Scissors, roles: ["BARBER"] },
  { href: "/barber/commissions", label: "Mes commissions", icon: Percent, roles: ["BARBER"] },
  { href: "/barber/payments", label: "Mes paiements", icon: CreditCard, roles: ["BARBER"] },
  { href: "/barber/history", label: "Mon historique", icon: History, roles: ["BARBER"] },
  { href: "/barber/profile", label: "Mon profil", icon: UserCircle, roles: ["BARBER"] },

  // Comptable
  { href: "/accounting", label: "Comptabilité", icon: BarChart3, roles: ["COMPTABLE"] },
  { href: "/transactions", label: "Transactions", icon: Receipt, roles: ["COMPTABLE"] },
  { href: "/commissions", label: "Commissions", icon: Percent, roles: ["COMPTABLE"] },
  { href: "/expenses", label: "Dépenses", icon: TrendingDown, roles: ["COMPTABLE"] },
  { href: "/reports", label: "Rapports", icon: FileText, roles: ["COMPTABLE"] },
  { href: "/performance", label: "Performance", icon: Trophy, roles: ["COMPTABLE"] },
  { href: "/audit", label: "Journal d'activité", icon: ClipboardList, roles: ["COMPTABLE"] },
];

const ROOT_PATHS = ["/dashboard", "/cash", "/barber", "/accounting", "/cashier-dashboard"];

function SidebarNav({
  filteredNav,
  pathname,
  profile,
  onNavigate,
  storeAlertCount,
}: {
  filteredNav: NavItem[];
  pathname: string;
  profile: Profile;
  onNavigate: () => void;
  storeAlertCount: number;
}) {
  return (
    <>
      <div className="border-b border-zinc-800 p-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (!ROOT_PATHS.includes(item.href) && pathname.startsWith(`${item.href}/`)) ||
            (item.href === "/barber" && pathname === "/barber");
          const showAlertBadge = item.href === "/dashboard/store" && storeAlertCount > 0;

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gold/10 text-gold"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {showAlertBadge && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {storeAlertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 p-4">
        <div className="mb-3 rounded-lg bg-zinc-900/50 p-3">
          <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
          <p className="text-xs text-zinc-500">{ROLE_LABELS[profile.role]}</p>
        </div>
      </div>
    </>
  );
}

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storeAlertCount, setStoreAlertCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateAlertCount = () => {
      try {
        const raw = window.localStorage.getItem(STORE_NOTIFICATION_STORAGE_KEY);
        if (!raw) {
          setStoreAlertCount(0);
          return;
        }

        const parsed = JSON.parse(raw) as { lowStockCount?: number; recentSalesCount?: number };
        const lowStockCount = profile.role === "ADMIN" || profile.role === "CAISSIERE" ? (parsed.lowStockCount ?? 0) : 0;
        const recentSalesCount = profile.role === "ADMIN" ? (parsed.recentSalesCount ?? 0) : 0;
        setStoreAlertCount(lowStockCount + recentSalesCount);
      } catch {
        setStoreAlertCount(0);
      }
    };

    updateAlertCount();
    window.addEventListener("storage", updateAlertCount);
    return () => window.removeEventListener("storage", updateAlertCount);
  }, []);

  const filteredNav = NAV_ITEMS.filter((item) =>
    item.roles.includes(profile.role)
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarNav
          filteredNav={filteredNav}
          pathname={pathname}
          profile={profile}
          onNavigate={() => setMobileOpen(false)}
          storeAlertCount={storeAlertCount}
        />
      </aside>
    </>
  );
}

export function Topbar({ title, subtitle, profile }: { title: string; subtitle?: string; profile?: Profile }) {
  const currentRole = profile?.role ?? "ADMIN";
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "sale" | "stock">("all");
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateNotificationCount = () => {
      try {
        const raw = window.localStorage.getItem(STORE_NOTIFICATION_STORAGE_KEY);
        if (!raw) {
          setNotificationCount(0);
          return;
        }

        const parsed = JSON.parse(raw) as { lowStockCount?: number; recentSalesCount?: number };
        const lowStockCount = currentRole === "ADMIN" || currentRole === "CAISSIERE" ? (parsed.lowStockCount ?? 0) : 0;
        const recentSalesCount = currentRole === "ADMIN" ? (parsed.recentSalesCount ?? 0) : 0;
        setNotificationCount(lowStockCount + recentSalesCount);
      } catch {
        setNotificationCount(0);
      }
    };

    const updateNotificationItems = () => {
      try {
        const raw = window.localStorage.getItem(STORE_NOTIFICATION_STORAGE_KEY);
        if (!raw) {
          setNotificationItems([]);
          return;
        }

        const parsed = JSON.parse(raw) as { lowStockCount?: number; lowStockNames?: string[]; recentSalesCount?: number; updatedAt?: string };
        const summary = {
          recentSalesCount: parsed.recentSalesCount ?? 0,
          lowStockCount: parsed.lowStockCount ?? 0,
          lowStockNames: parsed.lowStockNames ?? [],
          updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        };

        const built = buildNotificationItems(summary, currentRole);
        const persisted = readNotificationItems().filter((item) => item.role === currentRole);
        const merged = built.map((item) => {
          const current = persisted.find((p) => p.id === item.id);
          return current ? { ...item, read: current.read } : item;
        });

        const storedHistory = [...persisted.filter((item) => !built.some((current) => current.id === item.id)), ...merged];
        const sorted = storedHistory
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 20);

        writeNotificationItems(sorted);
        setNotificationItems(sorted);
      } catch {
        setNotificationItems([]);
      }
    };

    updateNotificationCount();
    updateNotificationItems();
    window.addEventListener("storage", updateNotificationCount);
    window.addEventListener("storage", updateNotificationItems);
    return () => {
      window.removeEventListener("storage", updateNotificationCount);
      window.removeEventListener("storage", updateNotificationItems);
    };
  }, [currentRole]);

  const filteredNotificationItems = useMemo(() => {
    if (notificationFilter === "all") return notificationItems;
    return notificationItems.filter((item) => item.type === notificationFilter);
  }, [notificationFilter, notificationItems]);

  const unreadCount = notificationItems.filter((item) => !item.read).length;

  const markAllAsRead = () => {
    const next = notificationItems.map((item) => ({ ...item, read: true }));
    setNotificationItems(next);
    writeNotificationItems(next);
  };

  const markItemAsRead = (id: string) => {
    const next = notificationItems.map((item) => (item.id === id ? { ...item, read: true } : item));
    setNotificationItems(next);
    writeNotificationItems(next);
  };

  const notificationTitle = currentRole === "ADMIN" || currentRole === "CAISSIERE" ? "Notifications Store" : "Notifications";

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:pl-72">
        <div className="ml-10 lg:ml-0">
          <h1 className="truncate text-base font-semibold text-white sm:text-lg md:text-xl">{title}</h1>
          {subtitle && <p className="hidden sm:block text-sm text-zinc-500 truncate">{subtitle}</p>}
        </div>

        {profile && (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(false);
                  setShowProfileMenu((value) => !value);
                }}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-gold/70 bg-zinc-900 text-zinc-200 shadow-[0_0_0_1px_rgba(212,175,55,0.2)] transition hover:border-gold hover:scale-105 sm:h-11 sm:w-11"
                aria-label="Profil utilisateur"
                title={profile.full_name}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                ) : (
                  <UserCircle className="h-5 w-5" />
                )}
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-12 z-50 w-44 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl sm:w-52">
                  <Link
                    href={profile.role === "BARBER" ? "/barber/profile" : "/settings"}
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800 hover:text-white"
                  >
                    <Pencil className="h-4 w-4 text-gold" />
                    Modifier le profil
                  </Link>

                  <form action={signOut} className="mt-1 border-t border-zinc-800 pt-2">
                    <Button type="submit" variant="ghost" className="w-full justify-start px-2 py-2 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white">
                      <LogOut className="mr-2 h-4 w-4 text-gold" />
                      Déconnexion
                    </Button>
                  </form>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  setShowNotifications((value) => !value);
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-200 transition hover:border-gold/60 hover:text-gold sm:h-10 sm:w-10"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl sm:w-80">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{notificationTitle}</p>
                    {unreadCount > 0 && (
                      <button type="button" onClick={markAllAsRead} className="text-[10px] uppercase tracking-wide text-gold hover:underline">
                        Tout lire
                      </button>
                    )}
                  </div>

                  <div className="mb-3 flex gap-2 text-[10px] uppercase tracking-wide text-zinc-400">
                    {(["all", "sale", "stock"] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setNotificationFilter(filter)}
                        className={cn(
                          "rounded-full px-2 py-1 transition",
                          notificationFilter === filter ? "bg-gold/15 text-gold" : "bg-zinc-900 text-zinc-400"
                        )}
                      >
                        {filter === "all" ? "Toutes" : filter === "sale" ? "Ventes" : "Stock"}
                      </button>
                    ))}
                  </div>

                  {filteredNotificationItems.length === 0 ? (
                    <p className="rounded-md bg-zinc-900/80 px-2 py-3 text-xs text-zinc-400">Aucune notification.</p>
                  ) : (
                    <ul className="space-y-2 text-xs text-zinc-300">
                      {filteredNotificationItems.map((item) => (
                        <li key={item.id} className={cn("rounded-md border px-2 py-2", item.read ? "border-zinc-800 bg-zinc-900/70" : "border-gold/40 bg-amber-500/5") }>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="font-medium text-white">{item.title}</span>
                            {!item.read && <span className="h-2 w-2 rounded-full bg-red-500" />}
                          </div>
                          <p className="text-zinc-300">{item.message}</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-wide text-zinc-500">{new Date(item.createdAt).toLocaleDateString("fr-FR")}</span>
                            {!item.read && (
                              <button type="button" onClick={() => markItemAsRead(item.id)} className="text-[10px] text-gold hover:underline">
                                Marquer lu
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
