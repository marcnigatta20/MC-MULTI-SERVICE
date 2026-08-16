"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/dashboard/stat-card";
import { Wallet, Receipt, TrendingDown, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useRealtimeTable } from "@/lib/hooks/use-realtime-table";
import { PAYMENT_METHOD_LABELS, type Barber, type Service, type CashRegister } from "@/types";
import {
  openCashRegisterAction,
  closeCashRegisterAction,
  createSaleAction,
} from "@/lib/actions/cashier";

interface CashierClientProps {
  profileId: string;
  openRegister: CashRegister | null;
  barbers: Barber[];
  services: Service[];
  summary: {
    totalSales: number;
    cashSales: number;
    otherSales: number;
    transactionCount: number;
    totalExpenses: number;
  } | null;
  todayTransactions: {
    id: string;
    receipt_number: string;
    amount: number;
    created_at: string;
    barber?: { full_name: string };
    service?: { name: string };
    payment_method: string;
  }[];
}

export function CashierClient({
  profileId,
  openRegister,
  barbers,
  services,
  summary,
  todayTransactions,
}: CashierClientProps) {
  const router = useRouter();
  useRealtimeTable({
    source: ["transaction", "transaction_cancelled"],
    refreshOnChange: true,
  });
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [loading, setLoading] = useState(false);

  const [barberId, setBarberId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"ESPECES" | "AUTRE_COMPTOIR">("ESPECES");
  const [clientName, setClientName] = useState("");

  const selectedService = services.find((s) => s.id === serviceId);
  const canSubmitSale = !loading && Boolean(openRegister) && Boolean(barberId) && Boolean(serviceId);

  async function handleOpenCash() {
    setLoading(true);
    try {
      await openCashRegisterAction(profileId, parseFloat(openingBalance) || 0);
      toast.success("Caisse ouverte avec succès");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  async function handleCloseCash() {
    if (!openRegister) return;
    setLoading(true);
    try {
      await closeCashRegisterAction(
        openRegister.id,
        profileId,
        parseFloat(closingBalance) || 0
      );
      toast.success("Caisse fermée avec succès");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  async function handleSale(e: React.FormEvent) {
    e.preventDefault();
    if (!openRegister) {
      toast.error("Veuillez ouvrir la caisse d'abord");
      return;
    }
    setLoading(true);
    try {
      const result = await createSaleAction({
        barberId,
        serviceId,
        cashierId: profileId,
        cashRegisterId: openRegister.id,
        paymentMethod,
        clientName: clientName || undefined,
      });
      toast.success(`Vente enregistrée — ${result.receipt_number}`);
      setClientName("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  if (!openRegister) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Ouvrir la caisse
          </CardTitle>
          <CardDescription>Fonds initial (optionnel)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Fonds initial (HTG)</Label>
            <Input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
          <Button onClick={handleOpenCash} disabled={loading} className="w-full">
            {loading ? "Ouverture..." : "Ouvrir la caisse"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Ventes du jour" value={summary?.totalSales || 0} icon={DollarSign} variant="gold" />
        <StatCard title="Espèces" value={summary?.cashSales || 0} icon={Wallet} />
        <StatCard title="Autre comptoir" value={summary?.otherSales || 0} icon={Receipt} />
        <StatCard title="Dépenses" value={summary?.totalExpenses || 0} icon={TrendingDown} variant="warning" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="border-zinc-800 bg-zinc-950/80">
          <CardHeader>
            <CardTitle className="text-xl text-gold">Nouvelle vente</CardTitle>
            <CardDescription>Enregistrer un paiement au comptoir</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSale} className="space-y-5">
              <div className="space-y-2">
                <Label>Barber</Label>
                <Select value={barberId} onValueChange={setBarberId} required>
                  <SelectTrigger className="h-11 border-zinc-700 bg-zinc-900">
                    <SelectValue placeholder="Sélectionner un barber" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.full_name} ({b.commission_rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={serviceId} onValueChange={setServiceId} required>
                  <SelectTrigger className="h-11 border-zinc-700 bg-zinc-900">
                    <SelectValue placeholder="Sélectionner un service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {formatCurrency(s.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as "ESPECES" | "AUTRE_COMPTOIR")}
                >
                  <SelectTrigger className="h-11 border-zinc-700 bg-zinc-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nom du client (optionnel)</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client comptoir"
                  className="border-zinc-700 bg-zinc-900"
                />
              </div>

              {selectedService && (
                <div className="rounded-2xl border border-gold/30 bg-linear-to-r from-gold/10 to-emerald-500/5 p-5 text-center shadow-inner shadow-gold/10">
                  <p className="text-sm text-zinc-400">Montant à enregistrer</p>
                  <p className="mt-2 text-3xl font-bold text-gold">
                    {formatCurrency(selectedService.price)}
                  </p>
                </div>
              )}

              <Button type="submit" disabled={!canSubmitSale} className="h-11 w-full text-base">
                {loading ? "Enregistrement..." : "Enregistrer le paiement"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950/80">
          <CardHeader>
            <CardTitle className="text-xl">Fermer la caisse</CardTitle>
            <CardDescription>
              Caisse ouverte depuis{" "}
              {new Date(openRegister.opened_at).toLocaleTimeString("fr-FR")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl bg-zinc-900 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Fond de caisse</span>
                <span>{formatCurrency(openRegister.opening_balance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Ventes espèces</span>
                <span>{formatCurrency(summary?.cashSales || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Dépenses</span>
                <span>-{formatCurrency(summary?.totalExpenses || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-700 pt-3 font-medium">
                <span>Solde attendu</span>
                <span className="text-gold">
                  {formatCurrency(
                    openRegister.opening_balance +
                      (summary?.cashSales || 0) -
                      (summary?.totalExpenses || 0)
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Montant compté en caisse (HTG)</Label>
              <Input
                type="number"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                placeholder="Montant physique compté"
                className="border-zinc-700 bg-zinc-900"
              />
            </div>

            <Button
              variant="outline"
              onClick={handleCloseCash}
              disabled={loading || !closingBalance}
              className="h-11 w-full"
            >
              {loading ? "Fermeture..." : "Fermer la caisse"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader>
          <CardTitle>Transactions du jour ({todayTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {todayTransactions.length === 0 ? (
            <p className="py-8 text-center text-zinc-500">Aucune transaction aujourd&apos;hui</p>
          ) : (
            <div className="space-y-2">
              {todayTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
                >
                  <div>
                    <p className="font-mono text-sm text-gold">{t.receipt_number}</p>
                    <p className="text-sm text-zinc-400">
                      {t.barber?.full_name} — {t.service?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(t.amount)}</p>
                    <p className="text-xs text-zinc-500">
                      {PAYMENT_METHOD_LABELS[t.payment_method as keyof typeof PAYMENT_METHOD_LABELS]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
