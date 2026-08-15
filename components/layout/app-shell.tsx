import { Sidebar, Topbar } from "@/components/layout/sidebar";
import { Toaster } from "sonner";
import type { Profile } from "@/types";

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
