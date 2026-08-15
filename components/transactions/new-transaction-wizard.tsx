"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { calculateCommissionBreakdown } from "@/utils/finance";
import { PAYMENT_METHOD_LABELS, type Barber, type Service, type Transaction } from "@/types";
import { createSaleAction } from "@/lib/actions/cashier";
import { ReceiptView } from "@/components/receipt/receipt-view";
import { Check, ChevronLeft, ChevronRight, Scissors, User, Wallet } from "lucide-react";

const STEPS = [
  { id: 1, label: "Barber", icon: User },
  { id: 2, label: "Service", icon: Scissors },
  { id: 3, label: "Remise", icon: Wallet },
  { id: 4, label: "Paiement", icon: Wallet },
];

interface NewTransactionWizardProps {
  profileId: string;
  cashRegisterId: string;
  barbers: Barber[];
  services: Service[];
}

export function NewTransactionWizard({
  profileId,
  cashRegisterId,
  barbers,
  services,
}: NewTransactionWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);

  const [barberId, setBarberId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"ESPECES" | "AUTRE_COMPTOIR">("ESPECES");

  const selectedBarber = barbers.find((b) => b.id === barberId);
  const selectedService = services.find((s) => s.id === serviceId);

  const breakdown = useMemo(() => {
    if (!selectedService || !selectedBarber) return null;
    return calculateCommissionBreakdown(
      Number(selectedService.price),
      Number(selectedBarber.commission_rate),
      parseFloat(discount) || 0
    );
  }, [selectedService, selectedBarber, discount]);

  const canSubmitTransaction =
    !loading && Boolean(selectedBarber) && Boolean(selectedService) && Boolean(breakdown);

  async function handleValidate() {
    if (!barberId || !serviceId || !breakdown) return;
    setLoading(true);
    try {
      const result = await createSaleAction({
        barberId,
        serviceId,
        cashierId: profileId,
        cashRegisterId,
        paymentMethod,
        discountAmount: breakdown.discountAmount,
      });
      setCompletedTransaction(result);
      toast.success("Transaction enregistrée avec succès.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'enregistrer la transaction.");
    }
    setLoading(false);
  }

  function resetWizard() {
    setStep(1);
    setBarberId("");
    setServiceId("");
    setDiscount("0");
    setPaymentMethod("ESPECES");
    setCompletedTransaction(null);
    router.refresh();
  }

  if (completedTransaction) {
    return (
      <div className="py-8">
        <ReceiptView transaction={completedTransaction} onClose={resetWizard} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg sm:max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        {STEPS.map((s) => (
          <div key={s.id} className="flex flex-1 flex-col items-center">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                step >= s.id
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-zinc-700 text-zinc-600"
              )}
            >
              {step > s.id ? <Check className="h-5 w-5" /> : <s.icon className="h-4 w-4" />}
            </div>
            <span className="mt-1 text-xs text-zinc-500">{s.label}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gold">Étape 1 — Choisir le barber</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {barbers.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBarberId(b.id);
                      setStep(2);
                    }}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all hover:border-gold/50",
                      barberId === b.id ? "border-gold bg-gold/5" : "border-zinc-800"
                    )}
                  >
                    <p className="font-medium">{b.full_name}</p>
                    <p className="text-sm text-zinc-500">Commission {b.commission_rate}%</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gold">Étape 2 — Choisir le service</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setServiceId(s.id);
                      setStep(3);
                    }}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all hover:border-gold/50",
                      serviceId === s.id ? "border-gold bg-gold/5" : "border-zinc-800"
                    )}
                  >
                    <p className="font-medium">{s.name}</p>
                    <p className="text-gold">{formatCurrency(s.price)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && breakdown && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gold">Étape 3 — Prix et remise</h3>
              <div className="rounded-xl bg-zinc-900 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Prix du service</span>
                  <span className="text-xl font-bold">{formatCurrency(breakdown.originalPrice)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Remise autorisée (HTG)</Label>
                <Input
                  type="number"
                  min="0"
                  max={breakdown.originalPrice}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 space-y-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total client</span>
                  <span className="text-gold">{formatCurrency(breakdown.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Commission barber ({breakdown.commissionRate}%)</span>
                  <span>{formatCurrency(breakdown.commissionAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Part MC</span>
                  <span>{formatCurrency(breakdown.shopAmount)}</span>
                </div>
              </div>
              <Button className="w-full h-12" onClick={() => setStep(4)}>
                Continuer <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 4 && breakdown && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gold">Étape 4 — Mode de paiement</h3>
              <div className="rounded-xl bg-zinc-900 p-4 text-center">
                <p className="text-3xl font-bold text-gold">{formatCurrency(breakdown.totalAmount)}</p>
                <p className="text-sm text-zinc-500">
                  {selectedBarber?.full_name} — {selectedService?.name}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["ESPECES", "AUTRE_COMPTOIR"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      "rounded-xl border p-4 transition-all",
                      paymentMethod === method
                        ? "border-gold bg-gold/10"
                        : "border-zinc-800 hover:border-zinc-600"
                    )}
                  >
                    <Badge variant={paymentMethod === method ? "default" : "outline"}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </Badge>
                  </button>
                ))}
              </div>
              <Button
                className="w-full h-12 text-lg"
                onClick={handleValidate}
                disabled={!canSubmitTransaction}
              >
                {loading ? "Enregistrement..." : "Valider la transaction"}
              </Button>
            </div>
          )}

          {step > 1 && step <= 4 && (
            <Button
              variant="ghost"
              className="mt-4 h-10"
              onClick={() => setStep((s) => s - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Retour
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
