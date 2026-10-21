/** Parse a monetary entry without silently accepting malformed grouping. */
export function parseMoneyInput(input: string): number | null {
  const raw = input.trim().replace(/^R\$\s*/, '');
  let normalized: string;
  if (raw.includes(',')) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(raw)) return null;
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, '');
  } else {
    if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
    normalized = raw;
  }
  const value = Number(normalized);
  const cents = Math.round(value * 100);
  return Number.isFinite(value) && Number.isSafeInteger(cents) ? cents / 100 : null;
}

export function normalizeAdminSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export function safeCsvCell(value: unknown): string {
  const text = String(value ?? '').replace(/^([=+@\-\t\r])/, "'$1");
  return `"${text.replace(/"/g, '""')}"`;
}

/** Empty optional amounts keep the existing zero default; malformed text stays invalid. */
export function parseOptionalMoneyInput(input: string): number | null {
  return input.trim() ? parseMoneyInput(input) : 0;
}
/** Cash reconciliation can legitimately be negative. Other amounts use parseMoneyInput. */
export function parseSignedMoneyInput(input: string): number | null {
  const match=input.trim().match(/^(-)?\s*(?:R\$\s*)?(-)?\s*(\d[\d.,]*)$/);
  if(!match || (match[1]&&match[2]))return null;
  const value=parseMoneyInput(match[3]);
  return value===null?null:match[1]||match[2]?-value:value;
}

/** Match names without accents and telephone numbers regardless of formatting. */
export function matchesCustomerSearch(name: string, phone: string, query: string, id = ''): boolean {
  const term = normalizeAdminSearch(query);
  if (!term) return true;
  if (normalizeAdminSearch(`${name} ${phone} ${id}`).includes(term)) return true;
  const digits = term.replace(/\D/g, '');
  return /^[+()\d\s.-]+$/.test(term) && digits.length > 0 && phone.replace(/\D/g, '').includes(digits);
}

export type SalesViewFilter = 'all' | 'open' | 'overdue' | 'paid' | 'cancelled';
export function matchesSalesView(sale: {payment_status: string; due_date?: string; total: number; paid_amount: number}, filter: SalesViewFilter, today: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'paid' || filter === 'cancelled') return sale.payment_status === filter;
  const outstanding = sale.payment_status !== 'cancelled' && sale.payment_status !== 'paid' && sale.total > sale.paid_amount;
  return outstanding && (filter === 'open' || !!sale.due_date && sale.due_date.slice(0, 10) < today);
}

export function matchesOrderSearch(order: {order_number: number; customer_name?: string; customer_phone?: string; address?: string | null; neighborhood_name?: string | null}, query: string): boolean {
  const term = normalizeAdminSearch(query);
  if (!term) return true;
  if (matchesCustomerSearch(order.customer_name || '', order.customer_phone || '', query)) return true;
  if (normalizeAdminSearch(`${order.address || ''} ${order.neighborhood_name || ''}`).includes(term)) return true;
  const numberQuery = term.replace(/^#\s*/, '');
  return /^\d+$/.test(numberQuery) && String(order.order_number).includes(numberQuery);
}

export type ProductViewFilter = 'all' | 'active' | 'paused' | 'stockout';
export function matchesProductView(product: {is_archived?: boolean; available: boolean; has_stock_control?: boolean; stock_quantity: number}, filter: ProductViewFilter): boolean {
  if (product.is_archived) return false;
  if (filter === 'active') return product.available;
  if (filter === 'paused') return !product.available;
  if (filter === 'stockout') return !!product.has_stock_control && product.stock_quantity <= 0;
  return true;
}
