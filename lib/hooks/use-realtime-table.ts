"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function matchesSource(
  eventSource: string | undefined,
  allowed?: RealtimeSource
) {
  if (!allowed) return true;

  if (Array.isArray(allowed)) {
    return allowed.includes(eventSource ?? "");
  }

  return allowed === eventSource;
}

function resolveRealtimeTables(
  source?: RealtimeSource,
  tableName?: string
): string[] {
  if (tableName) {
    return [tableName];
  }

  const sourceValues = Array.isArray(source)
    ? source
    : source
      ? [source]
      : [];

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
    store_notification: [],
    store_notifications: [],
  };

  const resolved = sourceValues.flatMap((value) => {
    if (!value) return [];

    const mapped = tableMap[value.toLowerCase()];

    return mapped && mapped.length > 0 ? mapped : [value];
  });

  return Array.from(new Set(resolved));
}

function getRowId<T extends RealtimeTableRow>(
  row: T | null | undefined,
  idKey: string
) {
  if (!row || typeof row !== "object") {
    return undefined;
  }

  if (idKey in row) {
    return row[idKey as keyof T];
  }

  return row.id;
}

function applyRealtimeChanges<T extends RealtimeTableRow>(
  current: T[],
  payload: {
    eventType?: string;
    new?: Record<string, unknown> | null;
    old?: Record<string, unknown> | null;
  },
  idKey: string
): T[] {
  const newRow = (payload.new ?? null) as T | null;
  const oldRow = (payload.old ?? null) as T | null;

  if (payload.eventType === "INSERT" && newRow) {
    return [newRow, ...current];
  }

  if (payload.eventType === "UPDATE" && newRow) {
    const newId = getRowId(newRow, idKey);

    return current.map((item) =>
      getRowId(item, idKey) === newId ? newRow : item
    );
  }

  if (payload.eventType === "DELETE" && oldRow) {
    const oldId = getRowId(oldRow, idKey);

    return current.filter(
      (item) => getRowId(item, idKey) !== oldId
    );
  }

  return current;
}

/**
 * Générateur d'identifiants pour éviter que plusieurs instances
 * du hook utilisent exactement le même canal Supabase Realtime.
 */
let realtimeChannelCounter = 0;

function createUniqueChannelName(tableName: string) {
  realtimeChannelCounter += 1;

  return `realtime-${tableName}-${realtimeChannelCounter}`;
}

