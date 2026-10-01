import React, { useState, useMemo, useEffect } from 'react';
import { Neighborhood } from '../../types';
import { StorageService, subscribeToStorage } from '../../services/storageService';
import { formatCurrency } from '../../utils/formatters';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Clock,
  DollarSign,
  TrendingUp,
  Percent,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  Navigation,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';

interface NeighborhoodsTabProps {
  neighborhoods?: Neighborhood[];
}

export const NeighborhoodsTab: React.FC<NeighborhoodsTabProps> = ({ neighborhoods: propNeighborhoods }) => {
  // Live neighborhoods state
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>(() => {
    return propNeighborhoods && propNeighborhoods.length > 0 ? propNeighborhoods : StorageService.getNeighborhoods();
  });

  // Sync with prop or storage events
  useEffect(() => {
    if (propNeighborhoods) {
      setNeighborhoods(propNeighborhoods);
    }
    const unsub = subscribeToStorage(() => {
      setNeighborhoods(StorageService.getNeighborhoods());
    });
    return unsub;
  }, [propNeighborhoods]);

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'fee_asc' | 'fee_desc'>('name_asc');

  // Modal State: Create or Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNeighborhood, setEditingNeighborhood] = useState<Neighborhood | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formFee, setFormFee] = useState('');
  const [formEstimatedTime, setFormEstimatedTime] = useState('35-50 min');
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formNotes, setFormNotes] = useState('');

  // Delete Confirmation Modal
  const [deletingNeighborhood, setDeletingNeighborhood] = useState<Neighborhood | null>(null);

  // Bulk Fee Adjust Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkAdjustmentType, setBulkAdjustmentType] = useState<'add' | 'subtract' | 'fixed'>('add');
  const [bulkAdjustmentValue, setBulkAdjustmentValue] = useState('1.00');

  // Quick Inline Fee Editing
  const [quickEditingId, setQuickEditingId] = useState<string | null>(null);
  const [quickFeeValue, setQuickFeeValue] = useState('');

  // Quick Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPIs
  const stats = useMemo(() => {
    const total = neighborhoods.length;
    const available = neighborhoods.filter(n => n.is_available !== false).length;
    const unavailable = total - available;

    const fees = neighborhoods.map(n => n.delivery_fee || 0);
    const minFee = fees.length > 0 ? Math.min(...fees) : 0;
    const maxFee = fees.length > 0 ? Math.max(...fees) : 0;
    const avgFee = fees.length > 0 ? fees.reduce((a, b) => a + b, 0) / fees.length : 0;

    return { total, available, unavailable, minFee, maxFee, avgFee };
  }, [neighborhoods]);

  // Filtered and Sorted Neighborhoods
  const processedNeighborhoods = useMemo(() => {
    let result = neighborhoods.filter(n => {
      // Status filter
      if (statusFilter === 'available' && n.is_available === false) return false;
      if (statusFilter === 'unavailable' && n.is_available !== false) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = (n.name || '').toLowerCase().includes(term);
        const matchesTime = (n.estimated_time || '').toLowerCase().includes(term);
        return matchesName || matchesTime;
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'pt-BR');
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name, 'pt-BR');
      if (sortBy === 'fee_asc') return (a.delivery_fee || 0) - (b.delivery_fee || 0);
      if (sortBy === 'fee_desc') return (b.delivery_fee || 0) - (a.delivery_fee || 0);
      return 0;
    });

    return result;
  }, [neighborhoods, searchTerm, statusFilter, sortBy]);

  // Open Modal for New Neighborhood
  const handleOpenNewModal = () => {
    setEditingNeighborhood(null);
    setFormName('');
    setFormFee('8.00');
    setFormEstimatedTime('35-50 min');
    setFormIsAvailable(true);
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open Modal for Editing
  const handleOpenEditModal = (item: Neighborhood) => {
    setEditingNeighborhood(item);
    setFormName(item.name);
    setFormFee((item.delivery_fee || 0).toString());
    setFormEstimatedTime(item.estimated_time || '35-50 min');
    setFormIsAvailable(item.is_available !== false);
    setFormNotes(item.notes || '');
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveNeighborhood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Por favor, informe o nome do bairro.');
      return;
    }

    const feeNum = parseFloat(formFee.replace(',', '.')) || 0;

    if (editingNeighborhood) {
      // Update existing
      const updated: Neighborhood = {
        ...editingNeighborhood,
        name: formName.trim(),
        delivery_fee: feeNum,
        estimated_time: formEstimatedTime.trim() || undefined,
        is_available: formIsAvailable,
        notes: formNotes.trim() || undefined,
        updated_at: new Date().toISOString()
      };
      StorageService.upsertNeighborhood(updated);
      showToast(`Bairro "${updated.name}" atualizado com sucesso!`);
    } else {
      // Create new
      const newId = `neigh_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const created: Neighborhood = {
        id: newId,
        name: formName.trim(),
        delivery_fee: feeNum,
        estimated_time: formEstimatedTime.trim() || undefined,
        is_available: formIsAvailable,
        notes: formNotes.trim() || undefined,
        created_at: new Date().toISOString()
      };
      StorageService.upsertNeighborhood(created);
      showToast(`Bairro "${created.name}" cadastrado com sucesso!`);
    }

    setIsModalOpen(false);
  };

  // Quick Toggle Availability
  const handleToggleAvailability = (item: Neighborhood) => {
    const updated: Neighborhood = {
      ...item,
      is_available: !(item.is_available !== false)
    };
    StorageService.upsertNeighborhood(updated);
    showToast(
      updated.is_available
        ? `Bairro "${updated.name}" agora está ATIVO para entregas.`
        : `Bairro "${updated.name}" foi PAUSADO.`
    );
  };

  // Quick Inline Fee Save
  const handleSaveQuickFee = (item: Neighborhood) => {
    const feeNum = parseFloat(quickFeeValue.replace(',', '.')) || 0;
    const updated: Neighborhood = {
      ...item,
      delivery_fee: feeNum
    };
    StorageService.upsertNeighborhood(updated);
    setQuickEditingId(null);
    showToast(`Taxa de "${updated.name}" alterada para ${formatCurrency(feeNum)}!`);
  };

  // Delete Neighborhood
  const handleConfirmDelete = () => {
    if (!deletingNeighborhood) return;
    StorageService.deleteNeighborhood(deletingNeighborhood.id);
    showToast(`Bairro "${deletingNeighborhood.name}" foi excluído.`);
    setDeletingNeighborhood(null);
  };

  // Bulk Fee Adjust
  const handleApplyBulkAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(bulkAdjustmentValue.replace(',', '.')) || 0;
    if (val <= 0 && bulkAdjustmentType !== 'fixed') {
      alert('Informe um valor válido para o ajuste.');
      return;
    }

    const currentList = StorageService.getNeighborhoods();
    const updatedList = currentList.map(n => {
      let newFee = n.delivery_fee || 0;
      if (bulkAdjustmentType === 'add') {
        newFee += val;
      } else if (bulkAdjustmentType === 'subtract') {
        newFee = Math.max(0, newFee - val);
      } else if (bulkAdjustmentType === 'fixed') {
        newFee = val;
      }
      return {
        ...n,
        delivery_fee: Math.round(newFee * 100) / 100
      };
    });

    StorageService.saveNeighborhoods(updatedList);
    setIsBulkModalOpen(false);
    showToast(
      bulkAdjustmentType === 'fixed'
        ? `Todas as taxas foram redefinidas para ${formatCurrency(val)}!`
        : `Reajuste de ${bulkAdjustmentType === 'add' ? '+' : '-'}${formatCurrency(val)} aplicado a todos os ${updatedList.length} bairros!`
    );
  };

  return (
    <div style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Toast Feedback */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 100,
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 10,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          fontSize: '0.88rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: 'slideUp 0.25s ease'
        }}>
          <Check size={18} style={{ color: '#22c55e' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER & PRIMARY ACTIONS */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Bairros & Taxas de Entrega
            </h2>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: '0.78rem',
              fontWeight: 800,
              backgroundColor: '#fee2e2',
              color: '#b91c1c'
            }}>
              {stats.available} Ativos
            </span>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '4px 0 0' }}>
            Configure as regiões atendidas, valores da tele-entrega e tempo médio de espera.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsBulkModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Ajustar ou aumentar a taxa de todos os bairros de uma vez"
          >
            <SlidersHorizontal size={16} />
            <span>Ajuste em Massa</span>
          </button>

          <button
            onClick={handleOpenNewModal}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 10,
              fontSize: '0.88rem',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
            }}
          >
            <Plus size={18} />
            <span>Novo Bairro</span>
          </button>
        </div>
      </div>

      {/* 2. STATS & KPIS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 14
      }}>
        {/* Total Bairros */}
        <div className="card" style={{
          padding: '16px 18px',
          borderRadius: 14,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <MapPin size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Total de Regiões</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.total} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>bairros</span>
            </div>
          </div>
        </div>

        {/* Ativos vs Pausados */}
        <div className="card" style={{
          padding: '16px 18px',
          borderRadius: 14,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#dcfce7',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Navigation size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Disponibilidade</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#15803d', lineHeight: 1.2 }}>
              {stats.available} <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>({stats.unavailable} pausados)</span>
            </div>
          </div>
        </div>

        {/* Taxa Média */}
        <div className="card" style={{
          padding: '16px 18px',
          borderRadius: 14,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Taxa Média</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
              {formatCurrency(stats.avgFee)}
            </div>
          </div>
        </div>

        {/* Variação (Menor a Maior) */}
        <div className="card" style={{
          padding: '16px 18px',
          borderRadius: 14,
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#fef3c7',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Faixa de Taxas</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
              {formatCurrency(stats.minFee)} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>a</span> {formatCurrency(stats.maxFee)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. FILTERS, SEARCH & SORT BAR */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '14px 18px',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', width: 280, minWidth: 220 }}>
          <input
            type="text"
            placeholder="Buscar por nome do bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{
              paddingLeft: 34,
              paddingRight: 28,
              fontSize: '0.85rem',
              borderRadius: 8,
              height: 38,
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
          <Search size={15} style={{ position: 'absolute', left: 11, top: 12, color: '#94a3b8' }} />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: 9,
                top: 9,
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter buttons & sorting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: 3, borderRadius: 8 }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: statusFilter === 'all' ? '#ffffff' : 'transparent',
                color: statusFilter === 'all' ? '#0f172a' : '#64748b',
                fontWeight: statusFilter === 'all' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: statusFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              Todos ({neighborhoods.length})
            </button>
            <button
              onClick={() => setStatusFilter('available')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: statusFilter === 'available' ? '#ffffff' : 'transparent',
                color: statusFilter === 'available' ? '#15803d' : '#64748b',
                fontWeight: statusFilter === 'available' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: statusFilter === 'available' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              Ativos ({stats.available})
            </button>
            <button
              onClick={() => setStatusFilter('unavailable')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: statusFilter === 'unavailable' ? '#ffffff' : 'transparent',
                color: statusFilter === 'unavailable' ? '#b91c1c' : '#64748b',
                fontWeight: statusFilter === 'unavailable' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: statusFilter === 'unavailable' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              Pausados ({stats.unavailable})
            </button>
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="form-input"
              style={{
                fontSize: '0.78rem',
                padding: '6px 10px',
                borderRadius: 8,
                height: 34,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <option value="name_asc">Nome (A - Z)</option>
              <option value="name_desc">Nome (Z - A)</option>
              <option value="fee_asc">Taxa (Menor primeiro)</option>
              <option value="fee_desc">Taxa (Maior primeiro)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. NEIGHBORHOODS TABLE */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                <th style={{ padding: '14px 18px' }}>Bairro / Região</th>
                <th style={{ padding: '14px 18px' }}>Taxa de Entrega</th>
                <th style={{ padding: '14px 18px' }}>Tempo Estimado</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>Status de Entrega</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {processedNeighborhoods.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <MapPin size={36} style={{ color: '#cbd5e1' }} />
                      <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Nenhum bairro encontrado</span>
                      <span style={{ fontSize: '0.8rem' }}>Tente alterar a busca ou filtro de status.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                processedNeighborhoods.map(item => {
                  const isAvailable = item.is_available !== false;
                  const isQuickEditing = quickEditingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isAvailable ? '#ffffff' : '#fafafa',
                        opacity: isAvailable ? 1 : 0.82,
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isAvailable ? '#f8fafc' : '#f4f4f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isAvailable ? '#ffffff' : '#fafafa'}
                    >
                      {/* Bairro Name */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: isAvailable ? '#fee2e2' : '#f1f5f9',
                            color: isAvailable ? '#dc2626' : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <MapPin size={17} />
                          </div>
                          <div>
                            <span style={{
                              fontWeight: 800,
                              color: isAvailable ? '#0f172a' : '#64748b',
                              fontSize: '0.92rem',
                              display: 'block'
                            }}>
                              {item.name}
                            </span>
                            {item.notes && (
                              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: 2 }}>
                                📌 {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Taxa de Entrega (Inline editing support) */}
                      <td style={{ padding: '14px 18px' }}>
                        {isQuickEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>R$</span>
                            <input
                              type="text"
                              value={quickFeeValue}
                              onChange={(e) => setQuickFeeValue(e.target.value)}
                              autoFocus
                              className="form-input"
                              style={{ width: 75, height: 30, padding: '2px 8px', fontSize: '0.82rem', fontWeight: 800 }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveQuickFee(item);
                                if (e.key === 'Escape') setQuickEditingId(null);
                              }}
                            />
                            <button
                              onClick={() => handleSaveQuickFee(item)}
                              style={{
                                padding: '4px 7px',
                                borderRadius: 6,
                                border: 'none',
                                backgroundColor: '#22c55e',
                                color: '#ffffff',
                                cursor: 'pointer'
                              }}
                              title="Salvar"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setQuickEditingId(null)}
                              style={{
                                padding: '4px 7px',
                                borderRadius: 6,
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#64748b',
                                cursor: 'pointer'
                              }}
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontWeight: 900,
                              fontSize: '0.96rem',
                              color: item.delivery_fee === 0 ? '#16a34a' : 'var(--color-primary-dark, #dc2626)'
                            }}>
                              {item.delivery_fee === 0 ? 'GRÁTIS' : formatCurrency(item.delivery_fee)}
                            </span>
                            <button
                              onClick={() => {
                                setQuickEditingId(item.id);
                                setQuickFeeValue((item.delivery_fee || 0).toString());
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: 2,
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Alterar taxa rapidamente"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Tempo Estimado */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.78rem',
                          color: '#475569',
                          backgroundColor: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontWeight: 600
                        }}>
                          <Clock size={12} style={{ color: '#64748b' }} />
                          <span>{item.estimated_time || '35-50 min'}</span>
                        </span>
                      </td>

                      {/* Status Toggle Switch */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: isAvailable ? '#dcfce7' : '#fee2e2',
                            color: isAvailable ? '#15803d' : '#b91c1c',
                            border: `1px solid ${isAvailable ? '#bbf7d0' : '#fecaca'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title={isAvailable ? 'Clique para pausar entregas neste bairro' : 'Clique para reativar o bairro'}
                        >
                          <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: isAvailable ? '#22c55e' : '#ef4444'
                          }} />
                          <span>{isAvailable ? 'Atendido' : 'Pausado'}</span>
                        </button>
                      </td>

                      {/* Ações: Editar e Excluir */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '6px 12px',
                              borderRadius: 8,
                              border: '1px solid #bae6fd',
                              backgroundColor: '#f0f9ff',
                              color: '#0284c7',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Editar informações completas do bairro"
                          >
                            <Edit2 size={13} />
                            <span>Editar</span>
                          </button>

                          <button
                            onClick={() => setDeletingNeighborhood(item)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '6px 8px',
                              borderRadius: 8,
                              border: '1px solid #fecaca',
                              backgroundColor: '#fff1f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Excluir este bairro"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: CADASTRAR OU EDITAR BAIRRO */}
      {isModalOpen && (
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
            borderRadius: 18,
            width: '100%',
            maxWidth: 500,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                    {editingNeighborhood ? 'Editar Bairro' : 'Novo Bairro'}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {editingNeighborhood ? `Alterando dados de "${editingNeighborhood.name}"` : 'Cadastrar nova região para tele-entrega'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNeighborhood}>
              <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Nome do Bairro */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Nome do Bairro / Região *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ex: Candeias, Centro, Recreio, Boa Vista..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.9rem', borderRadius: 8, height: 40 }}
                  />
                </div>

                {/* Taxa de Entrega (R$) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Taxa de Entrega (R$) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: 12,
                      top: 10,
                      fontWeight: 800,
                      color: '#64748b',
                      fontSize: '0.9rem'
                    }}>
                      R$
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="0.00"
                      value={formFee}
                      onChange={(e) => setFormFee(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: 38, fontSize: '1rem', fontWeight: 800, borderRadius: 8, height: 40 }}
                    />
                  </div>

                  {/* Preset Quick Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Sugestões:</span>
                    {[0, 5, 7, 8, 10, 12, 15].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormFee(val.toFixed(2))}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          color: '#334155',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {val === 0 ? 'Grátis' : `R$ ${val}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tempo Estimado */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Tempo Estimado de Entrega
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Clock size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Ex: 30-40 min, 40-50 min..."
                      value={formEstimatedTime}
                      onChange={(e) => setFormEstimatedTime(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: 36, fontSize: '0.86rem', borderRadius: 8, height: 40 }}
                    />
                  </div>
                </div>

                {/* Observação interna / Ponto de referência */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Observações / Região (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Zona Leste, Próximo ao shopping, etc."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.84rem', borderRadius: 8, height: 38 }}
                  />
                </div>

                {/* Status Toggle */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                      Bairro Ativo para Pedidos
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {formIsAvailable ? 'Clientes podem selecionar este bairro no checkout' : 'Bairro temporariamente bloqueado'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormIsAvailable(!formIsAvailable)}
                    style={{
                      width: 48,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: formIsAvailable ? '#22c55e' : '#cbd5e1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 3,
                      left: formIsAvailable ? 25 : 3,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                      transition: 'left 0.2s ease'
                    }} />
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '14px 22px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '8px 22px',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: '0.86rem'
                  }}
                >
                  {editingNeighborhood ? 'Salvar Alterações' : 'Cadastrar Bairro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: AJUSTE EM MASSA DE TAXAS */}
      {isBulkModalOpen && (
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
            borderRadius: 18,
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  Ajuste de Taxas em Massa
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Aplique um reajuste geral para todos os {neighborhoods.length} bairros
                </span>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApplyBulkAdjustment}>
              <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Tipo de Reajuste
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setBulkAdjustmentType('add')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 8,
                        border: `2px solid ${bulkAdjustmentType === 'add' ? 'var(--color-primary, #dc2626)' : '#e2e8f0'}`,
                        backgroundColor: bulkAdjustmentType === 'add' ? '#fee2e2' : '#ffffff',
                        color: bulkAdjustmentType === 'add' ? '#b91c1c' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      + Aumentar
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkAdjustmentType('subtract')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 8,
                        border: `2px solid ${bulkAdjustmentType === 'subtract' ? '#0284c7' : '#e2e8f0'}`,
                        backgroundColor: bulkAdjustmentType === 'subtract' ? '#e0f2fe' : '#ffffff',
                        color: bulkAdjustmentType === 'subtract' ? '#0369a1' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      - Reduzir
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkAdjustmentType('fixed')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 8,
                        border: `2px solid ${bulkAdjustmentType === 'fixed' ? '#7e22ce' : '#e2e8f0'}`,
                        backgroundColor: bulkAdjustmentType === 'fixed' ? '#f3e8ff' : '#ffffff',
                        color: bulkAdjustmentType === 'fixed' ? '#6b21a8' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Taxa Fixa Geral
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    {bulkAdjustmentType === 'fixed' ? 'Novo Valor Único (R$)' : 'Valor a Modificar (R$)'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: 10, fontWeight: 800, color: '#64748b' }}>R$</span>
                    <input
                      type="text"
                      required
                      value={bulkAdjustmentValue}
                      onChange={(e) => setBulkAdjustmentValue(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: 38, fontSize: '1rem', fontWeight: 800, borderRadius: 8, height: 40 }}
                    />
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4, display: 'block' }}>
                    {bulkAdjustmentType === 'add' && `Exemplo: se colocar 1.00, um bairro de R$ 8,00 passará para R$ 9,00.`}
                    {bulkAdjustmentType === 'subtract' && `Exemplo: se colocar 1.00, um bairro de R$ 8,00 passará para R$ 7,00 (mínimo R$ 0).`}
                    {bulkAdjustmentType === 'fixed' && `Exemplo: todos os bairros terão a taxa alterada exatamente para este valor.`}
                  </span>
                </div>
              </div>

              <div style={{
                padding: '14px 22px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10
              }}>
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', borderRadius: 8, fontWeight: 800, fontSize: '0.86rem' }}
                >
                  Aplicar aos {neighborhoods.length} Bairros
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingNeighborhood && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 18,
            width: '100%',
            maxWidth: 440,
            padding: 24,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            textAlign: 'center'
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
              Excluir Bairro?
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0 0 20px' }}>
              Tem certeza que deseja remover o bairro <strong>"{deletingNeighborhood.name}"</strong>?
              Os clientes não poderão mais selecionar este bairro na tela de entrega.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button
                onClick={() => setDeletingNeighborhood(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '9px 22px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
