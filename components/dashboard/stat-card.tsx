import { cn, formatCurrency } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "gold" | "success" | "warning" | "danger";
  isCurrency?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  isCurrency = true,
}: StatCardProps) {
  const displayValue =
    typeof value === "number" && isCurrency ? formatCurrency(value) : value;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border p-6 transition-all hover:border-gold/30",
        {
          "border-zinc-800 bg-zinc-950/80": variant === "default",
          "border-gold/20 bg-gradient-to-br from-zinc-950 to-zinc-900": variant === "gold",
          "border-emerald-500/20 bg-zinc-950/80": variant === "success",
          "border-amber-500/20 bg-zinc-950/80": variant === "warning",
          "border-red-500/20 bg-zinc-950/80": variant === "danger",
        }
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
            {displayValue}
          </p>
          {subtitle && (
            <p className="text-xs text-zinc-500">{subtitle}</p>
          )}
          {trend && (
            <p className="text-xs text-zinc-500">
              {trend.value > 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div
          className={cn(
            "rounded-lg p-3",
            {
              "bg-gold/10 text-gold": variant === "default" || variant === "gold",
              "bg-emerald-500/10 text-emerald-400": variant === "success",
              "bg-amber-500/10 text-amber-400": variant === "warning",
              "bg-red-500/10 text-red-400": variant === "danger",
            }
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-gold/5 transition-transform group-hover:scale-110" />
    </div>
  );
}
