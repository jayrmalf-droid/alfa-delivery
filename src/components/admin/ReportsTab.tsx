import { SalesDiagnostic } from './SalesDiagnostic';
import { safeCsvCell as csvCell } from '../../domain/adminInput';
import { businessDate, businessMonth, shiftCalendarDate, inBusinessDateRange, formatBusinessDateTime, calendarDate, formatBusinessDate } from '../../domain/businessDates';
import React, { useMemo, useState, useId } from 'react';
import { SalesIntelligence } from './SalesIntelligence';
import { SalesGoals } from './SalesGoals';
import type { Order } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Download, FileSpreadsheet, CalendarDays, Wallet, ShoppingBag, BadgePercent, CreditCard, BarChart3, Trophy, TrendingUp, Users, Package, CheckCircle2 } from 'lucide-react';
import './reportsPremium.css';

interface Props { orders: Order[]; }
const todayISO = () => businessDate();
const monthStartISO = () => `${businessMonth()}-01`;
const statusLabel = (status: string) => ({new:'Novo',pending:'Pendente',confirmed:'Confirmado',preparing:'Em produção',ready:'Pronto',delivering:'Em entrega',delivered:'Entregue',cancelled:'Cancelado'} as Record<string,string>)[status] || status;
const paymentLabel = (method: string) => ({pix:'Pix',cash:'Dinheiro',credit:'Crédito',debit:'Débito'} as Record<string,string>)[method] || method || 'Não informado';

