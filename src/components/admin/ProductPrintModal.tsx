import React, { useState, useMemo } from 'react';
import { Product, Category, StoreSettings } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatCurrency } from '../../utils/formatters';
import { productImage, fallbackProductImage } from '../../utils/productImage';
import { useDialog } from '../../utils/useDialog';
import {
  Printer,
  X,
  CheckSquare,
  Square,
  Filter,
  FileText,
  Sliders,
  Sparkles,
  Layers,
  Image as ImageIcon,
  DollarSign,
  Package,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface ColumnOption {
  id: 'photo' | 'name' | 'category' | 'price' | 'options' | 'stock' | 'status';
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  defaultChecked: boolean;
}

const AVAILABLE_COLUMNS: ColumnOption[] = [
  {
    id: 'photo',
    label: 'Foto do Produto',
    description: 'Miniatura da imagem do cardápio',
    icon: ImageIcon,
    defaultChecked: true
  },
  {
    id: 'name',
    label: 'Produto & Detalhes',
    description: 'Nome, descrição e destaques',
    icon: FileText,
    defaultChecked: true
  },
  {
    id: 'category',
    label: 'Categoria',
    description: 'Seção a que pertence',
    icon: Layers,
    defaultChecked: true
  },
  {
    id: 'price',
    label: 'Preço de Venda',
    description: 'Preço normal e promocional',
    icon: DollarSign,
    defaultChecked: true
  },
  {
    id: 'options',
    label: 'Adicionais / Listas',
    description: 'Quantidade de listas de complementos',
    icon: Sparkles,
    defaultChecked: true
  },
  {
    id: 'stock',
    label: 'Controle de Estoque',
    description: 'Saldo disponível ou ilimitado',
    icon: Package,
    defaultChecked: true
  },
  {
    id: 'status',
    label: 'Disponibilidade',
    description: 'Status ativo ou pausado',
    icon: CheckCircle2,
    defaultChecked: true
  }
];

interface ProductPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  filteredProducts: Product[];
  categories: Category[];
  currentSearchTerm?: string;
  currentCategoryName?: string;
}

