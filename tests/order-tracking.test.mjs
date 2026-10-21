import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../src/domain/orderTracking.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {orderTracking}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('acompanhamento representa os oito status em entrega e retirada',()=>{
 for(const type of ['delivery','pickup'])for(const status of ['new','pending','confirmed','preparing','ready','delivering','delivered','cancelled']){
  const view=orderTracking(status,type);assert.ok(view.title);assert.ok(view.description);assert.equal(view.cancelled,status==='cancelled');if(!view.cancelled)assert.ok(view.index>=0&&view.index<view.stages.length);
 }
});
test('pedido pronto para entrega não anuncia motoboy a caminho',()=>{
 const ready=orderTracking('ready','delivery'),route=orderTracking('delivering','delivery');assert.equal(ready.title,'Pronto para entrega');assert.equal(ready.description,'Aguardando saída para entrega.');assert.equal(route.title,'Saiu para entrega');assert.ok(ready.index<route.index);
});
test('retirada não possui etapa de motoboy e aceita delivering legado',()=>{
 for(const status of ['ready','delivering']){const view=orderTracking(status,'pickup');assert.equal(view.title,'Pronto para retirada');assert.equal(view.stages.some(stage=>stage.key==='delivering'),false);}
 assert.equal(orderTracking('delivered','pickup').title,'Retirada concluída');
});
test('confirmação fica depois do recebimento e antes do preparo',()=>{
 const received=orderTracking('new','delivery'),confirmed=orderTracking('confirmed','delivery'),preparing=orderTracking('preparing','delivery');assert.equal(received.index,orderTracking('pending','delivery').index);assert.ok(received.index<confirmed.index&&confirmed.index<preparing.index);assert.equal(confirmed.title,'Pedido confirmado');
});
test('cancelamento não marca uma etapa ativa e chamadas não compartilham estado',()=>{
 const cancelled=orderTracking('cancelled','delivery');assert.equal(cancelled.index,-1);assert.equal(cancelled.title,'Pedido cancelado');cancelled.stages[0].title='Alterado só no resultado';assert.equal(orderTracking('pending','delivery').title,'Pedido recebido');
});
