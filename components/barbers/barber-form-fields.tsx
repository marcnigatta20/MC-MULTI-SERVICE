"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Profile } from "@/types";

export type BarberFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  commissionRate: string;
  userId: string;
};

type BarberFormFieldsProps = {
  form: BarberFormState;
  setForm: (form: BarberFormState) => void;
  profiles: Profile[];
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
};

export function BarberFormFields({
  form,
  setForm,
  profiles,
  loading,
  onSubmit,
  submitLabel,
}: BarberFormFieldsProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prénom</Label>
          <Input
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Nom</Label>
          <Input
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Téléphone</Label>
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Commission (%)</Label>
        <Input
          type="number"
          min="0"
          max="100"
          value={form.commissionRate}
          onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Utilisateur associé</Label>
        <Select
          value={form.userId || "none"}
          onValueChange={(v) => setForm({ ...form, userId: v === "none" ? "" : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Aucun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            {profiles
              .filter((p) => p.role === "BARBER" || p.role === "CAISSIERE")
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name} ({p.email})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
