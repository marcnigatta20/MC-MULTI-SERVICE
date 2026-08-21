"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Receipt, Settings } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { KPIChart } from "./kpi-chart";
import type { StoreSale } from "@/types";

interface DashboardClientProps {
  barberTransactions: Array<{
    id: string;
    receipt_number: string;
    amount: number;
    created_at: string;
    barber?: { full_name: string };
    service?: { name: string };
    status: string;
  }>;
  storeSales: StoreSale[];
  marginToday: number;
  hourlyData?: Array<{
    hour: string;
    revenue: number;
    sales: number;
  }>;
  totalRevenue?: number;
  totalSales?: number;
}

export function DashboardClient({
  barberTransactions,
  storeSales,
  marginToday,
  hourlyData = [],
  totalRevenue = 0,
  totalSales = 0,
}: DashboardClientProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showCustomize, setShowCustomize] = useState(false);

  // Combine barber transactions and store sales, sorted by date
  const allTickets = [
    ...barberTransactions.map((t) => ({
      type: "barber" as const,
      id: t.id,
      receipt_number: t.receipt_number,
      amount: t.amount,
      created_at: t.created_at,
      barber_name: t.barber?.full_name,
      service_name: t.service?.name,
      status: t.status,
    })),
    ...storeSales.map((s) => ({
      type: "store" as const,
      id: s.id,
      receipt_number: s.receipt_number,
      amount: Number(s.total_amount),
      created_at: s.created_at,
      barber_name: s.cashier?.full_name,
      service_name: "Vente boutique",
      status: s.status,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Filter by date if selected
  const filteredTickets = selectedDate
    ? allTickets.filter((t) => new Date(t.created_at).toLocaleDateString() === new Date(selectedDate).toLocaleDateString())
    : allTickets;

  return (
    <div className="space-y-6">
      {/* Real-time KPI Charts */}
      <KPIChart
        initialData={hourlyData}
        totalRevenue={totalRevenue}
        totalSales={totalSales}
      />

      {/* Margin Card */}
      <Card className="border-gold/20 bg-gradient-to-br from-zinc-900 to-zinc-950">
        <CardHeader>
          <CardTitle className="text-gold">Marge de vente aujourd'hui</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-gold">{formatCurrency(marginToday)}</div>
          <p className="mt-2 text-sm text-zinc-400">Bénéfice net de la boutique</p>
        </CardContent>
      </Card>

      {/* Type Selection Buttons */}
      <div className="flex justify-end">
        <Button
          variant="secondary"
          className="flex items-center gap-2"
          onClick={() => setShowCustomize(!showCustomize)}
        >
          <Settings className="h-4 w-4" />
          Personnaliser
        </Button>
      </div>

      {/* Date Filter */}
      {showCustomize && (
        <Card className="border-zinc-700">
          <CardHeader>
            <CardTitle>Filtrer par date</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-xs"
            />
            {selectedDate && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-3"
                onClick={() => setSelectedDate("")}
              >
                Réinitialiser
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tickets History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Historique des tickets
          </CardTitle>
          <Badge variant="secondary">{filteredTickets.length} ticket(s)</Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reçu</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Personnel</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-zinc-500">
                      Aucun ticket pour cette période
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((t) => (
                    <TableRow key={`${t.type}-${t.id}`}>
                      <TableCell className="font-mono text-gold">{t.receipt_number}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === "barber" ? "default" : "secondary"}>
                          {t.type === "barber" ? "Barber" : "Store"}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.barber_name || "—"}</TableCell>
                      <TableCell>{t.service_name || "—"}</TableCell>
                      <TableCell>{formatDate(t.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "VALIDEE" || t.status === "ACTIVE" ? "success" : "destructive"}>
                          {t.status === "VALIDEE" || t.status === "ACTIVE" ? "Validé" : "Annulé"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(t.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
