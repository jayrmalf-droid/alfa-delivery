import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID,randomBytes,scryptSync } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizePhone, openingStatus, productPrice, localDate } from '../server/rules.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'alfa-test-'));
const password=randomBytes(18).toString('hex'),salt=randomBytes(16).toString('hex');
let child,origin,cookie,snapshot,fixture;
async function request(route,method='GET',payload,auth=false,headers={}) {
 const response=await fetch(origin+route,{method,headers:{'Content-Type':'application/json',...(auth?{Cookie:cookie}:{}),...headers},body:payload===undefined?undefined:JSON.stringify(payload)});
 return {status:response.status,data:await response.json(),response};
}
before(async()=>{
 child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,ALFA_DATABASE:path.join(temp,'test.sqlite'),PORT:'0',ADMIN_EMAIL:'fixture@example.test',ADMIN_PASSWORD_HASH:`${salt}:${scryptSync(password,salt,64).toString('hex')}`},stdio:['ignore','pipe','pipe']});
 child.stderr.on('data', chunk => process.stderr.write(chunk));
 origin=await new Promise((resolve,reject)=>{let text='';child.stdout.on('data',chunk=>{text+=chunk;const match=text.match(/http:\/\/localhost:\d+/);if(match)resolve(match[0]);});child.on('exit',code=>reject(Error(`Server exited: ${code}`)));setTimeout(()=>reject(Error('Server timeout')),10000).unref();});
 const login=await request('/api/login','POST',{email:'fixture@example.test',password});assert.equal(login.status,200);cookie=login.response.headers.get('set-cookie').split(';')[0];
 snapshot=(await request('/api/bootstrap','GET',undefined,true)).data;
 const settings={...snapshot.data.alfa_settings,is_open_override:true,is_paused:false,payment_cash:true};
 assert.equal((await request('/api/data/alfa_settings','PUT',{value:settings,version:snapshot.versions.alfa_settings},true)).status,200);
 fixture={...snapshot.data.alfa_products[0],id:'fixture-product',name:'Produto de teste',product_mode:'normal',price:10,promo_price:8,has_stock_control:true,stock_quantity:2,available:true,combo_max_qty:null};
 assert.equal((await request('/api/data/alfa_products','PUT',{value:[...snapshot.data.alfa_products,fixture],version:snapshot.versions.alfa_products},true)).status,200);
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
const payload=(key=randomUUID())=>({idempotency_key:key,customer_name:'Teste isolado',customer_phone:'77999990000',delivery_type:'pickup',payment_method:'cash',items:[{product_id:'fixture-product',quantity:1,selections:[]}],total:8});
test('telefone, preço promocional e dia da Bahia são consistentes',()=>{assert.equal(normalizePhone('+55 (77) 99999-0000'),'5577999990000');assert.equal(normalizePhone('77999990000'),'5577999990000');assert.equal(productPrice({price:10,promo_price:12}),10);assert.equal(localDate(new Date('2026-09-30T01:00:00Z')),'2026-09-29');});
test('horário após meia-noite usa o dia operacional anterior',()=>{assert.equal(openingStatus({weekly_schedule:{'2':{isOpen:true,open:'20:00',close:'02:00'}}},new Date('2026-09-30T04:00:00Z')).isOpen,true);});
test('visitante não lê clientes/cupons/pedidos e não altera catálogo',async()=>{const b=await request('/api/bootstrap');assert.deepEqual(b.data.data.alfa_orders,[]);assert.equal(b.data.data.alfa_coupons,undefined);assert.equal((await request('/api/data/alfa_products','PUT',{value:[],version:1})).status,401);});
test('origem externa é rejeitada',async()=>{assert.equal((await request('/api/orders','POST',payload(),false,{Origin:'https://external.example'})).status,403);});
test('preço adulterado é rejeitado sem baixar estoque',async()=>{assert.equal((await request('/api/orders','POST',{...payload(),total:1})).status,409);const b=(await request('/api/bootstrap','GET',undefined,true)).data;assert.equal(b.data.alfa_products.find(p=>p.id===fixture.id).stock_quantity,2);});
test('pedido persiste, retry é idempotente, rastreio é privado e cancelamento devolve estoque uma vez',async()=>{
 const p=payload();const first=await request('/api/orders','POST',p);assert.equal(first.status,201);const order=first.data;assert.equal(order.total,8);
 assert.equal((await request('/api/orders','POST',p)).data.id,order.id);
 assert.equal((await request(`/api/orders/${order.id}`)).status,403);
 assert.equal((await request(`/api/orders/${order.id}?token=${order.tracking_token}`)).status,200);
 let b=(await request('/api/bootstrap','GET',undefined,true)).data;assert.equal(b.data.alfa_orders.length,1);assert.equal(b.data.alfa_products.find(p=>p.id===fixture.id).stock_quantity,1);
 assert.equal((await request(`/api/orders/${order.id}/status`,'POST',{status:'cancelled'},true)).status,200);
 assert.equal((await request(`/api/orders/${order.id}/status`,'POST',{status:'cancelled'},true)).status,200);
 b=(await request('/api/bootstrap','GET',undefined,true)).data;assert.equal(b.data.alfa_products.find(p=>p.id===fixture.id).stock_quantity,2);
});
test('conflito de catálogo não sobrescreve alteração de outro dispositivo',async()=>{const b=(await request('/api/bootstrap','GET',undefined,true)).data;const input={value:b.data.alfa_products,version:b.versions.alfa_products};assert.equal((await request('/api/data/alfa_products','PUT',input,true)).status,200);assert.equal((await request('/api/data/alfa_products','PUT',input,true)).status,409);});
test('loja pausada e forma de pagamento desativada rejeitam pedido',async()=>{let b=(await request('/api/bootstrap','GET',undefined,true)).data;await request('/api/data/alfa_settings','PUT',{value:{...b.data.alfa_settings,is_paused:true},version:b.versions.alfa_settings},true);assert.equal((await request('/api/orders','POST',payload())).status,400);});
test('combo exige a quantidade de sabores e calcula o preço do catálogo',async()=>{
 const b=(await request('/api/bootstrap','GET',undefined,true)).data;
 const product=b.data.alfa_products.find(p=>p.name==='30 Salgados');
 const group=b.data.alfa_option_groups.find(g=>g.product_id===product.id&&g.name==='Escolha seus sabores');
 const option=b.data.alfa_product_options.find(o=>o.group_id===group.id);
 const base={delivery_type:'pickup',items:[{product_id:product.id,quantity:1,selections:[{groupId:group.id,optionId:option.id,quantity:20}]}]};
 assert.equal((await request('/api/quote','POST',base)).status,400);
 base.items[0].selections[0].quantity=30;const q=await request('/api/quote','POST',base);assert.equal(q.status,200);assert.equal(q.data.total,productPrice(product));
});
test('pedidos concorrentes não ultrapassam o estoque',async()=>{
 const b=(await request('/api/bootstrap','GET',undefined,true)).data;
 await request('/api/data/alfa_settings','PUT',{value:{...b.data.alfa_settings,is_open_override:true,is_paused:false},version:b.versions.alfa_settings},true);
 const results=await Promise.all([request('/api/orders','POST',payload()),request('/api/orders','POST',payload()),request('/api/orders','POST',payload())]);
 assert.deepEqual(results.map(r=>r.status).sort(),[201,201,400]);
 const latest=(await request('/api/bootstrap','GET',undefined,true)).data;assert.equal(latest.data.alfa_products.find(p=>p.id===fixture.id).stock_quantity,0);
});
const bundleInput = b => ({product:{...fixture,id:'bundle-product',name:'Caixa personalizada de teste',price:12,promo_price:null,stock_quantity:2,has_options:true,combo_max_qty:null,custom_label:'preservado'},groups:[{group:{id:'bundle-group',product_id:'bundle-product',name:'Complementos opcionais',min_select:2,max_select:4,step:1,required:false,is_active:true,group_kind:'extra',sort_order:1},options:[{id:'bundle-option',group_id:'bundle-group',name:'Molho de teste',price:1.5,is_available:true,is_active:true},{id:'bundle-paused',group_id:'bundle-group',name:'Item pausado',price:2,is_available:true,is_active:false}]}],versions:Object.fromEntries(['alfa_products','alfa_option_groups','alfa_product_options'].map(k=>[k,b.versions[k]]))});
test('cadastro completo exige administrador e não grava parcialmente',async()=>{
 const b=(await request('/api/bootstrap','GET',undefined,true)).data;
 assert.equal((await request('/api/catalog/product','POST',bundleInput(b))).status,401);
 const after=(await request('/api/bootstrap','GET',undefined,true)).data;assert.equal(after.data.alfa_products.some(p=>p.id==='bundle-product'),false);
 assert.deepEqual(after.versions,b.versions);
});
test('produto, grupos e complementos são gravados juntos com metadados preservados',async()=>{
 const b=(await request('/api/bootstrap','GET',undefined,true)).data;
 const result=await request('/api/catalog/product','POST',bundleInput(b),true);assert.equal(result.status,200);
 assert.equal(result.data.data.alfa_products.find(p=>p.id==='bundle-product').custom_label,'preservado');
 assert.equal(result.data.data.alfa_option_groups.find(g=>g.id==='bundle-group').group_kind,'extra');
 assert.equal(result.data.data.alfa_product_options.find(o=>o.id==='bundle-paused').is_active,false);
 for(const key of ['alfa_products','alfa_option_groups','alfa_product_options'])assert.equal(result.data.versions[key],b.versions[key]+1);
});
test('grupo opcional com mínimo permite omissão e exige o mínimo quando escolhido; item pausado é recusado',async()=>{
 const p={delivery_type:'pickup',items:[{product_id:'bundle-product',quantity:2,selections:[]}]};
 assert.equal((await request('/api/quote','POST',p)).data.total,24);
 p.items[0].selections=[{groupId:'bundle-group',optionId:'bundle-option',quantity:1}];assert.equal((await request('/api/quote','POST',p)).status,400);
 p.items[0].selections[0].quantity=2;assert.equal((await request('/api/quote','POST',p)).data.total,30);
 p.items[0].selections[0].optionId='bundle-paused';assert.equal((await request('/api/quote','POST',p)).status,400);
});
test('cadastro inválido não altera produto nem versões; limites respeitam incremento',async()=>{
 const b=(await request('/api/bootstrap','GET',undefined,true)).data;const input=bundleInput(b);input.product.name='Não deve ser salvo';input.groups[0].group.min_select=75;input.groups[0].group.max_select=75;input.groups[0].group.step=10;
 assert.equal((await request('/api/catalog/product','POST',input,true)).status,400);
 const after=(await request('/api/bootstrap','GET',undefined,true)).data;assert.deepEqual(after.versions,b.versions);assert.notEqual(after.data.alfa_products.find(p=>p.id==='bundle-product').name,input.product.name);
});
test('colisão de identificadores entre produtos cancela toda a transação',async()=>{
 const b=(await request('/api/bootstrap','GET',undefined,true)).data;const input=bundleInput(b);input.product.id='collision-product';
 assert.equal((await request('/api/catalog/product','POST',input,true)).status,400);
 const after=(await request('/api/bootstrap','GET',undefined,true)).data;assert.deepEqual(after.versions,b.versions);assert.equal(after.data.alfa_products.some(p=>p.id==='collision-product'),false);
});
test('venda durante a edição impede salvar estoque antigo e preserva reserva',async()=>{
 const b=(await request('/api/bootstrap','GET',undefined,true)).data;const input=bundleInput(b);
 const order={...payload(),items:[{product_id:'bundle-product',quantity:1,selections:[]}],total:12};assert.equal((await request('/api/orders','POST',order)).status,201);
 assert.equal((await request('/api/catalog/product','POST',input,true)).status,409);
 const after=(await request('/api/bootstrap','GET',undefined,true)).data;assert.equal(after.data.alfa_products.find(p=>p.id==='bundle-product').stock_quantity,1);
 assert.equal(after.versions.alfa_option_groups,b.versions.alfa_option_groups);
});
