"use client";

import { useState } from "react";
import { signIn, resetPassword } from "@/lib/actions/auth";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [showReset, setShowReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await resetPassword(formData);
    if (result?.error) setError(result.error);
    if (result?.success) setSuccess(result.success);
    setLoading(false);
  }

  const backgroundLogo =
    "https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNmE4MDgwNDFhZWU4ODE5MWJjYWJjYzUxMmUwNjM1YmE6ZmlsZV8wMDAwMDAwMDlmN2M4MWY3ODJhMjA2YjQ2ZGZhMWJhNCIsImdpem1vX2lkIjpudWxsLCJ3aWQiOm51bGwsIm9pZCI6bnVsbCwic2lkIjpudWxsLCJjcyI6bnVsbCwiZm4iOm51bGwsImNkIjpudWxsLCJ0cyI6IjIwNjgwIiwicCI6InB5aSIsImNpZCI6IjEiLCJzaWciOiJlYmVkYTQyMTJkYzczODRlOWJlYjQwNjIyZjI2ZTYzOTQ1NjkwODUwODljNWY5MDUzM2EzYzk3ODg5NTQxN2M1IiwidiI6IjAiLCJjZG4iOm51bGwsImNwIjpudWxsLCJtYSI6bnVsbH0=";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.68)), url(${backgroundLogo})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          filter: "saturate(0.8) contrast(1.08)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(212,175,55,0.12),_rgba(0,0,0,0.4)_35%,_rgba(0,0,0,0.78)_100%)]" />

      <Card className="relative z-10 w-full max-w-md border border-zinc-700/80 bg-zinc-950/78 shadow-[0_30px_90px_rgba(0,0,0,0.78)] backdrop-blur-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <CardTitle className="text-2xl">
            {showReset ? "Mot de passe oublié" : "Connexion"}
          </CardTitle>
          <CardDescription>
            {showReset
              ? "Entrez votre email pour recevoir un lien de réinitialisation"
              : "Accédez à votre espace de gestion"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              {success}
            </div>
          )}

          {!showReset ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="votre@email.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="w-full text-center text-sm text-zinc-400 hover:text-gold"
              >
                Mot de passe oublié ?
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  placeholder="votre@email.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Envoi..." : "Envoyer le lien"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowReset(false);
                  setSuccess(null);
                }}
                className="w-full text-center text-sm text-zinc-400 hover:text-gold"
              >
                Retour à la connexion
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
