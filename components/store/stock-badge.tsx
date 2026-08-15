import { Badge } from "@/components/ui/badge";
import { getStockStatus, STOCK_STATUS_LABELS, type StockStatus } from "@/types";
import { cn } from "@/lib/utils";

const VARIANTS: Record<StockStatus, "success" | "warning" | "destructive"> = {
  EN_STOCK: "success",
  STOCK_FAIBLE: "warning",
  EPUISE: "destructive",
};

export function StockBadge({
  stock,
  minimum,
  className,
}: {
  stock: number;
  minimum: number;
  className?: string;
}) {
  const status = getStockStatus(stock, minimum);
  return (
    <Badge variant={VARIANTS[status]} className={cn(className)}>
      {STOCK_STATUS_LABELS[status]}
    </Badge>
  );
}
