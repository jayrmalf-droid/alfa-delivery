import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { productPrice } from '../server/rules.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alfa-customizer-test-'));
const password = randomBytes(18).toString('hex'), salt = randomBytes(16).toString('hex');
let child, origin, cookie, snapshot;

async function request(route, method = 'GET', payload, auth = false, headers = {}) {
  const response = await fetch(origin + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Cookie: cookie } : {}),
      ...headers
    },
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
      ADMIN_EMAIL: 'customizer@alfasalgados.test',
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

  const login = await request('/api/login', 'POST', { email: 'customizer@alfasalgados.test', password });
  assert.equal(login.status, 200);
  cookie = login.response.headers.get('set-cookie').split(';')[0];

  snapshot = (await request('/api/bootstrap', 'GET', undefined, true)).data;
  const settings = {
    ...snapshot.data.alfa_settings,
    is_open_override: true,
    is_paused: false,
    payment_cash: true
  };
  await request('/api/data/alfa_settings', 'PUT', { value: settings, version: snapshot.versions.alfa_settings }, true);
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

test('1. Produto simples sem personalização calcula preço base e conclui cotação', async () => {
  const b = (await request('/api/bootstrap', 'GET', undefined, true)).data;
  const simpleProd = b.data.alfa_products.find(p => p.available && !p.has_options && p.product_mode !== 'combo') || b.data.alfa_products[0];

  const q = await request('/api/quote', 'POST', {
    delivery_type: 'pickup',
    items: [{ product_id: simpleProd.id, quantity: 2, selections: [] }]
  });

  assert.equal(q.status, 200);
  const expectedUnit = productPrice(simpleProd);
  assert.equal(q.data.subtotal, expectedUnit * 2);
  assert.equal(q.data.total, expectedUnit * 2);
});

test('2. Produto com grupo obrigatório exige seleção mínima e aceita quando atendido', async () => {
  const b = (await request('/api/bootstrap', 'GET', undefined, true)).data;
  const combo = b.data.alfa_products.find(p => p.name === '30 Salgados');
  const group = b.data.alfa_option_groups.find(g => g.product_id === combo.id && g.name === 'Escolha seus sabores');
  const option = b.data.alfa_product_options.find(o => o.group_id === group.id && (o.is_available ?? true));

  // Sem seleção deve falhar
  const invalid = await request('/api/quote', 'POST', {
    delivery_type: 'pickup',
    items: [{ product_id: combo.id, quantity: 1, selections: [] }]
  });
  assert.equal(invalid.status, 400);

  // Com quantidade incompleta (20 de 30) deve falhar
  const partial = await request('/api/quote', 'POST', {
    delivery_type: 'pickup',
    items: [{ product_id: combo.id, quantity: 1, selections: [{ groupId: group.id, optionId: option.id, quantity: 20 }] }]
  });
  assert.equal(partial.status, 400);

  // Com quantidade exata (30 de 30) deve ter sucesso
  const valid = await request('/api/quote', 'POST', {
    delivery_type: 'pickup',
    items: [{ product_id: combo.id, quantity: 1, selections: [{ groupId: group.id, optionId: option.id, quantity: 30 }] }]
  });
  assert.equal(valid.status, 200);
  assert.equal(valid.data.subtotal, productPrice(combo));
});

test('3. Grupo com incrementos configurados rejeita seleção fora do step', async () => {
  const b = (await request('/api/bootstrap', 'GET', undefined, true)).data;
  const combo = b.data.alfa_products.find(p => p.name === '30 Salgados');
  const group = b.data.alfa_option_groups.find(g => g.product_id === combo.id && g.name === 'Escolha seus sabores');
  const option = b.data.alfa_product_options.find(o => o.group_id === group.id);

  // Se o incremento do grupo for 10 (ou outro step), uma quantidade fracionada tipo 15 deve ser recusada
  const step = group.step || 10;
  if (step > 1) {
    const fractional = await request('/api/quote', 'POST', {
      delivery_type: 'pickup',
      items: [{ product_id: combo.id, quantity: 1, selections: [{ groupId: group.id, optionId: option.id, quantity: step + 1 }] }]
    });
    assert.equal(fractional.status, 400);
  }
});

