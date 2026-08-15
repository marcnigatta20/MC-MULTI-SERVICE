export function getBarberDisplayName(barber?: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
} | null): string {
  const directName = barber?.full_name?.trim();
  if (directName) return directName;

  const fallbackName = [barber?.first_name, barber?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fallbackName || "Barber";
}
