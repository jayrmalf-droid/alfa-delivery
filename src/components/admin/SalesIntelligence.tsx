import { businessDate, shiftCalendarDate, inBusinessDateRange, businessHour } from '../../domain/businessDates';
import React, { useMemo } from 'react';
import './goalsCharts.css';
import type { Order } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface Props { orders: Order[] }

const amount = (o: Order) => Number(o.total || 0);
const sum = (orders: Order[]) => orders.reduce((s,o)=>s+amount(o),0);
const percent = (current: number, previous: number) => previous === 0 ? (current === 0 ? '0%' : 'Sem base anterior') : `${current >= previous ? '+' : ''}${((current-previous)/previous*100).toFixed(1).replace('.',',')}%`;
const box: React.CSSProperties = {background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:18};
const muted: React.CSSProperties = {fontSize:12,color:'#64748b'};

export const SalesIntelligence: React.FC<Props> = ({orders}) => {
  const valid = useMemo(() => orders.filter(o => o.status !== 'cancelled'), [orders]);
  const today = businessDate();
  const periods = useMemo(() => {
    const daysAgo = (n: number) => shiftCalendarDate(today,-n);
    return [
    {label:'Hoje', from:daysAgo(0), to:daysAgo(0), prevFrom:daysAgo(1), prevTo:daysAgo(1)},
    {label:'Ontem', from:daysAgo(1), to:daysAgo(1), prevFrom:daysAgo(2), prevTo:daysAgo(2)},
    {label:'Últimos 7 dias', from:daysAgo(6), to:daysAgo(0), prevFrom:daysAgo(13), prevTo:daysAgo(7)},
    {label:'Últimos 30 dias', from:daysAgo(29), to:daysAgo(0), prevFrom:daysAgo(59), prevTo:daysAgo(30)},
  ].map(p => {
    const current = valid.filter(o => inBusinessDateRange(o.created_at,p.from,p.to));
    const previous = valid.filter(o => inBusinessDateRange(o.created_at,p.prevFrom,p.prevTo));
    return {...p, count:current.length, total:sum(current), ticket:current.length?sum(current)/current.length:0, change:percent(sum(current),sum(previous)), previousTotal:sum(previous)};
  }); },[valid,today]);
  const hours = useMemo(() => {
    const counts = Array.from({length:24},(_,hour)=>({hour,count:0,total:0}));
    valid.forEach(o => { const hour=businessHour(o.created_at); if(hour!==null&&hour>=0&&hour<24){counts[hour].count++;counts[hour].total+=amount(o);} });
    return counts;
  },[valid]);
  const max = Math.max(1,...hours.map(h=>h.count));
  const peak = [...hours].sort((a,b)=>b.count-a.count)[0];
  return <section style={{display:'flex',flexDirection:'column',gap:16}}>
    <div><h3 style={{margin:'0 0 4px',fontSize:20,color:'#0f172a'}}>Inteligência de vendas</h3><p style={{...muted,margin:0}}>Comparações por data do pedido, excluindo cancelados. Valores registrados, não necessariamente recebidos.</p></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12}} data-admin-ui="grid">{periods.map(p=><div key={p.label} style={box}><div style={{...muted,fontWeight:700}}>{p.label}</div><strong style={{fontSize:23,color:'#0f172a',display:'block',margin:'8px 0'}}>{formatCurrency(p.total)}</strong><div style={{fontSize:13,color:'#334155'}}>{p.count} pedidos · Ticket {formatCurrency(p.ticket)}</div><div style={{fontSize:13,marginTop:7,color:p.previousTotal>0?(p.total>=p.previousTotal?'#047857':'#b91c1c'):'#64748b',fontWeight:700}}>{p.change} vs. período anterior</div></div>)}</div>
    <div className="rp-hours-panel enhanced-hours" style={box}><div className="enhanced-hours-heading"><div><h4>Horários de maior movimento</h4><p>Pedidos agrupados por hora no horário da Bahia, considerando o histórico carregado.</p></div><div className="enhanced-peak"><span>Pico de movimento</span><strong>{peak?.count ? `${String(peak.hour).padStart(2,'0')}:00` : '—'}</strong><small>{peak?.count||0} pedido(s)</small></div></div><div className="enhanced-chart-layout"><div className="enhanced-axis" aria-hidden="true"><span>{max}</span><span>{Math.round(max/2)}</span><span>0</span></div><div className="enhanced-hour-chart" role="group" aria-label="Quantidade de pedidos por hora">{hours.map(h=><div className="enhanced-hour-slot" key={h.hour}><div className="enhanced-hour-column"><div className={`enhanced-hour-bar ${h.count>0&&h.count===peak.count?'is-peak':''}`} style={{height:`${h.count?Math.max(8,h.count/max*100):2}%`}} tabIndex={0} role="img" aria-label={`${String(h.hour).padStart(2,'0')}:00, ${h.count} pedido(s), ${formatCurrency(h.total)}`} title={`${String(h.hour).padStart(2,'0')}:00 — ${h.count} pedido(s) — ${formatCurrency(h.total)}`}/></div><span className="enhanced-hour-label">{h.hour%2===0?String(h.hour).padStart(2,'0'):''}</span></div>)}</div></div><p className="enhanced-chart-caption">Passe o cursor ou use Tab nas barras para consultar a quantidade de pedidos e o valor registrado. Cancelados são excluídos; os registros originais são preservados.</p></div>
  </section>;
};
