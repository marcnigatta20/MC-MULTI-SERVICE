"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Une erreur est survenue",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
      <h3 className="text-lg font-medium text-zinc-300">{title}</h3>
      {message && <p className="mt-2 max-w-md text-sm text-zinc-500">{message}</p>}
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Réessayer
        </Button>
      )}
    </div>
  );
}
