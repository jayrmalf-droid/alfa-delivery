import React, { useState, useMemo } from 'react';
import { DiscountCoupon, Order } from '../../types';
import { StorageService, subscribeToStorage } from '../../services/storageService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  Ticket,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  X,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Percent,
  ShoppingBag,
  Sparkles,
  Clock,
  ArrowUpRight,
  Eye,
  MessageCircle,
  AlertCircle
} from 'lucide-react';

interface CouponsTabProps {
  coupons?: DiscountCoupon[];
}

export const CouponsTab: React.FC<CouponsTabProps> = ({ coupons: propCoupons }) => {
  // Live coupons state
  const [coupons, setCoupons] = useState<DiscountCoupon[]>(() => {
    return propCoupons && propCoupons.length > 0 ? propCoupons : StorageService.getCoupons();
  });

  // Keep synced with propCoupons or storage mutations
  React.useEffect(() => {
    if (propCoupons) {
      setCoupons(propCoupons);
    }
    const unsub = subscribeToStorage(() => {
      setCoupons(StorageService.getCoupons());
    });
    return unsub;
  }, [propCoupons]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'expired'>('all');

  // Modal State for Create / Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<DiscountCoupon | null>(null);

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<'percentage' | 'fixed' | 'shipping'>('percentage');
  const [formValue, setFormValue] = useState('');
  const [formMinOrder, setFormMinOrder] = useState('');
  const [formUsageRule, setFormUsageRule] = useState<'unlimited' | 'max_limit' | 'single_per_client' | 'single_global'>('unlimited');
  const [formMaxUses, setFormMaxUses] = useState('50');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Modal State for Usage Details (Acompanhar uso do cupom)
  const [viewingCouponStats, setViewingCouponStats] = useState<DiscountCoupon | null>(null);

  // Copy Feedback Toast
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deletingCoupon, setDeletingCoupon] = useState<DiscountCoupon | null>(null);

  // Load all orders to calculate overall analytics
  const allOrders = useMemo(() => {
    return StorageService.getOrders();
  }, [coupons]);

  // Global KPIs for coupons
  const kpiData = useMemo(() => {
    let totalUses = 0;
    let totalDiscountGiven = 0;
    let totalRevenueFromCoupons = 0;
    const activeCount = coupons.filter(c => c.is_active).length;

    allOrders.forEach(o => {
      if (o.coupon_code) {
        totalUses++;
        totalDiscountGiven += (o.discount_value || 0);
        totalRevenueFromCoupons += (o.total || 0);
      }
    });

    return {
      activeCount,
      totalUses,
      totalDiscountGiven,
      totalRevenueFromCoupons,
      averageTicket: totalUses > 0 ? totalRevenueFromCoupons / totalUses : 0
    };
  }, [coupons, allOrders]);

  // Filtered coupons list
  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      // Search by code or description
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const codeMatch = c.code.toLowerCase().includes(term);
        const descMatch = c.description?.toLowerCase().includes(term);
        if (!codeMatch && !descMatch) return false;
      }

      // Filter by status
      const isExpired = c.expires_at ? new Date(c.expires_at).setHours(23,59,59,999) < Date.now() : false;
      const isMaxReached = c.max_uses ? (c.current_uses || 0) >= c.max_uses : false;

      if (statusFilter === 'active') {
        return c.is_active && !isExpired && !isMaxReached;
      }
      if (statusFilter === 'paused') {
        return !c.is_active;
      }
      if (statusFilter === 'expired') {
        return isExpired || isMaxReached;
      }

      return true;
    });
  }, [coupons, searchTerm, statusFilter]);

  // Open modal to Create New Coupon
  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormCode('');
    setFormDescription('');
    setFormType('percentage');
    setFormValue('10');
    setFormMinOrder('40,00');
    setFormUsageRule('unlimited');
    setFormMaxUses('50');
    setFormExpiresAt('');
    setFormIsActive(true);
    setIsFormModalOpen(true);
  };

  // Open modal to Edit Existing Coupon
  const handleOpenEdit = (c: DiscountCoupon) => {
    setEditingCoupon(c);
    setFormCode(c.code);
    setFormDescription(c.description || '');

    if (c.free_shipping) {
      setFormType('shipping');
    } else {
      setFormType((c.discount_type || c.type || 'percentage') as any);
    }

    setFormValue((c.discount_value ?? c.value ?? 0).toString());
    setFormMinOrder(c.min_order_value ? c.min_order_value.toString() : '');

    // Rule determination
    if (c.is_single_use) {
      setFormUsageRule('single_global');
    } else if (c.single_use_per_client) {
      setFormUsageRule('single_per_client');
    } else if (c.max_uses && c.max_uses > 0) {
      setFormUsageRule('max_limit');
      setFormMaxUses(c.max_uses.toString());
    } else {
      setFormUsageRule('unlimited');
    }

    setFormExpiresAt(c.expires_at ? c.expires_at.split('T')[0] : '');
    setFormIsActive(c.is_active);
    setIsFormModalOpen(true);
  };

  // Generate random promo code
  const handleGenerateRandomCode = () => {
    const prefixes = ['ALFA', 'PROMO', 'FESTA', 'DELIVERY', 'SABOR', 'COMBO'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const n = Math.floor(10 + Math.random() * 90);
    setFormCode(`${p}${n}`);
  };

  // Save Coupon (Create or Update)
  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) return;

    const cleanCode = formCode.trim().toUpperCase().replace(/\s+/g, '');
    const numVal = parseFloat(formValue.replace(',', '.')) || 0;
    const minOrderVal = parseFloat(formMinOrder.replace(',', '.')) || 0;

    const payload: DiscountCoupon = {
      id: editingCoupon ? editingCoupon.id : `cup_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      code: cleanCode,
      description: formDescription.trim() || undefined,
      discount_type: formType === 'shipping' ? 'fixed' : formType,
      type: formType === 'shipping' ? 'fixed' : formType,
      discount_value: formType === 'shipping' ? 0 : numVal,
      value: formType === 'shipping' ? 0 : numVal,
      free_shipping: formType === 'shipping',
      min_order_value: minOrderVal,
      is_active: formIsActive,
      is_single_use: formUsageRule === 'single_global',
      single_use_per_client: formUsageRule === 'single_per_client',
      max_uses: formUsageRule === 'max_limit' ? parseInt(formMaxUses) || 50 : (formUsageRule === 'single_global' ? 1 : null),
      current_uses: editingCoupon ? (editingCoupon.current_uses || 0) : 0,
      expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
      created_at: editingCoupon?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    StorageService.upsertCoupon(payload);
    setCoupons(StorageService.getCoupons());
    setIsFormModalOpen(false);
  };

  // Toggle Active/Paused Status
  const handleToggleStatus = (c: DiscountCoupon) => {
    const updated: DiscountCoupon = { ...c, is_active: !c.is_active, updated_at: new Date().toISOString() };
    StorageService.upsertCoupon(updated);
    setCoupons(StorageService.getCoupons());
  };

  // Delete Coupon
  const handleConfirmDelete = () => {
    if (!deletingCoupon) return;
    StorageService.deleteCoupon(deletingCoupon.id);
    setCoupons(StorageService.getCoupons());
    setDeletingCoupon(null);
  };

  // Copy code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: 'var(--color-primary-subtle, #fef2f2)',
                color: 'var(--color-primary, #dc2626)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Ticket size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Cupons & Descontos
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '2px 0 0' }}>
                Crie códigos promocionais, monitore as vendas geradas e acompanhe os clientes que utilizaram.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn btn-primary"
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 800,
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
          }}
        >
          <Plus size={18} />
          <span>Criar Novo Cupom</span>
        </button>
      </div>

      {/* KPI Performance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Cupons Ativos
            </span>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Ticket size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>
            {kpiData.activeCount} <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>/ {coupons.length}</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
            ● Prontos para resgate no carrinho
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Vendas com Cupom
            </span>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShoppingBag size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>
            {kpiData.totalUses} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>pedidos</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 600 }}>
            Ticket médio: {formatCurrency(kpiData.averageTicket)}
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Faturamento Gerado
            </span>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <TrendingUp size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#16a34a' }}>
            {formatCurrency(kpiData.totalRevenueFromCoupons)}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Total recebido em pedidos com cupom
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Desconto Concedido
            </span>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#fffbeb',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <DollarSign size={16} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#dc2626' }}>
            {formatCurrency(kpiData.totalDiscountGiven)}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Economia absorvida para clientes
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flexGrow: 1, minWidth: 260, maxWidth: 440 }}>
          <input
            type="text"
            placeholder="Buscar por código ou descrição..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 38, height: 42, borderRadius: 10, width: '100%' }}
          />
          <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: statusFilter === 'all' ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'all' ? '#fef2f2' : '#ffffff',
              color: statusFilter === 'all' ? '#dc2626' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Todos ({coupons.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: statusFilter === 'active' ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'active' ? '#f0fdf4' : '#ffffff',
              color: statusFilter === 'active' ? '#16a34a' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Ativos ({coupons.filter(c => c.is_active).length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('paused')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: statusFilter === 'paused' ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'paused' ? '#fffbeb' : '#ffffff',
              color: statusFilter === 'paused' ? '#d97706' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Pausados ({coupons.filter(c => !c.is_active).length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('expired')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: statusFilter === 'expired' ? '1.5px solid #64748b' : '1px solid #e2e8f0',
              backgroundColor: statusFilter === 'expired' ? '#f1f5f9' : '#ffffff',
              color: statusFilter === 'expired' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Esgotados / Expirados
          </button>
        </div>
      </div>

      {/* Coupons Modern Grid */}
      {filteredCoupons.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            border: '2px dashed #cbd5e1',
            padding: '48px 24px',
            textAlign: 'center',
            color: '#64748b'
          }}
        >
          <Ticket size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Nenhum cupom encontrado
          </h3>
          <p style={{ fontSize: '0.85rem', margin: '4px 0 18px' }}>
            {searchTerm || statusFilter !== 'all'
              ? 'Tente ajustar os filtros ou termo de busca acima.'
              : 'Crie seu primeiro cupom promocional para alavancar suas vendas!'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn btn-primary"
            style={{ padding: '10px 22px', borderRadius: 10, fontWeight: 700 }}
          >
            <Plus size={16} />
            <span>Criar Primeiro Cupom</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {filteredCoupons.map(coupon => {
            const stats = StorageService.getCouponUsageStats(coupon.code);
            const isPercentage = (coupon.discount_type || coupon.type) === 'percentage';
            const isShipping = Boolean(coupon.free_shipping);
            const discVal = coupon.discount_value ?? coupon.value ?? 0;

            const isExpired = coupon.expires_at ? new Date(coupon.expires_at).setHours(23,59,59,999) < Date.now() : false;
            const isLimitReached = coupon.max_uses ? (coupon.current_uses || 0) >= coupon.max_uses : false;

            const usagePercent = coupon.max_uses && coupon.max_uses > 0
              ? Math.min(100, Math.round(((coupon.current_uses || 0) / coupon.max_uses) * 100))
              : null;

            return (
              <div
                key={coupon.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 18,
                  border: coupon.is_active ? '1.5px solid #e2e8f0' : '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: coupon.is_active ? 1 : 0.75,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Top Ticket Header Bar with Status */}
                <div
                  style={{
                    padding: '14px 18px',
                    backgroundColor: coupon.is_active ? '#f8fafc' : '#f1f5f9',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        backgroundColor: isShipping ? '#eff6ff' : (isPercentage ? '#fef2f2' : '#f0fdf4'),
                        color: isShipping ? '#1d4ed8' : (isPercentage ? '#dc2626' : '#15803d'),
                        border: isShipping ? '1px solid #bfdbfe' : (isPercentage ? '1px solid #fecaca' : '1px solid #bbf7d0')
                      }}
                    >
                      {isShipping ? 'FRETE GRÁTIS' : (isPercentage ? 'PORCENTAGEM' : 'VALOR FIXO')}
                    </span>

                    {coupon.single_use_per_client && (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        1 uso p/ cliente
                      </span>
                    )}

                    {coupon.is_single_use && (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde68a'
                        }}
                      >
                        Uso Único Global
                      </span>
                    )}
                  </div>

                  {/* Toggle Active Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(coupon)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: coupon.is_active ? '#dcfce7' : '#fee2e2',
                      color: coupon.is_active ? '#15803d' : '#b91c1c'
                    }}
                  >
                    {coupon.is_active ? 'ATIVO' : 'PAUSADO'}
                  </button>
                </div>

                {/* Ticket Body */}
                <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Code and Copy Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: '#fef2f2',
                        border: '1.5px dashed #dc2626',
                        padding: '6px 14px',
                        borderRadius: 10
                      }}
                    >
                      <Ticket size={18} style={{ color: '#dc2626' }} />
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#b91c1c', letterSpacing: '0.05em' }}>
                        {coupon.code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCode(coupon.code)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        backgroundColor: copiedCode === coupon.code ? '#dcfce7' : '#f1f5f9',
                        color: copiedCode === coupon.code ? '#15803d' : '#475569',
                        border: 'none',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title="Copiar código do cupom"
                    >
                      {copiedCode === coupon.code ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedCode === coupon.code ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>

                  {/* Discount Value Display */}
                  <div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a' }}>
                      {isShipping ? 'Entrega 100% Grátis' : (isPercentage ? `${discVal}% de Desconto` : `${formatCurrency(discVal)} de Desconto`)}
                    </div>
                    {coupon.description && (
                      <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
                        {coupon.description}
                      </p>
                    )}
                  </div>

                  {/* Conditions & Expiration */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      fontSize: '0.8rem',
                      color: '#475569',
                      backgroundColor: '#f8fafc',
                      padding: 10,
                      borderRadius: 10
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>• Pedido mínimo:</span>
                      <span>{coupon.min_order_value > 0 ? formatCurrency(coupon.min_order_value) : 'Sem valor mínimo'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>• Validade:</span>
                      {coupon.expires_at ? (
                        <span style={{ color: isExpired ? '#dc2626' : '#0f172a', fontWeight: isExpired ? 700 : 500 }}>
                          {new Date(coupon.expires_at).toLocaleDateString('pt-BR')} {isExpired && '(Expirado)'}
                        </span>
                      ) : (
                        <span>Sem data de expiração</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>• Regra de uso:</span>
                      <span>
                        {coupon.is_single_use
                          ? 'Válido para 1 único pedido no total'
                          : (coupon.single_use_per_client
                            ? '1 utilização por cliente'
                            : (coupon.max_uses ? `Limite de ${coupon.max_uses} utilizações` : 'Uso ilimitado'))}
                      </span>
                    </div>
                  </div>

                  {/* Usage Performance Progress Bar (Section solicitada) */}
                  <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                        Desempenho de Uso
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                        {coupon.current_uses || stats.ordersCount || 0} {coupon.max_uses ? `/ ${coupon.max_uses}` : 'utilizações'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        width: '100%',
                        height: 7,
                        borderRadius: 9999,
                        backgroundColor: '#e2e8f0',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${usagePercent !== null ? usagePercent : Math.min(100, ((coupon.current_uses || stats.ordersCount || 0) * 10))}%`,
                          backgroundColor: isLimitReached ? '#ef4444' : 'var(--color-primary, #dc2626)',
                          borderRadius: 9999,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>

                    {/* Mini Stats Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: '0.75rem', color: '#64748b' }}>
                      <span>
                        Faturamento: <strong style={{ color: '#16a34a' }}>{formatCurrency(stats.totalRevenue)}</strong>
                      </span>
                      <span>
                        Clientes: <strong style={{ color: '#0f172a' }}>{stats.uniqueCustomersCount}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ticket Bottom Actions Bar */}
                <div
                  style={{
                    padding: '12px 18px',
                    borderTop: '1px solid #f1f5f9',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                  }}
                >
                  {/* Detailed Performance Modal Button */}
                  <button
                    type="button"
                    onClick={() => setViewingCouponStats(coupon)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 8,
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Eye size={14} style={{ color: '#2563eb' }} />
                    <span>Ver Pedidos ({stats.ordersCount})</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(coupon)}
                      style={{
                        padding: 7,
                        borderRadius: 8,
                        color: '#2563eb',
                        backgroundColor: '#eff6ff',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                      title="Alterar / Editar cupom"
                    >
                      <Edit2 size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingCoupon(coupon)}
                      style={{
                        padding: 7,
                        borderRadius: 8,
                        color: '#ef4444',
                        backgroundColor: '#fef2f2',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                      title="Excluir cupom"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CRIAR / ALTERAR CUPOM */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 580,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Ticket size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {editingCoupon ? `Alterar Cupom ${editingCoupon.code}` : 'Criar Novo Cupom'}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0' }}>
                    Configure o código, desconto e regras de utilização.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCoupon} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Code Input with Generator */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Código do Cupom *
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PROMO10, SALGADO15, FESTA20"
                    value={formCode}
                    onChange={e => setFormCode(e.target.value.toUpperCase())}
                    style={{
                      flex: 1,
                      height: 44,
                      padding: '0 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: '1rem',
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateRandomCode}
                    style={{
                      padding: '0 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="Gerar código aleatório"
                  >
                    <Sparkles size={14} />
                    <span>Gerar Código</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Descrição / Objetivo do Cupom
                </label>
                <input
                  type="text"
                  placeholder="Ex: Campanha de fim de semana no Instagram"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 12px',
                    borderRadius: 10,
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Discount Type Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Tipo de Desconto *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setFormType('percentage')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 10,
                      border: formType === 'percentage' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: formType === 'percentage' ? '#fef2f2' : '#ffffff',
                      color: formType === 'percentage' ? '#dc2626' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Percent size={18} />
                    <span>Porcentagem (%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('fixed')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 10,
                      border: formType === 'fixed' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: formType === 'fixed' ? '#fef2f2' : '#ffffff',
                      color: formType === 'fixed' ? '#dc2626' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <DollarSign size={18} />
                    <span>Valor Fixo (R$)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('shipping')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 10,
                      border: formType === 'shipping' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: formType === 'shipping' ? '#fef2f2' : '#ffffff',
                      color: formType === 'shipping' ? '#dc2626' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <ShoppingBag size={18} />
                    <span>Frete Grátis</span>
                  </button>
                </div>
              </div>

              {/* Value and Min Order Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {formType !== 'shipping' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      {formType === 'percentage' ? 'Porcentagem de Desconto (%) *' : 'Valor do Desconto (R$) *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={formType === 'percentage' ? '10' : '15,00'}
                      value={formValue}
                      onChange={e => setFormValue(e.target.value)}
                      style={{
                        width: '100%',
                        height: 42,
                        padding: '0 12px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                <div style={{ gridColumn: formType === 'shipping' ? '1 / -1' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Valor Mínimo do Pedido (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="0,00 (Sem mínimo)"
                    value={formMinOrder}
                    onChange={e => setFormMinOrder(e.target.value)}
                    style={{
                      width: '100%',
                      height: 42,
                      padding: '0 12px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Deixe 0 ou em branco se não houver pedido mínimo</span>
                </div>
              </div>

              {/* Usage Rules Selection (Item crucial solicitado pelo usuário) */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                  Regra de Utilização & Limite:
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: formUsageRule === 'unlimited' ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: formUsageRule === 'unlimited' ? '#fef2f2' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="usageRule"
                      checked={formUsageRule === 'unlimited'}
                      onChange={() => setFormUsageRule('unlimited')}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Uso Ilimitado</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Clientes podem usar várias vezes</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: formUsageRule === 'single_per_client' ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: formUsageRule === 'single_per_client' ? '#fef2f2' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="usageRule"
                      checked={formUsageRule === 'single_per_client'}
                      onChange={() => setFormUsageRule('single_per_client')}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>1 Uso por Cliente</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Bloqueia por WhatsApp após usar</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: formUsageRule === 'max_limit' ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: formUsageRule === 'max_limit' ? '#fef2f2' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="usageRule"
                      checked={formUsageRule === 'max_limit'}
                      onChange={() => setFormUsageRule('max_limit')}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Limite Total de Usos</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Ex: primeiros 50 pedidos</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: formUsageRule === 'single_global' ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: formUsageRule === 'single_global' ? '#fef2f2' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="usageRule"
                      checked={formUsageRule === 'single_global'}
                      onChange={() => setFormUsageRule('single_global')}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Uso Único Global</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Expira após o 1º uso</div>
                    </div>
                  </label>
                </div>

                {formUsageRule === 'max_limit' && (
                  <div style={{ marginTop: 6 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Quantidade Máxima de Pedidos Permitidos:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formMaxUses}
                      onChange={e => setFormMaxUses(e.target.value)}
                      style={{
                        width: 140,
                        height: 38,
                        padding: '0 10px',
                        borderRadius: 8,
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.9rem',
                        fontWeight: 700
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Expiration Date & Active Switch */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Data de Validade (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formExpiresAt}
                    onChange={e => setFormExpiresAt(e.target.value)}
                    style={{
                      width: '100%',
                      height: 42,
                      padding: '0 12px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    height: 42,
                    boxSizing: 'border-box'
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    Cupom Ativo
                  </span>
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={e => setFormIsActive(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#dc2626' }}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontWeight: 700,
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    borderRadius: 10,
                    backgroundColor: 'var(--color-primary, #dc2626)',
                    color: '#ffffff',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  {editingCoupon ? 'Salvar Alterações' : 'Cadastrar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ACOMPANHAMENTO DE USO & DESEMPENHO DO CLIENTE */}
      {/* ========================================================================= */}
      {viewingCouponStats && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: 16
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 780,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    padding: '6px 14px',
                    borderRadius: 10,
                    backgroundColor: '#fef2f2',
                    border: '1.5px dashed #dc2626',
                    color: '#b91c1c',
                    fontWeight: 900,
                    fontSize: '1.2rem',
                    letterSpacing: '0.05em'
                  }}
                >
                  {viewingCouponStats.code}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Desempenho & Pedidos dos Clientes
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0' }}>
                    Histórico detalhado de clientes que usaram este cupom no cardápio online.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingCouponStats(null)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            {(() => {
              const stats = StorageService.getCouponUsageStats(viewingCouponStats.code);

              return (
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Stats Highlights */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Utilizações
                      </span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                        {stats.ordersCount}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Clientes Únicos
                      </span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2563eb', marginTop: 2 }}>
                        {stats.uniqueCustomersCount}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Faturamento
                      </span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', marginTop: 2 }}>
                        {formatCurrency(stats.totalRevenue)}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Total Descontos
                      </span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: 2 }}>
                        {formatCurrency(stats.totalDiscount)}
                      </div>
                    </div>
                  </div>

                  {/* Orders Table */}
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                      Pedidos Realizados com este Cupom ({stats.orders.length})
                    </h4>

                    {stats.orders.length === 0 ? (
                      <div
                        style={{
                          padding: 36,
                          textAlign: 'center',
                          backgroundColor: '#f8fafc',
                          borderRadius: 14,
                          border: '1.5px dashed #cbd5e1',
                          color: '#64748b'
                        }}
                      >
                        <AlertCircle size={32} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                          Nenhum pedido utilizou este cupom até o momento.
                        </div>
                        <p style={{ fontSize: '0.82rem', margin: '4px 0 0' }}>
                          Compartilhe o código <strong>{viewingCouponStats.code}</strong> no WhatsApp ou Instagram para começar a rastrear os pedidos!
                        </p>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                              <th style={{ padding: '10px 14px' }}>Pedido</th>
                              <th style={{ padding: '10px 14px' }}>Cliente</th>
                              <th style={{ padding: '10px 14px' }}>Data / Hora</th>
                              <th style={{ padding: '10px 14px' }}>Desconto</th>
                              <th style={{ padding: '10px 14px' }}>Total Pago</th>
                              <th style={{ padding: '10px 14px', textAlign: 'right' }}>WhatsApp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.orders.map(order => (
                              <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>
                                  #{order.order_number}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{order.customer_name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.customer_phone}</div>
                                </td>
                                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                                  {formatDateTime(order.created_at)}
                                </td>
                                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#dc2626' }}>
                                  -{formatCurrency(order.discount_value || 0)}
                                </td>
                                <td style={{ padding: '10px 14px', fontWeight: 800, color: '#15803d' }}>
                                  {formatCurrency(order.total)}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                  <a
                                    href={`https://wa.me/55${order.customer_phone?.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      padding: '4px 10px',
                                      backgroundColor: '#dcfce7',
                                      color: '#15803d',
                                      borderRadius: 6,
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                  >
                                    <MessageCircle size={13} />
                                    <span>Conversar</span>
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRMAR EXCLUSÃO */}
      {/* ========================================================================= */}
      {deletingCoupon && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 16
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              maxWidth: 420,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}
          >
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Excluir Cupom "{deletingCoupon.code}"?
            </h4>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
              Tem certeza que deseja apagar este cupom? Clientes não poderão mais utilizá-lo no checkout.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setDeletingCoupon(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Sim, Excluir Cupom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
