import type { Product, ProductOptionGroup, ProductOption } from '../types';
export interface ProductBundle { product:Product; groups:{group:ProductOptionGroup;options:ProductOption[]}[]; }
export const CATALOG_KEYS=['alfa_products','alfa_option_groups','alfa_product_options'] as const;
const bad=(message:string):never=>{throw new Error(message);};
const integer=(value:unknown,min:number,max:number)=>typeof value==='number'&&Number.isInteger(value)&&value>=min&&value<=max;
export function validateProductBundle(bundle:ProductBundle) {
 const p=bundle?.product;
 if(!p||typeof p.id!=='string'||!p.id||typeof p.name!=='string'||!p.name.trim()||p.name.length>120)bad('Informe um nome de produto com até 120 caracteres.');
 if(typeof p.category_id!=='string'||!p.category_id)bad('Escolha uma categoria.');
 if(!Number.isFinite(p.price)||p.price<0||p.price>100000)bad('Informe um preço válido.');
 if(p.promo_price!=null&&(!Number.isFinite(p.promo_price)||p.promo_price<=0||p.promo_price>=p.price))bad('O preço promocional deve ser positivo e menor que o preço normal.');
 if(!integer(p.stock_quantity,0,1000000))bad('O estoque deve ser uma quantidade inteira, maior ou igual a zero.');
 if(p.preorder_days!=null&&!integer(p.preorder_days,0,365))bad('A antecedência deve ser de 0 a 365 dias.');
 if(p.description!=null&&(typeof p.description!=='string'||p.description.length>2000))bad('A descrição deve ter até 2000 caracteres.');
 if(p.image_url){const image=p.image_url;if(typeof image!=='string'||image.length>1000000||!(/^(https?:\/\/|\/(?!\/))/i.test(image)||/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)))bad('Use uma imagem JPG, PNG ou WebP otimizada, ou um endereço HTTP/HTTPS válido.');}
 if(!Array.isArray(bundle.groups)||bundle.groups.length>40)bad('Cadastre no máximo 40 grupos.');
 const groupIds=new Set<string>(),optionIds=new Set<string>();
 for(const entry of bundle.groups){const g=entry.group;
  if(!g||typeof g.id!=='string'||!g.id||groupIds.has(g.id))bad('Identificador de grupo duplicado ou inválido.');groupIds.add(g.id);
  if(typeof g.name!=='string'||!g.name.trim()||g.name.length>120)bad('Cada grupo precisa de um nome com até 120 caracteres.');
  const min=g.min_select??g.min_options??0,max=g.max_select??g.max_options??1,step=g.step??1;
  if(!integer(min,0,999)||!integer(max,0,999)||!integer(step,1,999)||max<min)bad(`Confira mínimo, máximo e incremento de ${g.name}.`);
  if(g.is_active!==false){
   if(max<1||min%step!==0||max%step!==0)bad(`Os limites de ${g.name} devem permitir seleções completas no incremento definido.`);
   if((g.required??g.is_required)&&min<1)bad(`O grupo obrigatório ${g.name} deve exigir ao menos uma unidade.`);
  }
  if(!Array.isArray(entry.options)||entry.options.length>200)bad(`Cadastre até 200 opções em ${g.name}.`);
  if(g.is_active!==false&&!entry.options.some(o=>(o.is_available??true)&&(o.is_active??true)))bad(`O grupo ativo ${g.name} precisa de uma opção disponível.`);
  for(const o of entry.options){
   if(!o||typeof o.id!=='string'||!o.id||optionIds.has(o.id))bad('Identificador de opção duplicado ou inválido.');optionIds.add(o.id);
   if(typeof o.name!=='string'||!o.name.trim()||o.name.length>120)bad('Cada opção precisa de um nome com até 120 caracteres.');
   if(!Number.isFinite(o.price)||o.price<0||o.price>100000)bad(`Preço inválido em ${o.name}.`);
  }
 }
 return bundle;
}
