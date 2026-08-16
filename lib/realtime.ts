export const REALTIME_SYNC_KEY = "mc-live-sync";

export function broadcastRealtimeUpdate(source = "manual") {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({ source, timestamp: Date.now() });

  try {
    localStorage.setItem(REALTIME_SYNC_KEY, payload);
  } catch {
    // Ignore storage issues silently.
  }

  window.dispatchEvent(new CustomEvent("mc-live-sync", { detail: { source } }));
}
