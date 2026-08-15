"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, UserCircle } from "lucide-react";
import { updateProfileAvatarAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types";

export function ProfilePhotoEditor({ profile }: { profile: Profile }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(profile.avatar_url ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (result) {
        setPreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!preview) {
      setError("Aucune photo sélectionnée.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateProfileAvatarAction(preview);
      window.location.reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Impossible de sauvegarder la photo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
          {preview ? (
            <img src={preview} alt="Photo de profil" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-500">
              <UserCircle className="h-10 w-10" />
            </div>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-gold shadow-lg transition hover:scale-105"
            aria-label="Choisir une photo"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            Choisir une photo
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="button" onClick={handleSave} disabled={isSaving || !preview} className="w-full">
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enregistrement...
          </>
        ) : (
          "Enregistrer la photo"
        )}
      </Button>
    </div>
  );
}
