/**
 * Formules financières MC Barber
 * Les montants sont figés à la création de la transaction.
 * Exemple : prix 1 000 HTG, commission 40 % → barber 400 HTG, MC 600 HTG
 */

export interface CommissionBreakdown {
  originalPrice: number;
  discountAmount: number;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  shopAmount: number;
}

export function calculateCommissionBreakdown(
  originalPrice: number,
  commissionRate: number,
  discountAmount = 0
): CommissionBreakdown {
  const priceCents = Math.round(originalPrice * 100);
  const discountCents = Math.max(0, Math.min(Math.round(discountAmount * 100), priceCents));
  const totalCents = priceCents - discountCents;
  const commissionCents = Math.round(totalCents * commissionRate / 100);
  const shopCents = totalCents - commissionCents;

  return {
    originalPrice: priceCents / 100,
    discountAmount: discountCents / 100,
    totalAmount: totalCents / 100,
    commissionRate,
    commissionAmount: commissionCents / 100,
    shopAmount: shopCents / 100,
  };
}

export function calculateTheoreticalBalance(input: {
  openingBalance: number;
  cashSales: number;
  authorizedInflows?: number;
  expenses: number;
  authorizedOutflows?: number;
}): number {
  const {
    openingBalance,
    cashSales,
    authorizedInflows = 0,
    expenses,
    authorizedOutflows = 0,
  } = input;

  return (
    openingBalance +
    cashSales +
    authorizedInflows -
    expenses -
    authorizedOutflows
  );
}
