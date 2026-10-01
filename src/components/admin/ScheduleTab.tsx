import React, { useState } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Calendar, Clock, MapPin, User, CheckCircle } from 'lucide-react';

interface ScheduleTabProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ orders, onSelectOrder }) => {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'week' | 'month'>('today');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const scheduledOrders = orders.filter(o => {
    if (!o.preorder_date) return false;
    if (filter === 'today') return o.preorder_date === todayStr;
    if (filter === 'tomorrow') return o.preorder_date === tomorrowStr;
    return true;
  });

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Agenda de Encomendas
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
            Pedidos programados e agendados com antecedência.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, backgroundColor: '#f1f5f9', padding: 4, borderRadius: 10 }}>
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'tomorrow', label: 'Amanhã' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mês' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id as typeof filter)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 600,
                background: filter === btn.id ? '#ffffff' : 'transparent',
                color: filter === btn.id ? '#0f172a' : '#64748b',
                boxShadow: filter === btn.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {scheduledOrders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#94a3b8',
          backgroundColor: '#ffffff',
          borderRadius: 16,
          border: '1px dashed #cbd5e1'
        }}>
          <Calendar size={48} strokeWidth={1.5} style={{ marginBottom: 12, color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569' }}>
            Nenhuma encomenda agendada para este período
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>
            Quando clientes fizerem encomendas com data e horário programados, elas aparecerão listadas aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {scheduledOrders.map(order => (
            <div
              key={order.id}
              onClick={() => onSelectOrder(order)}
              className="card"
              style={{ padding: 16, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, color: '#b91c1c' }}>
                  Pedido #{order.order_number}
                </span>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#1d4ed8',
                  background: '#eff6ff',
                  padding: '2px 8px',
                  borderRadius: 6
                }}>
                  <Clock size={12} />
                  {order.preorder_date} às {order.preorder_time || '18:00'}
                </span>
              </div>

              <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#1e293b' }}>
                {order.customer_name}
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                {order.delivery_type === 'delivery' ? `Entrega em ${order.neighborhood_name}` : 'Retirada no Balcão'}
              </p>

              <div style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700
              }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {order.items?.length || 0} item(ns)
                </span>
                <span style={{ fontSize: '1rem', color: '#0f172a' }}>
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
