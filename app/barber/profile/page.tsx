import { AppShell, requireAuth } from "@/lib/auth";
import { getBarberByUserId } from "@/services/barber.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ProfilePhotoEditor } from "@/components/profile/profile-photo-editor";

export default async function BarberProfilePage() {
  const profile = await requireAuth(["BARBER"]);
  const barber = await getBarberByUserId(profile.id);

  return (
    <AppShell profile={profile} title="Mon profil">
      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="h-14 w-14 rounded-full object-cover border border-zinc-700" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 text-xl font-semibold">
                  {profile.full_name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <CardTitle>{barber?.full_name || profile.full_name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-zinc-400">Email</span><span>{barber?.email || profile.email}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Téléphone</span><span>{barber?.phone || "—"}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Commission</span><Badge>{barber?.commission_rate || 0}%</Badge></div>
            {barber?.created_at && (
              <div className="flex justify-between"><span className="text-zinc-400">Membre depuis</span><span>{formatDate(barber.created_at)}</span></div>
            )}
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
      </div>
    </AppShell>
  );
}
