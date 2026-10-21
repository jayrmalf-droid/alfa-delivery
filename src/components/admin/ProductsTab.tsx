import { productAvailability } from '../../domain/productAvailability';
import { normalizeAdminSearch, matchesProductView, type ProductViewFilter } from '../../domain/adminInput';
import { productImage, fallbackProductImage } from '../../utils/productImage';
import React, { useState } from 'react';
import { Product, Category } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatCurrency } from '../../utils/formatters';
import {
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Edit2,
  Trash2,
  UtensilsCrossed,
  Copy,
  Sparkles,
  Printer
} from 'lucide-react';
import { ProductFormModal } from './ProductFormModal';
import { ProductPrintModal } from './ProductPrintModal';

interface ProductsTabProps {
  products: Product[];
  categories: Category[];
}

export const ProductsTab: React.FC<ProductsTabProps> = ({ products, categories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [productView, setProductView] = useState<ProductViewFilter>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [sortProducts, setSortProducts] = useState<'name'|'priceAsc'|'priceDesc'>('name');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [showStockPausePanel, setShowStockPausePanel] = useState(false);
  const [stockRevision, setStockRevision] = useState(0);
  const [stockPanel, setStockPanel] = useState(false);
  const [stockHistory, setStockHistory] = useState<Array<{id:string;product_name:string;type:string;quantity:number;before:number;after:number;note:string;created_at:string}>>([]);
  const [stockBusy, setStockBusy] = useState(false);
  const [stockError, setStockError] = useState('');
  const [stockProduct, setStockProduct] = useState('');
  const [stockType, setStockType] = useState<'entry'|'adjustment'>('entry');
  const [stockAmount, setStockAmount] = useState('');
  const [stockNote, setStockNote] = useState('');
  const [minimum, setMinimum] = useState('5');
  const lowLimit = Number(minimum) >= 0 && Number.isFinite(Number(minimum)) ? Number(minimum) : 5;
  const trackedProducts = products.filter(p => !p.is_archived && p.has_stock_control);
  const lowProducts = trackedProducts.filter(p => p.stock_quantity <= lowLimit);
  const loadStockHistory = async () => {
    try { const response = await fetch('/api/stock', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Não foi possível carregar o histórico.');
      const result = await response.json(); setStockHistory(result.movements || []); setStockError('');
    } catch (error) { setStockError(error instanceof Error ? error.message : 'Falha ao carregar histórico.'); }
  };
  const registerStock = async () => {
    const quantity = Number(stockAmount);
    if (!stockProduct || !/^\d+$/.test(stockAmount) || !Number.isSafeInteger(quantity) || (stockType === 'entry' && quantity === 0)) { setStockError('Selecione um produto e informe uma quantidade inteira válida.'); return; }
    setStockBusy(true); setStockError('');
    try {
      const response = await fetch('/api/stock', { method: 'POST', credentials: 'same-origin', headers: {'Content-Type':'application/json'}, body: JSON.stringify({product_id:stockProduct,type:stockType,quantity,note:stockNote}) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || result.message || 'Não foi possível salvar a movimentação.');
      window.location.reload();
    } catch (error) { setStockError(error instanceof Error ? error.message : 'Falha ao registrar movimentação.'); setStockBusy(false); }
  };

  // Unique ingredients from all option groups for quick 1-click pause
  const uniqueIngredients = React.useMemo(() => {
    const allOpts = StorageService.getProductOptions();
    const map = new Map<string, { name: string; count: number; isPaused: boolean; priceAvg: number }>();
    allOpts.forEach(opt => {
      const trimmed = (opt.name || '').trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      const existing = map.get(key);
      const isPaused = opt.is_paused === true || opt.is_available === false;
      if (existing) {
        existing.count += 1;
        if (isPaused) existing.isPaused = true;
      } else {
        map.set(key, {
          name: trimmed,
          count: 1,
          isPaused,
          priceAvg: opt.price || 0
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [products, stockRevision]);

  const handleToggleIngredientPause = (name: string, currentPaused: boolean) => {
    StorageService.togglePauseIngredient(name, !currentPaused);
    setStockRevision(r => r + 1);
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    if (!matchesProductView(p, productView)) return false;
    if (selectedCategoryId !== 'all' && p.category_id !== selectedCategoryId) return false;
    if (searchTerm.trim()) {
      const term = normalizeAdminSearch(searchTerm);
      return normalizeAdminSearch(p.name).includes(term) || normalizeAdminSearch(p.description || '').includes(term);
    }
    return true;
  });

  const displayedProducts = [...filteredProducts].sort((a,b) => sortProducts === 'priceAsc' ? a.price-b.price : sortProducts === 'priceDesc' ? b.price-a.price : a.name.localeCompare(b.name, 'pt-BR'));
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  // Open modal for new product
  const handleOpenNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  // Open modal to edit product
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  // Duplicate product
  const handleDuplicate = (id: string) => {
    void StorageService.duplicateProduct(id).catch(error => window.dispatchEvent(new CustomEvent('alfa-save',{detail:{status:'error',message:error.message}})));
  };

  // Toggle availability
  const handleToggle = (id: string) => {
    StorageService.toggleProductAvailability(id);
  };

  // Delete product
  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deseja arquivar o produto "${name}"?`)) {
      StorageService.deleteProduct(id);
    }
  };

  return (
    <div className="admin-catalog-refresh" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <header className="admin-section-heading" data-admin-ui="toolbar">
        <div>
          <span className="admin-section-eyebrow">LOJA E CARDÁPIO</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Cardápio & Produtos ({products.filter(p => !p.is_archived).length})
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
            Gerencie preços, fotos, disponibilidade e estoque dos itens.
          </p>
        </div>

        <div className="admin-section-actions"><button type="button" className="catalog-operations-link" onClick={()=>{const target=document.getElementById('catalog-operations');target?.scrollIntoView({behavior:'auto',block:'start'});target?.focus({preventScroll:true});}}>Estoque e opções</button>
        <button
          onClick={handleOpenNew}
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
         data-admin-ui="button">
          <Plus size={18} />
          <span>Novo Produto</span>
        </button>
        </div>
      </header>

      <section className="admin-product-summary" aria-label="Resumo do catálogo">
        <div><span>No catálogo</span><strong>{products.filter(p => !p.is_archived).length}</strong></div>
        <div><span>Disponíveis para venda</span><strong>{products.filter(p => !p.is_archived && p.available).length}</strong></div>
        <div><span>Com controle de estoque</span><strong>{trackedProducts.length}</strong></div>
        <div className="attention"><span>Em alerta de reposição</span><strong>{lowProducts.length}</strong></div>
      </section>

      {/* Barra de Filtros e Ferramentas Remodelada e Compacta */}
      <div
        className="catalog-filterbar"
        data-admin-ui="toolbar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '12px 16px',
          backgroundColor: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        {/* Linha 1: Filtros de Status (Esquerda) + Busca, Categoria, Ordenação e Botão Imprimir (Direita) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          {/* Status View Pills */}
          <div
            className="product-view-filters"
            role="group"
            aria-label="Situação dos produtos"
            style={{ margin: 0, gap: 6, display: 'flex', flexWrap: 'wrap' }}
          >
            {([
              { id: 'all', label: 'Todos' },
              { id: 'active', label: 'Ativos' },
              { id: 'paused', label: 'Pausados' },
              { id: 'stockout', label: 'Sem estoque' }
            ] as const).map(filter => (
              <button
                type="button"
                key={filter.id}
                aria-pressed={productView === filter.id}
                onClick={() => setProductView(filter.id)}
                style={{
                  minHeight: 38,
                  padding: '6px 12px',
                  borderRadius: 10,
                  fontSize: '0.84rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                <span>{filter.label}</span>
                <strong>{products.filter(p => matchesProductView(p, filter.id)).length}</strong>
              </button>
            ))}
          </div>

          {/* Grupo de Controles: Busca + Categoria + Ordenar + Imprimir */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              flexGrow: 1,
              justifyContent: 'flex-end'
            }}
          >
            {/* Campo de Busca */}
            <div style={{ position: 'relative', minWidth: 180, flexGrow: 1, maxWidth: 280 }}>
              <input
                type="text"
                aria-label="Buscar produto por nome"
                placeholder="Buscar produto..."
                data-admin-field-icon="true"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 34, height: 38, borderRadius: 10, fontSize: '0.85rem', width: '100%' }}
                data-admin-ui="field"
              />
              <Search size={16} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
            </div>

            {/* Dropdown de Categorias */}
            <select
              aria-label="Filtrar produtos por categoria"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="form-input"
              style={{ width: 'auto', minWidth: 160, height: 38, borderRadius: 10, fontSize: '0.85rem', background: '#fff' }}
              data-admin-ui="field"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Ordenação */}
            <select
              id="catalog-sort"
              aria-label="Ordenar produtos"
              className="form-input"
              value={sortProducts}
              onChange={e => setSortProducts(e.target.value as 'name'|'priceAsc'|'priceDesc')}
              style={{ width: 'auto', minWidth: 135, height: 38, borderRadius: 10, fontSize: '0.85rem', background: '#fff' }}
            >
              <option value="name">Nome (A–Z)</option>
              <option value="priceAsc">Menor preço</option>
              <option value="priceDesc">Maior preço</option>
            </select>

            {/* Botão de Impressão com Filtros para Formação das Colunas */}
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="btn btn-secondary"
              style={{
                height: 38,
                padding: '0 14px',
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontWeight: 700,
                fontSize: '0.85rem',
                backgroundColor: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#1e293b',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              title="Imprimir relatório da lista de produtos com seleção de colunas"
              data-admin-ui="button"
            >
              <Printer size={16} style={{ color: '#dc2626' }} />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Linha 2: Resumo e Status dos Filtros (Extremamente compacto) */}
        <div
          className="catalog-query-summary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            margin: 0,
            paddingTop: 8,
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.82rem',
            color: '#64748b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span role="status" style={{ fontWeight: 650, color: '#334155' }}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </span>
            {(selectedCategoryId !== 'all' || searchTerm.trim() || productView !== 'all') && (
              <span style={{ color: '#cbd5e1' }}>•</span>
            )}
            {selectedCategoryId !== 'all' && (
              <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, color: '#475569', fontSize: '0.78rem' }}>
                Categoria: <strong>{categories.find(c => c.id === selectedCategoryId)?.name || 'Selecionada'}</strong>
              </span>
            )}
            {searchTerm.trim() && (
              <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, color: '#475569', fontSize: '0.78rem' }}>
                Busca: <strong>"{searchTerm.trim()}"</strong>
              </span>
            )}
            {productView !== 'all' && (
              <span style={{ background: '#fef2f2', padding: '2px 8px', borderRadius: 6, color: '#991b1b', fontSize: '0.78rem' }}>
                Filtro: <strong>{productView === 'active' ? 'Ativos' : productView === 'paused' ? 'Pausados' : 'Sem estoque'}</strong>
              </span>
            )}
          </div>

          {(searchTerm || selectedCategoryId !== 'all' || productView !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategoryId('all');
                setProductView('all');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'underline',
                padding: '2px 6px',
                minHeight: 'auto'
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>
      {/* Products Table */}
      <div className="card admin-product-list" style={{ overflow: 'hidden', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Tabela de dados — role para ver todas as colunas" data-admin-ui="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px', width: 60 }}>Foto</th>
                <th style={{ padding: '12px 16px' }}>Produto</th>
                <th style={{ padding: '12px 16px' }}>Categoria</th>
                <th style={{ padding: '12px 16px' }}>Preço</th>
                <th style={{ padding: '12px 16px' }}>Adicionais</th>
                <th style={{ padding: '12px 16px' }}>Estoque</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Disponível</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    {searchTerm.trim() || selectedCategoryId!=='all' || productView!=='all' ? 'Nenhum produto corresponde aos filtros. Limpe os filtros ou tente outra busca.' : 'Nenhum produto encontrado. Clique em "Novo Produto" para cadastrar.'}
                  </td>
                </tr>
              ) : (
                displayedProducts.map(p => {
                  const catName = categoryMap.get(p.category_id) || 'Diversos';
                  const optionGroups = StorageService.getProductOptionGroups(p.id);

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Thumbnail */}
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{
                          width: 46,
                          height: 46,
                          borderRadius: 10,
                          overflow: 'hidden',
                          backgroundColor: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #e2e8f0'
                        }}>
                          {p.image_url ? (
                            <img
                              src={productImage(p)}
                              onError={e=>{const fallback=fallbackProductImage(p);if(!e.currentTarget.src.endsWith(fallback))e.currentTarget.src=fallback;}}
                              alt={p.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <UtensilsCrossed size={20} style={{ color: '#cbd5e1' }} />
                          )}
                        </div>
                      </td>

                      {/* Name & Desc */}
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{p.name}</span>
                          {p.is_best_seller && (
                            <span style={{ fontSize: '0.68rem', backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              Mais Vendido
                            </span>
                          )}
                          {p.is_highlight && (
                            <span style={{ fontSize: '0.68rem', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              Destaque
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.description}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '10px 16px', color: '#475569' }}>
                        <span className="admin-product-category-badge" style={{
                          background: '#f1f5f9',
                          color: '#334155',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          fontWeight: 600
                        }}>
                          {catName}
                        </span>
                      </td>

                      {/* Price */}
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#dc2626' }}>
                          {formatCurrency(p.promo_price && p.promo_price > 0 ? p.promo_price : p.price)}
                        </div>
                        {p.promo_price && p.promo_price > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                            {formatCurrency(p.price)}
                          </div>
                        )}
                        {p.price_display_mode === 'starting_at' && (
                          <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>A partir de</span>
                        )}
                      </td>

                      {/* Additionals status */}
                      <td style={{ padding: '10px 16px' }}>
                        {p.has_options || optionGroups.length > 0 ? (
                          <span className="admin-product-options-badge" style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca'
                          }}>
                            <Sparkles size={12} />
                            <span>{optionGroups.length} {optionGroups.length === 1 ? 'lista' : 'listas'}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Nenhum</span>
                        )}
                      </td>

                      {/* Stock */}
                      <td style={{ padding: '10px 16px' }}>
                        {p.has_stock_control ? (
                          <span style={{
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            color: p.stock_quantity <= 5 ? '#b91c1c' : '#15803d'
                          }}>
                            {p.stock_quantity} un
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Ilimitado</span>
                        )}
                      </td>

                      {/* Availability Switch */}
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          aria-label={`${p.available ? 'Pausar' : 'Ativar'} produto ${p.name}`}
                          aria-pressed={p.available}
                          onClick={() => handleToggle(p.id)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: p.available ? '#dcfce7' : '#fee2e2',
                            color: p.available ? '#15803d' : '#b91c1c',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                         data-admin-ui="button">
                          {p.available ? 'Ativo' : 'Pausado'}
                        </button>
                        <small className="admin-product-availability">{productAvailability(p).reason}</small>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              color: '#3b82f6',
                              background: '#eff6ff',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Editar produto"
                           aria-label="Editar produto" data-admin-ui="button">
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(p.id)}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              color: '#475569',
                              background: '#f1f5f9',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Duplicar produto"
                           aria-label="Duplicar produto" data-admin-ui="button">
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              color: '#ef4444',
                              background: '#fef2f2',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Arquivar produto"
                           aria-label="Arquivar produto" data-admin-ui="button">
                            <Trash2 size={16} />
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

      <section id="catalog-operations" className="catalog-operations" tabIndex={-1} aria-label="Estoque e opções">
      <section style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:16}} data-admin-ui="panel">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}} data-admin-ui="toolbar">
          <div><strong>Estoque e reposição</strong><div style={{fontSize:13,color:'#64748b'}}>{trackedProducts.length} produtos controlados · {lowProducts.length} em alerta (mínimo: {lowLimit})</div></div>
          <button className="btn btn-primary" onClick={() => {setStockPanel(!stockPanel); if(!stockPanel) void loadStockHistory();}} data-admin-ui="button">{stockPanel?'Fechar estoque':'Gerenciar estoque'}</button>
        </div>
        {stockPanel && <div style={{marginTop:16,display:'grid',gap:14}}>
          <label>Limite para alertas (somente nesta visualização): <input type="number" min="0" step="1" value={minimum} onChange={e=>setMinimum(e.target.value)} style={{width:75,padding:7,marginLeft:8}}  data-admin-ui="field"/></label>
          <div><strong>Produtos que precisam de reposição</strong>
            <div style={{fontSize:13,color:'#475569',marginTop:6}}>{lowProducts.length?lowProducts.map(p=>`${p.name} (${p.stock_quantity} un)`).join(' · '):'Nenhum produto abaixo do limite.'}</div>
            <button style={{marginTop:8}} onClick={()=>{const lines=['Produto;Estoque;Limite',...lowProducts.map(p=>`"${p.name.replace(/"/g,'""')}";${p.stock_quantity};${lowLimit}`)];const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='reposicao_estoque.csv';a.click();URL.revokeObjectURL(a.href);}} data-admin-ui="button">Exportar reposição CSV</button>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}} data-admin-ui="toolbar">
            <select value={stockProduct} onChange={e=>setStockProduct(e.target.value)} style={{padding:9}} data-admin-ui="field"><option value="">Selecione um produto</option>{trackedProducts.map(p=><option key={p.id} value={p.id}>{p.name} ({p.stock_quantity} un)</option>)}</select>
            <select value={stockType} onChange={e=>setStockType(e.target.value as 'entry'|'adjustment')} style={{padding:9}} data-admin-ui="field"><option value="entry">Entrada / reposição</option><option value="adjustment">Ajuste: definir saldo final</option></select>
            <input aria-label="Quantidade" placeholder={stockType==='entry'?'Quantidade recebida':'Novo saldo final'} type="number" min={stockType==='entry'?'1':'0'} step="1" value={stockAmount} onChange={e=>setStockAmount(e.target.value)} style={{padding:9,width:165}}  data-admin-ui="field"/>
            <input aria-label="Observação" placeholder="Observação (opcional)" maxLength={180} value={stockNote} onChange={e=>setStockNote(e.target.value)} style={{padding:9}}  data-admin-ui="field"/>
            <button className="btn btn-primary" disabled={stockBusy} onClick={()=>void registerStock()} data-admin-ui="button">{stockBusy?'Salvando...':'Registrar movimentação'}</button>
          </div>
          {stockError && <p role="alert" style={{color:'#b91c1c'}}>{stockError}</p>}
          <div><strong>Histórico de movimentações</strong><p style={{fontSize:12,color:'#64748b'}}>Pedidos anteriores à 0.5.9 não possuem histórico retroativo nesta lista.</p>
            <div style={{maxHeight:230,overflowY:'auto',fontSize:13}}>{stockHistory.length?stockHistory.slice(0,100).map(m=><div key={m.id} style={{padding:8,borderBottom:'1px solid #e2e8f0'}}>{new Date(m.created_at).toLocaleString('pt-BR')} · {m.product_name} · {m.type==='entry'?'Reposição':m.type==='sale'?'Venda':m.type==='cancellation'?'Cancelamento':'Ajuste'} · {m.before} → {m.after} {m.note?`· ${m.note}`:''}</div>):'Nenhuma movimentação manual registrada.'}</div>
          </div>
        </div>}
      </section>

      {/* ⚡ Área de Gerenciamento Rápido: Pausa de Estoque em 1 Clique */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        border: '1.5px solid #e2e8f0',
        padding: '16px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }} data-admin-ui="panel">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }} data-admin-ui="toolbar">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: '#fef2f2',
                color: '#dc2626'
              }}>
                ⚡
              </span>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Pausa Rápida de Estoque (Insumos & Adicionais)
              </h3>
              {uniqueIngredients.some(i => i.isPaused) && (
                <span style={{
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 999
                }}>
                  {uniqueIngredients.filter(i => i.isPaused).length} insumo(s) pausado(s)
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>
              Acabou um insumo no meio do expediente? Pause ou reative com 1 clique em todos os produtos do cardápio simultaneamente.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowStockPausePanel(!showStockPausePanel)}
            className="btn btn-secondary"
            style={{
              padding: '7px 14px',
              borderRadius: 10,
              fontSize: '0.8rem',
              fontWeight: 700
            }}
           data-admin-ui="button">
            {showStockPausePanel ? 'Recolher Insumos ▲' : `Gerenciar Insumos (${uniqueIngredients.length}) ▼`}
          </button>
        </div>

        {showStockPausePanel && (
          <div style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid #f1f5f9',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
            gap: 10
          }} data-admin-ui="grid">
            {uniqueIngredients.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', gridColumn: '1 / -1' }}>
                Nenhum complemento ou adicional cadastrado nos produtos ainda.
              </p>
            ) : (
              uniqueIngredients.map(ing => (
                <div
                  key={ing.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: ing.isPaused ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                    backgroundColor: ing.isPaused ? '#fef2f2' : '#f8fafc',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ minWidth: 0, paddingRight: 8 }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: ing.isPaused ? '#991b1b' : '#0f172a',
                      textDecoration: ing.isPaused ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {ing.name}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Presente em {ing.count} produto(s)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleIngredientPause(ing.name, ing.isPaused)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: ing.isPaused ? '#dc2626' : '#e2e8f0',
                      color: ing.isPaused ? '#ffffff' : '#334155',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                    title={ing.isPaused ? 'Clique para reativar insumo' : 'Clique para pausar (esgotado)'}
                   data-admin-ui="button">
                    {ing.isPaused ? (
                      <>
                        <PlayCircle size={13} />
                        <span>Pausado</span>
                      </>
                    ) : (
                      <>
                        <PauseCircle size={13} />
                        <span>Ativo</span>
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      </section>

      {/* Remodeled Dedicated Modal Component */}
      <ProductFormModal
        isOpen={isModalOpen}
        editingProduct={editingProduct}
        categories={categories}
        totalProductsCount={products.length}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => setIsModalOpen(false)}
      />

      {/* Modal de Impressão com Filtros das Colunas */}
      <ProductPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        products={products}
        filteredProducts={filteredProducts}
        categories={categories}
        currentSearchTerm={searchTerm}
        currentCategoryName={categoryMap.get(selectedCategoryId)}
      />
    </div>
  );
};
