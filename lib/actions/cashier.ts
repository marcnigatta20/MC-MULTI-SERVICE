"use server";

import { openCashRegister, closeCashRegister } from "@/services/cash.service";
import { createTransaction } from "@/services/transaction.service";
import { assertCashierOrAdmin } from "@/lib/permissions";
import { saleSchema, cashOpenSchema, cashCloseSchema } from "@/lib/validations";
import { parseOrThrow } from "@/lib/validate";
import type { PaymentMethod } from "@/types";

export async function openCashRegisterAction(cashierId: string, openingBalance: number) {
  const profile = await assertCashierOrAdmin();
  if (profile.id !== cashierId) throw new Error("Accès refusé.");
  const data = parseOrThrow(cashOpenSchema, { openingBalance });
  return openCashRegister(cashierId, data.openingBalance);
}

export async function closeCashRegisterAction(
  registerId: string,
  cashierId: string,
  closingBalance: number,
  differenceExplanation?: string,
  notes?: string
) {
  const profile = await assertCashierOrAdmin();
  if (profile.id !== cashierId && profile.role !== "ADMIN") {
    throw new Error("Accès refusé.");
  }
  const data = parseOrThrow(cashCloseSchema, {
    closingBalance,
    differenceExplanation,
    notes,
  });
  return closeCashRegister(
    registerId,
    cashierId,
    data.closingBalance,
    data.differenceExplanation,
    data.notes
  );
}

export async function createSaleAction(input: {
  barberId: string;
  serviceId: string;
  cashierId: string;
  cashRegisterId: string;
  paymentMethod: PaymentMethod;
  clientName?: string;
  notes?: string;
  discountAmount?: number;
}) {
  const profile = await assertCashierOrAdmin();
  if (profile.id !== input.cashierId) throw new Error("Accès refusé.");

  parseOrThrow(saleSchema, {
    barberId: input.barberId,
    serviceId: input.serviceId,
    paymentMethod: input.paymentMethod,
    discountAmount: input.discountAmount,
    clientName: input.clientName,
    notes: input.notes,
  });

  return createTransaction({
    barberId: input.barberId,
    serviceId: input.serviceId,
    cashierId: input.cashierId,
    cashRegisterId: input.cashRegisterId,
    paymentMethod: input.paymentMethod,
    clientName: input.clientName,
    notes: input.notes,
    discountAmount: input.discountAmount,
  });
}
