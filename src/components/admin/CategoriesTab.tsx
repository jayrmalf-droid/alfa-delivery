import React, { useState } from 'react';
import { Category } from '../../types';
import { StorageService } from '../../services/storageService';
import { Plus, Edit2, Trash2, Tags, Check, X, ArrowUpDown } from 'lucide-react';

interface CategoriesTabProps {
  categories: Category[];
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ categories }) => {
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCategory: Category = {
      id: `cat_${Date.now().toString(36)}`,
      name: newCatName.trim(),
      sort_order: categories.length + 1,
      is_available: true,
      created_at: new Date().toISOString()
    };

    StorageService.upsertCategory(newCategory);
    setNewCatName('');
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = (cat: Category) => {
    if (!editName.trim()) return;
    StorageService.upsertCategory({ ...cat, name: editName.trim() });
    setEditingId(null);
  };

  const handleToggle = (id: string) => {
    StorageService.toggleCategory(id);
  };

  const handleDelete = (id: string, name: string) => {
    const products = StorageService.getProducts();
    const linked = products.filter(p => p.category_id === id && !p.is_archived);
    if (linked.length > 0) {
      alert(`A categoria "${name}" não pode ser excluída pois possui ${linked.length} produto(s) vinculado(s) (ex.: "${linked[0].name}"). Mova ou arquive os produtos antes de excluir a categoria.`);
      return;
    }
    if (confirm(`Deseja remover a categoria "${name}"?`)) {
      StorageService.deleteCategory(id);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
          Categorias do Cardápio ({categories.length})
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
          Organize as seções em que os salgados e bebidas são exibidos para o cliente.
        </p>
      </div>

      {/* Add New Category form */}
      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
          Criar Nova Categoria
        </h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            required
            placeholder="Ex: Salgados Fritos, Sobremesas..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="form-input"
            style={{ flexGrow: 1 }}
          />
          <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
            <Plus size={18} />
            <span>Adicionar Categoria</span>
          </button>
        </form>
      </div>

      {/* Categories List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '12px 16px', width: 60 }}>Ordem</th>
              <th style={{ padding: '12px 16px' }}>Nome da Categoria</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Visibilidade</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, idx) => (
              <tr
                key={cat.id}
                style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#94a3b8' }}>
                  #{idx + 1}
                </td>

                <td style={{ padding: '12px 16px' }}>
                  {editingId === cat.id ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="form-input"
                        style={{ padding: '4px 8px', width: 240 }}
                      />
                      <button onClick={() => handleSaveEdit(cat)} style={{ color: '#16a34a' }}>
                        <Check size={18} />
                      </button>
                      <button onClick={() => setEditingId(null)} style={{ color: '#64748b' }}>
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>
                      {cat.name}
                    </span>
                  )}
                </td>

                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleToggle(cat.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: cat.is_available ? '#dcfce7' : '#fee2e2',
                      color: cat.is_available ? '#15803d' : '#b91c1c'
                    }}
                  >
                    {cat.is_available ? 'Ativa' : 'Oculta'}
                  </button>
                </td>

                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      onClick={() => handleStartEdit(cat)}
                      style={{ padding: 6, borderRadius: 6, color: '#3b82f6', background: '#eff6ff' }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      style={{ padding: 6, borderRadius: 6, color: '#ef4444', background: '#fef2f2' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
