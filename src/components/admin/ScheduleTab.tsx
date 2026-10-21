import { normalizeAdminSearch } from '../../domain/adminInput';
import { businessDate, formatBusinessDate, calendarDate } from '../../domain/businessDates';
import { scheduleDateRange } from '../../domain/schedule';
import React, { useState } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Calendar, Clock, MapPin, User, CheckCircle, Printer } from 'lucide-react';

interface ScheduleTabProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onPrintOrder?: (order: Order) => void;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ orders, onSelectOrder, onPrintOrder }) => {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'week' | 'month'>('today');

  const [query,setQuery]=useState('');
  const [delivery,setDelivery]=useState<'all'|'delivery'|'pickup'>('all');
  const range = scheduleDateRange(businessDate(), filter);
  const scheduledOrders = orders.filter(order => {
    const day = calendarDate(order.preorder_date);
    return !!day && day >= range.start && day <= range.end;
  }).sort((a,b) => `${a.preorder_date} ${a.preorder_time || ''}`.localeCompare(`${b.preorder_date} ${b.preorder_time || ''}`));

  const visibleOrders=scheduledOrders.filter(order=>normalizeAdminSearch(`${order.order_number} ${order.customer_name} ${order.neighborhood_name||''}`).includes(normalizeAdminSearch(query))&&(delivery==='all'||order.delivery_type===delivery));

  return (
    <div className="admin-schedule-polish" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }} data-admin-ui="toolbar">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Agenda de Encomendas
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
            Pedidos programados e agendados com antecedência.
          </p>
        </div>

        <div className="schedule-periods" role="group" aria-label="Período da agenda" style={{ display: 'flex', gap: 6, backgroundColor: '#f1f5f9', padding: 4, borderRadius: 10 }}>
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'tomorrow', label: 'Amanhã' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mês' }
          ].map(btn => (
            <button
              key={btn.id}
              type="button"
              aria-pressed={filter === btn.id}
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
             data-admin-ui="button">
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="catalog-agenda-filters"><label>Buscar encomenda<input type="search" aria-label="Buscar encomendas" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cliente, número ou bairro" data-admin-ui="field"/></label><div role="group" aria-label="Tipo de atendimento da agenda">{([['all','Todos'],['delivery','Entrega'],['pickup','Retirada']] as const).map(([id,label])=><button key={id} type="button" aria-pressed={delivery===id} onClick={()=>setDelivery(id)} data-admin-ui="button">{label}</button>)}</div><p role="status">{visibleOrders.length} de {scheduledOrders.length} encomendas no período</p></div>
      <p className="schedule-range" role="status">{formatBusinessDate(range.start)} a {formatBusinessDate(range.end)} · Horário da Bahia · Semana de segunda a domingo</p>
      {visibleOrders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#94a3b8',
          backgroundColor: '#ffffff',
          borderRadius: 16,
          border: '1px dashed #cbd5e1'
        }} data-admin-ui="panel">
          <Calendar size={48} strokeWidth={1.5} style={{ marginBottom: 12, color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569' }}>
            {scheduledOrders.length?'Nenhuma encomenda corresponde aos filtros':'Nenhuma encomenda agendada para este período'}
          </h3>
          {scheduledOrders.length>0&&<button type="button" onClick={()=>{setQuery('');setDelivery('all');}} data-admin-ui="button">Limpar filtros</button>}
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>
            Quando clientes fizerem encomendas com data e horário programados, elas aparecerão listadas aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,340px), 1fr))', gap: 16 }} data-admin-ui="grid">
          {visibleOrders.map(order => (
            <div
              key={order.id}
              role="button"
              tabIndex={0}
              aria-label={`Ver pedidos — encomenda ${order.order_number} de ${order.customer_name}`}
              onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelectOrder(order);}}}
              onClick={() => onSelectOrder(order)}
              className="card schedule-order-card"
              style={{ padding: 16, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, color: '#b91c1c' }}>
                  Pedido #{order.order_number}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {onPrintOrder && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrintOrder(order);
                      }}
                      title="Imprimir comanda do pedido agendado"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        padding: '3px 8px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}
                      data-admin-ui="button"
                    >
                      <Printer size={12} style={{ color: '#dc2626' }} />
                      <span>Imprimir</span>
                    </button>
                  )}
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
                    {formatBusinessDate(order.preorder_date)} · {order.preorder_time || 'Horário não informado'}
                  </span>
                </div>
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
