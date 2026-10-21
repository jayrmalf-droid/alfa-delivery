import React, { useState, useMemo } from 'react';
import { Order, StoreSettings } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { businessDate } from '../../domain/businessDates';
import { useDialog } from '../../utils/useDialog';
import {
  Printer,
  X,
  CheckSquare,
  Square,
  FileText,
  DollarSign,
  Package,
  Bike,
  User,
  Clock,
  AlertCircle,
  Layers,
  Sparkles,
  MapPin,
  CheckCircle2,
  Calendar,
  Eye,
  SlidersHorizontal
} from 'lucide-react';

export interface OrderColumnOption {
  id: 'order_num' | 'customer' | 'delivery' | 'items' | 'status' | 'payment' | 'values' | 'notes';
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  defaultChecked: boolean;
}

const AVAILABLE_ORDER_COLUMNS: OrderColumnOption[] = [
  {
    id: 'order_num',
    label: 'Nº & Horário',
    description: 'Número do pedido, data/hora e badge de agendamento',
    icon: Clock,
    defaultChecked: true
  },
  {
    id: 'customer',
    label: 'Cliente & Telefone',
    description: 'Nome do cliente e WhatsApp/telefone de contato',
    icon: User,
    defaultChecked: true
  },
  {
    id: 'delivery',
    label: 'Atendimento & Endereço',
    description: 'Tipo (Entrega/Retirada), endereço, número e bairro',
    icon: Bike,
    defaultChecked: true
  },
  {
    id: 'items',
    label: 'Itens & Quantidades',
    description: 'Produtos, adicionais, sabores e observações dos itens',
    icon: Package,
    defaultChecked: true
  },
  {
    id: 'status',
    label: 'Etapa / Fase',
    description: 'Fase operacional atual (Novo, Cozinha, Rota, Concluído)',
    icon: Layers,
    defaultChecked: true
  },
  {
    id: 'payment',
    label: 'Pagamento & Caixa',
    description: 'Forma de pagamento, troco e baixa financeira',
    icon: DollarSign,
    defaultChecked: true
  },
  {
    id: 'values',
    label: 'Valores Detalhados',
    description: 'Subtotal, taxa de entrega, desconto e total',
    icon: Sparkles,
    defaultChecked: true
  },
  {
    id: 'notes',
    label: 'Observações Gerais',
    description: 'Instruções e notas deixadas pelo cliente',
    icon: FileText,
    defaultChecked: false
  }
];

interface OrderPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  filteredOrders: Order[];
  settings: StoreSettings;
  currentSearchTerm?: string;
}

