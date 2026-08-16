"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, Topbar } from "@/components/layout/sidebar";
import { Toaster } from "sonner";
import { REALTIME_SYNC_KEY } from "@/lib/realtime";
import type { Profile } from "@/types";

function RealtimeSync() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleRefresh = () => {
      router.refresh();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === REALTIME_SYNC_KEY) {
        handleRefresh();
      }
    };

    window.addEventListener("mc-live-sync", handleRefresh);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("mc-live-sync", handleRefresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, [router]);

  return null;
}

export function AppShell({
  profile,
  title,
  subtitle,
  children,
}: {
  profile: Profile;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <RealtimeSync />
      <Sidebar profile={profile} />
      <div className="lg:pl-64">
        <Topbar title={title} subtitle={subtitle} profile={profile} />
        <main className="p-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "#18181b",
            border: "1px solid #3f3f46",
            color: "#fff",
          },
        }}
      />
    </div>
  );
}
