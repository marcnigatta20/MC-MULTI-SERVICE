import { requireAuth, AppShell } from '@/lib/auth';
import UsersNewClient from '@/components/users/users-new-client';

export default async function NewUserPage() {
  const profile = await requireAuth(['ADMIN']);

  return (
    <AppShell profile={profile} title="Nouvel utilisateur" subtitle="Créer un compte">
      <UsersNewClient />
    </AppShell>
  );
}