export const OrderPrintModal: React.FC<OrderPrintModalProps> = ({
  isOpen,
  onClose,
  orders,
  filteredOrders,
  settings,
  currentSearchTerm
}) => {
  useDialog(isOpen, onClose);

  // Seleção de Colunas
  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    AVAILABLE_ORDER_COLUMNS.forEach(col => {
      init[col.id] = col.defaultChecked;
    });
    return init;
  });

  // Filtros de Escopo dos Pedidos
  const [scope, setScope] = useState<'filtered' | 'active' | 'today' | 'all'>('filtered');
  const [statusFilterGroup, setStatusFilterGroup] = useState<Record<string, boolean>>({
    pending: true,
    preparing: true,
    delivering: true,
    delivered: true,
    cancelled: false
  });
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<'all' | 'delivery' | 'pickup'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [scheduledOnly, setScheduledOnly] = useState(false);

  // Configurações de Formato e Layout
  const [printFormat, setPrintFormat] = useState<'table' | 'tickets'>('table');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [fontSize, setFontSize] = useState<'normal' | 'compact'>('normal');
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Pedidos Filtrados para Impressão
  const printableOrders = useMemo(() => {
    // 1. Escopo inicial
    let baseList: Order[];
    const now = new Date();
    const todayStr = businessDate(now);

    if (scope === 'filtered') {
      baseList = filteredOrders;
    } else if (scope === 'active') {
      baseList = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
    } else if (scope === 'today') {
      baseList = orders.filter(o => businessDate(o.created_at) === todayStr);
    } else {
      baseList = orders;
    }

    // 2. Filtro de Grupos de Status
    const result = baseList.filter(o => {
      // Mapeamento do status para os grupos
      let groupKey = 'pending';
      if (['new', 'pending'].includes(o.status)) groupKey = 'pending';
      else if (['confirmed', 'preparing'].includes(o.status)) groupKey = 'preparing';
      else if (['ready', 'delivering'].includes(o.status)) groupKey = 'delivering';
      else if (o.status === 'delivered') groupKey = 'delivered';
      else if (o.status === 'cancelled') groupKey = 'cancelled';

      if (!statusFilterGroup[groupKey]) return false;

      // Filtro de Atendimento
      if (deliveryTypeFilter === 'delivery' && o.delivery_type !== 'delivery') return false;
      if (deliveryTypeFilter === 'pickup' && o.delivery_type !== 'pickup') return false;

      // Filtro de Situação Financeira
      if (paymentStatusFilter === 'confirmed' && o.payment_status !== 'confirmed') return false;
      if (paymentStatusFilter === 'pending' && o.payment_status === 'confirmed') return false;

      // Filtro de Agendamento
      if (scheduledOnly && !o.preorder_date && !o.is_scheduled) return false;

      return true;
    });

    // Ordenação lógica para impressão (mais antigos primeiro por padrão na operação)
    return [...result].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime() || 0;
      const bTime = new Date(b.created_at).getTime() || 0;
      return aTime - bTime;
    });
  }, [
    scope,
    orders,
    filteredOrders,
    statusFilterGroup,
    deliveryTypeFilter,
    paymentStatusFilter,
    scheduledOnly
  ]);

  // Métricas dos pedidos a imprimir
  const totalValue = useMemo(() => {
    return printableOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [printableOrders]);

  const deliveryCount = useMemo(() => {
    return printableOrders.filter(o => o.delivery_type === 'delivery').length;
  }, [printableOrders]);

  const pickupCount = useMemo(() => {
    return printableOrders.filter(o => o.delivery_type === 'pickup').length;
  }, [printableOrders]);

  // Handlers de Colunas
  const handleToggleColumn = (id: string) => {
    setSelectedColumns(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAllColumns = () => {
    const allChecked: Record<string, boolean> = {};
    AVAILABLE_ORDER_COLUMNS.forEach(col => {
      allChecked[col.id] = true;
    });
    setSelectedColumns(allChecked);
  };

  const handleResetColumns = () => {
    const defaults: Record<string, boolean> = {};
    AVAILABLE_ORDER_COLUMNS.forEach(col => {
      defaults[col.id] = col.defaultChecked;
    });
    setSelectedColumns(defaults);
  };

  // Helper de Status Formatado
  const getStatusLabel = (status: string): { label: string; bg: string; color: string } => {
    switch (status) {
      case 'new':
      case 'pending':
        return { label: 'Novo / Recebido', bg: '#fef3c7', color: '#b45309' };
      case 'confirmed':
        return { label: 'Confirmado', bg: '#e0f2fe', color: '#0369a1' };
      case 'preparing':
        return { label: 'Na Cozinha', bg: '#ffedd5', color: '#c2410c' };
      case 'ready':
        return { label: 'Pronto / Embalado', bg: '#f3e8ff', color: '#7e22ce' };
      case 'delivering':
        return { label: 'Em Rota', bg: '#dbeafe', color: '#1d4ed8' };
      case 'delivered':
        return { label: 'Concluído', bg: '#dcfce7', color: '#15803d' };
      case 'cancelled':
        return { label: 'Cancelado', bg: '#fee2e2', color: '#b91c1c' };
      default:
        return { label: status, bg: '#f1f5f9', color: '#475569' };
    }
  };

  // Disparo da Impressão
  const handleExecutePrint = () => {
    if (printableOrders.length === 0) {
      alert('Nenhum pedido atende aos filtros selecionados para impressão.');
      return;
    }

    setIsPrinting(true);

    try {
      const storeName = settings.restaurant_name || settings.business_name || 'Alfa Salgados';
      const storePhone = settings.phone || settings.whatsapp || '';
      const nowStr = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      let contentHtml = '';

      if (printFormat === 'table') {
        // MODO TABELA A4
        const headersHtml = `
          ${selectedColumns.order_num ? '<th style="width: 80px;">Nº / Hora</th>' : ''}
          ${selectedColumns.customer ? '<th style="width: 140px;">Cliente</th>' : ''}
          ${selectedColumns.delivery ? '<th style="width: 160px;">Atendimento / Endereço</th>' : ''}
          ${selectedColumns.items ? '<th>Itens do Pedido</th>' : ''}
          ${selectedColumns.status ? '<th style="width: 100px; text-align: center;">Etapa</th>' : ''}
          ${selectedColumns.payment ? '<th style="width: 110px;">Pagamento</th>' : ''}
          ${selectedColumns.values ? '<th style="width: 100px; text-align: right;">Total</th>' : ''}
          ${selectedColumns.notes ? '<th style="width: 120px;">Observações</th>' : ''}
        `;

        const rowsHtml = printableOrders.map((o, idx) => {
          const statusInfo = getStatusLabel(o.status);
          const isScheduled = Boolean(o.preorder_date || o.is_scheduled);
          const dateCreated = new Date(o.created_at);
          const timeFormatted = Number.isNaN(dateCreated.getTime())
            ? ''
            : dateCreated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          const itemsText = (o.items || [])
            .map(it => {
              const extras = it.selected_options?.map((op: any) => `+${op.name}`).join(', ');
              return `<div class="item-line"><strong>${it.quantity}x</strong> ${it.product_name}${extras ? ` <span class="extras">(${extras})</span>` : ''}${it.notes ? ` <span class="item-obs">[Obs: ${it.notes}]</span>` : ''}</div>`;
            })
            .join('');

          let paymentLabel = 'PIX';
          if (o.payment_method === 'cash') {
            paymentLabel = o.needs_change ? `Dinheiro (Troco p/ ${formatCurrency(o.change_amount || 0)})` : 'Dinheiro';
          } else if (o.payment_method === 'credit') {
            paymentLabel = 'Cartão Crédito';
          } else if (o.payment_method === 'debit') {
            paymentLabel = 'Cartão Débito';
          }

          const isPaymentConfirmed = o.payment_status === 'confirmed';

          let cells = '';

          // 1. Nº & Horário
          if (selectedColumns.order_num) {
            cells += `
              <td class="col-num">
                <div class="order-number">#${o.order_number}</div>
                <div class="order-time">${timeFormatted}</div>
                ${isScheduled ? `<div class="scheduled-badge">📅 Agendado ${o.preorder_time || ''}</div>` : ''}
              </td>
            `;
          }

          // 2. Cliente & Telefone
          if (selectedColumns.customer) {
            cells += `
              <td class="col-customer">
                <div class="customer-name">${o.customer_name || 'Cliente'}</div>
                <div class="customer-phone">${o.customer_phone || 'Sem telefone'}</div>
              </td>
            `;
          }

          // 3. Atendimento & Endereço
          if (selectedColumns.delivery) {
            cells += `
              <td class="col-delivery">
                <div class="delivery-type-pill ${o.delivery_type === 'delivery' ? 'type-delivery' : 'type-pickup'}">
                  ${o.delivery_type === 'delivery' ? '🛵 Entrega' : '🛍️ Retirada'}
                </div>
                ${o.delivery_type === 'delivery' ? `
                  <div class="address-text">${o.address || ''}, ${o.address_number || 'S/N'}${o.complement ? ` (${o.complement})` : ''}</div>
                  <div class="neighborhood-text">${o.neighborhood_name || ''}${o.reference_point ? ` • Ref: ${o.reference_point}` : ''}</div>
                ` : `
                  <div class="pickup-text">Retirada no balcão da loja</div>
                `}
              </td>
            `;
          }

          // 4. Itens & Quantidades
          if (selectedColumns.items) {
            cells += `
              <td class="col-items">
                <div class="items-list">${itemsText || '<span class="muted-text">Sem itens</span>'}</div>
              </td>
            `;
          }

          // 5. Etapa / Status
          if (selectedColumns.status) {
            cells += `
              <td class="col-status" style="text-align: center;">
                <span class="status-pill" style="background-color: ${statusInfo.bg}; color: ${statusInfo.color};">
                  ${statusInfo.label}
                </span>
              </td>
            `;
          }

          // 6. Pagamento & Caixa
          if (selectedColumns.payment) {
            cells += `
              <td class="col-payment">
                <div class="payment-method">${paymentLabel}</div>
                <div class="payment-status ${isPaymentConfirmed ? 'status-paid' : 'status-pending'}">
                  ${isPaymentConfirmed ? '✓ Caixa Confirmado' : '⏳ Pendente Baixa'}
                </div>
              </td>
            `;
          }

          // 7. Valores Detalhados
          if (selectedColumns.values) {
            cells += `
              <td class="col-values" style="text-align: right;">
                <div class="total-val">${formatCurrency(o.total || 0)}</div>
                ${o.delivery_fee > 0 ? `<div class="sub-val">Taxa: ${formatCurrency(o.delivery_fee)}</div>` : ''}
                ${o.discount_value > 0 ? `<div class="sub-val" style="color: #16a34a;">Desc: -${formatCurrency(o.discount_value)}</div>` : ''}
              </td>
            `;
          }

          // 8. Observações
          if (selectedColumns.notes) {
            cells += `
              <td class="col-notes">
                ${o.notes ? `<div class="notes-text">${o.notes}</div>` : '<span class="muted-text">—</span>'}
              </td>
            `;
          }

          return `<tr class="${idx % 2 === 0 ? 'even-row' : 'odd-row'}">${cells}</tr>`;
        }).join('');

        contentHtml = `
          <table class="report-table">
            <thead>
              <tr>${headersHtml}</tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        `;
      } else {
        // MODO COMANDAS / FICHAS DE PRODUÇÃO (TICKETS)
        const ticketsHtml = printableOrders.map((o) => {
          const statusInfo = getStatusLabel(o.status);
          const isScheduled = Boolean(o.preorder_date || o.is_scheduled);
          const dateCreated = new Date(o.created_at);
          const timeFormatted = Number.isNaN(dateCreated.getTime())
            ? ''
            : dateCreated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          const itemsListHtml = (o.items || []).map(it => {
            const extras = it.selected_options?.map((op: any) => `+${op.name} (${formatCurrency(op.price || 0)})`).join(', ');
            const unitPrice = it.unit_price ?? 0;
            return `
              <div class="ticket-item">
                <div class="ticket-item-header">
                  <span class="ticket-item-qty">${it.quantity}x</span>
                  <span class="ticket-item-name">${it.product_name}</span>
                  <span class="ticket-item-price">${formatCurrency(unitPrice * it.quantity)}</span>
                </div>
                ${extras ? `<div class="ticket-item-extras">${extras}</div>` : ''}
                ${it.notes ? `<div class="ticket-item-notes">Obs: ${it.notes}</div>` : ''}
              </div>
            `;
          }).join('');

          let paymentLabel = 'PIX';
          if (o.payment_method === 'cash') {
            paymentLabel = o.needs_change ? `DINHEIRO (Troco p/ ${formatCurrency(o.change_amount || 0)})` : 'DINHEIRO';
          } else if (o.payment_method === 'credit') {
            paymentLabel = 'CARTÃO CRÉDITO';
          } else if (o.payment_method === 'debit') {
            paymentLabel = 'CARTÃO DÉBITO';
          }

          return `
            <div class="ticket-card">
              <div class="ticket-header">
                <div>
                  <span class="ticket-order-num">PEDIDO #${o.order_number}</span>
                  <span class="ticket-badge-type ${o.delivery_type === 'delivery' ? 'badge-delivery' : 'badge-pickup'}">
                    ${o.delivery_type === 'delivery' ? 'ENTREGA' : 'RETIRADA NO BALCÃO'}
                  </span>
                </div>
                <div class="ticket-time">Hora: ${timeFormatted} • Status: ${statusInfo.label}</div>
              </div>

              ${isScheduled ? `
                <div class="ticket-scheduled-alert">
                  📅 AGENDADO PARA: ${o.preorder_date?.split('-').reverse().join('/') || ''} às ${o.preorder_time || ''}
                </div>
              ` : ''}

              <div class="ticket-customer-section">
                <div><strong>Cliente:</strong> ${o.customer_name || 'Consumidor'} | <strong>Tel:</strong> ${o.customer_phone || 'Não informado'}</div>
                ${o.delivery_type === 'delivery' ? `
                  <div><strong>Endereço:</strong> ${o.address || ''}, Nº ${o.address_number || 'S/N'}${o.complement ? ` (${o.complement})` : ''} - Bairro: <strong>${o.neighborhood_name || ''}</strong></div>
                  ${o.reference_point ? `<div><strong>Ref:</strong> ${o.reference_point}</div>` : ''}
                ` : ''}
              </div>

              <div class="ticket-divider"></div>

              <div class="ticket-items-box">
                <div class="ticket-section-title">ITENS DO PEDIDO:</div>
                ${itemsListHtml}
              </div>

              ${o.notes ? `
                <div class="ticket-obs-box">
                  <strong>Observações do Pedido:</strong> ${o.notes}
                </div>
              ` : ''}

              <div class="ticket-divider"></div>

              <div class="ticket-footer-row">
                <div>
                  <strong>Pagamento:</strong> ${paymentLabel} (${o.payment_status === 'confirmed' ? 'PAGO' : 'A RECEBER'})
                </div>
                <div class="ticket-total">
                  TOTAL: ${formatCurrency(o.total || 0)}
                </div>
              </div>
            </div>
          `;
        }).join('');

        contentHtml = `<div class="tickets-grid">${ticketsHtml}</div>`;
      }

      // Monta Documento HTML Completo
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Relatório de Pedidos - ${storeName}</title>
          <style>
            @page {
              size: A4 ${orientation};
              margin: 10mm 10mm 12mm 10mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              background: #ffffff;
              font-size: ${fontSize === 'compact' ? '9.5px' : '11px'};
              line-height: 1.3;
              padding: 0;
            }

            /* CABEÇALHO */
            .header-box {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #0f766e;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .brand-name {
              font-size: 18px;
              font-weight: 900;
              color: #0f766e;
              letter-spacing: -0.02em;
            }
            .report-title {
              font-size: 13px;
              font-weight: 700;
              color: #334155;
            }
            .meta-text {
              font-size: 10px;
              color: #64748b;
              text-align: right;
            }

            /* RESUMO EXECUTIVO */
            .summary-cards-row {
              display: flex;
              gap: 10px;
              margin-bottom: 14px;
            }
            .summary-card {
              flex: 1;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 8px 10px;
            }
            .summary-card-label {
              font-size: 9px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.03em;
            }
            .summary-card-val {
              font-size: 13px;
              font-weight: 900;
              color: #0f172a;
              margin-top: 2px;
            }

            /* TABELA */
            .report-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
            }
            .report-table th {
              background: #f1f5f9;
              color: #334155;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.03em;
              padding: 7px 8px;
              border: 1px solid #cbd5e1;
              text-align: left;
            }
            .report-table td {
              padding: 6px 8px;
              border: 1px solid #e2e8f0;
              vertical-align: top;
            }
            .even-row {
              background: #ffffff;
            }
            .odd-row {
              background: #fcfdfe;
            }
            tr {
              page-break-inside: avoid;
            }

            .order-number {
              font-weight: 900;
              font-size: 12px;
              color: #0f172a;
            }
            .order-time {
              font-size: 9px;
              color: #64748b;
            }
            .scheduled-badge {
              display: inline-block;
              font-size: 8px;
              font-weight: 800;
              background: #fef3c7;
              color: #92400e;
              padding: 1px 4px;
              border-radius: 3px;
              margin-top: 2px;
            }
            .customer-name {
              font-weight: 700;
              color: #0f172a;
            }
            .customer-phone {
              font-size: 9px;
              color: #64748b;
            }
            .delivery-type-pill {
              display: inline-block;
              font-size: 8px;
              font-weight: 800;
              padding: 1px 5px;
              border-radius: 4px;
              margin-bottom: 2px;
            }
            .type-delivery {
              background: #eff6ff;
              color: #1d4ed8;
            }
            .type-pickup {
              background: #e0f2fe;
              color: #0284c7;
            }
            .address-text {
              font-size: 9.5px;
              color: #334155;
            }
            .neighborhood-text {
              font-size: 8.5px;
              color: #64748b;
            }
            .pickup-text {
              font-size: 9px;
              color: #0284c7;
              font-weight: 600;
            }
            .item-line {
              margin-bottom: 2px;
              line-height: 1.25;
            }
            .extras {
              color: #0f766e;
              font-size: 8.5px;
            }
            .item-obs {
              color: #c2410c;
              font-size: 8.5px;
              font-weight: 700;
            }
            .status-pill {
              display: inline-block;
              font-size: 8.5px;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 10px;
              white-space: nowrap;
            }
            .payment-method {
              font-weight: 700;
              font-size: 10px;
              color: #0f172a;
            }
            .payment-status {
              font-size: 8.5px;
              font-weight: 700;
              margin-top: 1px;
            }
            .status-paid {
              color: #15803d;
            }
            .status-pending {
              color: #b45309;
            }
            .total-val {
              font-weight: 900;
              font-size: 11.5px;
              color: #0f766e;
            }
            .sub-val {
              font-size: 8px;
              color: #64748b;
            }
            .notes-text {
              font-size: 9px;
              color: #475569;
              font-style: italic;
            }
            .muted-text {
              color: #94a3b8;
              font-size: 8.5px;
            }

            /* TICKETS / COMANDAS DE PRODUÇÃO */
            .tickets-grid {
              display: grid;
              grid-template-columns: ${orientation === 'landscape' ? 'repeat(2, 1fr)' : '1fr'};
              gap: 12px;
            }
            .ticket-card {
              border: 2px solid #0f172a;
              border-radius: 8px;
              padding: 10px 12px;
              background: #ffffff;
              page-break-inside: avoid;
            }
            .ticket-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 6px;
              margin-bottom: 6px;
            }
            .ticket-order-num {
              font-size: 15px;
              font-weight: 900;
              color: #0f172a;
            }
            .ticket-badge-type {
              font-size: 9px;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 4px;
              margin-left: 6px;
            }
            .badge-delivery {
              background: #dbeafe;
              color: #1e40af;
            }
            .badge-pickup {
              background: #e0f2fe;
              color: #0369a1;
            }
            .ticket-time {
              font-size: 9.5px;
              color: #64748b;
            }
            .ticket-scheduled-alert {
              background: #fef3c7;
              border: 1px dashed #d97706;
              color: #92400e;
              font-weight: 800;
              font-size: 9.5px;
              padding: 4px 6px;
              border-radius: 4px;
              margin-bottom: 6px;
              text-align: center;
            }
            .ticket-customer-section {
              font-size: 9.5px;
              line-height: 1.35;
              margin-bottom: 6px;
            }
            .ticket-divider {
              border-top: 1px dashed #94a3b8;
              margin: 6px 0;
            }
            .ticket-section-title {
              font-size: 9px;
              font-weight: 800;
              color: #334155;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .ticket-item {
              margin-bottom: 4px;
              padding-bottom: 4px;
              border-bottom: 1px dotted #e2e8f0;
            }
            .ticket-item-header {
              display: flex;
              justify-content: space-between;
              font-weight: 700;
              font-size: 10.5px;
            }
            .ticket-item-qty {
              color: #0f766e;
              font-weight: 900;
              margin-right: 4px;
            }
            .ticket-item-extras {
              font-size: 9px;
              color: #0f766e;
              padding-left: 16px;
            }
            .ticket-item-notes {
              font-size: 9px;
              color: #b91c1c;
              font-weight: 700;
              padding-left: 16px;
            }
            .ticket-obs-box {
              background: #fffbeb;
              border: 1px solid #fde68a;
              border-radius: 4px;
              padding: 5px 8px;
              font-size: 9.5px;
              color: #92400e;
              margin-top: 6px;
            }
            .ticket-footer-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              margin-top: 6px;
            }
            .ticket-total {
              font-size: 13px;
              font-weight: 900;
              color: #0f766e;
            }

            /* RODAPÉ E ASSINATURA */
            .footer-signature-row {
              margin-top: 24px;
              display: flex;
              justify-content: space-between;
              gap: 40px;
              page-break-inside: avoid;
            }
            .signature-box {
              flex: 1;
              border-top: 1px solid #334155;
              padding-top: 4px;
              text-align: center;
              font-size: 9px;
              color: #64748b;
            }
            .footer-notes {
              margin-top: 16px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 6px;
              display: flex;
              justify-content: space-between;
              font-size: 8.5px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          ${includeHeader ? `
            <div class="header-box">
              <div>
                <div class="brand-name">${storeName}</div>
                <div class="report-title">
                  ${printFormat === 'table' ? 'Relatório Operacional de Pedidos' : 'Comandas de Produção & Expedição'}
                </div>
              </div>
              <div class="meta-text">
                <div><strong>Emissão:</strong> ${nowStr}</div>
                ${storePhone ? `<div><strong>Contato:</strong> ${storePhone}</div>` : ''}
                <div><strong>Total Listado:</strong> ${printableOrders.length} pedido(s)</div>
              </div>
            </div>
          ` : ''}

          ${includeSummary ? `
            <div class="summary-cards-row">
              <div class="summary-card">
                <div class="summary-card-label">Total de Pedidos</div>
                <div class="summary-card-val">${printableOrders.length}</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-label">Valor Total Faturado</div>
                <div class="summary-card-val" style="color: #0f766e;">${formatCurrency(totalValue)}</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-label">Entregas em Domicílio</div>
                <div class="summary-card-val" style="color: #1d4ed8;">${deliveryCount}</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-label">Retiradas no Balcão</div>
                <div class="summary-card-val" style="color: #0284c7;">${pickupCount}</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-label">Ticket Médio</div>
                <div class="summary-card-val">
                  ${formatCurrency(printableOrders.length ? totalValue / printableOrders.length : 0)}
                </div>
              </div>
            </div>
          ` : ''}

          ${contentHtml}

          ${includeSignature ? `
            <div class="footer-signature-row">
              <div class="signature-box">Conferência da Cozinha / Expedição</div>
              <div class="signature-box">Fechamento do Caixa / Gerência</div>
            </div>
          ` : ''}

          <div class="footer-notes">
            <span>ALFA DELIVERY PRO • SISTEMA DE GESTÃO INTEGRADA</span>
            <span>Documento gerado em ${nowStr}</span>
          </div>
        </body>
        </html>
      `;

      // Criação ou reuso do iframe de impressão
      let iframe = document.getElementById('orders-report-print-frame') as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'orders-report-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document;
      if (!doc) throw new Error('Não foi possível inicializar janela de impressão.');

      doc.open();
      doc.write(fullHtml);
      doc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch {
          window.dispatchEvent(
            new CustomEvent('alfa-save', {
              detail: { status: 'error', message: 'Erro ao disparar impressão.' }
            })
          );
        } finally {
          setIsPrinting(false);
        }
      }, 350);
    } catch {
      setIsPrinting(false);
      alert('Houve uma falha ao preparar o documento para impressão.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configurar Impressão de Pedidos"
      className="checkout-modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10500,
        padding: 16
      }}
    >
      <div
        className="orders-print-sheet"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          maxWidth: 720,
          width: '100%',
          maxHeight: 'min(94dvh, 840px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1'
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '16px 22px',
            background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <Printer size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                Imprimir Pedidos & Relatórios
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#ccfbf1' }}>
                Filtre os pedidos e escolha a composição das colunas a imprimir
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar modal de impressão"
            style={{
              background: 'rgba(255, 255, 255, 0.14)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            backgroundColor: '#f8fafc'
          }}
        >
          {/* SEÇÃO 1: FORMATO DA IMPRESSÃO */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: '14px 16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Layers size={16} color="#0f766e" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                1. Formato da Impressão
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <button
                type="button"
                onClick={() => setPrintFormat('table')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: `2px solid ${printFormat === 'table' ? '#0f766e' : '#e2e8f0'}`,
                  backgroundColor: printFormat === 'table' ? '#f0fdfa' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: printFormat === 'table' ? '#ccfbf1' : '#f1f5f9',
                    color: printFormat === 'table' ? '#0f766e' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <FileText size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                    Relatório em Tabela A4
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                    Listagem consolidada com colunas personalizadas e resumo financeiro.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrintFormat('tickets')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: `2px solid ${printFormat === 'tickets' ? '#0f766e' : '#e2e8f0'}`,
                  backgroundColor: printFormat === 'tickets' ? '#f0fdfa' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: printFormat === 'tickets' ? '#ccfbf1' : '#f1f5f9',
                    color: printFormat === 'tickets' ? '#0f766e' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Package size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                    Comandas / Fichas de Cozinha
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                    Fichas individuais completas para produção, expedição e entregadores.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* SEÇÃO 2: ESCOPO & FILTROS DE SELEÇÃO DOS PEDIDOS */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: '14px 16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <SlidersHorizontal size={16} color="#0f766e" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                2. Seleção de Pedidos a Incluir
              </span>
            </div>

            {/* Escopo Base */}
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Origem dos Pedidos:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {[
                  { id: 'filtered', label: `Visíveis na Tela (${filteredOrders.length})` },
                  { id: 'active', label: `Apenas em Aberto (${orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length})` },
                  { id: 'today', label: `Todos de Hoje` },
                  { id: 'all', label: `Todos os Pedidos (${orders.length})` }
                ].map(sc => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setScope(sc.id as any)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: `1px solid ${scope === sc.id ? '#0f766e' : '#cbd5e1'}`,
                      backgroundColor: scope === sc.id ? '#0f766e' : '#ffffff',
                      color: scope === sc.id ? '#ffffff' : '#334155',
                      cursor: 'pointer'
                    }}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Etapas / Status Operacionais */}
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Etapas Operacionais:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {[
                  { key: 'pending', label: 'Novos / Pendentes' },
                  { key: 'preparing', label: 'Cozinha / Em Preparo' },
                  { key: 'delivering', label: 'Prontos / Em Rota' },
                  { key: 'delivered', label: 'Concluídos' },
                  { key: 'cancelled', label: 'Cancelados' }
                ].map(st => {
                  const active = statusFilterGroup[st.key];
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() =>
                        setStatusFilterGroup(prev => ({
                          ...prev,
                          [st.key]: !prev[st.key]
                        }))
                      }
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        border: `1px solid ${active ? '#99f6e4' : '#e2e8f0'}`,
                        backgroundColor: active ? '#f0fdfa' : '#f8fafc',
                        color: active ? '#0f766e' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      {active ? <CheckSquare size={13} /> : <Square size={13} />}
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Atendimento e Pagamento */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>TIPO DE ATENDIMENTO:</span>
                <select
                  value={deliveryTypeFilter}
                  onChange={e => setDeliveryTypeFilter(e.target.value as any)}
                  style={{
                    width: '100%',
                    marginTop: 4,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    color: '#1e293b',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="all">Todos os tipos (Entrega e Retirada)</option>
                  <option value="delivery">Apenas Entregas em Domicílio</option>
                  <option value="pickup">Apenas Retiradas no Balcão</option>
                </select>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>SITUAÇÃO FINANCEIRA:</span>
                <select
                  value={paymentStatusFilter}
                  onChange={e => setPaymentStatusFilter(e.target.value as any)}
                  style={{
                    width: '100%',
                    marginTop: 4,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    color: '#1e293b',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="all">Todas as situações</option>
                  <option value="confirmed">Apenas Pagamentos Confirmados</option>
                  <option value="pending">Apenas Pendentes de Baixa no Caixa</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                id="check-scheduled-only"
                checked={scheduledOnly}
                onChange={e => setScheduledOnly(e.target.checked)}
                style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#0f766e' }}
              />
              <label htmlFor="check-scheduled-only" style={{ fontSize: '0.78rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                Filtrar apenas pedidos com agendamento prévio (preorder)
              </label>
            </div>
          </div>

          {/* SEÇÃO 3: COLUNAS DA COMPOSIÇÃO (SE MODO TABELA) */}
          {printFormat === 'table' && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                padding: '14px 16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckSquare size={16} color="#0f766e" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                    3. Composição das Colunas
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleSelectAllColumns}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0f766e',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Marcar Todas
                  </button>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <button
                    type="button"
                    onClick={handleResetColumns}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Padrão
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 8
                }}
              >
                {AVAILABLE_ORDER_COLUMNS.map(col => {
                  const isChecked = Boolean(selectedColumns[col.id]);
                  const Icon = col.icon;
                  return (
                    <div
                      key={col.id}
                      onClick={() => handleToggleColumn(col.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: `1px solid ${isChecked ? '#99f6e4' : '#e2e8f0'}`,
                        backgroundColor: isChecked ? '#f0fdfa' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ color: isChecked ? '#0f766e' : '#94a3b8' }}>
                        {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                          {col.label}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {col.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SEÇÃO 4: OPÇÕES DE PÁGINA E LAYOUT */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: '14px 16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Printer size={16} color="#0f766e" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                4. Opções de Página & Layout
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {/* Orientação */}
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>ORIENTAÇÃO DO PAPEL:</span>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 6,
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      border: `1px solid ${orientation === 'landscape' ? '#0f766e' : '#cbd5e1'}`,
                      backgroundColor: orientation === 'landscape' ? '#f0fdfa' : '#ffffff',
                      color: orientation === 'landscape' ? '#0f766e' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Paisagem (Recomendado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 6,
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      border: `1px solid ${orientation === 'portrait' ? '#0f766e' : '#cbd5e1'}`,
                      backgroundColor: orientation === 'portrait' ? '#f0fdfa' : '#ffffff',
                      color: orientation === 'portrait' ? '#0f766e' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Retrato
                  </button>
                </div>
              </div>

              {/* Densidade */}
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>TAMANHO DO TEXTO:</span>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setFontSize('normal')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 6,
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      border: `1px solid ${fontSize === 'normal' ? '#0f766e' : '#cbd5e1'}`,
                      backgroundColor: fontSize === 'normal' ? '#f0fdfa' : '#ffffff',
                      color: fontSize === 'normal' ? '#0f766e' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('compact')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 6,
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      border: `1px solid ${fontSize === 'compact' ? '#0f766e' : '#cbd5e1'}`,
                      backgroundColor: fontSize === 'compact' ? '#f0fdfa' : '#ffffff',
                      color: fontSize === 'compact' ? '#0f766e' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Compacto
                  </button>
                </div>
              </div>
            </div>

            {/* Checkboxes Extras */}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={includeHeader}
                  onChange={e => setIncludeHeader(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#0f766e', cursor: 'pointer' }}
                />
                Incluir Cabeçalho da Empresa
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={e => setIncludeSummary(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#0f766e', cursor: 'pointer' }}
                />
                Incluir Resumo Executivo / Totais
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={includeSignature}
                  onChange={e => setIncludeSignature(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#0f766e', cursor: 'pointer' }}
                />
                Linha para Assinatura / Conferência
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer / Summary & Actions */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            flexShrink: 0
          }}
        >
          {/* Contador Dinâmico em tempo real */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                backgroundColor: printableOrders.length > 0 ? '#f0fdfa' : '#fef2f2',
                border: `1px solid ${printableOrders.length > 0 ? '#99f6e4' : '#fecaca'}`,
                color: printableOrders.length > 0 ? '#0f766e' : '#b91c1c',
                fontSize: '0.82rem',
                fontWeight: 800
              }}
            >
              {printableOrders.length} pedido{printableOrders.length !== 1 ? 's' : ''} selecionado{printableOrders.length !== 1 ? 's' : ''}
              {printableOrders.length > 0 && ` • Total: ${formatCurrency(totalValue)}`}
            </div>

            {printableOrders.length > 0 && (
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                ({deliveryCount} entrega{deliveryCount !== 1 ? 's' : ''}, {pickupCount} retirada{pickupCount !== 1 ? 's' : ''})
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleExecutePrint}
              disabled={isPrinting || printableOrders.length === 0}
              style={{
                padding: '9px 20px',
                borderRadius: 8,
                border: 'none',
                background: printableOrders.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: printableOrders.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: printableOrders.length > 0 ? '0 4px 12px rgba(15, 118, 110, 0.25)' : 'none'
              }}
            >
              <Printer size={16} />
              <span>{isPrinting ? 'Preparando...' : 'Imprimir Pedidos'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
