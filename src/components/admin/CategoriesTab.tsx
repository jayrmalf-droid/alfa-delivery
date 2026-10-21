import { normalizeAdminSearch } from '../../domain/adminInput';
import { useConfirmedSave } from '../../utils/useConfirmedSave';
import React, { useState } from 'react';
import { Category } from '../../types';
import { StorageService } from '../../services/storageService';
import { Plus, Edit2, Trash2, Tags, Check, X, ArrowUpDown } from 'lucide-react';

interface CategoriesTabProps {
  categories: Category[];
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ categories }) => {
  const { saving, saveError, runSave } = useConfirmedSave();
  const [query,setQuery]=useState('');
  const [visibility,setVisibility]=useState<'all'|'active'|'hidden'>('all');
  const visibleCategories=categories.map((cat,index)=>({cat,index})).filter(({cat})=>normalizeAdminSearch(cat.name).includes(normalizeAdminSearch(query))&&(visibility==='all'||(visibility==='active'?cat.is_available:!cat.is_available)));
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCategory: Category = {
      id: `cat_${Date.now().toString(36)}`,
      name: newCatName.trim(),
      sort_order: categories.length + 1,
      is_available: true,
      created_at: new Date().toISOString()
    };

    if (!await runSave(() => StorageService.upsertCategory(newCategory))) return;
    setNewCatName('');
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = async (cat: Category) => {
    if (!editName.trim()) return;
    if (!await runSave(() => StorageService.upsertCategory({ ...cat, name: editName.trim() }))) return;
    setEditingId(null);
  };

  const handleToggle = async (id: string) => {
    if (!await runSave(() => StorageService.toggleCategory(id))) return;
  };

  const handleDelete = async (id: string, name: string) => {
    const products = StorageService.getProducts();
    const linked = products.filter(p => p.category_id === id && !p.is_archived);
    if (linked.length > 0) {
      alert(`A categoria "${name}" não pode ser excluída pois possui ${linked.length} produto(s) vinculado(s) (ex.: "${linked[0].name}"). Mova ou arquive os produtos antes de excluir a categoria.`);
      return;
    }
    if (confirm(`Deseja remover a categoria "${name}"?`)) {
      if (!await runSave(() => StorageService.deleteCategory(id))) return;
    }
  };

  return (
    <fieldset disabled={saving} aria-busy={saving} className="confirmed-save-fields admin-categories-polish">
      {saveError && <p role="alert" className="confirmed-save-error">{saveError}</p>}
      {saving && <p role="status">Aguardando confirmação de gravação…</p>}
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="admin-section-heading">
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
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10 }} data-admin-ui="form">
          <input
            type="text"
            required
            aria-label="Nome da nova categoria"
            placeholder="Ex: Salgados Fritos, Sobremesas..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="form-input"
            style={{ flexGrow: 1 }}
           data-admin-ui="field"/>
          <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }} data-admin-ui="button">
            <Plus size={18} />
            <span>Adicionar Categoria</span>
          </button>
        </form>
      </div>

      <div className="catalog-agenda-filters"><label>Buscar categoria<input type="search" aria-label="Buscar categorias" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Digite o nome da categoria" data-admin-ui="field"/></label><div role="group" aria-label="Visibilidade das categorias">{([['all','Todas'],['active','Ativas'],['hidden','Ocultas']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={visibility===id} onClick={()=>setVisibility(id)} data-admin-ui="button">{label}</button>)}</div><p role="status">{visibleCategories.length} de {categories.length} categorias · {categories.filter(c=>c.is_available).length} ativas</p></div>
      {/* Categories List */}
      <div className="card categories-list" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Tabela de dados — role para ver todas as colunas" data-admin-ui="table-scroll">
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
            {visibleCategories.map(({cat,index:idx}) => (
              <tr
                key={cat.id}
                style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td data-label="Ordem" style={{ padding: '12px 16px', fontWeight: 700, color: '#94a3b8' }}>
                  #{idx + 1}
                </td>

                <td data-label="Categoria" style={{ padding: '12px 16px' }}>
                  {editingId === cat.id ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        aria-label="Editar nome da categoria"
                        autoFocus
                        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();handleSaveEdit(cat);}else if(e.key==='Escape')setEditingId(null);}}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="form-input"
                        style={{ padding: '4px 8px', width: 240 }}
                       data-admin-ui="field"/>
                      <button onClick={() => handleSaveEdit(cat)} style={{ color: '#16a34a' }} aria-label="Confirmar" data-admin-ui="button">
                        <Check size={18} />
                      </button>
                      <button onClick={() => setEditingId(null)} style={{ color: '#64748b' }} aria-label="Fechar" data-admin-ui="button">
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>
                      {cat.name}
                    </span>
                  )}
                </td>

                <td data-label="Visibilidade" style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button
                    aria-label={`${cat.is_available?'Ocultar':'Ativar'} categoria ${cat.name}`}
                    onClick={() => handleToggle(cat.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: cat.is_available ? '#dcfce7' : '#fee2e2',
                      color: cat.is_available ? '#15803d' : '#b91c1c'
                    }}
                   data-admin-ui="button">
                    {cat.is_available ? 'Ativa' : 'Oculta'}
                  </button>
                </td>

                <td data-label="Ações" style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      onClick={() => handleStartEdit(cat)}
                      style={{ padding: 6, borderRadius: 6, color: '#3b82f6', background: '#eff6ff' }}
                     aria-label="Editar" data-admin-ui="button">
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      style={{ padding: 6, borderRadius: 6, color: '#ef4444', background: '#fef2f2' }}
                     aria-label="Excluir" data-admin-ui="button">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visibleCategories.length===0&&<tr><td colSpan={4} className="catalog-empty"><strong>Nenhuma categoria encontrada</strong><p>{categories.length?'Ajuste a busca ou os filtros de visibilidade.':'Crie a primeira categoria para organizar seu cardápio.'}</p>{categories.length>0&&<button type="button" onClick={()=>{setQuery('');setVisibility('all');}} data-admin-ui="button">Limpar filtros</button>}</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
    </fieldset>
  );
};
