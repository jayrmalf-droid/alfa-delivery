export interface ReceivableSale {
  total?: number;
  paid_amount?: number;
  payment_status?: string;
  customer_phone?: string;
}

// Read-only balance: cancelled sales remain in history but create no debt.
export function saleBalance(sale: ReceivableSale): number {
  if (sale.payment_status === 'cancelled') return 0;
  return Math.max(0, Number(sale.total || 0) - Number(sale.paid_amount || 0));
}

export function receivableTotal(sales: readonly ReceivableSale[]): number {
  return sales.reduce((sum, sale) => sum + saleBalance(sale), 0);
}

export function customerDebt(sales: readonly ReceivableSale[], phone: string): number {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return 0;
  return receivableTotal(sales.filter(sale => String(sale.customer_phone || '').replace(/\D/g, '') === digits));
}
