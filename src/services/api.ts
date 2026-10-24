import { CATALOG_KEYS, type ProductBundle } from '../domain/catalog';
export const cache: Record<string, any> = {};
const confirmed: Record<string, any> = {};
const versions: Record<string, number> = {};
const writeGenerations: Record<string, number> = {};
const trackingTokens: Record<string, string> = {};
let admin = false;
const customerOrders: Record<string, any> = {};
let writes: Promise<void> = Promise.resolve();
const callbacks = new Set<() => void>();
export const onApiChange = (fn: () => void) => { callbacks.add(fn); return () => { callbacks.delete(fn); }; };
const emit = () => callbacks.forEach(fn => fn());
export const apiState = () => ({ admin });
export function getApiBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host.endsWith('.web.app') || host.endsWith('.firebaseapp.com')) {
      return 'https://alfa-salgados.onrender.com';
    }
  }
  return '';
}
export async function request(path: string, options: RequestInit = {}) {
  const base = getApiBaseUrl();
  let token: string | null = null;
  try {
    token = typeof localStorage !== 'undefined' ? localStorage.getItem('alfa_admin_token') : null;
  } catch {}
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${base}/api${path}`, {
    ...options,
    credentials: 'include',
    headers
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível conectar com a loja. Tente novamente.');
  return data;
}
function apply(data: any) {
  admin = !!data.admin;
  if (!admin) { for (const key of ['alfa_coupons','alfa_customers','alfa_sales','alfa_customer_profiles','alfa_expenses','alfa_cash_closures','alfa_sales_goals']) cache[key]=[]; data.data.alfa_orders=Object.values(customerOrders).sort((a:any,b:any)=>b.order_number-a.order_number); }
  Object.assign(confirmed, structuredClone(data.data));
  Object.assign(cache, data.data); Object.assign(versions, data.versions); emit();
}
export async function refresh() { await writes; apply(await request('/bootstrap')); }
export async function initialize() {
 await refresh();
 try { const tokens=JSON.parse(localStorage.getItem('alfa_tracking')||'{}'); for(const id of Object.keys(tokens).slice(-5)) { const order=await trackedOrder(id).catch(()=>null); if(order)customerOrders[id]=order; } if(!admin){cache.alfa_orders=Object.values(customerOrders);emit();} } catch { /* local preferences are optional */ }
}
export async function login(email: string, password: string) {
  const res = await request('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  try {
    if (res?.token && typeof localStorage !== 'undefined') {
      localStorage.setItem('alfa_admin_token', res.token);
    }
  } catch {}
  await refresh();
}
export async function logout() {
  await writes;
  try {
    await request('/logout', { method: 'POST', body: '{}' });
  } finally {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('alfa_admin_token');
      }
    } catch {}
  }
  for (const key of ['alfa_orders','alfa_customers','alfa_coupons','alfa_sales','alfa_customer_profiles','alfa_expenses','alfa_cash_closures','alfa_sales_goals']) cache[key] = [];
  await refresh();
}
export function saveRemote(key: string, value: any): Promise<void> {
  if (!admin) throw new Error('Entre no painel para alterar os dados da loja.');
  const generation = writeGenerations[key] || 0;
  const snapshot = structuredClone(value); cache[key] = snapshot; emit();
  window.dispatchEvent(new CustomEvent('alfa-save', { detail: { status: 'saving' } }));
  const operation = writes.then(async () => {
    if (generation !== (writeGenerations[key] || 0)) {
      const error = new Error('Uma alteração anterior não foi salva. Confira os dados atualizados antes de tentar novamente.');
      window.dispatchEvent(new CustomEvent('alfa-save', { detail: { status: 'error', message: error.message } }));
      throw error;
    }
    try {
      const data = await request(`/data/${key}`, { method: 'PUT', body: JSON.stringify({ value: snapshot, version: versions[key] }) });
      versions[key] = data.version;
      confirmed[key] = structuredClone(snapshot);
      window.dispatchEvent(new CustomEvent('alfa-save', { detail: { status: 'saved' } }));
    } catch (error) {
      writeGenerations[key] = generation + 1;
      try { apply(await request('/bootstrap')); }
      catch { cache[key] = structuredClone(confirmed[key]); emit(); }
      window.dispatchEvent(new CustomEvent('alfa-save', { detail: { status: 'error', message: error instanceof Error ? error.message : 'Falha ao salvar.' } }));
      throw error;
    }
  });
  // Handle the queue separately so callers can await this specific write.
  writes = operation.catch(() => {});
  return operation;
}
export async function createRemoteOrder(payload: any, idempotencyKey: string) {
  const order = await request('/orders', { method: 'POST', body: JSON.stringify({ ...payload, idempotency_key: idempotencyKey }) });
  trackingTokens[order.id] = order.tracking_token;
  try { const tracked = JSON.parse(localStorage.getItem('alfa_tracking') || '{}'); tracked[order.id] = order.tracking_token; localStorage.setItem('alfa_tracking', JSON.stringify(tracked)); } catch { /* order already persisted; token still available in current response */ }
  customerOrders[order.id] = order;
  cache.alfa_orders = [order, ...(cache.alfa_orders || []).filter((o: any) => o.id !== order.id)]; emit(); return order;
}
export async function changeOrderStatus(id: string, status: string) {
  const order = await request(`/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
  await refresh(); return order;
}
export async function changeOrderPaymentStatus(id: string, payment_status: string, notes?: string) {
  const order = await request(`/orders/${id}/payment`, { method: 'POST', body: JSON.stringify({ payment_status, notes }) });
  await refresh(); return order;
}
export async function uploadImage(file: File): Promise<{ url: string; filename: string; size: number }> {
  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return request('/upload', { method: 'POST', body: JSON.stringify({ filename: file.name, data: dataUrl }) });
}
export async function trackedOrder(id: string) {
  let token = trackingTokens[id];
  if (!token) {
    try { token = JSON.parse(localStorage.getItem('alfa_tracking') || '{}')[id]; } catch { /* storage may be unavailable */ }
  }
  if (typeof token !== 'string' || !token) return null;
  const order = await request(`/orders/${id}?token=${encodeURIComponent(token)}`);
  customerOrders[id]=order; return order;
}
export async function quote(payload: any) { return request('/quote', { method: 'POST', body: JSON.stringify(payload) }); }
export async function fetchLoyaltyStatus(phone: string) { return request(`/loyalty?phone=${encodeURIComponent(phone)}`); }

export function catalogVersions() { return Object.fromEntries(CATALOG_KEYS.map(key=>[key,versions[key]])); }
export function saveProductBundle(bundle:ProductBundle, expectedVersions:Record<string,number>) : Promise<void> {
 const snapshot=structuredClone({...bundle,versions:expectedVersions});
 const operation=writes.then(async()=>{
  if(!admin)throw new Error('Entre no painel para salvar produtos.');
  window.dispatchEvent(new CustomEvent('alfa-save',{detail:{status:'saving'}}));
  try { apply(await request('/catalog/product',{method:'POST',body:JSON.stringify(snapshot)}));window.dispatchEvent(new CustomEvent('alfa-save',{detail:{status:'saved'}})); }
  catch(error){try{apply(await request('/bootstrap'));}catch{}window.dispatchEvent(new CustomEvent('alfa-save',{detail:{status:'error',message:error instanceof Error?error.message:'Falha ao salvar.'}}));throw error;}
 });
 writes=operation.catch(()=>{});return operation;
}
