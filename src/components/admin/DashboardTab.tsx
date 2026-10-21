import { SalesDiagnostic } from './SalesDiagnostic';
import { receivableTotal as sumReceivables } from '../../domain/receivables';
import { businessDate, shiftCalendarDate, formatBusinessDateTime } from '../../domain/businessDates';
import React, { useState } from 'react';
import { Order, Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { DollarSign, ShoppingBag, Clock, TrendingUp, Calendar, CheckCircle, Wallet, AlertTriangle, UsersRound } from 'lucide-react';
import { StorageService } from '../../services/storageService';

interface DashboardTabProps {
  orders: Order[];
  products: Product[];
  onSelectOrder: (order: Order) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ orders, products, onSelectOrder }) => {
  const [period, setPeriod] = useState<'today' | 'yesterday' | '7days' | '30days' | 'all'>('today');

  const now = new Date();
  const todayStr = businessDate(now);

  const yesterdayStr = shiftCalendarDate(todayStr,-1);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const filteredOrders = orders.filter(o => {
    if (period === 'all') return true;
    const orderDate = new Date(o.created_at);
    const orderDateStr = businessDate(orderDate);

    if (period === 'today') return orderDateStr === todayStr;
    if (period === 'yesterday') return orderDateStr === yesterdayStr;
    if (period === '7days') return orderDate >= sevenDaysAgo;
    if (period === '30days') return orderDate >= thirtyDaysAgo;
    return true;
  });

  const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');
  const deliveredRevenue = deliveredOrders.reduce((acc, o) => acc + (o.total || 0), 0);

  // Pagamentos confirmados de fato (baixa dada pelo financeiro)
  const paidOrders = filteredOrders.filter(o => o.payment_status === 'confirmed');
  const confirmedPaymentRevenue = paidOrders.reduce((acc, o) => acc + (o.total || 0), 0);

  const totalOrdersCount = filteredOrders.length;
  const pendingCount = filteredOrders.filter(o => o.status === 'pending' || o.status === 'new').length;
  const preparingCount = filteredOrders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length;
  const deliveringCount = filteredOrders.filter(o => o.status === 'ready' || o.status === 'delivering').length;
  const deliveredCount = deliveredOrders.length;
  const cancelledCount = filteredOrders.filter(o => o.status === 'cancelled').length;

  const avgTicket = deliveredOrders.length > 0 ? deliveredRevenue / deliveredOrders.length : 0;

  // O resumo operacional usa somente os pedidos do período selecionado.
  const operationalStages = [
    { label: 'Aguardando', count: pendingCount, color: '#d97706', background: '#fffbeb' },
    { label: 'Em preparo', count: preparingCount, color: '#ea580c', background: '#fff7ed' },
    { label: 'Prontos / em rota', count: deliveringCount, color: '#2563eb', background: '#eff6ff' },
    { label: 'Concluídos', count: deliveredCount, color: '#16a34a', background: '#f0fdf4' },
    { label: 'Cancelados', count: cancelledCount, color: '#64748b', background: '#f8fafc' },
  ];
  const activeOrdersCount = pendingCount + preparingCount + deliveringCount;
  const recentOrders = [...filteredOrders].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  }).slice(0, 6);

  // Visão do caixa de vendas avulsas/fiado: saldo calculado a partir do livro financeiro.
  const manualSales = StorageService.getSales() as Array<{ id: string; customer_name?: string; customer_phone?: string; total?: number; paid_amount?: number; payment_status?: string; due_date?: string; created_at?: string }>;
  const validManualSales = manualSales.filter(s => s.payment_status !== 'cancelled');
  const receivableSales = validManualSales.filter(s => s.payment_status !== 'paid' && Number(s.total || 0) > Number(s.paid_amount || 0));
  const receivableTotal = sumReceivables(receivableSales);
  const overdueSales = receivableSales.filter(sale => Boolean(sale.due_date) && String(sale.due_date).slice(0, 10) < todayStr);
  const overdueTotal = sumReceivables(overdueSales);
  const debtorsCount = new Set(receivableSales.map(sale => String(sale.customer_phone || sale.customer_name || sale.id).replace(/\D/g, '') || sale.id)).size;

  // Most sold products
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  deliveredOrders.forEach((o: Order) => {
    if (o.status === 'cancelled') return;
    o.items?.forEach((item: any) => {
      if (!productSalesMap[item.product_name]) {
        productSalesMap[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 };
      }
      productSalesMap[item.product_name].qty += item.quantity;
      productSalesMap[item.product_name].revenue += item.subtotal;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

    const periodLabel={today:'Hoje',yesterday:'Ontem','7days':'Últimos 7 dias','30days':'Últimos 30 dias',all:'Todos os pedidos'}[period];
  const statusPresentation={new:{label:'Novo',background:'#fffbeb',color:'#b45309'},pending:{label:'Pendente',background:'#fffbeb',color:'#b45309'},confirmed:{label:'Confirmado',background:'#fff7ed',color:'#c2410c'},preparing:{label:'Preparando',background:'#fff7ed',color:'#c2410c'},ready:{label:'Pronto',background:'#eff6ff',color:'#1d4ed8'},delivering:{label:'Em rota',background:'#eff6ff',color:'#1d4ed8'},delivered:{label:'Entregue',background:'#f0fdf4',color:'#15803d'},cancelled:{label:'Cancelado',background:'#f8fafc',color:'#64748b'}};
  const jumpTo=(id:string)=>{const target=document.getElementById(id);target?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});target?.focus({preventScroll:true});};
  return (
    <div className="admin-dashboard" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header & Filter Bar */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }} data-admin-ui="toolbar">
        <div>
          <span className="dashboard-eyebrow">SUA LOJA, EM RESUMO</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Visão geral
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
            Acompanhe os pedidos, os recebimentos e o desempenho da sua loja.
          </p>
        </div>

        {/* Period Filter Buttons */}
        <div className="dashboard-periods" role="group" aria-label="Período dos indicadores" style={{ display: 'flex', gap: 6, backgroundColor: '#f1f5f9', padding: 4, borderRadius: 10 }}>
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'yesterday', label: 'Ontem' },
            { id: '7days', label: '7 dias' },
            { id: '30days', label: '30 dias' },
            { id: 'all', label: 'Todos' }
          ].map(btn => (
            <button
              key={btn.id}
              type="button"
              aria-pressed={period === btn.id}
              onClick={() => setPeriod(btn.id as typeof period)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 600,
                background: period === btn.id ? '#ffffff' : 'transparent',
                color: period === btn.id ? '#0f172a' : '#64748b',
                boxShadow: period === btn.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
             data-admin-ui="button">
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-scope" role="status"><strong>{periodLabel}</strong><span>Indicadores por data de criação do pedido · Horário da Bahia</span></div>
      <nav className="dashboard-jumps" aria-label="Atalhos do resumo"><button type="button" onClick={()=>jumpTo('dashboard-recent')}>Pedidos recentes</button><button type="button" onClick={()=>jumpTo('dashboard-receivables')}>Fiado e recebíveis</button><button type="button" onClick={()=>jumpTo('dashboard-products')}>Mais vendidos</button></nav>
      {/* Metrics Cards Grid */}
      <div className="dashboard-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }} data-admin-ui="grid">
        {/* Vendas Concluídas (Entregues) */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#dcfce7',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Vendas Concluídas ({deliveredCount})</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              {formatCurrency(deliveredRevenue)}
            </h3>
            <small style={{ fontSize: '0.7rem', color: '#64748b' }}>Pedidos com entrega concluída</small>
          </div>
        </div>

        {/* Pagamentos Confirmados (Caixa) */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #a7f3d0'
          }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Caixa Recebido ({paidOrders.length})</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
              {formatCurrency(confirmedPaymentRevenue)}
            </h3>
            <small style={{ fontSize: '0.7rem', color: '#64748b' }}>Pagamentos conferidos</small>
          </div>
        </div>

        {/* Total Orders */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#eff6ff',
            color: '#1d4ed8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Total de Pedidos</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              {totalOrdersCount}
            </h3>
            <small style={{ fontSize: '0.7rem', color: '#64748b' }}>{pendingCount} em aberto</small>
          </div>
        </div>

        {/* Average Ticket */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#fef3c7',
            color: '#b45309',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Ticket Médio (Concluídos)</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              {formatCurrency(avgTicket)}
            </h3>
            <small style={{ fontSize: '0.7rem', color: '#64748b' }}>Por pedido entregue</small>
          </div>
        </div>
      </div>

      {/* Resumo visual do fluxo: sem modificar o estado dos pedidos */}
      <section className="dashboard-flow" aria-label="Fluxo operacional dos pedidos">
        <div className="dashboard-flow-heading">
          <div>
            <span className="dashboard-eyebrow">PEDIDOS DO PERÍODO</span>
            <h3>Fluxo de pedidos</h3>
            <p>Distribuição dos pedidos no período selecionado.</p>
          </div>
          <div className="dashboard-flow-active" aria-label={`${activeOrdersCount} pedidos em andamento`}>
            <strong>{activeOrdersCount}</strong>
            <span>em andamento</span>
          </div>
        </div>
        <div className="dashboard-flow-track" role="img" aria-label={operationalStages.map(stage => `${stage.label}: ${stage.count}`).join('; ')}>
          {operationalStages.filter(stage => stage.count > 0).map(stage => (
            <div key={stage.label} style={{ width: `${stage.count / Math.max(totalOrdersCount, 1) * 100}%`, background: stage.color }} title={`${stage.label}: ${stage.count}`} />
          ))}
        </div>
        <div className="dashboard-flow-grid">
          {operationalStages.map(stage => (
            <div className="dashboard-flow-stage" key={stage.label} style={{ background: stage.background }}>
              <span className="dashboard-flow-dot" style={{ background: stage.color }} aria-hidden="true" />
              <span>{stage.label}</span>
              <strong>{stage.count}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* Controle rápido de vendas avulsas e fiado */}
      <section id="dashboard-receivables" className="dashboard-receivables" tabIndex={-1} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }} aria-label="Resumo de fiado e recebíveis" data-admin-ui="grid">
        <header className="dashboard-receivables-heading"><span className="dashboard-eyebrow">SALDOS ATUAIS</span><h3>Fiado e recebíveis</h3><p>Todos os saldos em aberto de vendas avulsas, independentemente do período escolhido acima.</p></header>
        <div className="card" style={{ padding: 18, border: '1px solid #fed7aa', background: 'linear-gradient(135deg,#fff7ed,#ffffff)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#9a3412', fontWeight: 700, fontSize: '.82rem' }}><Wallet size={18}/> A receber (vendas avulsas)</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#9a3412', marginTop: 8 }}>{formatCurrency(receivableTotal)}</div>
          <small style={{ color: '#7c6252' }}>{receivableSales.length} venda(s) com saldo em aberto · {debtorsCount} cliente(s)</small>
        </div>
        <div className="card" style={{ padding: 18, border: overdueSales.length ? '1px solid #fecaca' : '1px solid #e2e8f0', background: overdueSales.length ? 'linear-gradient(135deg,#fef2f2,#ffffff)' : '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: overdueSales.length ? '#b91c1c' : '#475569', fontWeight: 700, fontSize: '.82rem' }}><AlertTriangle size={18}/> Fiado vencido</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: overdueSales.length ? '#b91c1c' : '#0f172a', marginTop: 8 }}>{formatCurrency(overdueTotal)}</div>
          <small style={{ color: '#64748b' }}>{overdueSales.length} venda(s) vencida(s) com saldo pendente</small>
        </div>
        <div className="card" style={{ padding: 18, border: '1px solid #bfdbfe', background: 'linear-gradient(135deg,#eff6ff,#ffffff)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#1d4ed8', fontWeight: 700, fontSize: '.82rem' }}><UsersRound size={18}/> Clientes com saldo</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1d4ed8', marginTop: 8 }}>{debtorsCount}</div>
          <small style={{ color: '#64748b' }}>Clientes com vendas avulsas ainda não quitadas</small>
        </div>
      </section>

      {overdueSales.length > 0 && (
        <section className="card" style={{ padding: 18, border: '1px solid #fecaca' }} aria-label="Vendas com fiado vencido">
          <h3 style={{ margin: '0 0 12px', color: '#991b1b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={18}/> Atenção: fiado vencido</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {overdueSales.slice().sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))).slice(0, 5).map(sale => (
              <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 12px', background: '#fff7f7', borderRadius: 10 }} data-admin-ui="toolbar">
                <div><strong style={{ color: '#7f1d1d' }}>{sale.customer_name || 'Cliente não identificado'}</strong><div style={{ fontSize: '.78rem', color: '#64748b' }}>Venceu em {new Date(`${String(sale.due_date).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')}</div></div>
                <strong style={{ color: '#b91c1c' }}>{formatCurrency(Math.max(0, Number(sale.total || 0) - Number(sale.paid_amount || 0)))}</strong>
              </div>
            ))}
          </div>
          {overdueSales.length > 5 && <small style={{ display: 'block', marginTop: 8, color: '#64748b' }}>Exibindo os 5 vencimentos mais antigos de {overdueSales.length} vendas vencidas.</small>}
        </section>
      )}

      {/* Two Column Grid: Top Products & Recent Orders */}
      <SalesDiagnostic orders={filteredOrders}/>
      <div className="dashboard-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,340px), 1fr))', gap: 20 }} data-admin-ui="grid">
        {/* Recent Orders */}
        <section id="dashboard-recent" tabIndex={-1} className="card dashboard-recent" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>
            Pedidos recentes
          </h3>

          <p className="dashboard-section-note">Até seis pedidos mais recentes no período. Selecione um cartão para acessar o gerenciamento de pedidos.</p>
          {filteredOrders.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Nenhum pedido neste período.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentOrders.map(order => (
                <button
                  type="button"
                  className="dashboard-recent-order"
                  aria-label={`Ver pedidos — ${order.order_number}, ${order.customer_name}, ${statusPresentation[order.status]?.label || order.status}`}
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                 data-admin-ui="button">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: '#b91c1c', fontSize: '0.9rem' }}>
                        #{order.order_number}
                      </span>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>
                        {order.customer_name}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {order.delivery_type === 'delivery' ? `Entrega (${order.neighborhood_name || 'Bairro'})` : 'Retirada'} • {formatBusinessDateTime(order.created_at)}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      {formatCurrency(order.total)}
                    </span>
                    <div>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: statusPresentation[order.status]?.background || '#f8fafc',
                        color: statusPresentation[order.status]?.color || '#475569'
                      }}>
                        {statusPresentation[order.status]?.label || order.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
        {/* Top Selling Products */}
        <section id="dashboard-products" tabIndex={-1} className="card dashboard-products" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>
            Mais vendidos no período
          </h3>

          <p className="dashboard-section-note">Produtos de pedidos entregues no período selecionado.</p>
          {topProducts.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Nenhum produto vendido ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topProducts.map((p, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: idx === 0 ? '#f59e0b' : '#cbd5e1',
                      color: idx === 0 ? '#fff' : '#334155',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                      {p.name}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                      {p.qty} un
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {formatCurrency(p.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
