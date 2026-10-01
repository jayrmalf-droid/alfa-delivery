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
