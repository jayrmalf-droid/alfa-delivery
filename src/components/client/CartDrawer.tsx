import { useDialog } from '../../utils/useDialog';
import React from 'react';
import { CartItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Edit3 } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
  onEditItem?: (item: CartItem) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onEditItem
}) => {
  useDialog(isOpen, onClose);
  if (!isOpen) return null;

  const totalQuantity = cart.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Seu carrinho de compras"
      className="cart-drawer-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Drawer Panel */}
      <div className="cart-drawer-sheet animate-fade-in">
        {/* Header */}
        <header className="cart-drawer-header">
          <div className="cart-header-title-wrap">
            <ShoppingBag size={22} className="cart-header-icon" />
            <h3 className="cart-header-title">
              Sua Sacola <span className="cart-count-badge">({totalQuantity})</span>
            </h3>
          </div>

          <button
            onClick={onClose}
            className="cart-close-btn"
            aria-label="Fechar carrinho"
            type="button"
          >
            <X size={20} />
          </button>
        </header>

        {/* Item List */}
        <div className="cart-items-body no-scrollbar">
          {cart.length === 0 ? (
            <div className="cart-empty-state">
              <div className="cart-empty-icon-wrap">
                <ShoppingBag size={52} strokeWidth={1.5} />
              </div>
              <h4 className="cart-empty-title">
                Sua sacola está vazia
              </h4>
              <p className="cart-empty-desc">
                Explore nossos deliciosos salgados, combos e porções para adicionar ao seu pedido!
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary"
              >
                Ver Cardápio
              </button>
            </div>
          ) : (
            <div className="cart-items-list">
              {cart.map(item => {
                const hasCustomizations = item.selectedOptions.length > 0 || !!item.notes;
                return (
                  <article key={item.id} className="cart-item-card">
                    <div className="cart-item-header">
                      <div className="cart-item-title-wrap">
                        <h4 className="cart-item-name">{item.product.name}</h4>
                        <span className="cart-item-unit-price">
                          {formatCurrency(item.unitPrice)} cada
                        </span>
                      </div>

                      <div className="cart-item-actions-top">
                        {hasCustomizations && onEditItem && (
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            className="cart-item-edit-btn"
                            title="Editar opções e sabores deste item"
                            aria-label={`Editar opções de ${item.product.name}`}
                          >
                            <Edit3 size={15} />
                            <span>Editar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="cart-item-remove-btn"
                          title="Remover item"
                          aria-label={`Remover ${item.product.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Opções e Sabores selecionados */}
                    {item.selectedOptions.length > 0 && (
                      <div className="cart-item-options-box">
                        {item.selectedOptions.map((opt, idx) => (
                          <div key={idx} className="cart-option-row">
                            <span className="cart-option-bullet">•</span>
                            <span className="cart-option-name">{opt.optionName}</span>
                            {opt.price > 0 && (
                              <span className="cart-option-price">+{formatCurrency(opt.price)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Observações */}
                    {item.notes && (
                      <div className="cart-item-notes-box">
                        <strong>Obs:</strong> {item.notes}
                      </div>
                    )}

                    {/* Rodapé do item com seletor de quantidade e subtotal */}
                    <div className="cart-item-footer">
                      <div className="cart-stepper-control" aria-label="Alterar quantidade">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="cart-stepper-btn"
                          aria-label={`Diminuir quantidade de ${item.product.name}`}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="cart-stepper-val" aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="cart-stepper-btn"
                          aria-label={`Aumentar quantidade de ${item.product.name}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <span className="cart-item-total-price">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {cart.length > 0 && (
          <footer className="cart-drawer-footer">
            <button type="button" onClick={onClose} className="cart-continue-shopping">Continuar escolhendo</button>
            <div className="cart-subtotal-row">
              <span className="cart-subtotal-label">Subtotal dos itens</span>
              <strong className="cart-subtotal-amount">
                {formatCurrency(subtotal)}
              </strong>
            </div>

            <p className="cart-quantity-summary" role="status">{totalQuantity} {totalQuantity===1?'item na sacola':'itens na sacola'}</p>
            <p className="cart-shipping-notice">
              🛵 Taxa de entrega calculada no próximo passo pelo bairro.
            </p>

            <button
              type="button"
              onClick={() => {
                onClose();
                onCheckout();
              }}
              className="btn btn-primary cart-checkout-btn"
            >
              <span>Avançar para o Pedido</span>
              <ArrowRight size={18} />
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};
