import { localDate } from '../../domain/rules';
import React, { useState } from 'react';
import { Order, Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { DollarSign, ShoppingBag, Clock, TrendingUp, Calendar, CheckCircle } from 'lucide-react';

interface DashboardTabProps {
  orders: Order[];
  products: Product[];
  onSelectOrder: (order: Order) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ orders, products, onSelectOrder }) => {
  const [period, setPeriod] = useState<'today' | 'yesterday' | '7days' | '30days' | 'all'>('today');

  const now = new Date();
  const todayStr = localDate(now);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = localDate(yesterday);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const filteredOrders = orders.filter(o => {
    if (period === 'all') return true;
    const orderDate = new Date(o.created_at);
    const orderDateStr = localDate(orderDate);

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

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Dashboard Geral
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
            Visão consolidada de vendas e desempenho da Alfa Salgados.
          </p>
        </div>

        {/* Period Filter Buttons */}
        <div style={{ display: 'flex', gap: 6, backgroundColor: '#f1f5f9', padding: 4, borderRadius: 10 }}>
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'yesterday', label: 'Ontem' },
            { id: '7days', label: '7 dias' },
            { id: '30days', label: '30 dias' },
            { id: 'all', label: 'Todos' }
          ].map(btn => (
            <button
              key={btn.id}
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
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
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

      {/* Pedidos por Status */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', backgroundColor: '#f8fafc' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Distribuição de Pedidos:</span>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.78rem' }}>
          <span style={{ color: '#b91c1c' }}>• <strong>{pendingCount}</strong> Pendentes</span>
          <span style={{ color: '#d97706' }}>• <strong>{preparingCount}</strong> Em Produção</span>
          <span style={{ color: '#2563eb' }}>• <strong>{deliveringCount}</strong> Em Entrega</span>
          <span style={{ color: '#16a34a' }}>• <strong>{deliveredCount}</strong> Concluídos</span>
          <span style={{ color: '#64748b' }}>• <strong>{cancelledCount}</strong> Cancelados</span>
        </div>
      </div>

      {/* Two Column Grid: Top Products & Recent Orders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {/* Top Selling Products */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>
            Mais Vendidos no Cardápio
          </h3>

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
        </div>

        {/* Recent Orders */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>
            Pedidos Recentes
          </h3>

          {filteredOrders.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Nenhum pedido neste período.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredOrders.slice(0, 6).map(order => (
                <div
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
                >
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
                      {order.delivery_type === 'delivery' ? `Entrega (${order.neighborhood_name || 'Bairro'})` : 'Retirada'} • {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
                        background:
                          order.status === 'pending' ? '#fef3c7' :
                          order.status === 'preparing' ? '#ffedd5' :
                          order.status === 'delivering' ? '#dbeafe' :
                          order.status === 'delivered' ? '#dcfce7' : '#fee2e2',
                        color:
                          order.status === 'pending' ? '#b45309' :
                          order.status === 'preparing' ? '#c2410c' :
                          order.status === 'delivering' ? '#1d4ed8' :
                          order.status === 'delivered' ? '#15803d' : '#b91c1c'
                      }}>
                        {order.status === 'pending' ? 'Pendente' :
                         order.status === 'preparing' ? 'Preparando' :
                         order.status === 'delivering' ? 'Em Rota' :
                         order.status === 'delivered' ? 'Entregue' : 'Cancelado'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
