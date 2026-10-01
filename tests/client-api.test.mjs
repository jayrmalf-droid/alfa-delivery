import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = ts.transpileModule(fs.readFileSync(new URL('../src/services/api.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText.replace("'../domain/catalog'",JSON.stringify(new URL('../server/catalog.mjs',import.meta.url).href));
let instance = 0;
async function harness(fn) {
  const previous = { fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage };
  globalThis.window = new EventTarget();
  globalThis.localStorage = { getItem: () => '{}', setItem: () => {} };
  const api = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${++instance}`);
  try { await fn(api); } finally { Object.assign(globalThis, previous); }
}
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const bootstrap = (products, version) => ({ admin: true, data: { alfa_products: products }, versions: { alfa_products: version } });

test('conflito cancela gravações já enfileiradas e preserva a alteração de outro dispositivo', async () => harness(async api => {
  const remote = [{ id: 'p1', name: 'Alteração do outro dispositivo', stock_quantity: 8 }];
  const puts = [];
  let state = bootstrap([{ id: 'p1', stock_quantity: 10 }], 1);
  globalThis.fetch = async (url, options = {}) => {
    if (url === '/api/bootstrap') return response(state);
    if (options.method === 'PUT') {
      puts.push(JSON.parse(options.body)); state = bootstrap(remote, 2);
      return response({ error: 'Dados alterados em outro dispositivo.' }, 409);
    }
    throw new Error(`Requisição inesperada: ${url}`);
  };
  await api.refresh();
  api.saveRemote('alfa_products', [{ id: 'p1', stock_quantity: 9 }]);
  api.saveRemote('alfa_products', [{ id: 'p1', stock_quantity: 7 }]);
  await api.refresh();
  assert.equal(puts.length, 1);
  assert.deepEqual(api.cache.alfa_products, remote);
  // Uma nova tentativa feita com os dados recarregados continua permitida.
  globalThis.fetch = async (url, options = {}) => options.method === 'PUT' ? response({ version: 3 }) : response(state);
  api.saveRemote('alfa_products', remote);
  await api.refresh();
}));

test('gravações consecutivas bem-sucedidas usam versões em sequência', async () => harness(async api => {
  let version = 1, products = [], seen = [];
  globalThis.fetch = async (url, options = {}) => {
    if (options.method === 'PUT') {
      const input = JSON.parse(options.body); seen.push(input.version);
      assert.equal(input.version, version); products = input.value;
      return response({ version: ++version });
    }
    return response(bootstrap(products, version));
  };
  await api.refresh();
  api.saveRemote('alfa_products', [{ id: 'first' }]);
  api.saveRemote('alfa_products', [{ id: 'second' }]);
  await api.refresh();
  assert.deepEqual(seen, [1, 2]);
  assert.deepEqual(api.cache.alfa_products, [{ id: 'second' }]);
}));

test('rastreio permanece disponível na sessão quando armazenamento do navegador é bloqueado', async () => harness(async api => {
  const order = { id: 'order-fixture', tracking_token: 'private-fixture', status: 'pending' };
  globalThis.localStorage = { getItem() { throw new Error('Bloqueado'); }, setItem() { throw new Error('Bloqueado'); } };
  globalThis.fetch = async url => {
    assert.ok(url === '/api/orders' || url === '/api/orders/order-fixture?token=private-fixture');
    return response(order);
  };
  await api.createRemoteOrder({}, 'test-key');
  assert.equal((await api.trackedOrder(order.id)).status, 'pending');
  assert.equal(await api.trackedOrder('unknown'), null);
}));
