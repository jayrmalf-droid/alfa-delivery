import { matchesOrderSearch } from '../../domain/adminInput';
import { businessDate } from '../../domain/businessDates';
import { useDialog } from '../../utils/useDialog';
import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, StoreSettings } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { changeOrderPaymentStatus } from '../../services/api';
import { OrderTimeline } from './OrderTimeline';
import { OrderPrintModal } from './OrderPrintModal';
import {
  Clock,
  Printer,
  MessageCircle,
  CheckCircle,
  XCircle,
  ChefHat,
  Bike,
  Store,
  MapPin,
  ChevronRight,
  Filter,
  Search,
  Columns,
  List,
  History,
  AlertCircle,
  PackageCheck,
  Send,
  Eye,
  Check,
  PhoneCall,
  Calendar, Download, SlidersHorizontal, RotateCcw
} from 'lucide-react';

interface OrdersManagerTabProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, newStatus: OrderStatus, userResponsible?: string) => void;
  onPrintOrder: (order: Order) => void;
  settings: StoreSettings;
  onNewOrder: () => void;
}

type KanbanFilterMode = 'active' | 'all' | 'history' | 'list';

export const OrdersManagerTab: React.FC<OrdersManagerTabProps> = ({
  orders,
  onUpdateStatus,
  onPrintOrder,
  settings,
  onNewOrder
}) => {
  const [filterMode, setFilterMode] = useState<KanbanFilterMode>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [orderSort, setOrderSort] = useState<'oldest' | 'newest' | 'highest'>('oldest');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'warning' | 'critical'>('all');
  const [clockTick, setClockTick] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('all');
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<'all' | 'delivery' | 'pickup'>('all');
  const [selectedAuditOrder, setSelectedAuditOrder] = useState<Order | null>(null);
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState<Order | null>(null);
  const [detailsActiveTab, setDetailsActiveTab] = useState<'overview' | 'timeline'>('overview');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Time elapsed helper
  const getElapsedMinutes = (dateString: string): number => {
    try {
      const created = new Date(dateString).getTime();
      const now = clockTick;
      return Number.isFinite(created) ? Math.max(0, Math.floor((now - created) / 60000)) : 0;
    } catch {
      return 0;
    }
  };

  const formatElapsedTime = (dateString: string): { label: string; delayClass: string; isDelayed: boolean; isCriticallyDelayed: boolean; mins: number } => {
    const mins = getElapsedMinutes(dateString);
    let label = 'Agora mesmo';
    if (mins >= 1 && mins < 60) {
      label = `${mins} min`;
    } else if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      label = `${hours}h ${remMins}m`;
    }

    let delayClass = 'kds-card-delayed-green';
    let isCriticallyDelayed = false;
    const isDelayed = mins > 20;
    if (mins > 40) {
      delayClass = 'kds-card-delayed-red-pulse';
      isCriticallyDelayed = true;
    } else if (mins > 20) {
      delayClass = 'kds-card-delayed-yellow';
    }

    return { label, delayClass, isDelayed, isCriticallyDelayed, mins };
  };

  // Filter orders by search & delivery type
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (priorityFilter !== 'all') {
        if (['delivered', 'cancelled'].includes(o.status)) return false;
        const created = new Date(o.created_at).getTime();
        const minutes = Number.isFinite(created) ? (clockTick - created) / 60000 : 0;
        if (priorityFilter === 'critical' && minutes <= 40) return false;
        if (priorityFilter === 'warning' && minutes <= 20) return false;
      }
      if (paymentFilter !== 'all' && o.payment_method !== paymentFilter) return false;
      if (neighborhoodFilter !== 'all' && (o.neighborhood_name || '') !== neighborhoodFilter) return false;
      if (dateFilter !== 'all') {
        const created = new Date(o.created_at);
        if (Number.isNaN(created.getTime())) return false;
        const now = new Date();
        if (dateFilter === 'today' && businessDate(o.created_at) !== businessDate(now)) return false;
        if (dateFilter === 'week' && created.getTime() < now.getTime() - 7 * 86400000) return false;
      }
      // Delivery type filter
      if (deliveryTypeFilter === 'delivery' && o.delivery_type !== 'delivery') return false;
      if (deliveryTypeFilter === 'pickup' && o.delivery_type !== 'pickup') return false;

      return matchesOrderSearch(o, searchTerm);
    }).sort((a, b) => {
      if (orderSort === 'highest') return (b.total || 0) - (a.total || 0);
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      const delta = (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
      return orderSort === 'oldest' ? delta : -delta;
    });
  }, [orders, searchTerm, deliveryTypeFilter, paymentFilter, neighborhoodFilter, dateFilter, priorityFilter, clockTick, orderSort]);

  // Operational metrics
  const activeOrders = useMemo(() => {
    return orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  }, [orders]);

  const countPending = orders.filter(o => o.status === 'pending' || o.status === 'new').length;
  const countPreparing = orders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length;
  const countReady = orders.filter(o => o.status === 'ready').length;
  const countDelivering = orders.filter(o => o.status === 'delivering').length;
  const countDelivered = orders.filter(o => o.status === 'delivered').length;
  const totalActiveValue = activeOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);

  const todayOrders = orders.filter(o => businessDate(o.created_at) === businessDate(new Date(clockTick)));
  const deliveredToday = todayOrders.filter(o => o.status === 'delivered');
  const avgMinutes = deliveredToday.length ? Math.round(deliveredToday.reduce((sum, o) => sum + Math.max(0, (new Date(o.updated_at || o.created_at).getTime() - new Date(o.created_at).getTime()) / 60000), 0) / deliveredToday.length) : null;
  const neighborhoods = [...new Set(orders.map(o => o.neighborhood_name).filter((v): v is string => Boolean(v)))].sort();
  const paymentMethods = [...new Set(orders.map(o => o.payment_method).filter(Boolean))].sort();
  const delayedOrders = activeOrders.filter(o => { const created = new Date(o.created_at).getTime(); return Number.isFinite(created) && clockTick - created > 20 * 60000; });
  const criticalOrders = delayedOrders.filter(o => clockTick - new Date(o.created_at).getTime() > 40 * 60000);
  const appliedFilters = [
    ...(searchTerm.trim() ? [{key:'search',label:`Busca: ${searchTerm.trim()}`,clear:()=>setSearchTerm('')}] : []),
    ...(deliveryTypeFilter !== 'all' ? [{key:'delivery',label:`Atendimento: ${deliveryTypeFilter==='delivery'?'Entrega':'Retirada'}`,clear:()=>setDeliveryTypeFilter('all')}] : []),
    ...(priorityFilter !== 'all' ? [{key:'priority',label:`Prioridade: ${priorityFilter==='critical'?'Urgentes':'Atrasados'}`,clear:()=>setPriorityFilter('all')}] : []),
    ...(dateFilter !== 'all' ? [{key:'date',label:`Período: ${dateFilter==='today'?'Hoje':'Últimos 7 dias'}`,clear:()=>setDateFilter('all')}] : []),
    ...(paymentFilter !== 'all' ? [{key:'payment',label:`Pagamento: ${paymentFilter}`,clear:()=>setPaymentFilter('all')}] : []),
    ...(neighborhoodFilter !== 'all' ? [{key:'neighborhood',label:`Bairro: ${neighborhoodFilter}`,clear:()=>setNeighborhoodFilter('all')}] : [])
  ];
  const resetFilters = () => { setPriorityFilter('all'); setSearchTerm(''); setDeliveryTypeFilter('all'); setPaymentFilter('all'); setDateFilter('all'); setNeighborhoodFilter('all'); };
  const exportCsv = () => {
    const header = ['Pedido', 'Data', 'Cliente', 'Telefone', 'Tipo', 'Bairro', 'Pagamento', 'Situação', 'Total'];
    const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filteredOrders.map(o => [o.order_number, o.created_at, o.customer_name, o.customer_phone, o.delivery_type, o.neighborhood_name, o.payment_method, o.status, o.total.toFixed(2)]);
    const csv = '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `pedidos-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  // Column definitions tailored for screen fit without horizontal scrolling
  interface ColumnConfig {
    id: string;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    headerBg: string;
    border: string;
    statuses: OrderStatus[];
  }

  // Active production KDS columns: 4 colunas operacionais padronizadas
  const activeColumns: ColumnConfig[] = [
    {
      id: 'col_pending',
      label: 'NOVO / RECEBIDO',
      shortLabel: 'Novo / Recebido',
      icon: <AlertCircle size={15} />,
      color: '#d97706',
      bg: '#fffbeb',
      headerBg: '#fef3c7',
      border: '#fde68a',
      statuses: ['new', 'pending']
    },
    {
      id: 'col_kitchen',
      label: 'EM PREPARO / COZINHA',
      shortLabel: 'Em Preparo / Cozinha',
      icon: <ChefHat size={15} />,
      color: '#0284c7',
      bg: '#f0f9ff',
      headerBg: '#e0f2fe',
      border: '#bae6fd',
      statuses: ['confirmed', 'preparing']
    },
    {
      id: 'col_delivering',
      label: 'SAIU PARA ENTREGA',
      shortLabel: 'Saiu para Entrega',
      icon: <Bike size={15} />,
      color: '#7e22ce',
      bg: '#faf5ff',
      headerBg: '#f3e8ff',
      border: '#e9d5ff',
      statuses: ['ready', 'delivering']
    },
    {
      id: 'col_delivered_active',
      label: 'CONCLUÍDO',
      shortLabel: 'Concluído',
      icon: <CheckCircle size={15} />,
      color: '#16a34a',
      bg: '#f0fdf4',
      headerBg: '#dcfce7',
      border: '#bbf7d0',
      statuses: ['delivered']
    }
  ];

  // All stages columns (5 columns fit 100% proportionally)
  const allColumns: ColumnConfig[] = [
    {
      id: 'col_pending_all',
      label: 'NOVOS',
      shortLabel: 'Novos',
      icon: <AlertCircle size={14} />,
      color: '#d97706',
      bg: '#fffbeb',
      headerBg: '#fef3c7',
      border: '#fde68a',
      statuses: ['new', 'pending']
    },
    {
      id: 'col_confirmed_all',
      label: 'CONFIRMADOS',
      shortLabel: 'Confirmados',
      icon: <CheckCircle size={14} />,
      color: '#0284c7',
      bg: '#f0f9ff',
      headerBg: '#e0f2fe',
      border: '#bae6fd',
      statuses: ['confirmed']
    },
    {
      id: 'col_preparing_all',
      label: 'EM PRODUÇÃO',
      shortLabel: 'Produção',
      icon: <ChefHat size={14} />,
      color: '#c2410c',
      bg: '#fff7ed',
      headerBg: '#ffedd5',
      border: '#fed7aa',
      statuses: ['preparing']
    },
    {
      id: 'col_ready_all',
      label: 'PRONTOS',
      shortLabel: 'Prontos',
      icon: <PackageCheck size={14} />,
      color: '#7e22ce',
      bg: '#faf5ff',
      headerBg: '#f3e8ff',
      border: '#e9d5ff',
      statuses: ['ready']
    },
    {
      id: 'col_delivering_all',
      label: 'EM ENTREGA',
      shortLabel: 'Entrega',
      icon: <Bike size={14} />,
      color: '#1d4ed8',
      bg: '#eff6ff',
      headerBg: '#dbeafe',
      border: '#bfdbfe',
      statuses: ['delivering']
    }
  ];

  // History columns
  const historyColumns: ColumnConfig[] = [
    {
      id: 'col_delivered',
      label: 'ENTREGUES COM SUCESSO',
      shortLabel: 'Entregues',
      icon: <CheckCircle size={15} />,
      color: '#15803d',
      bg: '#f0fdf4',
      headerBg: '#dcfce7',
      border: '#bbf7d0',
      statuses: ['delivered']
    },
    {
      id: 'col_cancelled',
      label: 'CANCELADOS',
      shortLabel: 'Cancelados',
      icon: <XCircle size={15} />,
      color: '#b91c1c',
      bg: '#fef2f2',
      headerBg: '#fee2e2',
      border: '#fecaca',
      statuses: ['cancelled']
    }
  ];

  // Status transitions
  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    switch (current) {
      case 'pending':
      case 'new':
        return 'confirmed';
      case 'confirmed':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'delivering';
      case 'delivering':
        return 'delivered';
      default:
        return null;
    }
  };

  const getNextStatusAction = (current: OrderStatus): { label: string; icon: React.ReactNode; bg: string } => {
    switch (current) {
      case 'pending':
      case 'new':
        return { label: 'Confirmar', icon: <Check size={13} />, bg: '#0284c7' };
      case 'confirmed':
        return { label: 'Iniciar Produção', icon: <ChefHat size={13} />, bg: '#ea580c' };
      case 'preparing':
        return { label: 'Pronto / Embalado', icon: <PackageCheck size={13} />, bg: '#7e22ce' };
      case 'ready':
        return { label: 'Despachar Entrega', icon: <Send size={13} />, bg: '#2563eb' };
      case 'delivering':
        return { label: 'Concluir Entrega', icon: <CheckCircle size={13} />, bg: '#16a34a' };
      default:
        return { label: '', icon: null, bg: '#64748b' };
    }
  };

  // WhatsApp shortcut
  const handleOpenWhatsApp = (order: Order) => {
    const rawPhone = (order.customer_phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
    const msg = encodeURIComponent(
      `Olá ${order.customer_name}! Seu pedido #${order.order_number} na ${settings.restaurant_name || 'ALFA Delivery'} está com o status: ${order.status.toUpperCase()}. Qualquer dúvida estamos à disposição!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  // Consulta de endereço: não requer chave de API e não envia dados até o clique.
  const openDeliveryMap = (order: Order) => {
    if (order.delivery_type !== 'delivery' || !order.address?.trim()) return;
    const destination = [order.address, order.address_number, order.neighborhood_name, settings.pix_recipient_city]
      .filter(Boolean).join(', ');
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`, '_blank', 'noopener,noreferrer');
  };

  const activeColumnsList = filterMode === 'active'
    ? activeColumns
    : filterMode === 'all'
    ? allColumns
    : historyColumns;

  useDialog(!!selectedDetailsOrder || !!selectedAuditOrder, () => {  setSelectedDetailsOrder(null); setSelectedAuditOrder(null); });

  return (
    <div className="orders-074" style={{
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      overflowX: 'hidden',
      padding: '4px 0 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minHeight: '100vh'
    }}>
      {/* 1. TOP OPERATIONAL HEADER: UNIFIED & COMPACT */}
      <div className="orders-unified-topbar" data-admin-ui="toolbar">
        <div className="orders-unified-topbar-left">
          <div className="orders-unified-topbar-title">
            <h2>Gestor de Pedidos</h2>
            <span className="orders-live-pulse-badge">
              <span className="orders-live-dot" />
              AO VIVO
            </span>
          </div>

          <div className="orders-open-summary-pill" data-admin-ui="panel">
            <span>Em Aberto:</span>
            <strong>{activeOrders.length}</strong>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <b>{formatCurrency(totalActiveValue)}</b>
          </div>

          {/* Quick Alert Badges */}
          {criticalOrders.length > 0 ? (
            <button
              type="button"
              className="orders-alert-pill critical"
              onClick={() => setPriorityFilter(priorityFilter === 'critical' ? 'all' : 'critical')}
              title="Filtrar pedidos com mais de 40 minutos"
            >
              <Clock size={13} />
              <span>{criticalOrders.length} urgente{criticalOrders.length > 1 ? 's' : ''}!</span>
            </button>
          ) : delayedOrders.length > 0 ? (
            <button
              type="button"
              className="orders-alert-pill warning"
              onClick={() => setPriorityFilter(priorityFilter === 'warning' ? 'all' : 'warning')}
              title="Filtrar pedidos com mais de 20 minutos"
            >
              <AlertCircle size={13} />
              <span>{delayedOrders.length} atrasado{delayedOrders.length > 1 ? 's' : ''}</span>
            </button>
          ) : (
            <span className="orders-alert-pill calm">
              <CheckCircle size={13} />
              <span>Fluxo em dia</span>
            </span>
          )}
        </div>

        <div className="orders-unified-topbar-right">
          <button
            type="button"
            className="orders-btn-new-order"
            onClick={onNewOrder}
            title="Abrir cardápio para criar pedido manual"
          >
            <span>＋</span>
            <span>Novo Pedido</span>
          </button>

          <button
            type="button"
            className="orders-btn-action"
            onClick={() => setIsPrintModalOpen(true)}
            title="Imprimir quadro e relatórios de pedidos com filtros"
          >
            <Printer size={14} />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            className="orders-btn-action"
            onClick={exportCsv}
            title="Exportar dados dos pedidos em CSV"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 2. COMPACT STAGES KPI BAR: 5 ETAPAS EM DESTAQUE */}
      <div className="orders-stages-kpi-strip" aria-label="Indicadores das etapas do atendimento">
        <div
          className="orders-stage-kpi-card pending"
          onClick={() => { setFilterMode('all'); setPriorityFilter('all'); }}
          style={{ cursor: 'pointer' }}
          title="Ver pedidos Novos / Recebidos"
        >
          <div className="orders-stage-kpi-icon">
            <AlertCircle size={16} />
          </div>
          <div className="orders-stage-kpi-text">
            <div className="orders-stage-kpi-count-row">
              <span className="orders-stage-kpi-count">{countPending}</span>
              <span className="orders-stage-kpi-badge">Novos</span>
            </div>
            <span className="orders-stage-kpi-label">Aguardando confirmação</span>
          </div>
        </div>

        <div
          className="orders-stage-kpi-card preparing"
          onClick={() => { setFilterMode('all'); setPriorityFilter('all'); }}
          style={{ cursor: 'pointer' }}
          title="Ver pedidos em Preparo na Cozinha"
        >
          <div className="orders-stage-kpi-icon">
            <ChefHat size={16} />
          </div>
          <div className="orders-stage-kpi-text">
            <div className="orders-stage-kpi-count-row">
              <span className="orders-stage-kpi-count">{countPreparing}</span>
              <span className="orders-stage-kpi-badge">Na Cozinha</span>
            </div>
            <span className="orders-stage-kpi-label">Em preparação</span>
          </div>
        </div>

        <div
          className="orders-stage-kpi-card delivering"
          onClick={() => { setFilterMode('all'); setPriorityFilter('all'); }}
          style={{ cursor: 'pointer' }}
          title="Ver pedidos Prontos e em Rota"
        >
          <div className="orders-stage-kpi-icon">
            <Bike size={16} />
          </div>
          <div className="orders-stage-kpi-text">
            <div className="orders-stage-kpi-count-row">
              <span className="orders-stage-kpi-count">{countReady + countDelivering}</span>
              <span className="orders-stage-kpi-badge">Expedição</span>
            </div>
            <span className="orders-stage-kpi-label">Prontos / Em rota</span>
          </div>
        </div>

        <div
          className="orders-stage-kpi-card delivered"
          onClick={() => setFilterMode('active')}
          style={{ cursor: 'pointer' }}
          title="Ver pedidos concluídos hoje"
        >
          <div className="orders-stage-kpi-icon">
            <CheckCircle size={16} />
          </div>
          <div className="orders-stage-kpi-text">
            <div className="orders-stage-kpi-count-row">
              <span className="orders-stage-kpi-count">{deliveredToday.length}</span>
              <span className="orders-stage-kpi-badge" style={{ color: '#16a34a' }}>Hoje</span>
            </div>
            <span className="orders-stage-kpi-label">
              {formatCurrency(deliveredToday.reduce((sum, o) => sum + o.total, 0))}
            </span>
          </div>
        </div>

        <div className="orders-stage-kpi-card timing" title="Tempo médio dos pedidos concluídos hoje">
          <div className="orders-stage-kpi-icon">
            <Clock size={16} />
          </div>
          <div className="orders-stage-kpi-text">
            <div className="orders-stage-kpi-count-row">
              <span className="orders-stage-kpi-count">
                {avgMinutes === null ? '—' : `${avgMinutes}m`}
              </span>
              <span className="orders-stage-kpi-badge">Tempo Médio</span>
            </div>
            <span className="orders-stage-kpi-label">Concluídos hoje</span>
          </div>
        </div>
      </div>

      {/* 3. INTEGRATED CONTROLS, VIEW MODES & FILTERS */}
      <div className="orders-integrated-toolbar" data-admin-ui="panel toolbar">
        <div className="orders-integrated-toolbar-left">
          {/* View Mode Buttons */}
          <div className="orders-view-modes" role="group" aria-label="Visualização dos pedidos">
            <button
              type="button"
              aria-pressed={filterMode === 'active'}
              onClick={() => setFilterMode('active')}
              title="Quadro operacional agrupado, incluindo a coluna de concluídos"
              data-admin-ui="button"
            >
              <ChefHat size={14} />
              <span>Operação ({activeOrders.length})</span>
            </button>

            <button
              type="button"
              aria-pressed={filterMode === 'all'}
              onClick={() => setFilterMode('all')}
              title="Exibe cada etapa dos pedidos em aberto em uma coluna"
              data-admin-ui="button"
            >
              <Columns size={14} />
              <span>Por etapa</span>
            </button>

            <button
              type="button"
              aria-pressed={filterMode === 'history'}
              onClick={() => setFilterMode('history')}
              title="Exibe pedidos entregues e cancelados"
              data-admin-ui="button"
            >
              <History size={14} />
              <span>Histórico</span>
            </button>

            <button
              type="button"
              aria-pressed={filterMode === 'list'}
              onClick={() => setFilterMode('list')}
              title="Visualização em tabela/lista completa"
              data-admin-ui="button"
            >
              <List size={14} />
              <span>Tabela</span>
            </button>
          </div>

          <span className="orders-toolbar-sep" aria-hidden="true" />

          {/* Delivery Type Filter */}
          <div className="orders-delivery-modes" role="group" aria-label="Tipo de atendimento">
            <button
              type="button"
              aria-pressed={deliveryTypeFilter === 'all'}
              onClick={() => setDeliveryTypeFilter('all')}
              data-admin-ui="button"
            >
              <span>Todos</span>
            </button>
            <button
              type="button"
              aria-pressed={deliveryTypeFilter === 'delivery'}
              onClick={() => setDeliveryTypeFilter('delivery')}
              data-admin-ui="button"
            >
              <Bike size={13} />
              <span>Entrega</span>
            </button>
            <button
              type="button"
              aria-pressed={deliveryTypeFilter === 'pickup'}
              onClick={() => setDeliveryTypeFilter('pickup')}
              data-admin-ui="button"
            >
              <Store size={13} />
              <span>Retirada</span>
            </button>
          </div>

          {/* Priority Quick Filter Pills */}
          {(delayedOrders.length > 0 || criticalOrders.length > 0) && (
            <>
              <span className="orders-toolbar-sep" aria-hidden="true" />
              <div className="orders-priority-pills" role="group" aria-label="Alertas de tempo">
                {delayedOrders.length > 0 && (
                  <button
                    type="button"
                    className={`orders-priority-pill warning ${priorityFilter === 'warning' ? 'active' : ''}`}
                    onClick={() => setPriorityFilter(priorityFilter === 'warning' ? 'all' : 'warning')}
                    title="Filtrar pedidos com mais de 20 min de espera"
                  >
                    <AlertCircle size={13} />
                    <span>Atrasados ({delayedOrders.length})</span>
                  </button>
                )}
                {criticalOrders.length > 0 && (
                  <button
                    type="button"
                    className={`orders-priority-pill critical ${priorityFilter === 'critical' ? 'active' : ''}`}
                    onClick={() => setPriorityFilter(priorityFilter === 'critical' ? 'all' : 'critical')}
                    title="Filtrar pedidos urgentes (+40 min)"
                  >
                    <Clock size={13} />
                    <span>Urgentes ({criticalOrders.length})</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="orders-integrated-toolbar-right">
          {/* Order Sort Select */}
          <label className="orders-pro-sort">
            <span>Ordenar</span>
            <select
              aria-label="Ordenar pedidos"
              value={orderSort}
              onChange={(e) => setOrderSort(e.target.value as 'oldest' | 'newest' | 'highest')}
            >
              <option value="oldest">Mais antigos</option>
              <option value="newest">Mais recentes</option>
              <option value="highest">Maior valor</option>
            </select>
          </label>

          {/* Search Input */}
          <div className="orders-search-field">
            <Search size={14} className="orders-search-icon" />
            <input
              type="text"
              aria-label="Buscar pedidos"
              placeholder="Nº pedido, nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              data-admin-ui="field"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="orders-search-clear-btn"
                aria-label="Limpar busca"
              >
                <XCircle size={14} />
              </button>
            )}
          </div>

          {/* Advanced Filters Button */}
          <button
            type="button"
            className={`orders-pro-button ${advancedOpen ? 'active' : ''}`}
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
            aria-controls="orders-advanced-filters"
          >
            <SlidersHorizontal size={14} />
            <span>Filtros</span>
            <span className="orders-filter-caret">{advancedOpen ? '▴' : '▾'}</span>
          </button>

          {(searchTerm || deliveryTypeFilter !== 'all' || paymentFilter !== 'all' || neighborhoodFilter !== 'all' || dateFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              type="button"
              className="orders-clear-pill-btn"
              onClick={resetFilters}
              title="Limpar todos os filtros aplicados"
            >
              <RotateCcw size={12} />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Applied Filters Tags */}
      {appliedFilters.length > 0 && (
        <div className="orders-applied-filters" role="group" aria-label="Filtros aplicados">
          <strong>Filtros ativos:</strong>
          {appliedFilters.map((filter) => (
            <button type="button" key={filter.key} onClick={filter.clear} aria-label={`Remover filtro ${filter.label}`}>
              <span>{filter.label}</span>
              <XCircle size={13} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {/* Advanced Filters Drawer */}
      {advancedOpen && (
        <div id="orders-advanced-filters" className="orders-pro-advanced" aria-label="Filtros avançados">
          <label>
            Prioridade
            <select aria-label="Prioridade dos pedidos" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'warning' | 'critical')}>
              <option value="all">Todas as prioridades</option>
              <option value="warning">Atrasados (+20 min)</option>
              <option value="critical">Urgentes (+40 min)</option>
            </select>
          </label>
          <label>
            Período
            <select aria-label="Período dos pedidos" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">Qualquer data</option>
              <option value="today">Hoje</option>
              <option value="week">Últimos 7 dias</option>
            </select>
          </label>
          <label>
            Forma de pagamento
            <select aria-label="Forma de pagamento dos pedidos" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option value="all">Todas as formas</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </label>
          <label>
            Bairro
            <select aria-label="Bairro dos pedidos" value={neighborhoodFilter} onChange={(e) => setNeighborhoodFilter(e.target.value)}>
              <option value="all">Todos os bairros</option>
              {neighborhoods.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* 4. ETAPAS DO ATENDIMENTO: CABEÇALHO DO KANBAN */}
      {filterMode !== 'list' && (
        <div className="orders-stages-section-header">
          <div className="orders-stages-title-group">
            <span className="orders-stages-dot" />
            <h3>Etapas do Atendimento</h3>
            <span className="orders-stages-count-badge">
              {filteredOrders.filter((order) => activeColumnsList.some((col) => col.statuses.includes(order.status))).length} pedido(s) no quadro
            </span>
          </div>
          {priorityFilter !== 'all' && (
            <button
              type="button"
              className="orders-clear-pill-btn"
              onClick={() => setPriorityFilter('all')}
            >
              Mostrando {priorityFilter === 'critical' ? 'Urgentes' : 'Atrasados'} (Clique para ver todos) ×
            </button>
          )}
        </div>
      )}
      {/* 3. KANBAN BOARD CONTAINER (ZERO HORIZONTAL SCROLL - 100% WIDTH FIT) */}
      {filterMode !== 'list' ? (
        <div className="kanban-board-container" role="region" aria-label="Etapas dos pedidos — role para ver todas as colunas" tabIndex={0} style={{
          display: 'flex',
          width: '100%',
          maxWidth: '100%',
          gap: 12,
          alignItems: 'stretch',
          boxSizing: 'border-box'
        }}>
          {activeColumnsList.map(col => {
            const colOrders = filteredOrders.filter(o => col.statuses.includes(o.status));

            return (
              <div
                key={col.id}
                className="kanban-column"
                style={{
                  boxSizing: 'border-box',
                  backgroundColor: '#f8fafc',
                  borderRadius: 14,
                  border: `1px solid ${col.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 480,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  overflow: 'hidden'
                }}
              >
                {/* Column Header */}
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: col.headerBg,
                  borderBottom: `1px solid ${col.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis'
                  }}>
                    <span style={{ color: col.color, display: 'flex', alignItems: 'center' }}>
                      {col.icon}
                    </span>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      color: col.color,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {col.shortLabel.toUpperCase()}
                    </span>
                  </div>

                  <span style={{
                    backgroundColor: '#ffffff',
                    color: col.color,
                    padding: '1px 7px',
                    borderRadius: 999,
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    flexShrink: 0
                  }}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Orders List in Column (Scrolls Vertically Only) */}
                <div style={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  padding: '10px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  scrollbarWidth: 'thin'
                }}>
                  {colOrders.length === 0 ? (
                    <div style={{
                      padding: '36px 12px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '0.76rem',
                      fontStyle: 'italic',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <span style={{ opacity: 0.5 }}>{col.icon}</span>
                      <span>Nenhum pedido nesta fase</span>
                    </div>
                  ) : (
                    colOrders.map(order => {
                      const nextStatus = getNextStatus(order.status);
                      const nextAction = getNextStatusAction(order.status);
                      const timeInfo = formatElapsedTime(order.created_at);

                      return (
                        <div
                          key={order.id}
                          className={`card admin-order-card animate-fade-in ${timeInfo.delayClass}`}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 12,
                            padding: '12px',
                            boxShadow: timeInfo.isCriticallyDelayed
                              ? '0 4px 16px rgba(239, 68, 68, 0.2)'
                              : '0 1px 4px rgba(0,0,0,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            position: 'relative',
                            transition: 'all 0.2s ease'
                          }}
                         data-admin-ui="panel">
                          {/* Card Top: Order Number + Time Badge + Price */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontWeight: 900,
                                fontSize: '0.98rem',
                                color: 'var(--color-primary-dark)'
                              }}>
                                #{order.order_number}
                              </span>

                              {/* Elapsed Time Badge */}
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontSize: '0.68rem',
                                padding: '2px 5px',
                                borderRadius: 5,
                                fontWeight: 700,
                                backgroundColor: timeInfo.isCriticallyDelayed
                                  ? '#fee2e2'
                                  : timeInfo.isDelayed
                                  ? '#fef3c7'
                                  : '#f1f5f9',
                                color: timeInfo.isCriticallyDelayed
                                  ? '#b91c1c'
                                  : timeInfo.isDelayed
                                  ? '#b45309'
                                  : '#64748b'
                              }}>
                                <Clock size={10} />
                                <span>{timeInfo.label}</span>
                              </span>
                            </div>

                            <span style={{
                              fontWeight: 800,
                              fontSize: '0.92rem',
                              color: '#0f172a'
                            }}>
                              {formatCurrency(order.total)}
                            </span>
                          </div>

                          {/* Mini Progress Timeline */}
                          <OrderTimeline order={order} compact={true} />

                          {/* Customer Name & Phone */}
                          <div>
                            <div style={{
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: '#1e293b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {order.customer_name}
                            </div>

                            {/* Delivery or Pickup Badge */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.73rem',
                              color: '#475569',
                              marginTop: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {order.delivery_type === 'delivery' ? (
                                <>
                                  <Bike size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {order.neighborhood_name || 'Entrega'} • {order.address || ''}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Store size={12} style={{ color: '#0284c7', flexShrink: 0 }} />
                                  <span style={{ fontWeight: 600, color: '#0284c7' }}>Retirada no Balcão</span>
                                </>
                              )}
                            </div>

                            {/* Preorder schedule banner */}
                            {order.preorder_date && (
                              <div style={{
                                marginTop: 4,
                                padding: '3px 6px',
                                background: '#fef3c7',
                                color: '#92400e',
                                borderRadius: 5,
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                <Calendar size={11} />
                                <span>Agendado: {order.preorder_date.split('-').reverse().join('/')} às {order.preorder_time}</span>
                              </div>
                            )}

                            {/* Customer Notes banner if present */}
                            {order.notes && (
                              <div style={{
                                marginTop: 4,
                                padding: '4px 8px',
                                background: '#fef2f2',
                                borderLeft: '3px solid #dc2626',
                                color: '#991b1b',
                                borderRadius: '0 4px 4px 0',
                                fontSize: '0.73rem',
                                fontWeight: 800
                              }}>
                                &gt;&gt; OBS: {order.notes.toUpperCase()} &lt;&lt;
                              </div>
                            )}
                          </div>

                          {/* Items Preview (Compact, highly legible) */}
                          <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '8px 10px',
                            borderRadius: 8,
                            fontSize: '0.76rem',
                            color: '#334155',
                            border: '1px solid #e2e8f0'
                          }}>
                            {order.items && order.items.slice(0, 4).map((item, idx) => (
                              <div key={idx} style={{ marginBottom: 4, lineHeight: 1.3 }}>
                                <span style={{ fontWeight: 800, color: '#dc2626' }}>{item.quantity}x</span>{' '}
                                <strong style={{ color: '#0f172a' }}>{item.product_name}</strong>
                                {item.selections && item.selections.length > 0 && (
                                  <div style={{
                                    fontSize: '0.7rem',
                                    color: '#475569',
                                    paddingLeft: 10,
                                    fontWeight: 700
                                  }}>
                                    (+) {item.selections.map(s => s.optionName).join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                            {order.items && order.items.length > 4 && (
                              <div style={{ fontSize: '0.68rem', color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>
                                + {order.items.length - 4} outro(s) item(ns)...
                              </div>
                            )}
                          </div>

                          {/* Quick info row: Payment & WhatsApp */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.72rem',
                            color: '#64748b'
                          }}>
                            <span>
                              Pgto: <strong style={{ color: '#0f172a' }}>{(order.payment_method || '').toUpperCase()}</strong>
                              <span style={{
                                marginLeft: 6,
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                backgroundColor: order.payment_status === 'confirmed' ? '#dcfce7' : '#fef3c7',
                                color: order.payment_status === 'confirmed' ? '#15803d' : '#b45309'
                              }}>
                                {order.payment_status === 'confirmed' ? 'Pago' : 'Pendente'}
                              </span>
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button
                                onClick={() => handleOpenWhatsApp(order)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#16a34a',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  fontWeight: 700
                                }}
                                title="Enviar mensagem via WhatsApp"
                               data-admin-ui="button">
                                <MessageCircle size={13} />
                                <span>Zap</span>
                              </button>

                              <button
                                onClick={() => {
                                  setDetailsActiveTab('timeline');
                                  setSelectedDetailsOrder(order);
                                }}
                                style={{
                                  background: '#f0f9ff',
                                  border: '1px solid #bae6fd',
                                  color: '#0369a1',
                                  borderRadius: 6,
                                  padding: '2px 7px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: '0.68rem',
                                  fontWeight: 700
                                }}
                                title="Visualizar linha do tempo e histórico deste pedido"
                               data-admin-ui="button">
                                <Clock size={11} />
                                <span>Linha do Tempo</span>
                              </button>
                            </div>
                          </div>

                          {/* Action Buttons Row */}
                          <div className="admin-order-actions" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            paddingTop: 6,
                            borderTop: '1px solid #f1f5f9'
                          }}>
                            {/* Thermal slip print */}
                            <button
                              onClick={() => onPrintOrder(order)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 7,
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: '0.74rem',
                                fontWeight: 700
                              }}
                              title="Imprimir comanda de produção"
                             data-admin-ui="button">
                              <Printer size={13} />
                              <span>Comanda</span>
                            </button>

                            {order.delivery_type === 'delivery' && Boolean(order.address?.trim()) && (
                              <button type="button" onClick={() => openDeliveryMap(order)} className="orders-pro-map-action" title="Consultar endereço no Google Maps" aria-label={`Mapa da entrega do pedido ${order.order_number}`}><MapPin size={13}/> Mapa</button>
                            )}

                            {/* View details */}
                            <button
                              onClick={() => {
                                setDetailsActiveTab('overview');
                                setSelectedDetailsOrder(order);
                              }}
                              style={{
                                padding: '6px 8px',
                                borderRadius: 7,
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#475569',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Ver detalhes completos do pedido"
                             aria-label="Ver detalhes completos do pedido" data-admin-ui="button">
                              <Eye size={13} />
                            </button>

                            {/* Next status advance CTA button */}
                            {nextStatus && (
                              <button
                                data-admin-action="advance"
                                onClick={() => onUpdateStatus(order.id, nextStatus, 'Admin (Kanban)')}
                                style={{
                                  flexGrow: 1,
                                  padding: '6px 8px',
                                  borderRadius: 7,
                                  border: 'none',
                                  backgroundColor: nextAction.bg,
                                  color: '#ffffff',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 4,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                               data-admin-ui="button">
                                {nextAction.icon}
                                <span>Avançar: {nextAction.label}</span>
                                <ChevronRight size={12} />
                              </button>
                            )}

                            {/* Cancel button if active */}
                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Deseja realmente cancelar o pedido #${order.order_number}?`)) {
                                    onUpdateStatus(order.id, 'cancelled', 'Admin (Cancelamento)');
                                  }
                                }}
                                style={{
                                  padding: '6px 7px',
                                  borderRadius: 7,
                                  border: '1px solid #fecaca',
                                  background: '#fff1f2',
                                  color: '#dc2626',
                                  cursor: 'pointer'
                                }}
                                title="Cancelar Pedido"
                               aria-label="Cancelar Pedido" data-admin-ui="button">
                                <XCircle size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 4. LIST / TABLE VIEW (Clean and responsive) */
        <div className="orders-list-panel" style={{
          backgroundColor: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }} data-admin-ui="panel">
          <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Tabela de Pedido — role para ver todas as colunas" data-admin-ui="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                  <th style={{ padding: '12px 14px' }}>Nº Pedido</th>
                  <th style={{ padding: '12px 14px' }}>Data / Hora</th>
                  <th style={{ padding: '12px 14px' }}>Cliente</th>
                  <th style={{ padding: '12px 14px' }}>Bairro / Tipo</th>
                  <th style={{ padding: '12px 14px' }}>Itens</th>
                  <th style={{ padding: '12px 14px' }}>Total</th>
                  <th style={{ padding: '12px 14px' }}>Pagamento</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                      Nenhum pedido encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td data-label="Pedido" style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                        #{order.order_number}
                      </td>
                      <td data-label="Data / hora" style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.78rem' }}>
                        {new Date(order.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}{' '}
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td data-label="Cliente" style={{ padding: '12px 14px' }}>
                        <div><div style={{ fontWeight: 700 }}>{order.customer_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{order.customer_phone}</div></div>
                      </td>
                      <td data-label="Atendimento" style={{ padding: '12px 14px', color: '#475569' }}>
                        {order.delivery_type === 'delivery' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Bike size={13} style={{ color: 'var(--color-primary)' }} />
                            {order.neighborhood_name || 'Entrega'}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0284c7', fontWeight: 600 }}>
                            <Store size={13} />
                            Retirada
                          </span>
                        )}
                      </td>
                      <td data-label="Itens" style={{ padding: '12px 14px', fontSize: '0.78rem', color: '#334155' }}>
                        {order.items?.length || 0} item(ns)
                      </td>
                      <td data-label="Total" style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(order.total)}
                      </td>
                      <td data-label="Pagamento" style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                        {order.payment_method}
                      </td>
                      <td data-label="Status" style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          backgroundColor:
                            order.status === 'delivered' ? '#dcfce7' :
                            order.status === 'cancelled' ? '#fee2e2' :
                            order.status === 'ready' ? '#f3e8ff' :
                            order.status === 'preparing' ? '#ffedd5' :
                            order.status === 'delivering' ? '#dbeafe' : '#fef3c7',
                          color:
                            order.status === 'delivered' ? '#15803d' :
                            order.status === 'cancelled' ? '#b91c1c' :
                            order.status === 'ready' ? '#7e22ce' :
                            order.status === 'preparing' ? '#c2410c' :
                            order.status === 'delivering' ? '#1d4ed8' : '#b45309'
                        }}>
                          {({new:'Novo',pending:'Pendente',confirmed:'Confirmado',preparing:'Preparando',ready:'Pronto',delivering:'Em rota',delivered:'Entregue',cancelled:'Cancelado'})[order.status] || order.status}
                        </span>
                      </td>
                      <td data-label="Ações" style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => {
                              setDetailsActiveTab('overview');
                              setSelectedDetailsOrder(order);
                            }}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              cursor: 'pointer'
                            }}
                            title="Ver Detalhes"
                           aria-label="Ver Detalhes" data-admin-ui="button">
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => {
                              setDetailsActiveTab('timeline');
                              setSelectedDetailsOrder(order);
                            }}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #bae6fd',
                              background: '#f0f9ff',
                              color: '#0369a1',
                              cursor: 'pointer'
                            }}
                            title="Ver Linha do Tempo"
                           aria-label="Ver Linha do Tempo" data-admin-ui="button">
                            <Clock size={13} />
                          </button>
                          <button
                            onClick={() => onPrintOrder(order)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              cursor: 'pointer'
                            }}
                            title="Imprimir"
                           aria-label="Imprimir" data-admin-ui="button">
                            <Printer size={13} />
                          </button>
                          {order.delivery_type === 'delivery' && Boolean(order.address?.trim()) && (
                            <button type="button" onClick={() => openDeliveryMap(order)} className="orders-pro-map-action" title="Consultar endereço no Google Maps" aria-label={`Mapa da entrega do pedido ${order.order_number}`}><MapPin size={13}/></button>
                          )}
                          <button
                            onClick={() => handleOpenWhatsApp(order)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #bbf7d0',
                              background: '#f0fdf4',
                              color: '#16a34a',
                              cursor: 'pointer'
                            }}
                            title="WhatsApp"
                           data-admin-ui="button">
                            <MessageCircle size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL: DETALHES COMPLETOS E LINHA DO TEMPO DO PEDIDO */}
      {selectedDetailsOrder && (() => {
        const detailsNextStatus = getNextStatus(selectedDetailsOrder.status);
        const detailsNextAction = getNextStatusAction(selectedDetailsOrder.status);
        const detailsTimeInfo = formatElapsedTime(selectedDetailsOrder.created_at);
        const isCancelled = selectedDetailsOrder.status === 'cancelled';
        const isDelivered = selectedDetailsOrder.status === 'delivered';

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            backgroundColor: 'rgba(15, 23, 42, 0.68)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }} data-admin-ui="overlay">
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              width: '100%',
              maxWidth: 860,
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }} role="dialog" aria-modal="true" aria-label={`Pedido #${selectedDetailsOrder.order_number} — detalhes e linha do tempo`} data-admin-ui="panel dialog">
              {/* Modal Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc'
              }} data-admin-ui="dialog-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                        Pedido #{selectedDetailsOrder.order_number}
                      </h3>
                      {/* Status Badge */}
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        backgroundColor:
                          isDelivered ? '#dcfce7' :
                          isCancelled ? '#fee2e2' :
                          selectedDetailsOrder.status === 'ready' ? '#f3e8ff' :
                          selectedDetailsOrder.status === 'preparing' ? '#ffedd5' :
                          selectedDetailsOrder.status === 'delivering' ? '#dbeafe' : '#fef3c7',
                        color:
                          isDelivered ? '#15803d' :
                          isCancelled ? '#b91c1c' :
                          selectedDetailsOrder.status === 'ready' ? '#7e22ce' :
                          selectedDetailsOrder.status === 'preparing' ? '#c2410c' :
                          selectedDetailsOrder.status === 'delivering' ? '#1d4ed8' : '#b45309'
                      }}>
                        {({new:'Novo',pending:'Pendente',confirmed:'Confirmado',preparing:'Em Preparo',ready:'Pronto',delivering:'Em rota',delivered:'Concluído',cancelled:'Cancelado'})[selectedDetailsOrder.status] || selectedDetailsOrder.status}
                      </span>

                      {/* Tempo Decorrido */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: 5,
                        fontWeight: 700,
                        backgroundColor: detailsTimeInfo.isCriticallyDelayed ? '#fee2e2' : detailsTimeInfo.isDelayed ? '#fef3c7' : '#f1f5f9',
                        color: detailsTimeInfo.isCriticallyDelayed ? '#b91c1c' : detailsTimeInfo.isDelayed ? '#b45309' : '#64748b'
                      }}>
                        <Clock size={11} />
                        <span>{detailsTimeInfo.label}</span>
                      </span>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                      Realizado em {new Date(selectedDetailsOrder.created_at).toLocaleString('pt-BR')} • {selectedDetailsOrder.delivery_type === 'delivery' ? '🛵 Entrega' : '🏬 Retirada no Balcão'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDetailsOrder(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
                  aria-label="Fechar detalhes do pedido" data-admin-ui="button">
                  <XCircle size={24} />
                </button>
              </div>

              {/* Navigation Tabs Inside Modal */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 20px',
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <button
                  type="button"
                  onClick={() => setDetailsActiveTab('overview')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: detailsActiveTab === 'overview' ? '#f0fdfa' : 'transparent',
                    color: detailsActiveTab === 'overview' ? '#0f766e' : '#64748b',
                    fontWeight: detailsActiveTab === 'overview' ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: detailsActiveTab === 'overview' ? 'inset 0 0 0 1px #99f6e4' : 'none'
                  }}>
                  <List size={15} />
                  <span>Itens & Financeiro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailsActiveTab('timeline')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: detailsActiveTab === 'timeline' ? '#f0fdfa' : 'transparent',
                    color: detailsActiveTab === 'timeline' ? '#0f766e' : '#64748b',
                    fontWeight: detailsActiveTab === 'timeline' ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: detailsActiveTab === 'timeline' ? 'inset 0 0 0 1px #99f6e4' : 'none'
                  }}>
                  <Clock size={15} />
                  <span>Linha do Tempo & Histórico</span>
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {detailsActiveTab === 'timeline' ? (
                  /* ABA: LINHA DO TEMPO */
                  <OrderTimeline order={selectedDetailsOrder} />
                ) : (
                  /* ABA: VISÃO GERAL & ITENS */
                  <>
                    {/* Linha do Tempo Compacta de Referência */}
                    <div style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '10px 14px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                          Fase Atual do Pedido
                        </span>
                        <button
                          type="button"
                          onClick={() => setDetailsActiveTab('timeline')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0f766e',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                          Ver Histórico Completo ➔
                        </button>
                      </div>
                      <OrderTimeline order={selectedDetailsOrder} compact={true} />
                    </div>

                    {/* Customer & Delivery Details */}
                    <div style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0f172a' }}>
                            {selectedDetailsOrder.customer_name}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 2 }}>
                            📞 {selectedDetailsOrder.customer_phone}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(selectedDetailsOrder)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              border: '1px solid #bbf7d0',
                              backgroundColor: '#f0fdf4',
                              color: '#16a34a',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                            <MessageCircle size={14} />
                            <span>WhatsApp</span>
                          </button>

                          {selectedDetailsOrder.delivery_type === 'delivery' && Boolean(selectedDetailsOrder.address?.trim()) && (
                            <button
                              type="button"
                              onClick={() => openDeliveryMap(selectedDetailsOrder)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#334155',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                              <MapPin size={14} />
                              <span>Abrir Mapa</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                        {selectedDetailsOrder.delivery_type === 'delivery' ? (
                          <span>📍 <strong>Entrega:</strong> {selectedDetailsOrder.address}, {selectedDetailsOrder.address_number} - {selectedDetailsOrder.neighborhood_name}</span>
                        ) : (
                          <span style={{ color: '#0284c7', fontWeight: 700 }}>🏬 <strong>Retirada no Balcão</strong></span>
                        )}
                        {selectedDetailsOrder.complement && (
                          <span style={{ color: '#64748b', marginLeft: 6 }}>({selectedDetailsOrder.complement})</span>
                        )}
                      </div>

                      {/* Agendamento */}
                      {selectedDetailsOrder.preorder_date && (
                        <div style={{ marginTop: 8, padding: '6px 10px', backgroundColor: '#fef3c7', borderRadius: 6, fontSize: '0.76rem', color: '#92400e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Calendar size={13} />
                          <span>Agendado para: {selectedDetailsOrder.preorder_date.split('-').reverse().join('/')} às {selectedDetailsOrder.preorder_time}</span>
                        </div>
                      )}

                      {/* Observação do cliente */}
                      {selectedDetailsOrder.notes && (
                        <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#fff1f2', borderLeft: '3px solid #e11d48', borderRadius: '0 6px 6px 0', fontSize: '0.8rem', color: '#9f1239' }}>
                          <strong>Observação do Cliente:</strong> {selectedDetailsOrder.notes}
                        </div>
                      )}
                    </div>

                    {/* Items List */}
                    <div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: '0 0 10px', color: '#1e293b' }}>
                        Itens Solicitados ({selectedDetailsOrder.items?.length || 0})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedDetailsOrder.items?.map((item, idx) => (
                          <div key={idx} style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                          }} data-admin-ui="panel">
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                                <span style={{ color: 'var(--color-primary-dark)', fontWeight: 800 }}>{item.quantity}x</span> {item.product_name}
                              </div>
                              {item.selections && item.selections.length > 0 && (
                                <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: 4, paddingLeft: 8, borderLeft: '2px solid #e2e8f0' }}>
                                  {item.selections.map((s, si) => (
                                    <div key={si} style={{ marginTop: 1 }}>• {s.optionName} {s.price > 0 && <span style={{ color: '#059669' }}>({formatCurrency(s.price)})</span>}</div>
                                  ))}
                                </div>
                              )}
                              {item.notes && (
                                <div style={{ fontSize: '0.74rem', color: '#d97706', marginTop: 3 }}>
                                  Obs: {item.notes}
                                </div>
                              )}
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                              {formatCurrency(item.subtotal || (item.product_price * item.quantity))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Financials */}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.84rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                        <span>Subtotal dos itens:</span>
                        <span>{formatCurrency(selectedDetailsOrder.subtotal)}</span>
                      </div>
                      {selectedDetailsOrder.delivery_fee > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Taxa de Entrega:</span>
                          <span>{formatCurrency(selectedDetailsOrder.delivery_fee)}</span>
                        </div>
                      )}
                      {selectedDetailsOrder.discount_value > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                          <span>Desconto ({selectedDetailsOrder.coupon_code || 'Cupom'}):</span>
                          <span>-{formatCurrency(selectedDetailsOrder.discount_value)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginTop: 4, paddingTop: 4, borderTop: '1px dashed #e2e8f0' }}>
                        <span>Total do Pedido:</span>
                        <span style={{ color: '#0f766e' }}>{formatCurrency(selectedDetailsOrder.total)}</span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>
                        Forma de Pagamento: <strong style={{ color: '#0f172a' }}>{selectedDetailsOrder.payment_method?.toUpperCase()}</strong>
                        {selectedDetailsOrder.needs_change && selectedDetailsOrder.change_amount && (
                          <span style={{ color: '#b45309', fontWeight: 700 }}> (Troco para {formatCurrency(selectedDetailsOrder.change_amount)})</span>
                        )}
                      </div>

                      {/* Bloco de Situação Financeira e Baixa de Pagamento */}
                      <div style={{
                        marginTop: 10,
                        padding: '12px 14px',
                        borderRadius: 10,
                        backgroundColor: selectedDetailsOrder.payment_status === 'confirmed' ? '#f0fdf4' : '#fffbeb',
                        border: `1px solid ${selectedDetailsOrder.payment_status === 'confirmed' ? '#bbf7d0' : '#fde68a'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8
                      }} data-admin-ui="toolbar">
                        <div>
                          <div style={{
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            color: selectedDetailsOrder.payment_status === 'confirmed' ? '#15803d' : '#b45309'
                          }}>
                            {selectedDetailsOrder.payment_status === 'confirmed' ? '✓ PAGAMENTO RECEBIDO NO CAIXA' : '⏳ AGUARDANDO BAIXA DE PAGAMENTO'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                            {selectedDetailsOrder.payment_status === 'confirmed'
                              ? 'Recebimento conferido pelo administrador.'
                              : 'A entrega física não confirma automaticamente o recebimento financeiro.'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            const isConfirmed = selectedDetailsOrder.payment_status === 'confirmed';
                            const nextStatus = isConfirmed ? 'pending' : 'confirmed';
                            const promptMsg = isConfirmed
                              ? 'Deseja estornar/desfazer a confirmação deste pagamento?'
                              : `Confirmar recebimento de ${formatCurrency(selectedDetailsOrder.total)} no caixa?`;
                            if (window.confirm(promptMsg)) {
                              await changeOrderPaymentStatus(selectedDetailsOrder.id, nextStatus, 'Alterado no painel administrativo');
                              setSelectedDetailsOrder(prev => prev ? { ...prev, payment_status: nextStatus } : null);
                            }
                          }}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 8,
                            border: 'none',
                            backgroundColor: selectedDetailsOrder.payment_status === 'confirmed' ? '#cbd5e1' : '#16a34a',
                            color: selectedDetailsOrder.payment_status === 'confirmed' ? '#1e293b' : '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                         data-admin-ui="button">
                          {selectedDetailsOrder.payment_status === 'confirmed' ? 'Desfazer Baixa' : 'Confirmar Recebimento'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => onPrintOrder(selectedDetailsOrder)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer'
                    }}
                   data-admin-ui="button">
                    <Printer size={15} />
                    <span>Imprimir Comanda</span>
                  </button>

                  {!isCancelled && !isDelivered && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Deseja cancelar o pedido #${selectedDetailsOrder.order_number}? O estoque será devolvido.`)) {
                          onUpdateStatus(selectedDetailsOrder.id, 'cancelled', 'Admin (Modal)');
                          setSelectedDetailsOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
                        }
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #fecaca',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}>
                      Cancelar Pedido
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Botão de Avanço Rápido de Status dentro do Modal */}
                  {detailsNextStatus && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateStatus(selectedDetailsOrder.id, detailsNextStatus, 'Admin (Modal)');
                        setSelectedDetailsOrder(prev => prev ? { ...prev, status: detailsNextStatus } : null);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: 'none',
                        backgroundColor: detailsNextAction.bg,
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                      }}>
                      {detailsNextAction.icon}
                      <span>Avançar para: {detailsNextAction.label}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedDetailsOrder(null)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#f1f5f9',
                      color: '#334155',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                   data-admin-ui="button">
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 6. MODAL: AUDITORIA DO PEDIDO (HISTÓRICO DE TRANSIÇÕES) */}
      {selectedAuditOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }} data-admin-ui="overlay">
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 520,
            padding: 22,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }} role="dialog" aria-modal="true" aria-label="Pedido — detalhes e edição" data-admin-ui="panel dialog">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Auditoria do Pedido #{selectedAuditOrder.order_number}
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>
                  Registro cronológico de transições de status
                </p>
              </div>
              <button
                onClick={() => setSelectedAuditOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
               aria-label="Limpar busca de pedidos" data-admin-ui="button">
                <XCircle size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
              {(selectedAuditOrder.audit_logs && selectedAuditOrder.audit_logs.length > 0) ? (
                selectedAuditOrder.audit_logs.map(log => (
                  <div
                    key={log.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f172a' }}>
                      <span>{log.previous_status.toUpperCase()} → {log.new_status.toUpperCase()}</span>
                      <span style={{ color: '#64748b', fontWeight: 500, fontSize: '0.75rem' }}>
                        {new Date(log.changed_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ color: '#475569', marginTop: 4, fontSize: '0.75rem' }}>
                      Responsável: <strong>{log.user_responsible}</strong>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.82rem', padding: 12, textAlign: 'center' }}>
                  Pedido criado em {new Date(selectedAuditOrder.created_at).toLocaleString()}
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedAuditOrder(null)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
               data-admin-ui="button">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: IMPRESSÃO PERSONALIZADA DE PEDIDOS COM FILTROS DE COMPOSIÇÃO */}
      {isPrintModalOpen && (
        <OrderPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          orders={orders}
          filteredOrders={filteredOrders}
          settings={settings}
          currentSearchTerm={searchTerm}
        />
      )}
    </div>
  );
};