test('4. Adicionais pagos somam corretamente ao preço unitário e multiplicam pela quantidade', async () => {
  const b = (await request('/api/bootstrap', 'GET', undefined, true)).data;
  const cat = b.data.alfa_categories[0];

  // Cria um produto com adicional pago via catalog bundle
  const testBundle = {
    product: {
      id: 'prod-calc-test',
      category_id: cat.id,
      name: 'Combo Especial com Molho',
      price: 50,
      promo_price: null,
      available: true,
      has_stock_control: false,
      stock_quantity: 0,
      has_options: true,
      sort_order: 1
    },
    groups: [{
      group: {
        id: 'group-addons-paid',
        product_id: 'prod-calc-test',
        name: 'Molhos Especiais',
        min_select: 0,
        max_select: 3,
        step: 1,
        required: false,
        is_active: true,
        tipo_cobranca: 'soma'
      },
      options: [
        { id: 'opt-free', group_id: 'group-addons-paid', name: 'Molho Verde Incluso', price: 0, is_available: true, is_active: true },
        { id: 'opt-paid', group_id: 'group-addons-paid', name: 'Barbecue Artesanal', price: 4.5, is_available: true, is_active: true }
      ]
    }],
    versions: Object.fromEntries(['alfa_products', 'alfa_option_groups', 'alfa_product_options'].map(k => [k, b.versions[k]]))
  };

  const createRes = await request('/api/catalog/product', 'POST', testBundle, true);
  assert.equal(createRes.status, 200);

  // 1x produto + 1x molho gratuito = R$ 50,00
  const qFree = await request('/api/quote', 'POST', {
    delivery_type: 'pickup',
    items: [{
      product_id: 'prod-calc-test',
      quantity: 1,
      selections: [{ groupId: 'group-addons-paid', optionId: 'opt-free', quantity: 1 }]
    }]
  });
  assert.equal(qFree.status, 200);
  assert.equal(qFree.data.total, 50);

  // 2x produto com 2x barbecue (+R$ 9,00 por produto) = (50 + 9) * 2 = R$ 118,00
  const qPaid = await request('/api/quote', 'POST', {
    delivery_type: 'pickup',
    items: [{
      product_id: 'prod-calc-test',
      quantity: 2,
      selections: [{ groupId: 'group-addons-paid', optionId: 'opt-paid', quantity: 2 }]
    }]
  });
  assert.equal(qPaid.status, 200);
  assert.equal(qPaid.data.subtotal, 118);
  assert.equal(qPaid.data.total, 118);
});

test('5. Manipulação de preço total no payload de pedido é barrada com 409', async () => {
  const forged = {
    idempotency_key: randomUUID(),
    customer_name: 'Cliente Teste',
    customer_phone: '77988887777',
    delivery_type: 'pickup',
    payment_method: 'cash',
    items: [{ product_id: 'prod-calc-test', quantity: 1, selections: [] }],
    total: 1.00 // Preço falso
  };

  const res = await request('/api/orders', 'POST', forged);
  assert.equal(res.status, 409);
});

test('6. Opção pausada rejeita cotação e pedido mesmo se estiver cadastrada', async () => {
  const b = (await request('/api/bootstrap', 'GET', undefined, true)).data;
  const groups = b.data.alfa_option_groups;
  const options = b.data.alfa_product_options;

  // Pausa a opção opt-paid
  const targetOpt = options.find(o => o.id === 'opt-paid');
  targetOpt.is_paused = true;
  await request('/api/data/alfa_product_options', 'PUT', { value: options, version: b.versions.alfa_product_options }, true);

  const res = await request('/api/quote', 'POST', {
    delivery_type: 'pickup',
    items: [{
      product_id: 'prod-calc-test',
      quantity: 1,
      selections: [{ groupId: 'group-addons-paid', optionId: 'opt-paid', quantity: 1 }]
    }]
  });
  assert.equal(res.status, 400);

  // Restaura
  targetOpt.is_paused = false;
  const b2 = (await request('/api/bootstrap', 'GET', undefined, true)).data;
  await request('/api/data/alfa_product_options', 'PUT', { value: options, version: b2.versions.alfa_product_options }, true);
});
