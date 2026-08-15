export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && anonKey && url.startsWith("http"));
}

export function getSupabaseConfigError(): string | null {
  if (isSupabaseConfigured()) return null;
  return "Supabase n'est pas configuré. Copiez .env.example vers .env.local et renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.";
}
