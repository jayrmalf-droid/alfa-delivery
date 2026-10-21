import { safeCsvCell } from '../../domain/adminInput';
import { receivableTotal } from '../../domain/receivables';
import { businessMonth, shiftCalendarMonth } from '../../domain/businessDates';
import React, { useMemo, useState } from 'react';
import { cache, onApiChange } from '../../services/api';

const brl = (v:number) => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const monthNow = () => businessMonth();
const csvCell=safeCsvCell;
const monthLabel=(m:string)=>{const [y,n]=m.split('-');return `${n}/${y}`;};
const card:React.CSSProperties={padding:14,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10};
const n=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
type Row={month:string;receipts:number;expenses:number;result:number;};
export const FinancialDashboard:React.FC=()=>{
 const [,refresh]=useState(0);
 React.useEffect(()=>onApiChange(()=>refresh(x=>x+1)),[]);
 const [selected,setSelected]=useState(monthNow);
 const sales:any[]=Array.isArray(cache.alfa_sales)?cache.alfa_sales:[];
 const orders:any[]=Array.isArray(cache.alfa_orders)?cache.alfa_orders:[];
 const expenses:any[]=Array.isArray(cache.alfa_expenses)?cache.alfa_expenses:[];
 const months=useMemo(()=>Array.from({length:6},(_,i)=>{return shiftCalendarMonth(selected,i-5);}),[selected]);
 const rows:Row[]=months.map(month=>{
  const saleReceipts=sales.filter(s=>s.payment_status!=='cancelled').reduce((sum,s)=>sum+(Array.isArray(s.payments)?s.payments:[]).filter((pay:any)=>businessMonth(pay.created_at)===month).reduce((acc:number,pay:any)=>acc+n(pay.amount),0),0);
  const orderReceipts=orders.filter(o=>o.status!=='cancelled'&&o.payment_status==='confirmed'&&businessMonth(o.payment_confirmed_at)===month).reduce((sum,o)=>sum+n(o.total),0);
  const paidExpenses=expenses.filter(e=>e.status==='paid'&&String(e.paid_date||'').slice(0,7)===month).reduce((sum,e)=>sum+n(e.amount),0);
  return {month,receipts:saleReceipts+orderReceipts,expenses:paidExpenses,result:saleReceipts+orderReceipts-paidExpenses};
 });
 const active=rows[5];
 const previous=rows[4];
 const debt=receivableTotal(sales);
 const pending=expenses.filter(e=>e.status==='pending').reduce((sum,e)=>sum+n(e.amount),0);
 const categories=Object.entries(expenses.filter(e=>e.status==='paid'&&String(e.paid_date||'').slice(0,7)===selected).reduce<Record<string,number>>((acc,e)=>{const name=String(e.category||'Sem categoria');acc[name]=(acc[name]||0)+n(e.amount);return acc;},{})).sort((a,b)=>b[1]-a[1]);
 const max=Math.max(1,...rows.flatMap(r=>[r.receipts,r.expenses]));
 const exportCsv=()=>{
  const data=[['Mês','Recebimentos datados (R$)','Despesas pagas (R$)','Resultado parcial (R$)'],...rows.map(r=>[r.month,r.receipts.toFixed(2),r.expenses.toFixed(2),r.result.toFixed(2)]),[],['Categoria','Despesas pagas no mês (R$)'],...categories.map(([c,v])=>[c,v.toFixed(2)]),[],['Fiado pendente atual (R$)',debt.toFixed(2)],['Despesas pendentes atuais (R$)',pending.toFixed(2)]];
  const blob=new Blob(['\uFEFF'+data.map(r=>r.map(csvCell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`alfa-painel-financeiro-${selected}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return <section className="finance-manager" style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:18,marginBottom:16}} data-admin-ui="panel">
  <h3 style={{marginTop:0}}>Painel financeiro gerencial</h3>
  <p style={{color:'#64748b'}}>Visão dos últimos seis meses até o mês escolhido. Somente recebimentos com data registrada entram no resultado.</p>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'end',marginBottom:16}} data-admin-ui="toolbar"><label>Mês de referência <input type="month" value={selected} onChange={e=>setSelected(e.target.value)} style={{display:'block',padding:9,border:'1px solid #cbd5e1',borderRadius:8}} data-admin-ui="field"/></label><button type="button" onClick={exportCsv} style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8,cursor:'pointer'}} data-admin-ui="button">Exportar painel CSV</button></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:12}} data-admin-ui="grid">{[['Recebimentos no mês',active.receipts],['Despesas pagas no mês',active.expenses],['Resultado parcial no mês',active.result],['Fiado a receber (atual)',debt],['Contas a pagar (atual)',pending]].map(([label,value])=><div key={String(label)} style={card}><small>{label}</small><strong style={{display:'block',fontSize:19,marginTop:8}}>{brl(Number(value))}</strong></div>)}</div>
  <p style={{color:'#475569'}}>Comparação com {monthLabel(previous.month)}: recebimentos {brl(active.receipts-previous.receipts)} de diferença; despesas {brl(active.expenses-previous.expenses)} de diferença; resultado {brl(active.result-previous.result)} de diferença.</p>
  <h4>Recebimentos e despesas — últimos 6 meses</h4><div className="finance-chart" tabIndex={0} role="region" aria-label="Recebimentos e despesas dos últimos seis meses; role horizontalmente" style={{display:'flex',gap:12,alignItems:'end',minHeight:180,overflowX:'auto'}}>{rows.map(r=><div key={r.month} style={{flex:'1 0 78px',textAlign:'center'}} title={`${monthLabel(r.month)}: recebimentos ${brl(r.receipts)}, despesas ${brl(r.expenses)}`}><div style={{height:140,display:'flex',alignItems:'end',justifyContent:'center',gap:5,borderBottom:'1px solid #cbd5e1'}}><div style={{width:23,height:`${Math.max(r.receipts>0?3:0,r.receipts/max*130)}px`,background:'#0f766e',borderRadius:'4px 4px 0 0'}}/><div style={{width:23,height:`${Math.max(r.expenses>0?3:0,r.expenses/max*130)}px`,background:'#d97706',borderRadius:'4px 4px 0 0'}}/></div><small>{monthLabel(r.month)}</small><div className="finance-chart-values">Entradas: {brl(r.receipts)}<br/>Despesas: {brl(r.expenses)}</div><div style={{fontSize:11}}>Resultado: {brl(r.result)}</div></div>)}</div><p style={{fontSize:12,color:'#64748b'}}>■ Verde: recebimentos datados. ■ Laranja: despesas pagas. Passe o mouse sobre as colunas para conferir os valores.</p>
  <h4>Despesas pagas por categoria — {monthLabel(selected)}</h4>{categories.length===0?<p>Nenhuma despesa paga neste mês.</p>:<div style={{overflowX:'auto'}} tabIndex={0} role="region" aria-label="Tabela de dados — role para ver todas as colunas" data-admin-ui="table-scroll"><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={{textAlign:'left'}}>Categoria</th><th style={{textAlign:'right'}}>Valor</th></tr></thead><tbody>{categories.map(([category,total])=><tr key={category}><td style={{padding:8,borderBottom:'1px solid #e2e8f0'}}>{category}</td><td style={{padding:8,textAlign:'right',borderBottom:'1px solid #e2e8f0'}}>{brl(total)}</td></tr>)}</tbody></table></div>}
  <p style={{fontSize:12,color:'#64748b'}}>Resultado parcial = recebimentos registrados − despesas efetivamente pagas. Não é lucro líquido. Pedidos antigos sem data confiável de confirmação não são somados; pendências de fiado e contas a pagar são saldos atuais, não históricos do mês. Vendas e pedidos cancelados são excluídos.</p>
 </section>;
};
