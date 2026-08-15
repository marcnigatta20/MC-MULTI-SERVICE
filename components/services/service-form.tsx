"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ServiceFormState = {
  name: string;
  description: string;
  price: string;
  duration: string;
};

type ServiceFormProps = {
  form: ServiceFormState;
  setForm: (form: ServiceFormState) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  label: string;
};

export function ServiceForm({ form, setForm, loading, onSubmit, label }: ServiceFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nom</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prix (HTG)</Label>
          <Input
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Durée (min, facultatif)</Label>
          <Input
            type="number"
            min="0"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {label}
      </Button>
    </form>
  );
}
