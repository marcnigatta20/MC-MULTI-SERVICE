"use server";

import { cancelTransaction } from "@/services/transaction.service";
import {
  createBarber,
  updateBarber,
  createService,
  updateService,
  createBarberPayment,
  createExpense,
  updateProfileRole,
} from "@/services/barber.service";
import {
  assertAdmin,
  assertCanCancelTransaction,
  assertCanCreateExpense,
  assertCanRecordBarberPayment,
} from "@/lib/permissions";
import {
  barberSchema,
  barberPaymentSchema,
  cancelTransactionSchema,
  expenseSchema,
  serviceSchema,
} from "@/lib/validations";
import { parseOrThrow } from "@/lib/validate";
import type { ExpenseCategory, PaymentMethod } from "@/types";
import { z } from "zod";

export async function cancelTransactionAction(
  transactionId: string,
  userId: string,
  reason: string
) {
  await assertCanCancelTransaction(userId);
  const data = parseOrThrow(cancelTransactionSchema, { transactionId, reason });
  return cancelTransaction(data.transactionId, userId, data.reason);
}

export async function createBarberAction(input: {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  commissionRate: number;
  userId?: string;
}) {
  await assertAdmin();
  const data = parseOrThrow(barberSchema, {
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    email: input.email || "",
    commissionRate: input.commissionRate,
  });
  return createBarber({
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    email: data.email || undefined,
    commissionRate: data.commissionRate,
    userId: input.userId,
  });
}

export async function updateBarberAction(
  id: string,
  input: Partial<{
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    commission_rate: number;
    is_active: boolean;
    user_id: string | null;
  }>
) {
  await assertAdmin();
  if (input.commission_rate !== undefined) {
    parseOrThrow(z.number().min(0).max(100), input.commission_rate);
  }
  return updateBarber(id, input);
}

export async function createServiceAction(input: {
  name: string;
  description?: string;
  price: number;
  durationMinutes?: number;
}) {
  await assertAdmin();
  const data = parseOrThrow(serviceSchema, {
    name: input.name,
    description: input.description,
    price: input.price,
    durationMinutes: input.durationMinutes,
  });
  return createService(data);
}

export async function updateServiceAction(
  id: string,
  input: {
    name?: string;
    description?: string;
    price?: number;
    duration_minutes?: number;
    is_active?: boolean;
  }
) {
  await assertAdmin();
  if (input.price !== undefined) {
    parseOrThrow(z.number().positive(), input.price);
  }
  return updateService(id, input);
}

export async function createBarberPaymentAction(input: {
  barberId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidBy: string;
  notes?: string;
  allowOverpayment?: boolean;
}) {
  await assertCanRecordBarberPayment();
  const data = parseOrThrow(barberPaymentSchema, {
    barberId: input.barberId,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    allowOverpayment: input.allowOverpayment,
  });
  return createBarberPayment({
    ...data,
    paidBy: input.paidBy,
    allowOverpayment: data.allowOverpayment,
  });
}

export async function createExpenseAction(input: {
  category: ExpenseCategory;
  amount: number;
  description: string;
  recordedBy: string;
  cashRegisterId?: string;
  receiptUrl?: string;
}) {
  await assertCanCreateExpense(input.recordedBy);
  const data = parseOrThrow(expenseSchema, {
    category: input.category,
    amount: input.amount,
    description: input.description,
    receiptUrl: input.receiptUrl || "",
  });
  return createExpense({
    category: data.category,
    amount: data.amount,
    description: data.description,
    recordedBy: input.recordedBy,
    cashRegisterId: input.cashRegisterId,
    receiptUrl: data.receiptUrl || undefined,
  });
}

export async function updateUserRoleAction(id: string, role: string, isActive: boolean) {
  await assertAdmin();
  parseOrThrow(
    z.object({
      id: z.string().uuid(),
      role: z.enum(["ADMIN", "CAISSIERE", "BARBER", "COMPTABLE"]),
      isActive: z.boolean(),
    }),
    { id, role, isActive }
  );
  return updateProfileRole(id, role, isActive);
}
