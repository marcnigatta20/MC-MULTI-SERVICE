import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        {
          "bg-gold/20 text-gold": variant === "default",
          "bg-zinc-800 text-zinc-300": variant === "secondary",
          "bg-emerald-500/20 text-emerald-400": variant === "success",
          "bg-amber-500/20 text-amber-400": variant === "warning",
          "bg-red-500/20 text-red-400": variant === "destructive",
          "border border-zinc-700 text-zinc-400": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
