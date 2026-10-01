import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, StoreSettings } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { changeOrderPaymentStatus } from '../../services/api';
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
  Calendar
} from 'lucide-react';

interface OrdersManagerTabProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, newStatus: OrderStatus, userResponsible?: string) => void;
  onPrintOrder: (order: Order) => void;
  settings: StoreSettings;
}

type KanbanFilterMode = 'active' | 'all' | 'history' | 'list';

export const OrdersManagerTab: React.FC<OrdersManagerTabProps> = ({
  orders,
  onUpdateStatus,
  onPrintOrder,
  settings
}) => {
  const [filterMode, setFilterMode] = useState<KanbanFilterMode>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<'all' | 'delivery' | 'pickup'>('all');
  const [selectedAuditOrder, setSelectedAuditOrder] = useState<Order | null>(null);
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState<Order | null>(null);

  // Time elapsed helper
  const getElapsedMinutes = (dateString: string): number => {
    try {
      const created = new Date(dateString).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((now - created) / 60000));
    } catch {
      return 0;
    }
  };

  const formatElapsedTime = (dateString: string): { label: string; isDelayed: boolean; isCriticallyDelayed: boolean } => {
    const mins = getElapsedMinutes(dateString);
    if (mins < 1) return { label: 'Agora mesmo', isDelayed: false, isCriticallyDelayed: false };
    if (mins < 60) {
      return {
        label: `${mins} min`,
        isDelayed: mins >= 30,
        isCriticallyDelayed: mins >= 45
      };
    }
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return {
      label: `${hours}h ${remMins}m`,
      isDelayed: true,
      isCriticallyDelayed: true
    };
  };

  // Filter orders by search & delivery type
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Delivery type filter
      if (deliveryTypeFilter === 'delivery' && o.delivery_type !== 'delivery') return false;
      if (deliveryTypeFilter === 'pickup' && o.delivery_type !== 'pickup') return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesNum = o.order_number.toString().includes(term);
        const matchesName = (o.customer_name || '').toLowerCase().includes(term);
        const matchesPhone = (o.customer_phone || '').includes(term);
        const matchesAddress = (o.address || '').toLowerCase().includes(term);
        const matchesNeighborhood = (o.neighborhood_name || '').toLowerCase().includes(term);
        return matchesNum || matchesName || matchesPhone || matchesAddress || matchesNeighborhood;
      }
      return true;
    });
  }, [orders, searchTerm, deliveryTypeFilter]);

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

  // Active kitchen/delivery workflow columns (4 columns fit 100% of desktop/laptop width seamlessly)
  const activeColumns: ColumnConfig[] = [
    {
      id: 'col_pending',
      label: 'NOVOS / PENDENTES',
      shortLabel: 'Pendentes',
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
      shortLabel: 'Em Preparo',
      icon: <ChefHat size={15} />,
      color: '#c2410c',
      bg: '#fff7ed',
      headerBg: '#ffedd5',
      border: '#fed7aa',
      statuses: ['confirmed', 'preparing']
    },
    {
      id: 'col_ready',
      label: 'PRONTOS / EMBALADOS',
      shortLabel: 'Prontos',
      icon: <PackageCheck size={15} />,
      color: '#7e22ce',
      bg: '#faf5ff',
      headerBg: '#f3e8ff',
      border: '#e9d5ff',
      statuses: ['ready']
    },
    {
      id: 'col_delivering',
      label: 'EM ROTA DE ENTREGA',
      shortLabel: 'Em Rota',
      icon: <Bike size={15} />,
      color: '#1d4ed8',
      bg: '#eff6ff',
      headerBg: '#dbeafe',
      border: '#bfdbfe',
      statuses: ['delivering']
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

  const activeColumnsList = filterMode === 'active'
    ? activeColumns
    : filterMode === 'all'
    ? allColumns
    : historyColumns;

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      overflowX: 'hidden',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      minHeight: '100vh'
    }}>
      {/* 1. TOP OPERATIONAL HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 4
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Gestor de Pedidos
            </h2>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 20,
              fontSize: '0.72rem',
              fontWeight: 800,
              backgroundColor: '#dcfce7',
              color: '#15803d'
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 1.5s infinite' }} />
              AO VIVO
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0' }}>
            Fluxo contínuo de atendimento, cozinha e expedição de delivery
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap'
        }}>
          <div style={{
            padding: '6px 12px',
            backgroundColor: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.78rem'
          }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Em Aberto:</span>
            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
              {activeOrders.length}
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.88rem' }}>
              {formatCurrency(totalActiveValue)}
            </span>
          </div>

          {countPending > 0 && (
            <div style={{
              padding: '6px 12px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.78rem',
              color: '#b45309',
              fontWeight: 800,
              animation: 'pulse 2s infinite'
            }}>
              <AlertCircle size={14} />
              <span>{countPending} pendente{countPending > 1 ? 's' : ''}!</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. CONTROLS, VIEW MODES & FILTERS */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: '10px 14px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10
      }}>
        {/* View Mode Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: 3,
            borderRadius: 9
          }}>
            <button
              onClick={() => setFilterMode('active')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 7,
                border: 'none',
                background: filterMode === 'active' ? '#ffffff' : 'transparent',
                color: filterMode === 'active' ? '#0f172a' : '#64748b',
                fontWeight: filterMode === 'active' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: filterMode === 'active' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Exibe as 4 fases operacionais ativas (Pendentes, Cozinha, Prontos, Em Entrega)"
            >
              <ChefHat size={14} style={{ color: filterMode === 'active' ? '#ea580c' : 'inherit' }} />
              <span>Em Andamento ({activeOrders.length})</span>
            </button>

            <button
              onClick={() => setFilterMode('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 7,
                border: 'none',
                background: filterMode === 'all' ? '#ffffff' : 'transparent',
                color: filterMode === 'all' ? '#0f172a' : '#64748b',
                fontWeight: filterMode === 'all' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: filterMode === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Exibe todas as colunas de produção lado a lado ajustadas à tela"
            >
              <Columns size={14} />
              <span>Todas as Fases</span>
            </button>

            <button
              onClick={() => setFilterMode('history')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 7,
                border: 'none',
                background: filterMode === 'history' ? '#ffffff' : 'transparent',
                color: filterMode === 'history' ? '#0f172a' : '#64748b',
                fontWeight: filterMode === 'history' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: filterMode === 'history' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Exibe pedidos entregues e cancelados"
            >
              <History size={14} />
              <span>Concluídos ({countDelivered})</span>
            </button>

            <button
              onClick={() => setFilterMode('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 7,
                border: 'none',
                background: filterMode === 'list' ? '#ffffff' : 'transparent',
                color: filterMode === 'list' ? '#0f172a' : '#64748b',
                fontWeight: filterMode === 'list' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: filterMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Visualização em tabela/lista completa"
            >
              <List size={14} />
              <span>Tabela</span>
            </button>
          </div>

          {/* Delivery Type Quick Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
            <button
              onClick={() => setDeliveryTypeFilter('all')}
              style={{
                padding: '5px 9px',
                borderRadius: 7,
                border: `1px solid ${deliveryTypeFilter === 'all' ? '#94a3b8' : '#e2e8f0'}`,
                backgroundColor: deliveryTypeFilter === 'all' ? '#f8fafc' : '#ffffff',
                color: deliveryTypeFilter === 'all' ? '#0f172a' : '#64748b',
                fontWeight: deliveryTypeFilter === 'all' ? 700 : 500,
                fontSize: '0.74rem',
                cursor: 'pointer'
              }}
            >
              Todos
            </button>
            <button
              onClick={() => setDeliveryTypeFilter('delivery')}
              style={{
                padding: '5px 9px',
                borderRadius: 7,
                border: `1px solid ${deliveryTypeFilter === 'delivery' ? 'var(--color-primary)' : '#e2e8f0'}`,
                backgroundColor: deliveryTypeFilter === 'delivery' ? '#fff7ed' : '#ffffff',
                color: deliveryTypeFilter === 'delivery' ? 'var(--color-primary-dark)' : '#64748b',
                fontWeight: deliveryTypeFilter === 'delivery' ? 700 : 500,
                fontSize: '0.74rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Bike size={12} />
              <span>Delivery</span>
            </button>
            <button
              onClick={() => setDeliveryTypeFilter('pickup')}
              style={{
                padding: '5px 9px',
                borderRadius: 7,
                border: `1px solid ${deliveryTypeFilter === 'pickup' ? '#0284c7' : '#e2e8f0'}`,
                backgroundColor: deliveryTypeFilter === 'pickup' ? '#f0f9ff' : '#ffffff',
                color: deliveryTypeFilter === 'pickup' ? '#0284c7' : '#64748b',
                fontWeight: deliveryTypeFilter === 'pickup' ? 700 : 500,
                fontSize: '0.74rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Store size={12} />
              <span>Retirada</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: 250, minWidth: 200, flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Nº pedido, nome, fone, bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{
              paddingLeft: 32,
              paddingRight: 28,
              fontSize: '0.8rem',
              borderRadius: 8,
              height: 34,
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: 8,
                top: 8,
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <XCircle size={15} />
            </button>
          )}
        </div>
      </div>

      {/* 3. KANBAN BOARD CONTAINER (ZERO HORIZONTAL SCROLL - 100% WIDTH FIT) */}
      {filterMode !== 'list' ? (
        <div style={{
          display: 'flex',
          width: '100%',
          maxWidth: '100%',
          gap: 12,
          overflowX: 'hidden',
          alignItems: 'stretch',
          boxSizing: 'border-box'
        }}>
          {activeColumnsList.map(col => {
            const colOrders = filteredOrders.filter(o => col.statuses.includes(o.status));

            return (
              <div
                key={col.id}
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: '#f8fafc',
                  borderRadius: 14,
                  border: `1px solid ${col.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 'calc(100vh - 195px)',
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
                          className="card animate-fade-in"
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 11,
                            padding: '12px',
                            border: `1px solid ${timeInfo.isCriticallyDelayed ? '#fca5a5' : '#e2e8f0'}`,
                            boxShadow: timeInfo.isCriticallyDelayed
                              ? '0 2px 10px rgba(239, 68, 68, 0.12)'
                              : '0 1px 4px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            position: 'relative'
                          }}
                        >
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
                                padding: '3px 6px',
                                background: '#fffbeb',
                                borderLeft: '3px solid #f59e0b',
                                color: '#92400e',
                                borderRadius: '0 4px 4px 0',
                                fontSize: '0.7rem',
                                fontWeight: 600
                              }}>
                                ⚠️ Obs: {order.notes}
                              </div>
                            )}
                          </div>

                          {/* Items Preview (Compact, highly legible) */}
                          <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '6px 8px',
                            borderRadius: 7,
                            fontSize: '0.74rem',
                            color: '#334155',
                            border: '1px solid #f1f5f9'
                          }}>
                            {order.items && order.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} style={{ marginBottom: 3, lineHeight: 1.25 }}>
                                <span style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>{item.quantity}x</span>{' '}
                                <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                                {item.selections && item.selections.length > 0 && (
                                  <div style={{
                                    fontSize: '0.67rem',
                                    color: '#64748b',
                                    paddingLeft: 12,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    + {item.selections.map(s => s.optionName).join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                            {order.items && order.items.length > 3 && (
                              <div style={{ fontSize: '0.67rem', color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>
                                + {order.items.length - 3} outro(s) item(ns)...
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
                              >
                                <MessageCircle size={13} />
                                <span>Zap</span>
                              </button>

                              <button
                                onClick={() => setSelectedAuditOrder(order)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2
                                }}
                                title="Histórico e auditoria do pedido"
                              >
                                <History size={12} />
                                <span>Logs</span>
                              </button>
                            </div>
                          </div>

                          {/* Action Buttons Row */}
                          <div style={{
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
                              title="Imprimir comanda de produção"
                            >
                              <Printer size={13} />
                            </button>

                            {/* View details */}
                            <button
                              onClick={() => setSelectedDetailsOrder(order)}
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
                            >
                              <Eye size={13} />
                            </button>

                            {/* Next status advance CTA button */}
                            {nextStatus && (
                              <button
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
                              >
                                {nextAction.icon}
                                <span>{nextAction.label}</span>
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
                              >
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
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ overflowX: 'auto' }}>
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
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                        #{order.order_number}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.78rem' }}>
                        {new Date(order.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}{' '}
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{order.customer_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{order.customer_phone}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
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
                      <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: '#334155' }}>
                        {order.items?.length || 0} item(ns)
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(order.total)}
                      </td>
                      <td style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                        {order.payment_method}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
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
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => setSelectedDetailsOrder(order)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              cursor: 'pointer'
                            }}
                            title="Ver Detalhes"
                          >
                            <Eye size={13} />
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
                          >
                            <Printer size={13} />
                          </button>
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
                          >
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

      {/* 5. MODAL: DETALHES COMPLETOS DO PEDIDO */}
      {selectedDetailsOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 580,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  Pedido #{selectedDetailsOrder.order_number}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Realizado em {new Date(selectedDetailsOrder.created_at).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedDetailsOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Customer & Delivery Details */}
              <div style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: 4 }}>
                  {selectedDetailsOrder.customer_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                  📞 {selectedDetailsOrder.customer_phone}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4 }}>
                  {selectedDetailsOrder.delivery_type === 'delivery' ? (
                    <span>📍 {selectedDetailsOrder.address}, {selectedDetailsOrder.address_number} - {selectedDetailsOrder.neighborhood_name}</span>
                  ) : (
                    <span style={{ color: '#0284c7', fontWeight: 700 }}>🏬 Retirada no Balcão do Estabelecimento</span>
                  )}
                </div>
                {selectedDetailsOrder.complement && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Comp: {selectedDetailsOrder.complement}
                  </div>
                )}
                {selectedDetailsOrder.notes && (
                  <div style={{ marginTop: 8, padding: 8, backgroundColor: '#fffbeb', borderRadius: 6, fontSize: '0.78rem', color: '#92400e' }}>
                    <strong>Observação do Cliente:</strong> {selectedDetailsOrder.notes}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h4 style={{ fontSize: '0.86rem', fontWeight: 800, margin: '0 0 8px', color: '#334155' }}>
                  Itens do Pedido ({selectedDetailsOrder.items?.length || 0})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedDetailsOrder.items?.map((item, idx) => (
                    <div key={idx} style={{
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--color-primary-dark)' }}>{item.quantity}x</span> {item.product_name}
                        </div>
                        {item.selections && item.selections.length > 0 && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 3 }}>
                            {item.selections.map((s, si) => (
                              <div key={si}>+ {s.optionName} {s.price > 0 && `(${formatCurrency(s.price)})`}</div>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <div style={{ fontSize: '0.72rem', color: '#d97706', marginTop: 2 }}>
                            Obs item: {item.notes}
                          </div>
                        )}
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                        {formatCurrency(item.subtotal || (item.product_price * item.quantity))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Financials */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Subtotal:</span>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
                  <span>Total Geral:</span>
                  <span>{formatCurrency(selectedDetailsOrder.total)}</span>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>
                  Forma de Pagamento: <strong>{selectedDetailsOrder.payment_method?.toUpperCase()}</strong>
                  {selectedDetailsOrder.needs_change && selectedDetailsOrder.change_amount && (
                    <span> (Troco para {formatCurrency(selectedDetailsOrder.change_amount)})</span>
                  )}
                </div>

                {/* Bloco de Situação Financeira e Baixa de Pagamento */}
                <div style={{
                  marginTop: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: selectedDetailsOrder.payment_status === 'confirmed' ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${selectedDetailsOrder.payment_status === 'confirmed' ? '#bbf7d0' : '#fde68a'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <div>
                    <div style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: selectedDetailsOrder.payment_status === 'confirmed' ? '#15803d' : '#b45309'
                    }}>
                      Situação Financeira: {selectedDetailsOrder.payment_status === 'confirmed' ? '✓ PAGAMENTO RECEBIDO' : '⏳ AGUARDANDO BAIXA'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                      {selectedDetailsOrder.payment_status === 'confirmed'
                        ? 'Recebimento conferido pelo administrador.'
                        : 'A entrega do pedido não confirma automaticamente o recebimento financeiro.'}
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
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                      backgroundColor: selectedDetailsOrder.payment_status === 'confirmed' ? '#cbd5e1' : '#16a34a',
                      color: selectedDetailsOrder.payment_status === 'confirmed' ? '#1e293b' : '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {selectedDetailsOrder.payment_status === 'confirmed' ? 'Desfazer Baixa' : 'Confirmar Pagamento'}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button
                onClick={() => onPrintOrder(selectedDetailsOrder)}
                style={{
                  padding: '7px 14px',
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
              >
                <Printer size={15} />
                <span>Imprimir Comanda</span>
              </button>

              <button
                onClick={() => setSelectedDetailsOrder(null)}
                className="btn btn-primary"
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 800 }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 520,
            padding: 22,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
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
              >
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
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
