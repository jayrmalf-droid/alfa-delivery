import type { Order } from '../types';
export function salesInsights(orders: Order[]) {
 const completed=orders.filter(o=>o.status==='delivered');const cancelled=orders.filter(o=>o.status==='cancelled');
 const total=completed.reduce((sum,o)=>sum+Number(o.total||0),0);const coupons=completed.filter(o=>!!o.coupon_code);const redeemed=completed.filter(o=>Number(o.loyalty_discount)>0);
 const phones=new Map<string,number>();const products=new Map<string,number>();const hours=new Map<string,number>();
 for(const order of completed){const raw=(order.customer_phone||'').replace(/\D/g,'');const phone=raw.length===10||raw.length===11?'55'+raw:raw;if(phone)phones.set(phone,(phones.get(phone)||0)+1);for(const i of order.items||[])products.set(i.product_name,(products.get(i.product_name)||0)+Number(i.quantity||0));const date=new Date(order.created_at);if(Number.isFinite(date.getTime())){const hour=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',hour:'2-digit',hourCycle:'h23'}).format(date);hours.set(hour,(hours.get(hour)||0)+1);}}
 const repeated=[...phones.values()].filter(n=>n>1).length;const top=[...products].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];const peak=[...hours].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
 return {completed:completed.length,total,ticket:completed.length?total/completed.length:0,cancelled:cancelled.length,cancellationRate:orders.length?cancelled.length/orders.length*100:0,customers:phones.size,repeated,repeatRate:phones.size?repeated/phones.size*100:0,coupons:coupons.length,redeemed:redeemed.length,top:top?{name:top[0],quantity:top[1]}:null,peak:peak?{hour:peak[0],count:peak[1]}:null};
}
