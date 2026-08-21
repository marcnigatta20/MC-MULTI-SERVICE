"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useRealtimeTable } from "@/lib/hooks/use-realtime-table";
import type { StoreSale } from "@/types";

interface StoreSalesListProps {
  sales: StoreSale[];
}

export function StoreSalesList({ sales }: StoreSalesListProps) {
  useRealtimeTable({
    source: ["store_sale", "store_sale_cancelled"],
    refreshOnChange: true,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des ventes</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-zinc-200">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="py-3 pr-4">Référence</th>
              <th className="py-3 pr-4">Date</th>
              <th className="py-3 pr-4">Total</th>
              <th className="py-3 pr-4">Paiement</th>
              <th className="py-3 pr-4">Statut</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-b border-zinc-800/80">
                <td className="py-3 pr-4 font-medium text-white">
                  {sale.receipt_number || sale.id.slice(0, 8)}
                </td>
                <td className="py-3 pr-4">{formatDateTime(sale.created_at)}</td>
                <td className="py-3 pr-4">{formatCurrency(Number(sale.total_amount))}</td>
                <td className="py-3 pr-4">{sale.payment_method}</td>
                <td className="py-3 pr-4">
                  <Badge variant={sale.status === "VALIDEE" ? "success" : "secondary"}>
                    {sale.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
