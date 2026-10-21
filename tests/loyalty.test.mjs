import { test } from 'node:test';
import assert from 'node:assert/strict';

// Integration tests with HTTP server
import { before, after } from 'node:test';
import { spawn } from 'node:child_process';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alfa-loyalty-test-'));
const password = randomBytes(18).toString('hex'), salt = randomBytes(16).toString('hex');
let child, origin, cookie;

async function apiRequest(route, method = 'GET', payload, auth = false) {
  const response = await fetch(origin + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Cookie: cookie } : {}) },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  return { status: response.status, data: await response.json(), response };
}

before(async () => {
  child = spawn(process.execPath, ['server/index.mjs'], {
    env: {
      ...process.env,
      ALFA_DATABASE: path.join(temp, 'test.sqlite'),
      PORT: '0',
      ADMIN_EMAIL: 'admin@loyalty.test',
      ADMIN_PASSWORD_HASH: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  origin = await new Promise((resolve, reject) => {
    let text = '';
    child.stdout.on('data', chunk => {
      text += chunk;
      const match = text.match(/http:\/\/localhost:\d+/);
      if (match) resolve(match[0]);
    });
    child.on('exit', code => reject(Error(`Server exited: ${code}`)));
    setTimeout(() => reject(Error('Server timeout')), 10000).unref();
  });
  const login = await apiRequest('/api/login', 'POST', { email: 'admin@loyalty.test', password });
  cookie = login.response.headers.get('set-cookie').split(';')[0];
});

after(async () => {
  if (child) {
    child.kill();
    await new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.on('exit', () => resolve());
      setTimeout(resolve, 1000).unref();
    });
  }
  try {
    fs.rmSync(temp, { recursive: true, force: true });
  } catch {}
});

test('API GET /api/loyalty retorna status inicial correto do cliente', async () => {
  const res = await apiRequest('/api/loyalty?phone=77988880000');
  assert.equal(res.status, 200);
  assert.equal(res.data.enabled, true);
  assert.equal(res.data.stamps, 0);
  assert.equal(res.data.has_reward, false);
  assert.equal(res.data.goal, 100);
  assert.equal(res.data.points, 0);
  assert.equal(res.data.earn_per_real, 1);
  assert.equal(typeof res.data.min_order_value, 'number');
  assert.ok(res.data.min_order_value > 0);
  assert.equal(typeof res.data.max_discount_value, 'number');
  assert.ok(res.data.max_discount_value > 0);
});

test('API POST /api/quote recusa combinar recompensa com cupom de desconto', async () => {
  const boot = await apiRequest('/api/bootstrap');
  const prodId = boot.data.data.alfa_products[0]?.id;
  const quoteRes = await apiRequest('/api/quote', 'POST', {
    items: [{ product_id: prodId, quantity: 2, selections: [] }],
    customer_phone: '77988880000',
    delivery_type: 'pickup',
    coupon_code: 'DESCONTO10',
    apply_loyalty_reward: true
  });
  assert.equal(quoteRes.status, 400);
  assert.match(quoteRes.data.error, /não pode ser combinada com outro cupom/i);
});


test('API de pontos: ganho, resgate e cancelamentos preservam saldo e não duplicam lançamentos', async () => {
  let boot = (await apiRequest('/api/bootstrap', 'GET', undefined, true)).data;
  const settings = { ...boot.data.alfa_settings, is_open_override: true, is_paused: false,
    payment_cash: true, loyalty_enabled: true, loyalty_points_goal: 100, loyalty_points_per_real: 1,
    loyalty_min_order_value: 45, loyalty_discount_percent: 50, loyalty_max_discount_value: 35 };
  assert.equal((await apiRequest('/api/data/alfa_settings', 'PUT', { value: settings, version: boot.versions.alfa_settings }, true)).status, 200);
  const product = { ...boot.data.alfa_products[0], id: 'points-fixture', name: 'Teste de pontos',
    product_mode: 'normal', price: 60, promo_price: null, has_stock_control: false,
    available: true, is_archived: false, has_options: false };
  assert.equal((await apiRequest('/api/data/alfa_products', 'PUT', { value: [...boot.data.alfa_products, product], version: boot.versions.alfa_products }, true)).status, 200);
  const phone = '77988881111';
  const input = { customer_name: 'Cliente Pontos', customer_phone: phone, delivery_type: 'pickup',
    payment_method: 'cash', items: [{ product_id: product.id, quantity: 1, selections: [] }] };
  const balance = async () => (await apiRequest(`/api/loyalty?phone=${phone}`)).data;
  const create = async (extra = {}) => {
    const result = await apiRequest('/api/orders', 'POST', { ...input, total: 60, idempotency_key: randomUUID(), ...extra });
    assert.equal(result.status, 201, JSON.stringify(result.data)); return result.data;
  };
  const first = await create(); await create();
  assert.equal((await balance()).points, 120);
  const quote = await apiRequest('/api/quote', 'POST', { ...input, apply_loyalty_reward: true });
  assert.equal(quote.status, 200); assert.equal(quote.data.total, 30);
  const reward = await create({ total: 30, apply_loyalty_reward: true });
  assert.equal(reward.loyalty_points_redeemed, 100);
  assert.equal((await balance()).points, 80);
  const cancel = order => apiRequest(`/api/orders/${order.id}/status`, 'POST', { status: 'cancelled' }, true);
  assert.equal((await cancel(reward)).status, 200);
  assert.equal((await balance()).points, 120);
  assert.equal((await cancel(first)).status, 200);
  assert.equal((await balance()).points, 60);
  assert.equal((await cancel(first)).status, 200);
  assert.equal((await balance()).points, 60);
  boot = (await apiRequest('/api/bootstrap', 'GET', undefined, true)).data;
  const entries = boot.data.alfa_loyalty_points.filter(e => e.phone.endsWith(phone));
  assert.equal(entries.length, 7);
  assert.equal(new Set(entries.map(e => e.id)).size, 7);
});