export function useRealtimeTable<T extends RealtimeTableRow>(
  tableNameOrOptions?: string | string[] | UseRealtimeTableOptions<T>,
  initialData: T[] | Record<string, T[]> = [],
  options: UseRealtimeTableOptions<T> = {}
) {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const channelNamesRef = useRef<string[]>([]);

  /**
   * Détermine les tables passées directement au hook.
   */
  const normalizedTables = useMemo(() => {
    if (Array.isArray(tableNameOrOptions)) {
      return tableNameOrOptions;
    }

    if (typeof tableNameOrOptions === "string") {
      return [tableNameOrOptions];
    }

    return [];
  }, [tableNameOrOptions]);

  /**
   * Normalise les options.
   */
  const normalizedOptions = useMemo<UseRealtimeTableOptions<T>>(() => {
    if (
      typeof tableNameOrOptions === "string" ||
      Array.isArray(tableNameOrOptions)
    ) {
      return {
        enabled: true,
        refreshOnChange: true,
        initialData: Array.isArray(initialData)
          ? initialData
          : [],
        tableName: Array.isArray(tableNameOrOptions)
          ? undefined
          : tableNameOrOptions,
        idKey: "id",
        ...options,
      };
    }

    return {
      enabled: true,
      refreshOnChange: true,
      initialData: Array.isArray(initialData)
        ? initialData
        : [],
      idKey: "id",
      ...tableNameOrOptions,
    };
  }, [
    initialData,
    options,
    tableNameOrOptions,
  ]);

  /**
   * Données d'une seule table.
   */
  const [data, setData] = useState<T[]>(
    Array.isArray(initialData)
      ? initialData
      : normalizedOptions.initialData ?? []
  );

  /**
   * Données de plusieurs tables.
   */
  const [dataByTable, setDataByTable] = useState<
    Record<string, T[]>
  >(() => {
    if (!Array.isArray(tableNameOrOptions)) {
      return {};
    }

    const map: Record<string, T[]> = {};

    for (const table of tableNameOrOptions) {
      const entry = (
        initialData as Record<string, T[]>
      )?.[table];

      map[table] = Array.isArray(entry)
        ? entry
        : [];
    }

    return map;
  });

  /**
   * Rafraîchissement de la page/donnée.
   */
  const refresh = useCallback(
    (detail?: { source?: string }) => {
      if (
        normalizedOptions.source &&
        !matchesSource(
          detail?.source,
          normalizedOptions.source
        )
      ) {
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
    [
      normalizedOptions.source,
      normalizedOptions.onRefresh,
      normalizedOptions.refreshOnChange,
      router,
    ]
  );

  /**
   * Événements personnalisés + synchronisation entre onglets.
   */
  useEffect(() => {
    if (
      !normalizedOptions.enabled ||
      typeof window === "undefined"
    ) {
      return;
    }

    const eventName =
      normalizedOptions.eventName ?? "mc-live-sync";

    const handleCustomEvent = (event: Event) => {
      const customEvent =
        event as CustomEvent<{ source?: string }>;

      refresh(customEvent.detail);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== REALTIME_SYNC_KEY) {
        return;
      }

      try {
        const payload = event.newValue
          ? JSON.parse(event.newValue)
          : null;

        refresh(payload?.source);
      } catch {
        refresh();
      }
    };

    window.addEventListener(
      eventName,
      handleCustomEvent
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        eventName,
        handleCustomEvent
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, [
    normalizedOptions.enabled,
    normalizedOptions.eventName,
    refresh,
  ]);

  /**
   * Tables Realtime à surveiller.
   */
  const tablesToWatch = useMemo(() => {
    if (normalizedTables.length > 0) {
      return Array.from(
        new Set(normalizedTables)
      );
    }

    return resolveRealtimeTables(
      normalizedOptions.source,
      normalizedOptions.tableName
    );
  }, [
    normalizedTables,
    normalizedOptions.source,
    normalizedOptions.tableName,
  ]);

  /**
   * Supabase Realtime.
   */
  useEffect(() => {
    if (
      !normalizedOptions.enabled ||
      typeof window === "undefined" ||
      tablesToWatch.length === 0
    ) {
      return;
    }

    let cancelled = false;

    const channels = tablesToWatch.map((tableName) => {
      /**
       * IMPORTANT :
       * chaque abonnement possède maintenant son propre nom.
       *
       * Exemple :
       * realtime-store_sales-1
       * realtime-store_sales-2
       */
      const channelName =
        createUniqueChannelName(tableName);

      channelNamesRef.current.push(channelName);

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: tableName,
          },
          (payload) => {
            if (cancelled) {
              return;
            }

            /**
             * Mise à jour des données d'une table.
             */
            setData((current) =>
              applyRealtimeChanges<T>(
                current,
                payload,
                normalizedOptions.idKey ?? "id"
              )
            );

            /**
             * Mise à jour des données multi-tables.
             */
            setDataByTable((current) => {
              const next = {
                ...current,
              };

              next[tableName] =
                applyRealtimeChanges<T>(
                  next[tableName] ?? [],
                  payload,
                  normalizedOptions.idKey ?? "id"
                );

              return next;
            });

            /**
             * Permet également aux autres parties
             * de l'application de se rafraîchir.
             */
            refresh();
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log(
              `[Realtime] Connecté : ${tableName}`
            );
          }

          if (status === "CHANNEL_ERROR") {
            console.error(
              `[Realtime] Erreur du canal : ${tableName}`
            );
          }

          if (status === "TIMED_OUT") {
            console.error(
              `[Realtime] Timeout : ${tableName}`
            );
          }

          if (status === "CLOSED") {
            console.log(
              `[Realtime] Canal fermé : ${tableName}`
            );
          }
        });

      return channel;
    });

    /**
     * Nettoyage.
     */
    return () => {
      cancelled = true;

      for (const channel of channels) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.error(
            "[Realtime] Erreur lors du nettoyage :",
            error
          );
        }
      }

      channelNamesRef.current = [];
    };
  }, [
    supabase,
    tablesToWatch,
    normalizedOptions.enabled,
    normalizedOptions.idKey,
    refresh,
  ]);

  /**
   * API pour plusieurs tables.
   */
  if (Array.isArray(tableNameOrOptions)) {
    return {
      data: dataByTable,
      setData: setDataByTable,
      refresh,
    } as const;
  }

  /**
   * API pour une seule table avec string.
   */
  if (typeof tableNameOrOptions === "string") {
    return [data, setData] as const;
  }

  /**
   * API avec options.
   */
  if (
    tableNameOrOptions &&
    typeof tableNameOrOptions === "object"
  ) {
    return {
      data,
      setData,
      refresh,
    } as const;
  }

  /**
   * API par défaut.
   */
  return {
    data,
    setData,
    dataByTable,
    refresh,
  } as const;
}