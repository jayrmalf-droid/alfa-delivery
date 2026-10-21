import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { verifyBackup, isBackupName } from '../server/backups.mjs';
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
      ALFA_BACKUP_DIR: path.join(temp, 'backups'),
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

test('tokens Bearer fabricados não autorizam leitura nem gravação administrativa', async () => {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const payloads = [
    { email: 'admin@alfasalgados.test', exp: Math.floor(Date.now() / 1000) + 3600 },
    { user_metadata: { role: 'admin' } },
    { app_metadata: { role: 'admin' } },
    { email: 'admin@alfasalgados.test', exp: 1 }
  ];
  const before = (await request('/api/bootstrap', 'GET', undefined, { Cookie: adminCookie })).data;
  for (const payload of payloads) {
    const Authorization = `Bearer ${encode({ alg: 'none' })}.${encode(payload)}.fabricated`;
    const bootstrap = await request('/api/bootstrap', 'GET', undefined, { Authorization });
    assert.equal(bootstrap.data.admin, false);
    assert.equal(bootstrap.data.data.alfa_sales, undefined);
    assert.equal(bootstrap.data.data.alfa_sales_goals, undefined);
    assert.equal((await request('/api/stock', 'GET', undefined, { Authorization })).status, 401);
    assert.equal((await request('/api/data/alfa_sales_goals', 'PUT', {
      value: [{ month: '2026-10', amount: 999 }], version: before.versions.alfa_sales_goals
    }, { Authorization })).status, 401);
  }
  const after = (await request('/api/bootstrap', 'GET', undefined, { Cookie: adminCookie })).data;
  assert.deepEqual(after.data.alfa_sales_goals, before.data.alfa_sales_goals);
  assert.equal(after.versions.alfa_sales_goals, before.versions.alfa_sales_goals);
});

test('cookies fabricados e autorização malformada não criam sessão administrativa', async () => {
  for (const headers of [{ Cookie: 'alfa_session=fabricated' }, { Cookie: '__session=fabricated' },
    { Authorization: 'Bearer invalid' }, { Authorization: 'Bearer e30.e30.invalid' }]) {
    assert.equal((await request('/api/bootstrap', 'GET', undefined, headers)).data.admin, false);
    assert.equal((await request('/api/admin/audit', 'GET', undefined, headers)).status, 401);
  }
});

test('logout revoga uma sessão emitida pelo servidor e preserva a outra sessão válida', async () => {
  const login = await request('/api/login', 'POST', { email: 'admin@alfasalgados.test', password });
  assert.equal(login.status, 200);
  const token = (login.response.headers.get('set-cookie') || '').match(/alfa_session=([^;]+)/)[1];
  const Cookie = `alfa_session=${token}`;
  assert.equal((await request('/api/bootstrap', 'GET', undefined, { Cookie })).data.admin, true);
  assert.equal((await request('/api/logout', 'POST', {}, { Cookie })).status, 200);
  assert.equal((await request('/api/bootstrap', 'GET', undefined, { Cookie })).data.admin, false);
  assert.equal((await request('/api/bootstrap', 'GET', undefined, { Cookie: adminCookie })).data.admin, true);
});

