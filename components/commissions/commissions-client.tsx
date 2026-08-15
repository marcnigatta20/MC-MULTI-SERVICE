"use client";

import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/loading";
import { Percent } from "lucide-react";

interface CommissionRow {
  barber_id: string;
  full_name: string;
  commission_rate: number;
  period_revenue: number;
  period_commission: number;
  total_commissions: number;
  total_paid: number;
  balance_due: number;
}

export function CommissionsClient({
  commissions,
  periodLabel,
}: {
  commissions: CommissionRow[];
  periodLabel: string;
}) {
  if (commissions.length === 0) {
    return (
      <EmptyState
        title="Aucune commission"
        description="Aucun barber actif ou aucune transaction sur cette période."
        icon={Percent}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">Période : {periodLabel}</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {commissions.map((c) => (
          <Card key={c.barber_id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {c.full_name}
                <Badge>{c.commission_rate}%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">CA (période)</span>
                <span className="font-medium">{formatCurrency(c.period_revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Commission (période)</span>
                <span className="text-gold">{formatCurrency(c.period_commission)}</span>
              </div>
              <div className="border-t border-zinc-800 pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Commission totale</span>
                  <span>{formatCurrency(c.total_commissions)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Déjà payé</span>
                  <span className="text-emerald-400">{formatCurrency(c.total_paid)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Reste</span>
                  <Badge variant={c.balance_due > 0 ? "warning" : "success"}>
                    {formatCurrency(c.balance_due)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
