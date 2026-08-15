import { AppShell, requireAuth } from '@/lib/auth';
import UsersClient from '@/components/users/users-client';

export default async function UsersPage() {
  const profile = await requireAuth(['ADMIN']);

  return (
    <AppShell profile={profile} title="Utilisateurs" subtitle="Gérer les comptes utilisateur">
      {/* Client component handles fetching via API */}
      <UsersClient currentUser={profile} />
    </AppShell>
  );
}
