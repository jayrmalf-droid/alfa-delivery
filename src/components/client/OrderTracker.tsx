import { normalizePhone } from '../../domain/rules';
import React from 'react';
import { Order, StoreSettings } from '../../types';
import { formatCurrency } from '../../utils/formatters';
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
  if (!order) return null;

  const steps = [
    { key: 'pending', title: 'Pedido Recebido', desc: 'Aguardando confirmação', icon: Clock },
    { key: 'preparing', title: 'Em Preparo', desc: 'Seus salgados estão sendo feitos', icon: UtensilsCrossed },
    {
      key: 'delivering',
      title: order.delivery_type === 'delivery' ? 'Saiu para Entrega' : 'Pronto para Retirada',
      desc: order.delivery_type === 'delivery' ? 'O motoboy está a caminho' : 'Pode retirar no balcão',
      icon: Bike
    },
    { key: 'delivered', title: 'Finalizado', desc: 'Pedido entregue com sucesso!', icon: CheckCircle }
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'pending': return 0;
      case 'preparing': return 1;
      case 'delivering':
      case 'ready': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  };

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div style={{
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
        className="card animate-fade-in"
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              Acompanhar Pedido #{order.order_number}
            </h3>
            <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
              Alfa Salgados Delivery
            </span>
          </div>

          <button
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
        <div style={{ padding: '24px 20px', overflowY: 'auto', flexGrow: 1 }}>
          {isCancelled ? (
            <div style={{
              textAlign: 'center',
              padding: 24,
              backgroundColor: 'var(--color-primary-subtle)',
              borderRadius: 14,
              border: '1px solid var(--color-primary-border)',
              color: 'var(--color-primary-dark)',
              marginBottom: 20
            }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Pedido Cancelado</h4>
              <p style={{ fontSize: '0.88rem', marginTop: 4 }}>
                Este pedido foi cancelado pelo estabelecimento. Entre em contato para mais detalhes.
              </p>
            </div>
          ) : (
            /* Timeline */
            <div style={{ marginBottom: 24, padding: '0 10px' }}>
              {steps.map((step, idx) => {
                const IconComponent = step.icon;
                const isPassed = idx <= currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={step.key} style={{ display: 'flex', gap: 16, position: 'relative' }}>
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
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
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
