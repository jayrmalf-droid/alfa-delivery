import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alfa-prod-test-'));
const password = randomBytes(18).toString('hex'), salt = randomBytes(16).toString('hex');
let child, origin, adminCookie, sessionCookie, snapshot;

async function request(route, method = 'GET', payload, headers = {}) {
  const response = await fetch(origin + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data, response };
}

before(async () => {
  child = spawn(process.execPath, ['server/index.mjs'], {
    env: {
      ...process.env,
      ALFA_DATABASE: path.join(temp, 'test.sqlite'),
      PORT: '0',
      ADMIN_EMAIL: 'admin@alfasalgados.test',
      ADMIN_PASSWORD_HASH: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stderr.on('data', chunk => process.stderr.write(chunk));
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

  const loginRes = await request('/api/login', 'POST', { email: 'admin@alfasalgados.test', password });
  assert.equal(loginRes.status, 200);

  const rawSetCookie = loginRes.response.headers.get('set-cookie') || '';
  const alfaCookieMatch = rawSetCookie.match(/alfa_session=([^;]+)/);
  const sessionCookieMatch = rawSetCookie.match(/__session=([^;]+)/);

  assert.ok(alfaCookieMatch, 'alfa_session cookie should be set');
  assert.ok(sessionCookieMatch, '__session cookie should be set for Firebase Hosting');

  adminCookie = `alfa_session=${alfaCookieMatch[1]}`;
  sessionCookie = `__session=${sessionCookieMatch[1]}`;

  snapshot = (await request('/api/bootstrap', 'GET', undefined, { Cookie: adminCookie })).data;
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
  for (let i = 0; i < 5; i++) {
    try {
      fs.rmSync(temp, { recursive: true, force: true });
      break;
    } catch {
      await new Promise(r => setTimeout(r, 100));
    }
  }
});

test('health check responde 200 com status do banco e uptime', async () => {
  const res = await request('/health');
  assert.equal(res.status, 200);
  assert.equal(res.data.status, 'ok');
  assert.equal(res.data.database, 'sqlite');
  assert.ok(Number.isInteger(res.data.uptime));

  const apiRes = await request('/api/health');
  assert.equal(apiRes.status, 200);
  assert.equal(apiRes.data.status, 'ok');
});

test('sessão via __session (Firebase Hosting) autoriza requisições administrativas', async () => {
  const bootstrapRes = await request('/api/bootstrap', 'GET', undefined, { Cookie: sessionCookie });
  assert.equal(bootstrapRes.status, 200);
  assert.equal(bootstrapRes.data.admin, true);
});

test('categoria em uso por produtos não pode ser excluída', async () => {
  const currentCategories = snapshot.data.alfa_categories;
  const currentProducts = snapshot.data.alfa_products;
  assert.ok(currentCategories.length > 0);
  assert.ok(currentProducts.length > 0);

  const usedCatId = currentProducts[0].category_id;
  // Tentar remover a categoria usada pelo primeiro produto
  const updatedCategories = currentCategories.filter(c => c.id !== usedCatId);

  const res = await request('/api/data/alfa_categories', 'PUT', {
    value: updatedCategories,
    version: snapshot.versions.alfa_categories
  }, { Cookie: adminCookie });

  assert.equal(res.status, 400);
  assert.ok(res.data.error.includes('não pode ser excluída'));
});

test('separação de status do pedido e status financeiro com baixa manual de pagamento', async () => {
  // Criar pedido
  const product = snapshot.data.alfa_products[0];
  const orderPayload = {
    idempotency_key: randomUUID(),
    customer_name: 'Cliente Auditoria Financeira',
    customer_phone: '77999887766',
    delivery_type: 'pickup',
    payment_method: 'pix',
    items: [{ product_id: product.id, quantity: 1, selections: [] }],
    total: product.promo_price || product.price
  };

  const orderRes = await request('/api/orders', 'POST', orderPayload);
  assert.equal(orderRes.status, 201);
  const order = orderRes.data;
  assert.equal(order.status, 'pending');
  assert.equal(order.payment_status, 'pending');

  // Transicionar status operacional através das etapas válidas: confirmed -> preparing -> ready -> delivered
  await request(`/api/orders/${order.id}/status`, 'POST', { status: 'confirmed' }, { Cookie: adminCookie });
  await request(`/api/orders/${order.id}/status`, 'POST', { status: 'preparing' }, { Cookie: adminCookie });
  await request(`/api/orders/${order.id}/status`, 'POST', { status: 'ready' }, { Cookie: adminCookie });
  const deliveredRes = await request(`/api/orders/${order.id}/status`, 'POST', { status: 'delivered' }, { Cookie: adminCookie });
  assert.equal(deliveredRes.status, 200);
  assert.equal(deliveredRes.data.status, 'delivered');

  // Regra crítica: pedido entregue NÃO altera pagamento automaticamente
  assert.equal(deliveredRes.data.payment_status, 'pending', 'Pedido entregue não deve confirmar pagamento automaticamente');

  // Confirmação manual de pagamento com trilha de auditoria
  const paymentRes = await request(`/api/orders/${order.id}/payment`, 'POST', {
    payment_status: 'confirmed',
    notes: 'PIX conferido no extrato bancário'
  }, { Cookie: adminCookie });

  assert.equal(paymentRes.status, 200);
  assert.equal(paymentRes.data.payment_status, 'confirmed');

  // Verificar trilha de auditoria
  const singleRes = await request(`/api/orders/${order.id}?token=${order.tracking_token}`);
  assert.equal(singleRes.status, 200);
  const updatedOrder = singleRes.data;
  assert.equal(updatedOrder.payment_status, 'confirmed');
  assert.ok(updatedOrder.audit_logs.some(l => l.action === 'payment_status_changed' && l.new_payment_status === 'confirmed'));
});

test('upload de imagem valida tipo, tamanho e requer administrador', async () => {
  // Visitante não pode fazer upload
  const unauth = await request('/api/upload', 'POST', { filename: 'teste.png', data: 'data:image/png;base64,AAAA' });
  assert.equal(unauth.status, 401);

  // Formato inválido é recusado
  const invalid = await request('/api/upload', 'POST', {
    filename: 'teste.exe',
    data: 'data:application/octet-stream;base64,AAAA'
  }, { Cookie: adminCookie });
  assert.equal(invalid.status, 400);

  // Upload válido de PNG em base64
  // 1x1 transparent PNG in base64
  const pngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const uploadRes = await request('/api/upload', 'POST', {
    filename: 'salgado.png',
    data: pngBase64
  }, { Cookie: adminCookie });

  assert.equal(uploadRes.status, 200);
  assert.ok(uploadRes.data.url.startsWith('/uploads/'));
  assert.ok(uploadRes.data.size > 0);

  // Arquivo gravado pode ser acessado publicamente via GET
  const fileRes = await fetch(origin + uploadRes.data.url);
  assert.equal(fileRes.status, 200);
  assert.equal(fileRes.headers.get('content-type'), 'image/png');
});

test('produto pausado rejeita pedido e é tratado como indisponível', async () => {
  const currentBoot = (await request('/api/bootstrap', 'GET', undefined, { Cookie: adminCookie })).data;
  const products = currentBoot.data.alfa_products;
  const targetProduct = products.find(p => p.available && !p.is_archived);
  assert.ok(targetProduct, 'Deve existir pelo menos um produto ativo');

  // Pausar o produto
  const updatedProducts = products.map(p => p.id === targetProduct.id ? { ...p, available: false } : p);
  const pauseRes = await request('/api/data/alfa_products', 'PUT', {
    version: currentBoot.versions.alfa_products,
    value: updatedProducts
  }, { Cookie: adminCookie });
  assert.equal(pauseRes.status, 200);

  // Tentar fazer cotação/pedido do produto pausado deve falhar
  const quoteRes = await request('/api/quote', 'POST', {
    items: [{ product_id: targetProduct.id, quantity: 1 }],
    delivery_type: 'pickup'
  });
  assert.equal(quoteRes.status, 400);
  assert.match(quoteRes.data.error, /não está mais disponível/i);

  // Reativar o produto
  const reactivated = updatedProducts.map(p => p.id === targetProduct.id ? { ...p, available: true } : p);
  const reactivateRes = await request('/api/data/alfa_products', 'PUT', {
    version: pauseRes.data.version,
    value: reactivated
  }, { Cookie: adminCookie });
  assert.equal(reactivateRes.status, 200);
  snapshot.versions.alfa_products = reactivateRes.data.version;
});

