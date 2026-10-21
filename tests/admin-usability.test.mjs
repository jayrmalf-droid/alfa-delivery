import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile = file => ts.transpileModule(fs.readFileSync(new URL('../src/domain/' + file, import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText;
const url = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const input = await import(url(compile('adminInput.ts')));
const datesUrl = url(compile('businessDates.ts').replace("'./rules'", JSON.stringify(new URL('../server/rules.mjs', import.meta.url).href)));
const schedule = await import(url(compile('schedule.ts').replace("'./businessDates'", JSON.stringify(datesUrl))));
const dates = await import(datesUrl);

test('meta aceita reais com separador brasileiro, símbolo e valores sem agrupamento', () => {
  for (const value of ['1.000,00', '1000,00', 'R$ 1.000,00', '1.000', '1000', '1000.00']) {
    assert.equal(input.parseMoneyInput(value), 1000, value);
  }
  assert.equal(input.parseMoneyInput('1.234.567,89'), 1234567.89);
  assert.equal(input.parseMoneyInput('0,01'), 0.01);
  assert.equal(input.parseMoneyInput(' 12,50 '), 12.5);
});

test('entrada monetária recusa agrupamentos quebrados, expoentes e centavos excedentes', () => {
  for (const value of ['', ' ', '10.00,00', '1,000', '1.2.3', '1e3', '-10', 'NaN', 'Infinity', '12,34,56', '1 2', '9007199254740992']) {
    assert.equal(input.parseMoneyInput(value), null, value);
  }
});

test('buscas do painel equivalem com e sem acentos e com letras maiúsculas', () => {
  for (const [left,right] of [['Relatórios', 'relatorios'], ['Configurações', 'CONFIGURACOES'], ['Visão geral', ' visao geral '], ['Cupons', 'cupons']]) {
    assert.equal(input.normalizeAdminSearch(left), input.normalizeAdminSearch(right));
  }
});

test('CSV neutraliza fórmulas preservando caracteres originais, aspas e valores numéricos', () => {
  assert.equal(input.safeCsvCell('=1+1'), '"\'=1+1"');
  assert.equal(input.safeCsvCell('+123'), '"\'+123"');
  assert.equal(input.safeCsvCell('Cliente "Teste"'), '"Cliente ""Teste"""');
  assert.equal(input.safeCsvCell(1000.5), '"1000.5"');
  assert.equal(input.safeCsvCell(null), '""');
});

test('agenda usa o dia da Bahia quando UTC já está no dia seguinte', () => {
  const today = dates.businessDate('2026-10-17T01:30:00Z');
  assert.equal(today, '2026-10-16');
  assert.deepEqual(schedule.scheduleDateRange(today,'today'), {start:'2026-10-16',end:'2026-10-16'});
  assert.deepEqual(schedule.scheduleDateRange(today,'tomorrow'), {start:'2026-10-17',end:'2026-10-17'});
});

test('agenda semanal considera segunda a domingo, inclusive quando atravessa o ano', () => {
  assert.deepEqual(schedule.scheduleDateRange('2026-10-16','week'), {start:'2026-10-12',end:'2026-10-18'});
  assert.deepEqual(schedule.scheduleDateRange('2026-10-18','week'), {start:'2026-10-12',end:'2026-10-18'});
  assert.deepEqual(schedule.scheduleDateRange('2026-10-19','week'), {start:'2026-10-19',end:'2026-10-25'});
  assert.deepEqual(schedule.scheduleDateRange('2027-01-01','week'), {start:'2026-12-28',end:'2027-01-03'});
});

test('agenda mensal respeita fevereiro bissexto, virada do ano e datas inválidas', () => {
  assert.deepEqual(schedule.scheduleDateRange('2028-02-20','month'), {start:'2028-02-01',end:'2028-02-29'});
  assert.deepEqual(schedule.scheduleDateRange('2026-02-20','month'), {start:'2026-02-01',end:'2026-02-28'});
  assert.deepEqual(schedule.scheduleDateRange('2026-12-31','tomorrow'), {start:'2027-01-01',end:'2027-01-01'});
  assert.deepEqual(schedule.scheduleDateRange('2026-02-30','month'), {start:'',end:''});
});


test('valores opcionais distinguem vazio de entrada inválida',()=>{
 assert.equal(input.parseOptionalMoneyInput(''),0);assert.equal(input.parseOptionalMoneyInput('  '),0);
 assert.equal(input.parseOptionalMoneyInput('R$ 1.250,50'),1250.5);
 for(const value of ['abc','1,234','-1','1e3','10.00,00'])assert.equal(input.parseOptionalMoneyInput(value),null,value);
});
test('conferência de caixa aceita valores negativos sem perder centavos',()=>{
 for(const value of ['-1.250,50','-R$ 1.250,50','R$ -1.250,50','-1250.50'])assert.equal(input.parseSignedMoneyInput(value),-1250.5,value);
 assert.equal(input.parseSignedMoneyInput('1.250,50'),1250.5);assert.equal(input.parseSignedMoneyInput('0,00'),0);
});
test('conferência de caixa recusa sinais duplicados, símbolos repetidos e formatos inválidos',()=>{
 for(const value of ['', '--1','- -1','R$ R$ 1','R$ -R$ 1','1e3','-1,234','-1.2.3','1-2','NaN','Infinity'])assert.equal(input.parseSignedMoneyInput(value),null,value);
});

test('busca de cliente aceita acentos e telefone com pontuação sem confundir nomes com números', () => {
 assert.equal(input.matchesCustomerSearch('João Açúcar','(77) 99999-1234','joao acucar'),true);
 assert.equal(input.matchesCustomerSearch('João','77999991234','(77) 99999-1234'),true);
 assert.equal(input.matchesCustomerSearch('João','77999991234','outro 1234'),false);
 assert.equal(input.matchesCustomerSearch('João','77999991234','   '),true);
});
test('filtros de cobrança incluem parciais e excluem quitadas e canceladas dos vencidos', () => {
 const sale={payment_status:'partial',total:100,paid_amount:25,due_date:'2026-10-16'};
 assert.equal(input.matchesSalesView(sale,'overdue','2026-10-17'),true);
 assert.equal(input.matchesSalesView(sale,'open','2026-10-17'),true);
 assert.equal(input.matchesSalesView(sale,'overdue','2026-10-16'),false);
 for(const payment_status of ['paid','cancelled']) assert.equal(input.matchesSalesView({...sale,payment_status},'overdue','2026-10-17'),false);
 assert.equal(input.matchesSalesView({...sale,due_date:undefined},'overdue','2026-10-17'),false);
 assert.equal(input.matchesSalesView({...sale,paid_amount:100},'open','2026-10-17'),false);
});


test('busca de pedidos aceita número com cerquilha, bairro sem acento e telefone formatado', () => {
 const order={order_number:1234,customer_name:'José',customer_phone:'77999991234',address:'Rua São João',neighborhood_name:'Conceição'};
 for(const query of ['#1234',' # 1234 ','jose','sao joao','conceicao','(77) 99999-1234']) assert.equal(input.matchesOrderSearch(order,query),true,query);
 for(const query of ['#5678','outro 1234','99988']) assert.equal(input.matchesOrderSearch(order,query),false,query);
 assert.equal(input.matchesOrderSearch({order_number:1234},'   '),true);
 assert.equal(input.matchesOrderSearch({order_number:1234},'jose'),false);
});


test('filtros de produto distinguem pausa e estoque sem incluir arquivados', () => {
 const product={available:true,has_stock_control:true,stock_quantity:0};
 assert.equal(input.matchesProductView(product,'active'),true);
 assert.equal(input.matchesProductView(product,'stockout'),true);
 assert.equal(input.matchesProductView({...product,has_stock_control:false},'stockout'),false);
 assert.equal(input.matchesProductView({...product,stock_quantity:1},'stockout'),false);
 assert.equal(input.matchesProductView({...product,available:false},'paused'),true);
 for(const filter of ['all','active','paused','stockout']) assert.equal(input.matchesProductView({...product,is_archived:true},filter),false);
});
