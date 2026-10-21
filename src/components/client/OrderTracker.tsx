import { useDialog } from '../../utils/useDialog';
import { orderTracking } from '../../domain/orderTracking';
import { formatBusinessDateTime, formatBusinessDate } from '../../domain/businessDates';
import { normalizePhone } from '../../domain/rules';
import React, { useState, useEffect } from 'react';
import { Order, StoreSettings, LoyaltyStatus } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { fetchLoyaltyStatus } from '../../services/api';
import { LoyaltyCard } from './LoyaltyCard';
import {
  X,
  Clock,
  UtensilsCrossed,
  Bike,
  CheckCircle,
  Phone,
  MessageCircle,
  MapPin
} from 'lucide-react';

interface OrderTrackerProps {
  order: Order | null;
  onClose: () => void;
  settings: StoreSettings;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({ order, onClose, settings }) => {
  const [loyaltyStatus, setLoyaltyStatus] = useState<LoyaltyStatus | null>(null);

  useEffect(() => {
    if (order?.customer_phone && settings.loyalty_enabled !== false) {
      let active = true;
      fetchLoyaltyStatus(order.customer_phone)
        .then(data => { if (active) setLoyaltyStatus(data); })
        .catch(() => {});
      return () => { active = false; };
    }
  }, [order?.customer_phone, settings.loyalty_enabled]);

  useDialog(!!order,onClose);
  if (!order) return null;

  const progress=orderTracking(order.status,order.delivery_type||'pickup');
  const steps=progress.stages.map(stage=>({...stage,icon:stage.key==='delivered'?CheckCircle:stage.key==='delivering'?Bike:stage.key==='preparing'?UtensilsCrossed:Clock}));
  const currentStep=progress.index;
  const isCancelled=progress.cancelled;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="order-tracker-title" className="order-tracker-backdrop" onClick={event=>{if(event.target===event.currentTarget)onClose();}} style={{
      position: 'fixed',
      inset: 0,
      zIndex: 80,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div
        className="card animate-fade-in order-tracker-sheet"
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary-darker) 100%)',
          color: '#fff'
        }}>
          <div>
            <h3 id="order-tracker-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              Acompanhar Pedido #{order.order_number}
            </h3>
            <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
              {settings.business_name || 'Alfa Salgados Delivery'}
            </span>
          </div>

          <button
            type="button"
            aria-label="Fechar acompanhamento do pedido"
            onClick={onClose}
            style={{
              padding: 6,
              borderRadius: '50%',
              color: '#fff',
              background: 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="order-tracker-content" style={{ padding: '24px 20px', overflowY: 'auto', flexGrow: 1 }}>
          <section className={`tracking-current ${isCancelled?'cancelled':''}`} role="status" aria-live="polite"><span>SITUAÇÃO DO PEDIDO</span><h4>{progress.title}</h4><p>{progress.description}</p></section>
          <p className="tracking-date">Pedido criado em {formatBusinessDateTime(order.created_at)} · Horário da Bahia</p>
          {order.preorder_date&&<p className="tracking-date">Agendado para {formatBusinessDate(order.preorder_date)} · {order.preorder_time||'Horário não informado'}</p>}
          {!isCancelled && (
            /* Timeline */
            <div className="tracking-timeline" role="list" aria-label="Etapas do pedido" style={{ marginBottom: 24, padding: '0 10px' }}>
              {steps.map((step, idx) => {
                const IconComponent = step.icon;
                const isPassed = idx <= currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={step.key} role="listitem" aria-current={isCurrent?'step':undefined} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                    {/* Vertical line */}
                    {idx < steps.length - 1 && (
                      <div style={{
                        position: 'absolute',
                        left: 17,
                        top: 36,
                        bottom: -10,
                        width: 2,
                        backgroundColor: idx < currentStep ? '#16a34a' : '#e2e8f0',
                        zIndex: 1
                      }} />
                    )}

                    {/* Step Icon */}
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: isPassed ? (isCurrent ? 'var(--color-primary-dark)' : '#16a34a') : '#f1f5f9',
                      color: isPassed ? '#fff' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      boxShadow: isCurrent ? '0 0 0 4px var(--color-primary-glow)' : 'none',
                      flexShrink: 0
                    }}>
                      <IconComponent size={18} />
                    </div>

                    {/* Step Info */}
                    <div style={{ paddingBottom: 24 }}>
                      <h4 style={{
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: isPassed ? '#0f172a' : '#94a3b8'
                      }}>
                        {step.title}
                      </h4>
                      <p style={{
                        fontSize: '0.82rem',
                        color: isCurrent ? 'var(--color-primary-dark)' : '#64748b',
                        fontWeight: isCurrent ? 600 : 400
                      }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Order Details card */}
          <div style={{
            padding: 16,
            borderRadius: 14,
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: '0.88rem'
          }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
              Resumo do Pedido
            </h4>

            {order.delivery_type === 'delivery' ? (
              <p style={{ color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} style={{ color: 'var(--color-primary)' }} />
                <span>{order.address}, {order.address_number} - {order.neighborhood_name}</span>
              </p>
            ) : (
              <p style={{ color: '#475569', marginBottom: 6 }}>
                📦 <strong>Retirada no Balcão</strong>: {settings.store_address}, {settings.store_address_number}
              </p>
            )}

            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
              {order.items?.map((item, idx) => (
                <div key={idx} className="tracking-item-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>{item.quantity}x {item.product_name}</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 800,
              fontSize: '1rem',
              color: '#0f172a',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid #cbd5e1'
            }}>
              <span>Total</span>
              <span style={{ color: 'var(--color-primary-dark)' }}>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Loyalty Card */}
          {loyaltyStatus && (
            <div style={{ marginTop: 16 }}>
              <LoyaltyCard loyalty={loyaltyStatus} />
            </div>
          )}
        </div>

        {/* Footer WhatsApp direct button */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff'
        }}>
          <a
            href={`https://wa.me/${normalizePhone(settings.whatsapp)}?text=${encodeURIComponent(`Olá, gostaria de saber sobre meu pedido #${order.order_number} no nome de ${order.customer_name}`)}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              textDecoration: 'none'
            }}
          >
            <MessageCircle size={18} style={{ color: '#16a34a' }} />
            <span>Falar com o Estabelecimento</span>
          </a>
        </div>
      </div>
    </div>
  );
};
