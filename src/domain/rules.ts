export function normalizePhone(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (/^55\d{10,11}$/.test(digits)) return digits;
  if (/^\d{10,11}$/.test(digits)) return `55${digits}`;
  throw new Error('Informe um telefone com DDD válido.');
}
export const cents = (value: number) => Math.round(Number(value) * 100);
export function productPrice(p: { price: number; promo_price?: number | null }): number {
  return p.promo_price && p.promo_price > 0 && p.promo_price < p.price ? p.promo_price : p.price;
}
export function localDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function storeClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bahia', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value || '';
  return { day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(part('weekday')), minutes: Number(part('hour')) * 60 + Number(part('minute')) };
}
export function openingStatus(settings: any, date = new Date()): { isOpen: boolean; message: string } {
  if (settings.is_paused) return { isOpen: false, message: settings.pause_message || 'Pedidos pausados' };
  if (typeof settings.is_open_override === 'boolean') return { isOpen: settings.is_open_override, message: settings.is_open_override ? 'Aberto agora' : 'Fechado agora' };
  const { day, minutes } = storeClock(date);
  const minute = (value: string) => { const [h,m] = value.split(':').map(Number); return h * 60 + m; };
  const schedule = settings.weekly_schedule || {};
  const current = schedule[String(day)]; const previous = schedule[String((day+6)%7)];
  if (previous?.isOpen && minute(previous.close) < minute(previous.open) && minutes < minute(previous.close)) return { isOpen: true, message: `Até ${previous.close}` };
  if (current?.isOpen) {
    const start = minute(current.open), end = minute(current.close);
    if (end > start ? minutes >= start && minutes < end : end < start && minutes >= start) return { isOpen: true, message: `Até ${current.close}` };
    return { isOpen: false, message: `Abre às ${current.open}` };
  }
  return { isOpen: false, message: 'Fechado hoje' };
}

export function calculateLoyaltyStatus(
  orders: any[],
  phone: string,
  settings: any
): {
  enabled: boolean;
  program_name: string;
  phone: string;
  stamps: number;
  goal: number;
  stamps_needed: number;
  has_reward: boolean;
  discount_percent: number;
  max_discount_value: number;
  min_order_value: number;
  expiration_days: number;
  is_expired: boolean;
  last_stamp_date: string | null;
  total_stamps_all_time: number;
  rewards_redeemed_count: number;
} {
  const enabled = settings?.loyalty_enabled !== false;
  const program_name = settings?.loyalty_program_name || 'Clube 10 Pedidos';
  const goal = Number(settings?.loyalty_stamps_goal) || 10;
  const minOrderVal = Number(settings?.loyalty_min_order_value ?? 45);
  const minOrderCents = cents(minOrderVal);
  const discountPercent = Number(settings?.loyalty_discount_percent) || 50;
  const maxDiscountVal = Number(settings?.loyalty_max_discount_value ?? 35);
  const expDays = Number(settings?.loyalty_expiration_days) || 90;

  let normalizedPhone = '';
  try {
    normalizedPhone = normalizePhone(phone);
  } catch {
    normalizedPhone = String(phone || '').replace(/\D/g, '');
  }

  const customerOrders = (Array.isArray(orders) ? orders : [])
    .filter(o => {
      if (!o || o.status === 'cancelled') return false;
      try {
        return normalizePhone(o.customer_phone) === normalizedPhone;
      } catch {
        return false;
      }
    })
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

  let stamps = 0;
  let totalStampsAllTime = 0;
  let rewardsRedeemedCount = 0;
  let lastStampDate: string | null = null;
  let isExpired = false;

  for (const order of customerOrders) {
    const orderDate = new Date(order.created_at || 0).getTime();

    // Se o pedido usou a recompensa da fidelidade, consome os selos acumulados
    if (order.used_loyalty_reward) {
      rewardsRedeemedCount++;
      stamps = Math.max(0, stamps - goal);
    }

    // Pedido gera selo se atingiu o valor mínimo configurado
    const orderSubtotalCents = cents(order.subtotal ?? order.total ?? 0);
    if (orderSubtotalCents >= minOrderCents) {
      // Verifica se houve expiração por inatividade entre o último selo e este pedido
      if (lastStampDate && expDays > 0) {
        const daysDiff = (orderDate - new Date(lastStampDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > expDays && stamps < goal) {
          stamps = 0;
        }
      }

      stamps++;
      totalStampsAllTime++;
      lastStampDate = order.created_at;
    }
  }

  // Verifica expiração por inatividade desde o último selo até a data atual
  if (lastStampDate && expDays > 0 && stamps > 0 && stamps < goal) {
    const daysSinceLast = (Date.now() - new Date(lastStampDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLast > expDays) {
      isExpired = true;
      stamps = 0;
    }
  }

  const hasReward = stamps >= goal;
  const stamps_needed = Math.max(0, goal - stamps);

  return {
    enabled,
    program_name,
    phone: normalizedPhone,
    stamps: Math.min(stamps, goal),
    goal,
    stamps_needed,
    has_reward: hasReward,
    discount_percent: discountPercent,
    max_discount_value: maxDiscountVal,
    min_order_value: minOrderVal,
    expiration_days: expDays,
    is_expired: isExpired,
    last_stamp_date: lastStampDate,
    total_stamps_all_time: totalStampsAllTime,
    rewards_redeemed_count: rewardsRedeemedCount
  };
}
