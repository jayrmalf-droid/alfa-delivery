import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync(new URL('../src/domain/receivables.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText;
const { saleBalance, receivableTotal, customerDebt } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('fiado de R$ 40 com R$ 10 recebidos permanece R$ 30 após cancelar outra venda de R$ 40', () => {
  const sales = [
    { customer_phone: '77999990000', total: 40, paid_amount: 10, payment_status: 'partial' },
    { customer_phone: '77999990000', total: 40, paid_amount: 0, payment_status: 'cancelled' }
  ];
  assert.equal(receivableTotal(sales), 30);
  assert.equal(customerDebt(sales, '(77) 99999-0000'), 30);
  assert.equal(saleBalance(sales[1]), 0);
});

test('saldo do cliente exclui outros telefones e aceita a mesma numeração com pontuação', () => {
  const sales = [
    { customer_phone: '(77) 99999-0000', total: 50, paid_amount: 5, payment_status: 'partial' },
    { customer_phone: '77999990001', total: 70, paid_amount: 0, payment_status: 'open' },
    { total: 20, paid_amount: 0, payment_status: 'open' }
  ];
  assert.equal(customerDebt(sales, '77999990000'), 45);
  assert.equal(customerDebt(sales, ''), 0);
  assert.equal(customerDebt(sales, '77999990002'), 0);
});

test('quitação zera a dívida e pagamentos acima do total não geram saldo negativo', () => {
  assert.equal(saleBalance({ total: 40, paid_amount: 40, payment_status: 'paid' }), 0);
  assert.equal(saleBalance({ total: 40, paid_amount: 41, payment_status: 'partial' }), 0);
  assert.equal(receivableTotal([]), 0);
});

test('consultar saldos não altera vendas, recebimentos nem registros cancelados', () => {
  const sales = [{ customer_phone: '77999990000', total: 40, paid_amount: 10, payment_status: 'partial', payments: [{ amount: 10 }] },
    { customer_phone: '77999990000', total: 40, paid_amount: 0, payment_status: 'cancelled' }];
  const original = structuredClone(sales);
  customerDebt(sales, '77999990000');
  receivableTotal(sales);
  assert.deepEqual(sales, original);
});
