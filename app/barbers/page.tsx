import { AppShell, requireAuth } from "@/lib/auth";
import { BarbersClient } from "@/components/barbers/barbers-client";
import { getBarbersWithStats, getProfiles } from "@/services/barber.service";
import type { Profile } from "@/types";

export default async function BarbersPage() {
  const profile = await requireAuth(["ADMIN"]);
  const [barbers, profiles] = await Promise.all([
    getBarbersWithStats(),
    getProfiles(),
  ]);

  return (
    <AppShell profile={profile} title="Barbiers" subtitle="Gestion et performances des barbiers">
      <BarbersClient barbers={barbers} profiles={profiles as Profile[]} />
    </AppShell>
  );
}
