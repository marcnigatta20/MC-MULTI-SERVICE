"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { REALTIME_SYNC_KEY } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";

type RealtimeSource = string | string[] | undefined;
type RealtimeTableRow = { id?: string | number };

interface UseRealtimeTableOptions<T> {
  enabled?: boolean;
  source?: RealtimeSource;
  onRefresh?: () => void;
  eventName?: string;
  refreshOnChange?: boolean;
  initialData?: T[];
  tableName?: string;
  idKey?: string;
}

function matchesSource(eventSource: string | undefined, allowed?: RealtimeSource) {
  if (!allowed) return true;

  if (Array.isArray(allowed)) {
    return allowed.includes(eventSource ?? "");
  }

  return allowed === eventSource;
}

function resolveRealtimeTables(source?: RealtimeSource, tableName?: string): string[] {
  const explicitTables = tableName ? [tableName] : [];
  if (explicitTables.length > 0) return explicitTables;

  const sourceValues = Array.isArray(source) ? source : source ? [source] : [];
  const tableMap: Record<string, string[]> = {
    transaction: ["transactions"],
    transaction_cancelled: ["transactions"],
    store_sale: ["store_sales"],
    store_sale_cancelled: ["store_sales"],
    sales: ["transactions", "store_sales"],
    product: ["products"],
    products: ["products"],
    stock: ["products"],
    notification: [],
    notifications: [],
    "store_notification": [],
    "store_notifications": [],
  };

  const resolved = sourceValues.flatMap((value) => {
    if (!value) return [];
    const mapped = tableMap[value.toLowerCase()];
    return mapped && mapped.length > 0 ? mapped : [value];
  });

  return Array.from(new Set(resolved));
}

function getRowId<T extends RealtimeTableRow>(row: T | null | undefined, idKey: string) {
  if (!row || typeof row !== "object") return undefined;

  if (idKey in row) {
    return row[idKey as keyof T];
  }

  return row.id;
}

function applyRealtimeChanges<T extends RealtimeTableRow>(
  current: T[],
  payload: { eventType?: string; new?: Record<string, unknown> | null; old?: Record<string, unknown> | null },
  idKey: string
) {
  const newRow = (payload.new ?? null) as T | null;
  const oldRow = (payload.old ?? null) as T | null;

  if (payload.eventType === "INSERT" && newRow) {
    return [newRow, ...current];
  }

  if (payload.eventType === "UPDATE" && newRow) {
    const newId = getRowId(newRow, idKey);
    return current.map((item) => (getRowId(item, idKey) === newId ? newRow : item));
  }

  if (payload.eventType === "DELETE" && oldRow) {
    const oldId = getRowId(oldRow, idKey);
    return current.filter((item) => getRowId(item, idKey) !== oldId);
  }

  return current;
}

export function useRealtimeTable<T extends RealtimeTableRow>(
  tableNameOrOptions?: string | string[] | UseRealtimeTableOptions<T>,
  initialData: T[] | Record<string, T[]> = [],
  options: UseRealtimeTableOptions<T> = {}
) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const normalizedTables = useMemo(() => {
    if (Array.isArray(tableNameOrOptions)) return tableNameOrOptions;
    if (typeof tableNameOrOptions === "string") return [tableNameOrOptions];
    return [];
  }, [tableNameOrOptions]);

  const normalizedOptions = useMemo(() => {
    if (typeof tableNameOrOptions === "string" || Array.isArray(tableNameOrOptions)) {
      return {
        enabled: true,
        refreshOnChange: true,
        initialData: Array.isArray(initialData) ? initialData : [],
        tableName: Array.isArray(tableNameOrOptions) ? undefined : tableNameOrOptions,
        idKey: "id",
        ...options,
      };
    }

    return {
      enabled: true,
      refreshOnChange: true,
      initialData: Array.isArray(initialData) ? initialData : [],
      idKey: "id",
      ...tableNameOrOptions,
    };
  }, [initialData, options, tableNameOrOptions]);

  const [data, setData] = useState<T[]>(
    Array.isArray(initialData) ? initialData : normalizedOptions.initialData ?? []
  );

  const [dataByTable, setDataByTable] = useState<Record<string, T[]>>(() => {
    if (!Array.isArray(tableNameOrOptions)) return {};

    const map: Record<string, T[]> = {};
    for (const table of tableNameOrOptions) {
      const entry = (initialData as Record<string, T[]>)?.[table];
      map[table] = Array.isArray(entry) ? entry : [];
    }
    return map;
  });

  const refresh = useCallback(
    (detail?: { source?: string }) => {
      if (normalizedOptions.source && !matchesSource(detail?.source, normalizedOptions.source)) {
        return;
      }

      if (normalizedOptions.onRefresh) {
        normalizedOptions.onRefresh();
        return;
      }

      if (normalizedOptions.refreshOnChange) {
        router.refresh();
      }
    },
    [normalizedOptions, router]
  );

  useEffect(() => {
    if (!normalizedOptions.enabled || typeof window === "undefined") return;

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ source?: string }>;
      refresh(customEvent.detail);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== REALTIME_SYNC_KEY) return;

      try {
        const payload = event.newValue ? JSON.parse(event.newValue) : null;
        refresh(payload?.source);
      } catch {
        refresh();
      }
    };

    window.addEventListener(normalizedOptions.eventName ?? "mc-live-sync", handleCustomEvent);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(normalizedOptions.eventName ?? "mc-live-sync", handleCustomEvent);
      window.removeEventListener("storage", handleStorage);
    };
  }, [normalizedOptions.enabled, normalizedOptions.eventName, normalizedOptions.onRefresh, normalizedOptions.refreshOnChange, normalizedOptions.source, refresh]);

  useEffect(() => {
    if (!normalizedOptions.enabled || typeof window === "undefined") return;

    const tablesToWatch =
      normalizedTables.length > 0
        ? normalizedTables
        : resolveRealtimeTables(normalizedOptions.source, normalizedOptions.tableName);

    if (tablesToWatch.length === 0) return;

    const unsubscribers: Array<() => void> = [];

    for (const tableName of tablesToWatch) {
      const channel = supabase
        .channel(`realtime-${tableName}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: tableName },
          (payload) => {
            setData((current) =>
              applyRealtimeChanges<T>(current, payload, normalizedOptions.idKey ?? "id")
            );

            setDataByTable((current) => {
              const next: Record<string, T[]> = { ...current };
              next[tableName] = applyRealtimeChanges<T>(
                next[tableName] ?? [],
                payload,
                normalizedOptions.idKey ?? "id"
              );
              return next;
            });
          }
        )
        .subscribe();

      unsubscribers.push(() => {
        supabase.removeChannel(channel);
      });
    }

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, [normalizedOptions.enabled, normalizedOptions.idKey, normalizedOptions.tableName, normalizedTables, supabase]);

  if (Array.isArray(tableNameOrOptions)) {
    return { data: dataByTable, setData: setDataByTable, refresh } as const;
  }

  if (typeof tableNameOrOptions === "string") {
    return [data, setData] as const;
  }

  if (tableNameOrOptions && typeof tableNameOrOptions === "object") {
    return { data, setData, refresh } as const;
  }

  return { data, setData, dataByTable, refresh } as const;
}

// Usage examples:
// const [transactions] = useRealtimeTable("transactions");
// const [products] = useRealtimeTable("products", initialProducts);
// const { data: tables } = useRealtimeTable(["products", "transactions", "sales", "store_sales"]);
// useRealtimeTable({ tableName: "products", source: ["store_sale", "transaction"], refreshOnChange: true });
