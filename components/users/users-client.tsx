"use client";
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, RefreshCw, Key } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ROLE_LABELS, Profile, UserRole } from '@/types';

type UserRow = Profile & { phone?: string | null };
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['ADMIN','CAISSIERE','BARBER','COMPTABLE']),
  phone: z.string().optional(),
});

async function apiGet(path: string) {
  const res = await fetch(path, { credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Erreur réseau');
  return data;
}

  async function apiPost(path: string, body?: unknown) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Erreur réseau');
  return data;
}

  async function apiPatch(path: string, body: unknown) {
  const res = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Erreur réseau');
  return data;
}

async function apiDelete(path: string) {
  const res = await fetch(path, { method: 'DELETE', credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Erreur réseau');
  return data;
}

export default function UsersClient({}: { currentUser?: Profile | null }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'CAISSIERE', phone: '' });
  const [error, setError] = useState<string | null>(null);
  // router not needed here

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await apiGet('/api/admin/users');
      setUsers(res.users || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Impossible de récupérer les utilisateurs.');
      toast.error(msg || 'Impossible de récupérer les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      CreateUserSchema.parse(form);
    } catch (zerr: unknown) {
      // zod error handling
      let msg = String(zerr);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof zerr === 'object' && zerr !== null && (zerr as any).errors) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          msg = (zerr as any).errors?.[0]?.message || msg;
        }
      } catch {
        /* ignore */
      }
      setError(msg || 'Données invalides.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost('/api/admin/users', form);
      if (res?.id) {
        setShowNew(false);
        setForm({ email: '', full_name: '', password: '', role: 'CAISSIERE', phone: '' });
        await fetchUsers();
      } else {
        setError(res?.error || 'Erreur inconnue.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Impossible de créer l&apos;utilisateur.');
      toast.error(msg || 'Impossible de créer l&apos;utilisateur.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      const payload = { full_name: editingUser.full_name, phone: editingUser.phone, role: editingUser.role, email: editingUser.email, is_active: editingUser.is_active } as Record<string, unknown>;
      const res = await apiPatch(`/api/admin/users/${editingUser.id}`, payload);
      if (res?.message) {
        setEditingUser(null);
        await fetchUsers();
      } else {
        setError(res?.error || 'Erreur inconnue.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Impossible de mettre à jour l&apos;utilisateur.');
      toast.error(msg || 'Impossible de mettre à jour l&apos;utilisateur.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Utilisateurs</h2>
        <button className="btn-primary" onClick={() => setShowNew(true)} disabled={loading}>+ Ajouter un utilisateur</button>
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      <div className="overflow-auto bg-zinc-950 rounded shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom complet</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell className="text-zinc-400">{u.email}</TableCell>
                <TableCell className="text-zinc-400">{u.phone || '—'}</TableCell>
                <TableCell>
                  <Badge variant={u.role === 'ADMIN' ? 'default' : u.role === 'BARBER' ? 'warning' : 'secondary'}>
                    {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.is_active ? 'success' : 'destructive'}>
                    {u.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell>{u.created_at ? new Date(u.created_at).toLocaleString('fr-FR') : '—'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setEditingUser(u)}>
                    <Edit className="h-4 w-4 mr-2" /> Modifier
                  </Button>
                  {u.is_active ? (
                    <Button variant="link" size="sm" onClick={async () => { if (confirm("Voulez-vous vraiment désactiver cet utilisateur ?")) { await apiDelete(`/api/admin/users/${u.id}`); await fetchUsers(); toast.success('Utilisateur désactivé'); }}}>
                      <Trash2 className="h-4 w-4 mr-2" /> Désactiver
                    </Button>
                  ) : (
                    <Button variant="link" size="sm" onClick={async () => { if (confirm("Voulez-vous réactiver cet utilisateur ?")) { await apiPost(`/api/admin/users/${u.id}?action=enable`); await fetchUsers(); toast.success('Utilisateur réactivé'); }}}>
                      <RefreshCw className="h-4 w-4 mr-2" /> Réactiver
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={async () => { if (confirm("Envoyer un email de réinitialisation du mot de passe ?")) { await apiPost(`/api/admin/users/${u.id}?action=reset-password`); toast.success('Email de réinitialisation demandé'); }}}>
                    <Key className="h-4 w-4 mr-2" /> Réinitialiser
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
            <DialogDescription>Créer un compte et définir son rôle.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-2">
              <label className="text-sm text-zinc-400">Nom complet</label>
              <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />

              <label className="text-sm text-zinc-400">Email</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

              <label className="text-sm text-zinc-400">Téléphone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

              <label className="text-sm text-zinc-400">Mot de passe temporaire</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

              <label className="text-sm text-zinc-400">Rôle</label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrateur</SelectItem>
                  <SelectItem value="CAISSIERE">Caissière</SelectItem>
                  <SelectItem value="BARBER">Barber</SelectItem>
                  <SelectItem value="COMPTABLE">Comptable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" variant="default">Créer</Button>
              <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Annuler</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
            <DialogDescription>Mettre à jour les informations et le rôle.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdate}>
              <div className="grid gap-2">
                <label className="text-sm text-zinc-400">Nom complet</label>
                <input className="input" value={editingUser.full_name} onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })} />

                <label className="text-sm text-zinc-400">Email</label>
                <input className="input" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} />

                <label className="text-sm text-zinc-400">Téléphone</label>
                <input className="input" value={editingUser.phone || ''} onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} />

                <label className="text-sm text-zinc-400">Rôle</label>
                <Select value={editingUser.role} onValueChange={(v) => setEditingUser({ ...editingUser, role: v as UserRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrateur</SelectItem>
                    <SelectItem value="CAISSIERE">Caissière</SelectItem>
                    <SelectItem value="BARBER">Barber</SelectItem>
                    <SelectItem value="COMPTABLE">Comptable</SelectItem>
                  </SelectContent>
                </Select>

                <label className="text-sm text-zinc-400">Actif</label>
                <Select value={editingUser.is_active ? 'true' : 'false'} onValueChange={(v) => setEditingUser({ ...editingUser, is_active: v === 'true' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Actif</SelectItem>
                    <SelectItem value="false">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" variant="default">Enregistrer</Button>
                <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Annuler</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