export const ReportsTab: React.FC<Props> = ({ orders }) => {
  const [activePanel, setActivePanel] = useState('summary');
  const panelId = useId();
  const panels = [{id:'summary',label:'Resumo do período'},{id:'goals',label:'Metas mensais'},{id:'intelligence',label:'Comparações'}];
  const [startDate, setStartDate] = useState(monthStartISO);
  const [endDate, setEndDate] = useState(todayISO);
  const [status, setStatus] = useState('all');
  const [productRanking, setProductRanking] = useState<'quantity' | 'revenue'>('quantity');
  const validRange = !!calendarDate(startDate) && !!calendarDate(endDate) && startDate <= endDate;
  const filtered = useMemo(() => orders.filter(order => {
    return inBusinessDateRange(order.created_at, startDate, endDate) && (status === 'all' || order.status === status);
  }).sort((a,b) => String(b.created_at).localeCompare(String(a.created_at))), [orders, startDate, endDate, status]);
  const nonCancelled = filtered.filter(o => o.status !== 'cancelled');
  const delivered = nonCancelled.filter(o => o.status === 'delivered');
  const received = nonCancelled.filter(o => o.payment_status === 'confirmed');
  const discounts = nonCancelled.reduce((sum,o) => sum + Number(o.discount_value || 0) + Number(o.loyalty_discount || 0), 0);
  const salesTotal = nonCancelled.reduce((sum,o) => sum + Number(o.total || 0), 0);
  const confirmedTotal = received.reduce((sum,o) => sum + Number(o.total || 0), 0);
  const byPayment = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    nonCancelled.forEach(o => { const key = paymentLabel(o.payment_method); const old = map.get(key) || {count:0,total:0}; map.set(key,{count:old.count+1,total:old.total+Number(o.total||0)}); });
    return [...map.entries()].sort((a,b)=>b[1].total-a[1].total);
  }, [nonCancelled]);
  const byProduct = useMemo(() => {
    const map = new Map<string,{quantity:number; total:number}>();
    nonCancelled.forEach(o => (o.items || []).forEach(item => { const old=map.get(item.product_name)||{quantity:0,total:0}; map.set(item.product_name,{quantity:old.quantity+Number(item.quantity||0),total:old.total+Number(item.subtotal||0)}); }));
    return [...map.entries()].sort((a,b)=>productRanking === 'quantity' ? b[1].quantity-a[1].quantity : b[1].total-a[1].total).slice(0,10);
  }, [nonCancelled, productRanking]);
  const itemsSold = nonCancelled.reduce((sum,o)=>sum+(o.items||[]).reduce((q,item)=>q+Number(item.quantity||0),0),0);
  const customerCount = new Set(nonCancelled.map(o=>String(o.customer_phone||o.customer_name||o.id).trim()).filter(Boolean)).size;
  const avgTicket = nonCancelled.length ? salesTotal/nonCancelled.length : 0;
  const paymentMax = Math.max(1,...byPayment.map(([,v])=>v.total));
  const productMax = Math.max(1,...byProduct.map(([,v])=>productRanking==='quantity'?v.quantity:v.total));
  const choosePeriod = (days:number) => { setEndDate(todayISO()); const end=todayISO(); setStartDate(shiftCalendarDate(end,-days+1)); };
  const exportCSV = () => {
    if (!validRange) return;
    const rows = [['Pedido','Data e hora (Bahia)','Registro original','Cliente','Telefone','Status','Pagamento','Situação do pagamento','Subtotal','Taxa entrega','Desconto','Total','Cupom'], ...filtered.map(o => [o.order_number, formatBusinessDateTime(o.created_at), o.created_at, o.customer_name, o.customer_phone, statusLabel(o.status), paymentLabel(o.payment_method), o.payment_status === 'confirmed' ? 'Confirmado' : 'Pendente/Não confirmado', o.subtotal, o.delivery_fee, Number(o.discount_value||0)+Number(o.loyalty_discount||0), o.total, o.coupon_code || ''])];
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href=url; a.download=`relatorio-alfa-${startDate}-a-${endDate}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const cardStyle: React.CSSProperties = {background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:18,minWidth:0};
  const muted: React.CSSProperties = {color:'#64748b',fontSize:12,fontWeight:600};
  const th: React.CSSProperties = {padding:'11px 12px',textAlign:'left',fontSize:12,color:'#64748b',background:'#f8fafc',whiteSpace:'nowrap'};
  const td: React.CSSProperties = {padding:'12px',borderTop:'1px solid #f1f5f9',fontSize:13,color:'#334155',verticalAlign:'top'};
  return <div className="finance-refresh finance-reports reports-premium" style={{padding:24,display:'flex',flexDirection:'column',gap:20}}>
    <header className="rp-header" data-admin-ui="toolbar">
      <div className="rp-heading"><span className="rp-heading-icon"><BarChart3 size={25}/></span><div><div className="rp-eyebrow">PAINEL / FINANCEIRO</div><h2>Relatórios e metas</h2><p>Acompanhe o desempenho financeiro, analise seus pedidos e monitore suas metas.</p></div></div>
      {activePanel==='summary'&&<div className="rp-header-actions"><button className="rp-export" onClick={exportCSV} disabled={!validRange}><Download size={16}/> Exportar período CSV</button></div>}
    </header>
    <div className="rp-tabs" role="tablist" aria-label="Áreas de relatórios" onKeyDown={event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const index=panels.findIndex(panel=>panel.id===activePanel);
      const next=event.key==='Home'?0:event.key==='End'?panels.length-1:(index+(event.key==='ArrowRight'?1:-1)+panels.length)%panels.length;
      setActivePanel(panels[next].id);
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }}>{panels.map(panel=><button key={panel.id} type="button" role="tab" id={`${panelId}-${panel.id}-tab`} aria-controls={`${panelId}-${panel.id}-panel`} aria-selected={activePanel===panel.id} tabIndex={activePanel===panel.id?0:-1} onClick={()=>setActivePanel(panel.id)}>{panel.label}</button>)}</div>
    <section className="rp-section" role="tabpanel" id={`${panelId}-summary-panel`} aria-labelledby={`${panelId}-summary-tab`} hidden={activePanel!=='summary'} tabIndex={0}>
    <p className="rp-scope">Os filtros abaixo valem para os indicadores, gráficos, tabela e exportação desta aba. Metas e Comparações têm seus próprios períodos.</p>
    <section className="rp-filterbar" data-admin-ui="toolbar" aria-label="Filtros do relatório">
      <div className="rp-dates"><CalendarDays size={18}/><label>De <input aria-label="Data inicial" type="date" value={startDate} max={endDate} onChange={e=>setStartDate(e.target.value)}/></label><label>até <input aria-label="Data final" type="date" value={endDate} min={startDate} onChange={e=>setEndDate(e.target.value)}/></label></div>
      <div className="rp-presets"><button onClick={()=>choosePeriod(1)}>Hoje</button><button onClick={()=>choosePeriod(7)}>7 dias</button><button onClick={()=>choosePeriod(30)}>30 dias</button><button onClick={()=>{setStartDate(monthStartISO());setEndDate(todayISO());}}>Este mês</button></div>
      <label className="rp-status">Status <select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Todos os status</option><option value="new">Novo</option><option value="pending">Pendente</option><option value="confirmed">Confirmado</option><option value="preparing">Em produção</option><option value="ready">Pronto</option><option value="delivering">Em entrega</option><option value="delivered">Entregue</option><option value="cancelled">Cancelado</option></select></label>
      <span className="rp-filter-count" role="status">{filtered.length} pedido(s) no período</span>
    </section>
    {!validRange&&<p className="rp-range-error" role="alert">Informe as duas datas, com a data inicial anterior ou igual à final.</p>}
    {validRange&&<p className="rp-period-label">Período: <strong>{formatBusinessDate(startDate)} a {formatBusinessDate(endDate)}</strong> · Horário da Bahia</p>}
    {validRange && <SalesDiagnostic orders={filtered}/>}
    <div className="rp-kpis" data-admin-ui="grid">
      <div className="rp-kpi rp-green"><span className="rp-kpi-icon"><TrendingUp size={25}/></span><div><span>Vendas registradas</span><strong>{formatCurrency(salesTotal)}</strong><small>{nonCancelled.length} pedido(s) não cancelados</small></div></div>
      <div className="rp-kpi rp-blue"><span className="rp-kpi-icon"><CreditCard size={25}/></span><div><span>Ticket médio</span><strong>{formatCurrency(avgTicket)}</strong><small>Por pedido não cancelado</small></div></div>
      <div className="rp-kpi rp-orange"><span className="rp-kpi-icon"><Package size={25}/></span><div><span>Produtos vendidos</span><strong>{itemsSold}</strong><small>Unidades nos pedidos válidos</small></div></div>
      <div className="rp-kpi rp-purple"><span className="rp-kpi-icon"><Users size={25}/></span><div><span>Clientes atendidos</span><strong>{customerCount}</strong><small>Clientes distintos estimados</small></div></div>
    </div>
    <div className="rp-secondary-kpis" data-admin-ui="grid">
      <div><Wallet size={17}/><span>Recebimentos confirmados</span><strong>{formatCurrency(confirmedTotal)}</strong><small>{received.length} pagamento(s) confirmado(s)</small></div>
      <div><BadgePercent size={17}/><span>Descontos aplicados</span><strong>{formatCurrency(discounts)}</strong><small>Cupons e fidelidade</small></div>
      <div><CheckCircle2 size={17}/><span>Ticket médio entregue</span><strong>{formatCurrency(delivered.length ? delivered.reduce((s,o)=>s+Number(o.total||0),0)/delivered.length : 0)}</strong><small>{delivered.length} pedido(s) entregues</small></div>
    </div>
    <div className="rp-breakdown" data-admin-ui="grid">
      <section className="rp-panel"><h3><span className="rp-panel-icon rp-icon-red"><CreditCard size={20}/></span>Totais por forma de pagamento</h3>
        {byPayment.length===0?<p className="rp-empty">Sem dados para o filtro selecionado.</p>:byPayment.map(([name,value])=><div className="rp-payment-row" key={name}><div className="rp-payment-name"><strong>{name}</strong><small>{value.count} pedido(s)</small></div><div className="rp-progress"><span style={{width:`${Math.min(100,value.total/paymentMax*100)}%`}}/></div><span className="rp-percent">{salesTotal>0?(value.total/salesTotal*100).toFixed(0):0}%</span><strong className="rp-amount">{formatCurrency(value.total)}</strong></div>)}
      </section>
      <section className="rp-panel"><div className="rp-panel-head"><h3><span className="rp-panel-icon rp-icon-amber"><Trophy size={20}/></span>Produtos mais vendidos</h3><label>Ordenar por <select value={productRanking} onChange={e=>setProductRanking(e.target.value as 'quantity'|'revenue')}><option value="quantity">Quantidade</option><option value="revenue">Faturamento</option></select></label></div>
        {byProduct.length===0?<p className="rp-empty">Sem itens vendidos no período.</p>:byProduct.map(([name,value],i)=><div className="rp-product-row" key={name}><span className="rp-rank">{i+1}</span><div className="rp-product-name"><strong title={name}>{name}</strong><small>{value.quantity} unidade(s)</small></div><div className="rp-product-progress"><span style={{width:`${Math.min(100,(productRanking==='quantity'?value.quantity:value.total)/productMax*100)}%`}}/></div><strong className="rp-product-amount">{formatCurrency(value.total)}</strong></div>)}
      </section>
    </div>
    <section style={{...cardStyle,padding:0,overflow:'hidden'}}><div style={{padding:18,display:'flex',alignItems:'center',gap:8}}><FileSpreadsheet size={19} color="#0f766e"/><h3 style={{margin:0,fontSize:16,fontWeight:800,color:'#0f172a'}}>Detalhamento dos pedidos</h3></div><div style={{overflowX:'auto'}} tabIndex={0} role="region" aria-label="Tabela de dados — role para ver todas as colunas" data-admin-ui="table-scroll"><table style={{borderCollapse:'collapse',width:'100%',minWidth:850}}><thead><tr>{['Pedido / data','Cliente','Status','Pagamento','Desconto','Total'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{filtered.length===0?<tr><td colSpan={6} style={{...td,textAlign:'center',padding:30,color:'#94a3b8'}}>Nenhum pedido encontrado para os filtros escolhidos.</td></tr>:filtered.map(o=><tr key={o.id}><td style={td}><strong>#{o.order_number}</strong><div style={muted}>{o.created_at ? formatBusinessDateTime(o.created_at) : '—'}</div></td><td style={td}><strong>{o.customer_name}</strong><div style={muted}>{o.customer_phone}</div></td><td style={td}>{statusLabel(o.status)}</td><td style={td}>{paymentLabel(o.payment_method)}<div style={muted}>{o.payment_status==='confirmed'?'Recebido':'Não confirmado'}</div></td><td style={td}>{formatCurrency(Number(o.discount_value||0)+Number(o.loyalty_discount||0))}</td><td style={{...td,fontWeight:800,whiteSpace:'nowrap'}}>{formatCurrency(Number(o.total||0))}</td></tr>)}</tbody></table></div></section>
    <p style={{margin:0,color:'#64748b',fontSize:12,lineHeight:1.5}}>Observação: os indicadores deste relatório são calculados a partir dos pedidos carregados no painel. “Recebimentos confirmados” considera pedidos com pagamento confirmado, agrupados pela data de criação do pedido; não equivale a conciliação bancária. Cancelamentos são excluídos dos totais financeiros e permanecem no detalhamento. Datas e horários seguem o horário da Bahia; o CSV também preserva o registro original.</p>
    </section>
    <section className="rp-section" role="tabpanel" id={`${panelId}-goals-panel`} aria-labelledby={`${panelId}-goals-tab`} hidden={activePanel!=='goals'} tabIndex={0}><SalesGoals orders={orders} /></section>
    <section className="rp-section" role="tabpanel" id={`${panelId}-intelligence-panel`} aria-labelledby={`${panelId}-intelligence-tab`} hidden={activePanel!=='intelligence'} tabIndex={0}><p className="rp-scope">Comparações usam Hoje, Ontem, últimos 7 e 30 dias. O gráfico de horários usa todo o histórico carregado. O filtro do Resumo do período não altera esta aba.</p><SalesIntelligence orders={orders} /></section>
  </div>;
};