test('cada alteração de venda registra uma única ocorrência de cada evento financeiro', async () => {
  const id = randomUUID();
  const sale = { id, customer_name: 'Cliente fictício', customer_phone: '77999990000',
    items: [{ product_id: 'fixture', name: 'Produto fictício', quantity: 2, unit_price: 20, subtotal: 40 }],
    subtotal: 40, discount_value: 0, total: 40, paid_amount: 0, payment_status: 'open',
    payment_method: 'Fiado', created_at: new Date().toISOString(), payments: [] };
  const save = async transform => {
    const b = (await request('/api/bootstrap', 'GET', undefined, { Cookie: adminCookie })).data;
    const value = transform(b.data.alfa_sales);
    const r = await request('/api/data/alfa_sales', 'PUT', { value, version: b.versions.alfa_sales }, { Cookie: adminCookie });
    assert.equal(r.status, 200);
    return { value, version: b.versions.alfa_sales };
  };
  const events = async action => {
    const r = await request(`/api/admin/audit?action=${action}`, 'GET', undefined, { Cookie: adminCookie });
    assert.equal(r.status, 200);
    return r.data.rows.filter(row => row.resource === id || row.resource.startsWith(`${id} |`));
  };
  await save(rows => [...rows, sale]);
  assert.equal((await events('sale_created')).length, 1);
  await save(rows => rows.map(row => row.id === id ? { ...row, paid_amount: 10, payment_status: 'partial',
    payments: [{ id: randomUUID(), amount: 10, method: 'Pix', created_at: new Date().toISOString() }] } : row));
  assert.equal((await events('sale_payment_status_changed')).length, 1);
  assert.equal((await events('sale_payment_amount_changed')).length, 1);
  await save(rows => rows);
  assert.equal((await events('sale_payment_status_changed')).length, 1);
  const stale = await save(rows => rows.map(row => row.id === id ? { ...row, total: 35, discount_value: 5 } : row));
  assert.equal((await events('sale_amount_adjusted')).length, 1);
  assert.equal((await request('/api/data/alfa_sales', 'PUT', stale, { Cookie: adminCookie })).status, 409);
  assert.equal((await events('sale_amount_adjusted')).length, 1);
  await save(rows => rows.filter(row => row.id !== id));
  assert.equal((await events('sale_removed')).length, 1);
});