export const ProductPrintModal: React.FC<ProductPrintModalProps> = ({
  isOpen,
  onClose,
  products,
  filteredProducts,
  categories,
  currentSearchTerm,
  currentCategoryName
}) => {
  useDialog(isOpen, onClose);

  // Seleção de Colunas
  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    AVAILABLE_COLUMNS.forEach(col => {
      init[col.id] = col.defaultChecked;
    });
    return init;
  });

  // Filtros de Escopo
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [sortBy, setSortBy] = useState<'category_name' | 'name_asc' | 'price_desc' | 'price_asc'>('category_name');

  // Configurações de Layout
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [fontSize, setFontSize] = useState<'normal' | 'compact'>('normal');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeHeader, setIncludeHeader] = useState(true);

  const [isPrinting, setIsPrinting] = useState(false);

  // Mapeamento de Categorias
  const categoryMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c.name]));
  }, [categories]);

  // Lista base de produtos a serem impressos
  const baseList = scope === 'filtered' ? filteredProducts : products.filter(p => !p.is_archived);

  // Produtos finais após filtros e ordenação
  const printableProducts = useMemo(() => {
    let list = baseList.filter(p => {
      if (statusFilter === 'active') return p.available;
      if (statusFilter === 'paused') return !p.available;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name, 'pt-BR');
      }
      if (sortBy === 'price_desc') {
        const pA = a.promo_price && a.promo_price > 0 ? a.promo_price : a.price;
        const pB = b.promo_price && b.promo_price > 0 ? b.promo_price : b.price;
        return pB - pA;
      }
      if (sortBy === 'price_asc') {
        const pA = a.promo_price && a.promo_price > 0 ? a.promo_price : a.price;
        const pB = b.promo_price && b.promo_price > 0 ? b.promo_price : b.price;
        return pA - pB;
      }
      // category_name
      const catA = categoryMap.get(a.category_id) || 'Diversos';
      const catB = categoryMap.get(b.category_id) || 'Diversos';
      const catComp = catA.localeCompare(catB, 'pt-BR');
      if (catComp !== 0) return catComp;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

    return list;
  }, [baseList, statusFilter, sortBy, categoryMap]);

  // Quantidade de colunas selecionadas
  const selectedColsCount = useMemo(() => {
    return Object.values(selectedColumns).filter(Boolean).length;
  }, [selectedColumns]);

  const handleToggleColumn = (colId: string) => {
    setSelectedColumns(prev => ({
      ...prev,
      [colId]: !prev[colId]
    }));
  };

  const handleSelectAllColumns = () => {
    const updated: Record<string, boolean> = {};
    AVAILABLE_COLUMNS.forEach(c => { updated[c.id] = true; });
    setSelectedColumns(updated);
  };

  const handleDeselectAllColumns = () => {
    const updated: Record<string, boolean> = {};
    AVAILABLE_COLUMNS.forEach(c => { updated[c.id] = false; });
    // Sempre mantém pelo menos o nome marcado
    updated['name'] = true;
    setSelectedColumns(updated);
  };

  // Disparar Impressão
  const handlePrint = () => {
    if (selectedColsCount === 0) {
      alert('Selecione pelo menos uma coluna para imprimir.');
      return;
    }
    if (printableProducts.length === 0) {
      alert('Nenhum produto atende aos filtros selecionados para impressão.');
      return;
    }

    setIsPrinting(true);

    try {
      const settings = StorageService.getSettings() as StoreSettings;
      const storeName = settings.business_name || 'Alfa Salgados';
      const storePhone = settings.phone || settings.whatsapp || '';
      const nowStr = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const totalActive = printableProducts.filter(p => p.available).length;
      const totalPaused = printableProducts.length - totalActive;
      const avgPrice = printableProducts.reduce((acc, p) => acc + (p.promo_price && p.promo_price > 0 ? p.promo_price : p.price), 0) / (printableProducts.length || 1);

      // Constrói linhas da tabela
      const rowsHtml = printableProducts.map((p, idx) => {
        const catName = categoryMap.get(p.category_id) || 'Diversos';
        const optionGroups = StorageService.getProductOptionGroups(p.id);
        const finalPrice = p.promo_price && p.promo_price > 0 ? p.promo_price : p.price;

        let cells = '';

        // 1. Foto
        if (selectedColumns.photo) {
          const imgSrc = p.image_url ? productImage(p) : '';
          cells += `
            <td class="col-photo">
              ${imgSrc ? `
                <img src="${imgSrc}" alt="${p.name}" class="product-thumb" onerror="this.style.display='none'" />
              ` : `
                <div class="no-photo-badge">—</div>
              `}
            </td>
          `;
        }

        // 2. Nome
        if (selectedColumns.name) {
          cells += `
            <td class="col-name">
              <div class="product-title-row">
                <span class="product-name">${p.name}</span>
                ${p.is_best_seller ? '<span class="badge badge-warning">Mais Vendido</span>' : ''}
                ${p.is_highlight ? '<span class="badge badge-info">Destaque</span>' : ''}
              </div>
              ${p.description ? `<div class="product-desc">${p.description}</div>` : ''}
            </td>
          `;
        }

        // 3. Categoria
        if (selectedColumns.category) {
          cells += `
            <td class="col-category">
              <span class="category-pill">${catName}</span>
            </td>
          `;
        }

        // 4. Preço
        if (selectedColumns.price) {
          cells += `
            <td class="col-price">
              <div class="price-val">${formatCurrency(finalPrice)}</div>
              ${p.promo_price && p.promo_price > 0 ? `<div class="strike-price">${formatCurrency(p.price)}</div>` : ''}
              ${p.price_display_mode === 'starting_at' ? '<div class="starting-hint">A partir de</div>' : ''}
            </td>
          `;
        }

        // 5. Adicionais
        if (selectedColumns.options) {
          cells += `
            <td class="col-options">
              ${p.has_options || optionGroups.length > 0 ? `
                <span class="badge badge-danger">${optionGroups.length} ${optionGroups.length === 1 ? 'lista' : 'listas'}</span>
              ` : `
                <span class="muted-text">Nenhum</span>
              `}
            </td>
          `;
        }

        // 6. Estoque
        if (selectedColumns.stock) {
          cells += `
            <td class="col-stock">
              ${p.has_stock_control ? `
                <span class="stock-val ${p.stock_quantity <= 5 ? 'stock-low' : 'stock-ok'}">
                  ${p.stock_quantity} un
                </span>
              ` : `
                <span class="muted-text">Ilimitado</span>
              `}
            </td>
          `;
        }

        // 7. Status
        if (selectedColumns.status) {
          cells += `
            <td class="col-status text-center">
              <span class="status-pill ${p.available ? 'status-active' : 'status-paused'}">
                ${p.available ? 'Ativo' : 'Pausado'}
              </span>
            </td>
          `;
        }

        return `<tr class="${idx % 2 === 0 ? 'even-row' : 'odd-row'}">${cells}</tr>`;
      }).join('');

      // Constrói cabeçalho da tabela
      let headersHtml = '';
      if (selectedColumns.photo) headersHtml += '<th class="col-photo" style="width: 50px;">Foto</th>';
      if (selectedColumns.name) headersHtml += '<th class="col-name">Produto</th>';
      if (selectedColumns.category) headersHtml += '<th class="col-category" style="width: 140px;">Categoria</th>';
      if (selectedColumns.price) headersHtml += '<th class="col-price" style="width: 110px;">Preço</th>';
      if (selectedColumns.options) headersHtml += '<th class="col-options" style="width: 110px;">Adicionais</th>';
      if (selectedColumns.stock) headersHtml += '<th class="col-stock" style="width: 90px;">Estoque</th>';
      if (selectedColumns.status) headersHtml += '<th class="col-status text-center" style="width: 90px;">Status</th>';

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Relatório de Produtos - ${storeName}</title>
          <style>
            @page {
              size: A4 ${orientation};
              margin: 12mm 12mm 15mm 12mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              background: #ffffff;
              font-size: ${fontSize === 'compact' ? '10px' : '11.5px'};
              line-height: 1.35;
              padding: 0;
            }
            .header-box {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #dc2626;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .brand-name {
              font-size: 18px;
              font-weight: 800;
              color: #991b1b;
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
            .summary-cards-row {
              display: flex;
              gap: 12px;
              margin-bottom: 14px;
            }
            .summary-card {
              flex: 1;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 6px 10px;
            }
            .summary-card-label {
              font-size: 9px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.03em;
            }
            .summary-card-val {
              font-size: 13px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 1px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            thead {
              display: table-header-group;
            }
            th {
              background: #f1f5f9;
              color: #334155;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.02em;
              padding: 8px 10px;
              border-top: 1px solid #cbd5e1;
              border-bottom: 1.5px solid #94a3b8;
              text-align: left;
            }
            td {
              padding: ${fontSize === 'compact' ? '6px 8px' : '8px 10px'};
              border-bottom: 1px solid #e2e8f0;
              vertical-align: middle;
            }
            .even-row {
              background-color: #ffffff;
            }
            .odd-row {
              background-color: #f8fafc;
            }
            .product-thumb {
              width: 38px;
              height: 38px;
              border-radius: 6px;
              object-fit: cover;
              border: 1px solid #cbd5e1;
              display: block;
            }
            .no-photo-badge {
              width: 38px;
              height: 38px;
              border-radius: 6px;
              background: #f1f5f9;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #94a3b8;
              font-size: 10px;
            }
            .product-title-row {
              display: flex;
              align-items: center;
              gap: 6px;
              flex-wrap: wrap;
            }
            .product-name {
              font-weight: 700;
              color: #0f172a;
              font-size: ${fontSize === 'compact' ? '11px' : '12px'};
            }
            .product-desc {
              font-size: 9.5px;
              color: #64748b;
              margin-top: 2px;
              line-height: 1.25;
            }
            .category-pill {
              display: inline-block;
              background: #e2e8f0;
              color: #334155;
              padding: 2px 7px;
              border-radius: 4px;
              font-size: 9.5px;
              font-weight: 600;
            }
            .price-val {
              font-weight: 800;
              color: #b91c1c;
              font-size: ${fontSize === 'compact' ? '11px' : '12px'};
            }
            .strike-price {
              font-size: 9px;
              color: #94a3b8;
              text-decoration: line-through;
            }
            .starting-hint {
              font-size: 8.5px;
              color: #64748b;
            }
            .badge {
              display: inline-block;
              font-size: 8.5px;
              font-weight: 700;
              padding: 1px 5px;
              border-radius: 3px;
            }
            .badge-warning {
              background: #fef3c7;
              color: #92400e;
            }
            .badge-info {
              background: #eff6ff;
              color: #1e40af;
            }
            .badge-danger {
              background: #fee2e2;
              color: #991b1b;
            }
            .muted-text {
              color: #94a3b8;
              font-size: 9.5px;
            }
            .stock-val {
              font-weight: 700;
              font-size: 10px;
            }
            .stock-low {
              color: #b91c1c;
            }
            .stock-ok {
              color: #15803d;
            }
            .status-pill {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 9px;
              font-weight: 800;
            }
            .status-active {
              background: #dcfce7;
              color: #15803d;
            }
            .status-paused {
              background: #fee2e2;
              color: #b91c1c;
            }
            .text-center {
              text-align: center;
            }
            .footer-notes {
              margin-top: 14px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 8px;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          ${includeHeader ? `
            <div class="header-box">
              <div>
                <div class="brand-name">${storeName}</div>
                <div class="report-title">Catálogo & Lista de Produtos</div>
              </div>
              <div class="meta-text">
                <div><strong>Emissão:</strong> ${nowStr}</div>
                ${storePhone ? `<div><strong>Contato:</strong> ${storePhone}</div>` : ''}
                <div><strong>Total Listado:</strong> ${printableProducts.length} itens</div>
              </div>
            </div>
          ` : ''}

          ${includeSummary ? `
            <div class="summary-cards-row">
              <div class="summary-card">
                <div class="summary-card-label">Produtos Selecionados</div>
                <div class="summary-card-val">${printableProducts.length} itens</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-label">Itens Ativos</div>
                <div class="summary-card-val" style="color: #15803d;">${totalActive} (${Math.round((totalActive / (printableProducts.length || 1)) * 100)}%)</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-label">Itens Pausados</div>
                <div class="summary-card-val" style="color: #b91c1c;">${totalPaused}</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-label">Preço Médio</div>
                <div class="summary-card-val">${formatCurrency(avgPrice)}</div>
              </div>
            </div>
          ` : ''}

          <table>
            <thead>
              <tr>${headersHtml}</tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-notes">
            <span>Alfa Delivery Pro • Sistema de Gestão</span>
            <span>Documento gerado em ${nowStr} • Página 1</span>
          </div>
        </body>
        </html>
      `;

      // Executa a impressão via iframe invisível
      let iframe = document.getElementById('product-list-print-frame') as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'product-list-print-frame';
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
      doc.write(htmlContent);
      doc.close();

      const images = Array.from(doc.images || []).map(img => (img as HTMLImageElement).complete ? Promise.resolve() : new Promise<void>(resolve => {
        (img as HTMLImageElement).onload = () => resolve();
        (img as HTMLImageElement).onerror = () => resolve();
        setTimeout(resolve, 2000);
      }));

      void Promise.all([...images, doc.fonts?.ready ?? Promise.resolve()]).then(() => {
        setTimeout(() => {
          try {
            iframe?.contentWindow?.focus();
            iframe?.contentWindow?.print();
          } catch {
            window.print();
          } finally {
            setIsPrinting(false);
          }
        }, 200);
      });
    } catch (err) {
      console.error('Erro ao gerar impressão:', err);
      alert('Ocorreu um erro ao preparar a impressão.');
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configurar Impressão de Produtos"
      className="checkout-modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 11000 }}
    >
      <div
        className="checkout-modal-sheet animate-fade-in"
        style={{
          maxWidth: 680,
          height: 'min(92dvh, 820px)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
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
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f8fafc'
              }}
            >
              <Printer size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                Imprimir Lista de Produtos
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Filtre as colunas e opções para gerar o relatório impresso ou PDF
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar modal"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              borderRadius: '50%',
              width: 34,
              height: 34,
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
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            background: '#f8fafc'
          }}
        >
          {/* SEÇÃO 1: COLUNAS */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: '1.5px solid #f1f5f9'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={18} className="text-primary" style={{ color: '#dc2626' }} />
                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                  1. Colunas do Relatório ({selectedColsCount} selecionadas)
                </h4>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleSelectAllColumns}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '2px 6px'
                  }}
                >
                  Marcar Todas
                </button>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <button
                  type="button"
                  onClick={handleDeselectAllColumns}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '2px 6px'
                  }}
                >
                  Limpar
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 10
              }}
            >
              {AVAILABLE_COLUMNS.map(col => {
                const Icon = col.icon;
                const isChecked = !!selectedColumns[col.id];

                return (
                  <label
                    key={col.id}
                    onClick={() => handleToggleColumn(col.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: isChecked ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
                      backgroundColor: isChecked ? '#fef2f2' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ marginTop: 2, color: isChecked ? '#dc2626' : '#94a3b8' }}>
                      {isChecked ? <CheckSquare size={17} /> : <Square size={17} />}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          color: isChecked ? '#991b1b' : '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <Icon size={14} style={{ opacity: 0.85 }} />
                        <span>{col.label}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                        {col.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO 2: FILTROS DE DADOS */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: '1.5px solid #f1f5f9'
              }}
            >
              <Filter size={18} className="text-primary" style={{ color: '#dc2626' }} />
              <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                2. Filtros e Itens a Incluir
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              {/* Escopo da lista */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Produtos a Imprimir:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.84rem',
                      color: '#1e293b',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'filtered'}
                      onChange={() => setScope('filtered')}
                    />
                    <span>
                      Itens filtrados na tela ({filteredProducts.length} produtos)
                    </span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.84rem',
                      color: '#1e293b',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'all'}
                      onChange={() => setScope('all')}
                    />
                    <span>
                      Todos os produtos do cardápio ({products.filter(p => !p.is_archived).length} produtos)
                    </span>
                  </label>
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Disponibilidade no Cardápio:
                </label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="form-input"
                  style={{ width: '100%', borderRadius: 10, fontSize: '0.85rem' }}
                >
                  <option value="all">Todos os Status (Ativos & Pausados)</option>
                  <option value="active">Apenas Produtos Ativos</option>
                  <option value="paused">Apenas Produtos Pausados</option>
                </select>
              </div>

              {/* Ordenação */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Ordenar Relatório:
                </label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="form-input"
                  style={{ width: '100%', borderRadius: 10, fontSize: '0.85rem' }}
                >
                  <option value="category_name">Por Categoria e Nome (Padrão)</option>
                  <option value="name_asc">Nome do Produto (A a Z)</option>
                  <option value="price_desc">Preço (Maior primeiro)</option>
                  <option value="price_asc">Preço (Menor primeiro)</option>
                </select>
              </div>

              {/* Orientação */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Orientação da Folha:
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: orientation === 'portrait' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      background: orientation === 'portrait' ? '#fef2f2' : '#ffffff',
                      color: orientation === 'portrait' ? '#991b1b' : '#475569',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    📄 Vertical (Retrato)
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: orientation === 'landscape' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      background: orientation === 'landscape' ? '#fef2f2' : '#ffffff',
                      color: orientation === 'landscape' ? '#991b1b' : '#475569',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    📑 Horizontal (Paisagem)
                  </button>
                </div>
              </div>
            </div>

            {/* Opções adicionais de cabeçalho e densidade */}
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeHeader}
                  onChange={e => setIncludeHeader(e.target.checked)}
                />
                <span>Incluir Cabeçalho da Loja & Data</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={e => setIncludeSummary(e.target.checked)}
                />
                <span>Incluir Resumo de Indicadores no topo</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={fontSize === 'compact'}
                  onChange={e => setFontSize(e.target.checked ? 'compact' : 'normal')}
                />
                <span>Modo Compacto (cabe mais produtos por folha)</span>
              </label>
            </div>
          </div>

          {/* INDICADOR DE PRÉVIA */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', fontSize: '0.85rem', fontWeight: 600 }}>
              <CheckCircle2 size={18} />
              <span>
                Pronto para imprimir: <strong>{printableProducts.length} produtos</strong> com <strong>{selectedColsCount} colunas</strong> selecionadas.
              </span>
            </div>

            <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700 }}>
              Papel A4 ({orientation === 'portrait' ? 'Retrato' : 'Paisagem'})
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              fontSize: '0.88rem',
              fontWeight: 700
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isPrinting || selectedColsCount === 0 || printableProducts.length === 0}
            onClick={handlePrint}
            className="btn btn-primary"
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              fontSize: '0.92rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)'
            }}
          >
            <Printer size={18} />
            <span>{isPrinting ? 'Gerando Relatório...' : 'Imprimir / Salvar PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
