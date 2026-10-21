import {test} from 'node:test';
import assert from 'node:assert/strict';
import {statusFor,awardPoints,appendEntry} from '../server/points.mjs';
const config={loyalty_enabled:true,loyalty_points_goal:100,loyalty_points_per_real:1,loyalty_min_order_value:45};
const order={id:'pedido1',order_number:12,customer_phone:'77999990001',subtotal:120};
test('pedidos históricos sem lançamentos não concedem pontos',()=>assert.equal(statusFor([],order.customer_phone,config).points,0));
test('ganho, resgate e duplicidade',()=>{const entries=[];assert.equal(awardPoints(order,config),120);assert.equal(appendEntry(entries,order,'earn',120),true);assert.equal(appendEntry(entries,order,'earn',120),false);assert.equal(statusFor(entries,order.customer_phone,config).points,120);appendEntry(entries,order,'redeem',-100);assert.equal(statusFor(entries,order.customer_phone,config).points,20);});
test('cancelamento preserva rastreabilidade e permite saldo negativo',()=>{const entries=[];appendEntry(entries,order,'earn',120);appendEntry(entries,order,'redeem',-100);appendEntry(entries,order,'reverse_earn',-120);appendEntry(entries,order,'refund_redeem',100);assert.equal(statusFor(entries,order.customer_phone,config).points,0);assert.equal(appendEntry(entries,order,'reverse_earn',-120),false);});
test('pedido abaixo do mínimo não pontua',()=>assert.equal(awardPoints({...order,subtotal:44.9},config),0));
