import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import ts from 'typescript';
test('cupom trata nome, observações e URL como dados sem executar HTML',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alfa-receipt-'));
 let source=ts.transpileModule(fs.readFileSync('src/utils/printThermalReceipt.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 source=source.replace("import { formatCurrency } from './formatters';", "const formatCurrency = value => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value || 0);");
 const file=path.join(dir,'receipt.mjs');fs.writeFileSync(file,source);
 let html='';const doc={open(){},write(value){html=value;},close(){},images:[],fonts:{ready:Promise.resolve()}};
 globalThis.document={getElementById(){return {contentWindow:{document:doc,focus(){},print(){}}};}};
 try{
  const {printThermalReceipt}=await import(pathToFileURL(file));
  printThermalReceipt({id:'fixture',order_number:1,customer_name:'<b>CLIENTE_TESTE</b>',customer_phone:'00000000000',payment_method:'pix',items:[{quantity:1,product_name:'Produto',subtotal:10,notes:'<i>OBS_TESTE</i>'}],subtotal:10,total:10}, {business_name:'Loja fixture',printer_paper_width:'58mm',printer_logo_url:'javascript:inert',printer_include_logo:true});
  assert.ok(html.includes('&lt;b&gt;CLIENTE_TESTE&lt;/b&gt;'));assert.ok(html.includes('&lt;i&gt;OBS_TESTE&lt;/i&gt;'));assert.ok(!html.includes('src="javascript:'));assert.ok(!html.includes('<b>CLIENTE_TESTE</b>'));
  await Promise.resolve();
 }finally{delete globalThis.document;fs.rmSync(dir,{recursive:true,force:true});}
});

test('cupom de pedido agendado inclui banner PEDIDO AGENDADO, data de criação e data/horário de entrega',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alfa-receipt-agendado-'));
 let source=ts.transpileModule(fs.readFileSync('src/utils/printThermalReceipt.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 source=source.replace("import { formatCurrency } from './formatters';", "const formatCurrency = value => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value || 0);");
 const file=path.join(dir,'receipt.mjs');fs.writeFileSync(file,source);
 let html='';const doc={open(){},write(value){html=value;},close(){},images:[],fonts:{ready:Promise.resolve()}};
 globalThis.document={getElementById(){return {contentWindow:{document:doc,focus(){},print(){}}};}};
 try{
  const {printThermalReceipt}=await import(pathToFileURL(file));
  const scheduledOrder={
    id:'scheduled_ord_1',
    order_number:42,
    customer_name:'Maria Agendada',
    customer_phone:'77988887777',
    payment_method:'pix',
    delivery_type:'delivery',
    created_at:'2026-10-18T10:30:00.000Z',
    preorder_date:'2026-10-25',
    preorder_time:'19:45',
    subtotal:80,
    delivery_fee:5,
    total:85,
    items:[{
      quantity:1,
      product_name:'Cento de Salgados',
      subtotal:80,
      selections:[{optionName:'Coxinha de Frango',groupName:'Sabores'}]
    }]
  };
  const storeSettings={
    business_name:'Alfa Salgados Teste',
    store_address:'Rua Central',
    store_address_number:'100',
    store_neighborhood:'Centro',
    whatsapp:'77999990000',
    cnpj:'12.345.678/0001-90',
    printer_paper_width:'80mm',
    printer_header_custom_text:'DELIVERY OFICIAL',
    printer_footer_custom_text:'Obrigado pela preferência!',
    printer_items_highlight_flavors:true
  };
  printThermalReceipt(scheduledOrder, storeSettings);
  assert.ok(html.includes('*** PEDIDO AGENDADO ***'), 'Deve conter *** PEDIDO AGENDADO ***');
  assert.ok(html.includes('Pedido feito em:'), 'Deve indicar quando o pedido foi feito');
  assert.ok(html.includes('25/10/2026'), 'Deve conter a data agendada formatada');
  assert.ok(html.includes('19:45'), 'Deve conter o horário agendado');
  assert.ok(html.includes('ENTREGA AGENDADA PARA:'), 'Deve indicar o tipo de entrega agendada');
  assert.ok(html.includes('DELIVERY OFICIAL'), 'Deve conter o slogan configurado');
  assert.ok(html.includes('Obrigado pela preferência!'), 'Deve conter o rodapé configurado');
  assert.ok(html.includes('▶'), 'Deve conter marcador de adicionais/sabores');
 }finally{delete globalThis.document;fs.rmSync(dir,{recursive:true,force:true});}
});

