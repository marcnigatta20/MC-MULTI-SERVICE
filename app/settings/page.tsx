import { AppShell, requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfilePhotoEditor } from "@/components/profile/profile-photo-editor";
import { ClockSettings } from "@/components/settings/clock-settings";

export default async function SettingsPage() {
  const profile = await requireAuth(["ADMIN"]);

  return (
    <AppShell profile={profile} title="Paramètres" subtitle="Configuration de la plateforme">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations du shop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-zinc-400">Nom</span>
              <span>MC Barber Management</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Devise</span>
              <Badge>HTG</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Commission par défaut</span>
              <span>40%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photo de profil</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfilePhotoEditor profile={profile} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modes de paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-zinc-400 mb-4">
              Paiements enregistrés au comptoir uniquement — aucun transfert électronique.
            </p>
            <Badge variant="default" className="mr-2">Espèces</Badge>
            <Badge variant="secondary">Autre paiement comptoir</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sécurité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-400">
            <p>• Authentification via Supabase Auth</p>
            <p>• Row Level Security (RLS) activé</p>
            <p>• Journal d&apos;audit des opérations</p>
            <p>• Contrôle d&apos;accès par rôle</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rôles disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge>Administrateur</Badge>
              <Badge>Caissière</Badge>
              <Badge>Barber</Badge>
              <Badge>Comptable</Badge>
            </div>
          </CardContent>
        </Card>

        <ClockSettings />
      </div>
    </AppShell>
  );
}
