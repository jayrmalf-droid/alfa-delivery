import { normalizePhone, cents } from './rules.mjs';
export function pointsConfig(settings = {}) {
  return { enabled: settings.loyalty_enabled !== false, program_name: settings.loyalty_program_name || 'Clube de Pontos', goal: Number(settings.loyalty_points_goal ?? 100), min_order_value: Number(settings.loyalty_min_order_value ?? 45), discount_percent: Number(settings.loyalty_discount_percent ?? 50), max_discount_value: Number(settings.loyalty_max_discount_value ?? 35), earn_per_real: Number(settings.loyalty_points_per_real ?? 1) };
}
export function statusFor(entries, phone, settings) {
  const c = pointsConfig(settings); const normalized = normalizePhone(phone);
  const history = entries.filter(e => e.phone === normalized).sort((a,b)=>a.created_at.localeCompare(b.created_at));
  const points = history.reduce((sum,e)=>sum+e.points,0);
  return { ...c, phone:normalized, points, stamps:points, goal:c.goal, stamps_needed:Math.max(0,c.goal-points), has_reward:c.enabled && points>=c.goal, total_stamps_all_time:history.filter(e=>e.points>0).reduce((sum,e)=>sum+e.points,0), rewards_redeemed_count:history.filter(e=>e.type==='redeem').length, expiration_days:0, is_expired:false, last_stamp_date:history.filter(e=>e.type==='earn').at(-1)?.created_at || null, history:history.slice(-100).reverse() };
}
export function awardPoints(order, settings) {
  const c=pointsConfig(settings);
  if (!c.enabled || cents(order.subtotal)<cents(c.min_order_value)) return 0;
  return Math.max(0,Math.floor(Number(order.subtotal)*c.earn_per_real));
}
export function appendEntry(entries, order, type, points) {
  const id=`${order.id}:${type}`;
  if (!points || entries.some(e=>e.id===id)) return false;
  entries.push({id, order_id:order.id, order_number:order.order_number, phone:normalizePhone(order.customer_phone), type, points, created_at:new Date().toISOString()});
  return true;
}
