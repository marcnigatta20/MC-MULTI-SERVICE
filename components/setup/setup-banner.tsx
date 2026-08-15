import { AlertTriangle } from "lucide-react";

export function SetupBanner() {
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <div className="mx-auto flex max-w-4xl items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Configuration Supabase requise</p>
          <p className="mt-1 text-amber-200/80">
            Copiez <code className="rounded bg-black/30 px-1">.env.example</code> vers{" "}
            <code className="rounded bg-black/30 px-1">.env.local</code>, renseignez vos clés
            Supabase, puis exécutez les migrations SQL dans{" "}
            <code className="rounded bg-black/30 px-1">supabase/migrations/</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
