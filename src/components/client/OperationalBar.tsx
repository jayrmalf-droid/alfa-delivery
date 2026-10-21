import React from 'react';
import type { StoreSettings } from '../../types';
import { openingStatus } from '../../domain/rules';
import { formatCurrency } from '../../utils/formatters';
import { Clock, ShoppingBag, Bike, ChevronRight } from 'lucide-react';

interface OperationalBarProps {
  settings: StoreSettings;
}

export const OperationalBar: React.FC<OperationalBarProps> = ({ settings }) => {
  const status = openingStatus(settings);
  const deliveryTime = settings.delivery_time_estimate || '40 min';
  const minOrder = settings.min_order_value && settings.min_order_value > 0
    ? `Mín. ${formatCurrency(settings.min_order_value)}`
    : 'Sem pedido mínimo';

  return (
    <div className="operational-wrapper" role="region" aria-label="Informações operacionais da loja">
      <div className="store-container">
        {/* Cartão Branco Flutuante com as 4 Informações + Selo de Qualidade */}
        <div className="operational-card-strip">
          {/* 1. Status da Loja */}
          <div className={`op-card op-card-status ${status.isOpen ? 'card-open' : 'card-closed'}`}>
            <div className="op-card-icon status-icon-bg">
              <Clock size={20} />
            </div>
            <div className="op-card-body">
              <strong className="op-status-title">
                {status.isOpen ? 'Aberto agora' : 'Fechado'}
              </strong>
              <span className="op-status-subtitle">
                {status.message || (status.isOpen ? 'Até 22:00' : 'Estamos temporariamente sem receber pedidos.')}
              </span>
            </div>
            <ChevronRight size={16} className="op-chevron-icon" />
          </div>

          {/* 2. Tempo de Entrega */}
          <div className="op-card op-card-time">
            <div className="op-card-icon time-icon-bg">
              <Clock size={18} />
            </div>
            <div className="op-card-body">
              <span className="op-meta-label">Tempo de entrega</span>
              <strong className="op-meta-value">{deliveryTime}</strong>
            </div>
          </div>

          {/* 3. Pedido Mínimo */}
          <div className="op-card op-card-min">
            <div className="op-card-icon min-icon-bg">
              <ShoppingBag size={18} />
            </div>
            <div className="op-card-body">
              <span className="op-meta-label">Pedido mínimo</span>
              <strong className="op-meta-value">{minOrder}</strong>
            </div>
          </div>

          {/* 4. Modalidades de Entrega */}
          <div className="op-card op-card-modalities">
            <div className="op-card-icon modalities-icon-bg">
              <Bike size={18} />
            </div>
            <div className="op-card-body">
              <span className="op-meta-label">Modalidades</span>
              <strong className="op-meta-value">Entrega e Retirada</strong>
            </div>
          </div>
        </div>

        {/* Linha Centralizada de Aviso se a Loja Estiver Fechada / Pausada */}
        {!status.isOpen && (
          <div className="store-notice-line" role="alert">
            <span className="notice-line-dash" />
            <div className="notice-line-content">
              <Clock size={16} className="notice-icon" />
              <span>{settings.pause_message || status.message || 'Estamos temporariamente sem receber pedidos.'}</span>
            </div>
            <span className="notice-line-dash" />
          </div>
        )}
      </div>
    </div>
  );
};
