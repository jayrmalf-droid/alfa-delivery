import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../src/domain/selectionGuidance.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const rules=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('orientações distinguem total exato, intervalo e mínimo opcional por unidade',()=>{
 assert.match(rules.selectionGuidance(80,80,10,true),/exatamente 80.*de 10 em 10.*por unidade/);
 assert.match(rules.selectionGuidance(1,6,1,true),/de 1 a 6/);
 assert.match(rules.selectionGuidance(2,6,1,false),/Opcional.*Se escolher.*de 2 a 6/);
 assert.match(rules.selectionGuidance(0,6,1,false),/Opcional.*até 6/);
});
test('contagem de faltantes usa mínimo exigido e nunca o máximo permitido',()=>{
 assert.equal(rules.missingSelections(1,0),1);
 assert.equal(rules.missingSelections(2,1),1);
 assert.equal(rules.missingSelections(2,4),0);
 assert.equal(rules.missingSelections(80,30),50);
});
