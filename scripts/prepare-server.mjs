import fs from 'node:fs';
import ts from 'typescript';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alfa-seeds-'));
for (const [source, target] of [['src/data/initialData.ts','initialData.mjs'],['src/domain/rules.ts','rules.mjs'],['src/domain/catalog.ts','catalog.mjs']]) {
  let code = ts.transpileModule(fs.readFileSync(source,'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  if (target === 'storage.mjs') { code = code.slice(0,code.indexOf('type Listener') >= 0 ? code.indexOf('type Listener') : code.indexOf('const listeners')); code = code.replace(/import .*?from '.\/api';\n/s, '').replace("'../data/initialData'", "'./initialData.mjs'"); }
  fs.writeFileSync(path.join(dir,target),code);
}
const seeds = await import(pathToFileURL(path.join(dir,'initialData.mjs')));
// Seed constants are build-only; never bundle catalog/database snapshots in the client.
const source = fs.readFileSync('src/data/bannerSeeds.ts','utf8');
const constants = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
fs.writeFileSync(path.join(dir,'constants.mjs'),constants);
const extra = await import(pathToFileURL(path.join(dir,'constants.mjs')));
const data = {};
for(const [key,name] of Object.entries({settings:'SETTINGS',categories:'CATEGORIES',products:'PRODUCTS',neighborhoods:'NEIGHBORHOODS',coupons:'COUPONS',option_groups:'OPTION_GROUPS',product_options:'PRODUCT_OPTIONS',combo_items:'COMBO_ITEMS'})) data[`alfa_${key}`] = seeds[`INITIAL_${name}`];
data.alfa_orders=[];data.alfa_customers=[];data.alfa_flavors=extra.INITIAL_FLAVORS;data.alfa_banners=extra.INITIAL_BANNERS;
// Existing JPGs supplied with the project; preserve other catalog images.
data.alfa_banners[0].image_desktop='/hero-salgados.webp';data.alfa_banners[0].image_mobile='/hero-salgados.webp';
// One-time seed normalization: the legacy combo maximum counted packs, not units.
// Preserve inactive rows, but create explicit savory selection groups for existing combos.
for (const product of data.alfa_products) {
 const match=product.name.match(/^(\d+)\s+Salgados/i);
 if(product.product_mode!=='combo'||!match)continue;
 const target=Number(match[1]), step=target===75?15:target<30?5:10;
 product.combo_min_qty=target;product.combo_max_qty=target;product.combo_step=step;product.has_options=true;product.available_flavor_ids=data.alfa_flavors.filter(f=>f.is_active&&!/churros/i.test(f.name)).map(f=>f.id);
 const activeGroups=data.alfa_option_groups.filter(g=>g.product_id===product.id && g.is_active!==false);
 if(!activeGroups.some(g=>g.group_kind==='flavors'||/sabores/i.test(g.name))) {
  const id=`seed-flavors-${product.id}`;
  data.alfa_option_groups.push({id,product_id:product.id,name:'Escolha seus sabores',min_select:target,max_select:target,step,required:true,is_active:true,sort_order:-1,group_kind:'flavors'});
  for(const flavor of data.alfa_flavors.filter(f=>f.is_active&&!/churros/i.test(f.name)))data.alfa_product_options.push({id:`${id}-${flavor.id}`,group_id:id,name:flavor.name,price:0,is_available:true,is_active:true,step,sort_order:flavor.sort_order});
 }
}
fs.mkdirSync('server',{recursive:true});fs.writeFileSync('server/seed.json',JSON.stringify(data,null,2));fs.copyFileSync(path.join(dir,'rules.mjs'),'server/rules.mjs');fs.copyFileSync(path.join(dir,'catalog.mjs'),'server/catalog.mjs');fs.rmSync(dir,{recursive:true});
