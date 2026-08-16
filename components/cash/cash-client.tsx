"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/dashboard/stat-card";
import { Wallet, Receipt, TrendingDown, DollarSign, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { calculateTheoreticalBalance } from "@/utils/finance";
import type { CashRegister } from "@/types";
import {
  openCashRegisterAction,
  closeCashRegisterAction,
  increaseCashRegisterAction,
} from "@/lib/actions/cashier";
import type { UserRole } from "@/types";

interface CashClientProps {
  profileId: string;
  profileRole: UserRole;
  openRegister: CashRegister | null;
  summary: {
    totalSales: number;
    cashSales: number;
    otherSales: number;
    transactionCount: number;
    totalExpenses: number;
    authorizedInflows: number;
    authorizedOutflows: number;
  } | null;
}

export function CashClient({ profileId, profileRole, openRegister, summary }: CashClientProps) {
  const router = useRouter();
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [differenceExplanation, setDifferenceExplanation] = useState("");
  const [cashTopUpAmount, setCashTopUpAmount] = useState("");
  const [cashTopUpReason, setCashTopUpReason] = useState("");
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const theoreticalBalance =
    openRegister && summary
      ? calculateTheoreticalBalance({
          openingBalance: openRegister.opening_balance,
          cashSales: summary.cashSales,
          authorizedInflows: summary.authorizedInflows,
          expenses: summary.totalExpenses,
          authorizedOutflows: summary.authorizedOutflows,
        })
      : 0;

  const physicalBalance = parseFloat(closingBalance) || 0;
  const difference =
    closingBalance !== "" ? physicalBalance - theoreticalBalance : null;

  async function handleOpenCash() {
    setLoading(true);
    try {
      await openCashRegisterAction(profileId, parseFloat(openingBalance) || 0);
      toast.success("Caisse ouverte");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  async function handleCloseCash() {
    if (!openRegister) return;
    if (difference !== null && difference !== 0 && !differenceExplanation.trim()) {
      toast.error("Veuillez expliquer la différence de caisse.");
      return;
    }
    setLoading(true);
    try {
      await closeCashRegisterAction(
        openRegister.id,
        profileId,
        physicalBalance,
        differenceExplanation || undefined
      );
      toast.success("Caisse fermée");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  async function handleIncreaseCashBalance() {
    if (!openRegister) return;
    const amount = Number(cashTopUpAmount);
    if (!amount || amount <= 0) {
      toast.error("Veuillez saisir un montant valide.");
      return;
    }

    setLoading(true);
    try {
      await increaseCashRegisterAction(
        openRegister.id,
        profileId,
        amount,
        cashTopUpReason || "Ajout manuel de fonds"
      );
      toast.success("Fond de caisse ajouté");
      setCashTopUpAmount("");
      setCashTopUpReason("");
      setIsTopUpOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  if (!openRegister) {
    return (
      <div className="mx-auto w-full max-w-lg">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Ouverture de caisse
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
            <p className="text-xs text-zinc-500">Exemple : 5 000 HTG (optionnel)</p>
          </div>
          <Button onClick={handleOpenCash} disabled={loading} className="w-full">
            {loading ? "Ouverture..." : "Ouvrir la caisse"}
          </Button>
        </CardContent>
      </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">
            Caisse ouverte depuis{" "}
            {new Date(openRegister.opened_at).toLocaleTimeString("fr-FR")}
          </p>
        </div>
        <Link href="/transactions/new">
          <Button size="lg">
            <Plus className="h-4 w-4" /> Nouvelle transaction
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Fonds initial" value={openRegister.opening_balance} icon={Wallet} />
        <StatCard title="Ventes espèces" value={summary?.cashSales || 0} icon={DollarSign} variant="gold" />
        <StatCard title="Ventes total" value={summary?.totalSales || 0} icon={Receipt} />
        <StatCard title="Dépenses" value={summary?.totalExpenses || 0} icon={TrendingDown} variant="warning" />
      </div>

      {profileRole === "ADMIN" && (
        <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-fit px-3 py-1 text-sm flex items-center gap-2 border border-amber-400 text-amber-400 hover:bg-amber-500/10"
              title="Ajouter des fonds (admin)"
            >
              <DollarSign className="h-4 w-4" />
              Ajouter des fonds
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-amber-500/10 p-2">
                  <DollarSign className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <DialogTitle>Augmenter la caisse</DialogTitle>
                  <DialogDescription>
                    Ajoutez un montant au fond de caisse sans fermer la caisse de la journée.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Montant à ajouter (HTG)</Label>
                <Input
                  type="number"
                  min="1"
                  value={cashTopUpAmount}
                  onChange={(e) => setCashTopUpAmount(e.target.value)}
                  placeholder="2500"
                />
              </div>

              <div className="space-y-2">
                <Label>Motif</Label>
                <Input
                  value={cashTopUpReason}
                  onChange={(e) => setCashTopUpReason(e.target.value)}
                  placeholder="Dépôt / fonds supplémentaires"
                />
              </div>

              <p className="text-xs text-zinc-500">L'opération est enregistrée dans l'historique d'audit.</p>
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsTopUpOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleIncreaseCashBalance}
                disabled={loading || !cashTopUpAmount}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {loading ? "Validation..." : (
                  <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Confirmer</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Solde théorique</CardTitle>
            <CardDescription>
              Fonds initial + Ventes espèces + Entrées − Dépenses − Sorties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Fonds initial</span>
                <span>{formatCurrency(openRegister.opening_balance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">+ Ventes espèces</span>
                <span className="text-emerald-400">+{formatCurrency(summary?.cashSales || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">+ Entrées autorisées</span>
                <span>+{formatCurrency(summary?.authorizedInflows || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">− Dépenses</span>
                <span className="text-red-400">−{formatCurrency(summary?.totalExpenses || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">− Sorties autorisées</span>
                <span>−{formatCurrency(summary?.authorizedOutflows || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-700 pt-3 text-lg font-bold">
                <span>= Solde théorique</span>
                <span className="text-gold">{formatCurrency(theoreticalBalance)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fermeture de caisse</CardTitle>
            <CardDescription>Saisissez le montant réellement présent en caisse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Solde physique compté (HTG)</Label>
              <Input
                type="number"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                placeholder="36500"
              />
            </div>

            {difference !== null && (
              <div
                className={`rounded-lg p-4 ${
                  difference === 0
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-amber-500/10 border border-amber-500/20"
                }`}
              >
                <div className="flex justify-between text-sm">
                  <span>Solde théorique</span>
                  <span>{formatCurrency(theoreticalBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Solde physique</span>
                  <span>{formatCurrency(physicalBalance)}</span>
                </div>
                <div className="mt-2 flex justify-between font-bold">
                  <span>Différence</span>
                  <span className={difference < 0 ? "text-red-400" : difference > 0 ? "text-emerald-400" : ""}>
                    {difference > 0 ? "+" : ""}
                    {formatCurrency(difference)}
                  </span>
                </div>
              </div>
            )}

            {difference !== null && difference !== 0 && (
              <div className="space-y-2">
                <Label>Explication de la différence *</Label>
                <Textarea
                  value={differenceExplanation}
                  onChange={(e) => setDifferenceExplanation(e.target.value)}
                  placeholder="Décrivez la raison de l'écart..."
                  required
                />
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleCloseCash}
              disabled={loading || !closingBalance}
              className="w-full"
            >
              {loading ? "Fermeture..." : "Fermer la caisse"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
