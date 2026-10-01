import { useDialog } from '../../utils/useDialog';
import React from 'react';
import { CartItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout
}) => {
  useDialog(isOpen, onClose);
  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);

  return (
    <div role="dialog" aria-modal="true" aria-label="Seu carrinho" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 60,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'flex-end',
      transition: 'all 0.3s'
    }}>
      {/* Drawer Panel */}
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 440,
          height: '100%',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag size={22} style={{ color: 'var(--color-primary-dark)' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              Seu Carrinho ({cart.reduce((acc, i) => acc + i.quantity, 0)})
            </h3>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: 8,
              borderRadius: '50%',
              color: '#64748b',
              background: '#f1f5f9'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Item List */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flexGrow: 1 }}>
          {cart.length === 0 ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <ShoppingBag size={56} strokeWidth={1.5} style={{ marginBottom: 16, color: '#cbd5e1' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                Seu carrinho está vazio
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8', maxWidth: 260, marginBottom: 20 }}>
                Explore nossos deliciosos salgados e combos e adicione ao seu pedido!
              </p>
              <button onClick={onClose} className="btn btn-secondary">
                Ver Cardápio
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {cart.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
                        {item.product.name}
                      </h4>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                        {formatCurrency(item.unitPrice)}
                      </span>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.id)}
                      style={{ color: '#94a3b8', padding: 4, transition: 'color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                      title="Remover item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Options selected */}
                  {item.selectedOptions.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {item.selectedOptions.map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>• {opt.optionName}</span>
                          {opt.price > 0 && <span>+{formatCurrency(opt.price)}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <div style={{
                      fontSize: '0.78rem',
                      fontStyle: 'italic',
                      color: '#475569',
                      backgroundColor: '#fff',
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0'
                    }}>
                      Obs: {item.notes}
                    </div>
                  )}

                  {/* Quantity and Line total */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 6,
                    paddingTop: 8,
                    borderTop: '1px solid #f1f5f9'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: '#fff',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      padding: 2
                    }}>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        style={{
                          width: 26,
                          height: 26,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#475569'
                        }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ width: 26, textAlign: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        style={{
                          width: 26,
                          height: 26,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#475569'
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {cart.length > 0 && (
          <div style={{
            padding: '20px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Subtotal</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {formatCurrency(subtotal)}
              </span>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 14, textAlign: 'center' }}>
              Taxa de entrega calculada na próxima etapa pelo bairro.
            </p>

            <button
              onClick={() => {
                onClose();
                onCheckout();
              }}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                fontSize: '1.05rem',
                fontWeight: 700
              }}
            >
              <span>Continuar para Pagamento</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
