import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
const code = ts.transpileModule(fs.readFileSync(new URL('../src/domain/businessDates.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText.replace("'./rules'", JSON.stringify(new URL('../server/rules.mjs', import.meta.url).href));
const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const dates = await import(url);

test('após 21h na Bahia o movimento continua no mesmo dia local', () => {
  assert.equal(dates.businessDate('2026-10-14T23:59:59Z'), '2026-10-14');
  assert.equal(dates.businessDate('2026-10-15T00:00:00Z'), '2026-10-14');
  assert.equal(dates.businessDate('2026-10-15T01:00:00Z'), '2026-10-14');
  assert.equal(dates.businessHour('2026-10-15T01:00:00Z'), 22);
});
test('meia-noite da Bahia muda o dia somente às 03h UTC', () => {
  assert.equal(dates.businessDate('2026-10-15T02:59:59.999Z'), '2026-10-14');
  assert.equal(dates.businessDate('2026-10-15T03:00:00Z'), '2026-10-15');
  assert.equal(dates.businessHour('2026-10-15T03:00:00Z'), 0);
});
test('virada do mês e do ano usa o calendário da Bahia', () => {
  assert.equal(dates.businessMonth('2026-11-01T02:59:59Z'), '2026-10');
  assert.equal(dates.businessMonth('2026-11-01T03:00:00Z'), '2026-11');
  assert.equal(dates.businessDate('2027-01-01T00:30:00Z'), '2026-12-31');
  assert.equal(dates.businessMonth('2027-01-01T03:00:00Z'), '2027-01');
});
test('vencimento, pagamento de despesa e dia de fechamento não sofrem conversão', () => {
  assert.equal(dates.businessDate('2026-10-14'), '2026-10-14');
  assert.equal(dates.businessMonth('2026-10-01'), '2026-10');
  assert.equal(dates.formatBusinessDate('2026-10-14'), '14/10/2026');
  assert.equal(dates.calendarDate('2026-02-30'), '');
});
test('intervalo do caixa inclui limites locais e exclui data faltante ou inválida', () => {
  for (const value of ['2026-10-14T03:00:00Z', '2026-10-15T02:59:59.999Z']) assert.equal(dates.inBusinessDateRange(value, '2026-10-14', '2026-10-14'), true);
  for (const value of ['2026-10-14T02:59:59Z', '2026-10-15T03:00:00Z', undefined, null, '', 'invalid']) assert.equal(dates.inBusinessDateRange(value, '2026-10-14', '2026-10-14'), false);
  assert.equal(dates.businessDate(undefined), '');
  assert.equal(dates.businessMonth(undefined), '');
  assert.equal(dates.inBusinessDateRange('2026-10-14', '2026-10-15', '2026-10-14'), false);
});
test('soma dos recebimentos por dia e mês preserva valores e registros originais', () => {
  const receipts = [{ created_at: '2026-11-01T01:00:00Z', amount: 10 }, { created_at: '2026-11-01T03:00:00Z', amount: 20 }];
  const original = structuredClone(receipts);
  const october = receipts.filter(r => dates.businessMonth(r.created_at) === '2026-10').reduce((n, r) => n + r.amount, 0);
  const november = receipts.filter(r => dates.businessMonth(r.created_at) === '2026-11').reduce((n, r) => n + r.amount, 0);
  assert.equal(october, 10); assert.equal(november, 20); assert.equal(october + november, 30);
  assert.deepEqual(receipts, original);
});
test('deslocamentos de calendário cobrem fevereiro, ano bissexto e comparação mensal', () => {
  assert.equal(dates.shiftCalendarDate('2026-03-01', -1), '2026-02-28');
  assert.equal(dates.shiftCalendarDate('2028-03-01', -1), '2028-02-29');
  assert.equal(dates.shiftCalendarMonth('2027-01', -1), '2026-12');
  assert.equal(dates.shiftCalendarMonth('2026-12', 1), '2027-01');
  assert.equal(dates.daysInCalendarMonth('2028-02'), 29);
  assert.equal(dates.daysInCalendarMonth('2026-02'), 28);
});
test('CSV e apresentação usam Bahia, preservando instantes com offsets equivalentes', () => {
  const utc = '2026-11-01T01:00:00Z', offset = '2026-10-31T22:00:00-03:00';
  assert.equal(dates.businessDate(utc), dates.businessDate(offset));
  assert.match(dates.formatBusinessDateTime(utc), /31\/10\/2026.*22:00:00/);
  assert.equal(dates.formatBusinessDateTime(utc), dates.formatBusinessDateTime(offset));
  assert.equal(dates.formatBusinessDateTime('invalid'), '—');
});
test('mesmo resultado em computadores configurados em UTC, Bahia e Tóquio', () => {
  const script = `const d=await import(${JSON.stringify(url)}); console.log(JSON.stringify([d.businessDate('2026-11-01T01:00:00Z'),d.businessMonth('2026-11-01T01:00:00Z'),d.businessHour('2026-11-01T01:00:00Z'),d.shiftCalendarDate('2026-11-01',-1),d.shiftCalendarMonth('2027-01',-1)]));`;
  for (const TZ of ['UTC', 'America/Bahia', 'Asia/Tokyo']) {
    const actual = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ }, encoding: 'utf8' }));
    assert.deepEqual(actual, ['2026-10-31', '2026-10', 22, '2026-10-31', '2026-12']);
  }
});
