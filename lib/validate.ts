import { z } from "zod";

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(first?.message || "Données invalides.");
  }
  return result.data;
}
