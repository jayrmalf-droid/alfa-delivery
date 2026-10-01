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
