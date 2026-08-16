'use server';

import { sendReceiptEmail } from '@/lib/mail';
import { createClient } from '@/lib/supabase/server';

export async function sendReceiptByEmail(receiptNumber: string, email: string, type: 'barber' | 'store' = 'barber') {
  try {
    const supabase = await createClient();

    if (type === 'barber') {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('receipt_number, amount, created_at, barber:barbers(full_name)')
        .eq('receipt_number', receiptNumber)
        .single();

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const customerName = (transaction.barber as unknown as { full_name: string } | null)?.full_name || 'Client';

      await sendReceiptEmail({
        to: email,
        receiptNumber: transaction.receipt_number,
        total: Number(transaction.amount),
        date: new Date(transaction.created_at),
        customerName,
        type: 'barber',
      });

      return { success: true, message: 'Reçu envoyé avec succès par email' };
    } else {
      const { data: sale } = await supabase
        .from('store_sales')
        .select('receipt_number, total_amount, created_at')
        .eq('receipt_number', receiptNumber)
        .single();

      if (!sale) {
        throw new Error('Sale not found');
      }

      await sendReceiptEmail({
        to: email,
        receiptNumber: sale.receipt_number,
        total: Number(sale.total_amount),
        date: new Date(sale.created_at),
        type: 'store',
      });

      return { success: true, message: 'Reçu envoyé avec succès par email' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi du reçu';
    return { success: false, message };
  }
}
