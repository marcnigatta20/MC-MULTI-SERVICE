import { AppShell, requireAuth } from "@/lib/auth";
import UsersClient from "@/components/users/users-client";
import { getProfiles } from "@/services/barber.service";

export default async function UsersPage() {
  const profile = await requireAuth(["ADMIN"]);
  await getProfiles();

  return (
    <AppShell profile={profile} title="Utilisateurs" subtitle="Gestion des comptes et rôles">
      <UsersClient currentUser={profile} />
    </AppShell>
  );
}
