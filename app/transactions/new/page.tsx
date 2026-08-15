import Link from "next/link";
import { AppShell, requireAuth } from "@/lib/auth";
import { NewTransactionWizard } from "@/components/transactions/new-transaction-wizard";
import { getOpenCashRegister } from "@/services/cash.service";
import { getBarbers, getServices } from "@/services/barber.service";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewTransactionPage() {
  const profile = await requireAuth(["ADMIN", "CAISSIERE"]);

  const openRegister = await getOpenCashRegister(profile.id);

  if (!openRegister) {
    return (
      <AppShell profile={profile} title="Nouvelle transaction">
        <Card className="mx-auto max-w-md text-center">
          <CardContent className="py-12">
            <Wallet className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
            <p className="mb-4 text-zinc-400">
              Vous devez ouvrir la caisse avant d&apos;enregistrer une vente.
            </p>
            <Link href="/cash">
              <Button>Ouvrir la caisse</Button>
            </Link>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const [barbers, services] = await Promise.all([getBarbers(), getServices()]);

  return (
    <AppShell
      profile={profile}
      title="Nouvelle transaction"
      subtitle="Enregistrement rapide au comptoir"
    >
      <NewTransactionWizard
        profileId={profile.id}
        cashRegisterId={openRegister.id}
        barbers={barbers}
        services={services}
      />
    </AppShell>
  );
}
