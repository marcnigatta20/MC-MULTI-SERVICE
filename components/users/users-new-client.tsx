"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const CreateUserSchema = z.object({
  email: z.string().email({ message: 'Email invalide.' }),
  full_name: z.string().min(1, { message: 'Le nom est requis.' }),
  password: z.string().min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' }),
  role: z.enum(['ADMIN','CAISSIERE','BARBER','COMPTABLE']),
  phone: z.string().optional(),
});

export default function UsersNewClient() {
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'CAISSIERE', phone: '' });
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      CreateUserSchema.parse(form);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || 'Données invalides.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur');
      toast.success('Utilisateur créé avec succès.');
      // Navigate using Next.js router
      try {
        router.push('/dashboard/users');
      } catch {
        // fallback
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/dashboard/users';
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || 'Impossible de créer l\'utilisateur.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <form onSubmit={handleSubmit} className="grid gap-3">
        <label className="text-sm text-zinc-400">Nom complet</label>
        <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />

        <label className="text-sm text-zinc-400">Email</label>
        <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

        <label className="text-sm text-zinc-400">Téléphone</label>
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

        <label className="text-sm text-zinc-400">Mot de passe temporaire</label>
        <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

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

        <div className="pt-4">
          <Button type="submit" variant="default" disabled={loading}>{loading ? 'Création…' : 'Créer l\'utilisateur'}</Button>
        </div>
      </form>
    </div>
  );
}