test('cancelar venda sem recebimentos registra um único evento e mantém o histórico', async () => {
  const id = randomUUID();
  const before = (await request('/api/bootstrap', 'GET', undefined, { Cookie: adminCookie })).data;
  const sale = { id, customer_name: 'Cliente cancelamento', customer_phone: '77999990001',
    items: [{ product_id: 'fixture', name: 'Produto fictício', quantity: 1, unit_price: 40, subtotal: 40 }],
    total: 40, paid_amount: 0, payment_status: 'open', payment_method: 'Fiado',
    created_at: new Date().toISOString(), payments: [] };
  assert.equal((await request('/api/data/alfa_sales', 'PUT', { value: [...before.data.alfa_sales, sale],
    version: before.versions.alfa_sales }, { Cookie: adminCookie })).status, 200);
  const b = (await request('/api/bootstrap', 'GET', undefined, { Cookie: adminCookie })).data;
  assert.equal((await request('/api/data/alfa_sales', 'PUT', { value: b.data.alfa_sales.map(row => row.id === id
    ? { ...row, payment_status: 'cancelled', cancellation_reason: 'Teste isolado' } : row),
    version: b.versions.alfa_sales }, { Cookie: adminCookie })).status, 200);
  const audit = await request('/api/admin/audit?action=sale_cancelled', 'GET', undefined, { Cookie: adminCookie });
  assert.equal(audit.data.rows.filter(row => row.resource.startsWith(`${id} |`)).length, 1);
  const after = (await request('/api/bootstrap', 'GET', undefined, { Cookie: adminCookie })).data;
  assert.equal(after.data.alfa_sales.find(row => row.id === id).payment_status, 'cancelled');
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
  // Criar pedido com produto simples
  const product = snapshot.data.alfa_products.find(p =>
    p.available &&
    !p.is_archived &&
    p.product_mode !== 'combo' &&
    !p.combo_max_qty &&
    !snapshot.data.alfa_option_groups.some(g =>
      (g.product_id === p.id || g.product_ids?.includes(p.id) || g.category_ids?.includes(p.category_id)) &&
      (g.required || g.is_required || (g.min_select && g.min_select > 0))
    )
  ) || snapshot.data.alfa_products[0];

  const orderPayload = {
    idempotency_key: randomUUID(),
    customer_name: 'Cliente Auditoria Financeira',
    customer_phone: '77999887766',
    delivery_type: 'pickup',
    payment_method: 'pix',
    items: [{ product_id: product.id, quantity: 1, selections: [] }],
    total: product.promo_price || product.price
  };

  // Garantir loja aberta para o teste de pedido
  await request('/api/data/alfa_settings', 'PUT', {
    value: { ...snapshot.data.alfa_settings, is_open_override: true, is_paused: false },
    version: snapshot.versions.alfa_settings
  }, { Cookie: adminCookie });

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

  // Limpar arquivo de teste gravado para não sujar o repositório
  const uploadedFilePath = path.resolve('public', '.' + uploadRes.data.url);
  if (fs.existsSync(uploadedFilePath)) {
    try { fs.unlinkSync(uploadedFilePath); } catch {}
  }
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

test('blindagem de adicionais: snapshot histórico congelado, cobrança por maior_valor e bloqueio de item pausado', async () => {
  const currentBoot = (await request('/api/bootstrap', 'GET', undefined, { Cookie: adminCookie })).data;
  const products = currentBoot.data.alfa_products;
  const product = products.find(p => p.available && !p.is_archived && p.product_mode !== 'combo' && !p.combo_max_qty);
  assert.ok(product);

  const testGroupId = 'grp-nn-test';
  const testOpt1Id = 'opt-nn-1';
  const testOpt2Id = 'opt-nn-2';

  // 1. Criar grupo com tipo_cobranca: 'maior_valor' e permite_repetir: false vinculado via product_ids
  const newGroup = {
    id: testGroupId,
    name: 'Bordas Especiais',
    product_ids: [product.id],
    min_select: 1,
    max_select: 2,
    permite_repetir: false,
    tipo_cobranca: 'maior_valor',
    is_active: true,
    step: 1,
    sort_order: 1
  };
  const newOpts = [
    { id: testOpt1Id, group_id: testGroupId, name: 'Borda Cheddar', price: 6, is_available: true, is_active: true },
    { id: testOpt2Id, group_id: testGroupId, name: 'Borda Catupiry Especial', price: 10, is_available: true, is_active: true }
  ];

  const putG = await request('/api/data/alfa_option_groups', 'PUT', {
    version: currentBoot.versions.alfa_option_groups,
    value: [...currentBoot.data.alfa_option_groups, newGroup]
  }, { Cookie: adminCookie });
  assert.equal(putG.status, 200);

  const putO = await request('/api/data/alfa_product_options', 'PUT', {
    version: currentBoot.versions.alfa_product_options,
    value: [...currentBoot.data.alfa_product_options, ...newOpts]
  }, { Cookie: adminCookie });
  assert.equal(putO.status, 200);

  // 2. Tentar repetir quando permite_repetir: false deve ser rejeitado
  const repeatRes = await request('/api/quote', 'POST', {
    items: [{
      product_id: product.id,
      quantity: 1,
      selections: [{ groupId: testGroupId, optionId: testOpt1Id, quantity: 2 }]
    }],
    delivery_type: 'pickup'
  });
  assert.equal(repeatRes.status, 400);
  assert.match(repeatRes.data.error, /não permite repetição/i);

  // 3. Cotação escolhendo ambos (R$ 6 e R$ 10) com maior_valor deve somar apenas R$ 10 ao preço base do produto
  const quoteRes = await request('/api/quote', 'POST', {
    items: [{
      product_id: product.id,
      quantity: 1,
      selections: [
        { groupId: testGroupId, optionId: testOpt1Id, quantity: 1 },
        { groupId: testGroupId, optionId: testOpt2Id, quantity: 1 }
      ]
    }],
    delivery_type: 'pickup'
  });
  assert.equal(quoteRes.status, 200);
  const basePrice = product.promo_price || product.price;
  assert.equal(quoteRes.data.subtotal, Math.round((basePrice + 10) * 100) / 100);

  // 4. Testar pedido real e verificar o snapshot congelado order_item_addons
  const orderRes = await request('/api/orders', 'POST', {
    idempotency_key: 'idem-test-snapshot-' + Date.now(),
    customer_name: 'Cliente Snapshot',
    customer_phone: '77999990000',
    delivery_type: 'pickup',
    payment_method: 'pix',
    items: [{
      product_id: product.id,
      quantity: 1,
      selections: [
        { groupId: testGroupId, optionId: testOpt1Id, quantity: 1 },
        { groupId: testGroupId, optionId: testOpt2Id, quantity: 1 }
      ]
    }],
    total: quoteRes.data.total
  });
  assert.equal(orderRes.status, 201);
  const createdOrder = orderRes.data;
  assert.ok(createdOrder.items[0].order_item_addons, 'Deve conter snapshot order_item_addons');
  assert.equal(createdOrder.items[0].order_item_addons.length, 2);
  assert.equal(createdOrder.items[0].order_item_addons[0].nome_historico, '1x Borda Cheddar');
  assert.equal(createdOrder.items[0].order_item_addons[1].nome_historico, '1x Borda Catupiry Especial');

  // 5. Testar que se um adicional estiver marcado como is_paused: true, a cotação falha
  const pausedOpts = [...currentBoot.data.alfa_product_options, { ...newOpts[0], is_paused: true }, newOpts[1]];
  await request('/api/data/alfa_product_options', 'PUT', {
    version: putO.data.version,
    value: pausedOpts
  }, { Cookie: adminCookie });

  const pausedRes = await request('/api/quote', 'POST', {
    items: [{
      product_id: product.id,
      quantity: 1,
      selections: [{ groupId: testGroupId, optionId: testOpt1Id, quantity: 1 }]
    }],
    delivery_type: 'pickup'
  });
  assert.equal(pausedRes.status, 400);
  assert.match(pausedRes.data.error, /indisponível/i);

  // Limpeza: Restaurar grupos e opções originais
  const cleanBoot = (await request('/api/bootstrap', 'GET', undefined, { Cookie: adminCookie })).data;
  await request('/api/data/alfa_option_groups', 'PUT', {
    version: cleanBoot.versions.alfa_option_groups,
    value: currentBoot.data.alfa_option_groups
  }, { Cookie: adminCookie });
  const cleanBoot2 = (await request('/api/bootstrap', 'GET', undefined, { Cookie: adminCookie })).data;
  await request('/api/data/alfa_product_options', 'PUT', {
    version: cleanBoot2.versions.alfa_product_options,
    value: currentBoot.data.alfa_product_options
  }, { Cookie: adminCookie });
});



test('backup por terminal e painel: lista, download, integridade e nomes antigos', async () => {
  const headers = { Cookie: adminCookie };
  const folder = path.join(temp, 'backups');
  assert.equal((await request('/api/admin/backups')).status, 401);
  execFileSync(process.execPath, ['scripts/backup.mjs'], { env: { ...process.env, DATABASE_TYPE: 'sqlite',
    ALFA_DATABASE: path.join(temp, 'test.sqlite'), ALFA_BACKUP_DIR: folder } });
  const cliName = fs.readdirSync(folder).find(isBackupName);
  assert.ok(cliName);
  const panel = await request('/api/admin/backups', 'POST', {}, headers);
  assert.equal(panel.status, 201); assert.notEqual(panel.data.name, cliName);
  const legacy = 'alfa-2026-10-14T18-00-00-000Z.sqlite';
  fs.copyFileSync(path.join(folder, cliName), path.join(folder, legacy));
  const list = await request('/api/admin/backups', 'GET', undefined, headers);
  assert.equal(list.status, 200);
  assert.deepEqual(new Set(list.data.files.map(f => f.name)), new Set([cliName, panel.data.name, legacy]));
  const health = await request('/api/admin/backups/health', 'GET', undefined, headers);
  assert.equal(health.data.backupCount, 3); assert.equal(health.data.backupStale, false);
  for (const name of [cliName, panel.data.name, legacy]) {
    const response = await fetch(origin + `/api/admin/backups/download/${name}`, { headers });
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), fs.readFileSync(path.join(folder, name)));
    verifyBackup(path.join(folder, name));
    const db = new DatabaseSync(path.join(folder, name), { readOnly: true });
    try { assert.ok(db.prepare('SELECT COUNT(*) AS n FROM records').get().n > 0); } finally { db.close(); }
  }
  assert.equal((await request('/api/admin/backups/download/retention-policy.json', 'GET', undefined, headers)).status, 404);
  const corrupt = path.join(folder, 'broken.sqlite'); fs.writeFileSync(corrupt, 'not a database');
  assert.throws(() => verifyBackup(corrupt));
  assert.equal(fs.readdirSync(folder).some(n => n.endsWith('.partial')), false);
});
