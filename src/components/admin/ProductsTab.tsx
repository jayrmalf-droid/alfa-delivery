import { productImage, fallbackProductImage } from '../../utils/productImage';
import React, { useState } from 'react';
import { Product, Category } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatCurrency } from '../../utils/formatters';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  UtensilsCrossed,
  Copy,
  Sparkles
} from 'lucide-react';
import { ProductFormModal } from './ProductFormModal';

interface ProductsTabProps {
  products: Product[];
  categories: Category[];
}

export const ProductsTab: React.FC<ProductsTabProps> = ({ products, categories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter products
  const filteredProducts = products.filter(p => {
    if (p.is_archived) return false;
    if (selectedCategoryId !== 'all' && p.category_id !== selectedCategoryId) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term);
    }
    return true;
  });

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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Cardápio & Produtos ({products.filter(p => !p.is_archived).length})
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
            Gerencie preços, fotos, disponibilidade e estoque dos itens.
          </p>
        </div>

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
        >
          <Plus size={18} />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flexGrow: 1, minWidth: 0 }}>
          <input
            type="text"
            placeholder="Buscar produto por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 38, height: 44, borderRadius: 10 }}
          />
          <Search size={18} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
        </div>

        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="form-input"
          style={{ width: 'auto', minWidth: 200, height: 44, borderRadius: 10, background: '#fff' }}
        >
          <option value="all">Todas as Categorias</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="card" style={{ overflow: 'hidden', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
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
                    Nenhum produto encontrado. Clique em "Novo Produto" para cadastrar.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
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
                        <span style={{
                          background: '#f1f5f9',
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
                          <span style={{
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
                        >
                          {p.available ? 'Ativo' : 'Pausado'}
                        </button>
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
                          >
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
                          >
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
                          >
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

      {/* Remodeled Dedicated Modal Component */}
      <ProductFormModal
        isOpen={isModalOpen}
        editingProduct={editingProduct}
        categories={categories}
        totalProductsCount={products.length}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => setIsModalOpen(false)}
      />
    </div>
  );
};
