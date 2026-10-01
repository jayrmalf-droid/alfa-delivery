import React, { useState } from 'react';
import { Flavor } from '../../types';
import { StorageService } from '../../services/storageService';
import { Plus, Edit2, Trash2, Check, X, Sparkles, Image as ImageIcon } from 'lucide-react';

export const FlavorsTab: React.FC = () => {
  const [flavors, setFlavors] = useState<Flavor[]>(() => StorageService.getFlavors());
  const [editingFlavor, setEditingFlavor] = useState<Flavor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<Flavor>>({
    name: '',
    description: '',
    image_url: '',
    is_active: true,
    sort_order: 1
  });

  const handleOpenCreate = () => {
    setEditingFlavor(null);
    setFormData({
      name: '',
      description: '',
      image_url: '',
      is_active: true,
      sort_order: flavors.length + 1
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (flavor: Flavor) => {
    setEditingFlavor(flavor);
    setFormData(flavor);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const toSave: Flavor = {
      id: editingFlavor?.id || 'flv_' + Math.random().toString(36).substring(2, 9),
      name: formData.name.trim(),
      description: formData.description?.trim() || '',
      image_url: formData.image_url?.trim() || '',
      is_active: formData.is_active ?? true,
      sort_order: formData.sort_order || 1
    };

    StorageService.upsertFlavor(toSave);
    setFlavors(StorageService.getFlavors());
    setIsModalOpen(false);
  };

  const handleToggleActive = (id: string) => {
    StorageService.toggleFlavor(id);
    setFlavors(StorageService.getFlavors());
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Deseja realmente remover o sabor "${name}"?`)) {
      StorageService.deleteFlavor(id);
      setFlavors(StorageService.getFlavors());
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Catálogo de Sabores (Salgados & Doces)
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '4px 0 0' }}>
            Gerencie os sabores disponíveis para os centos, combos e porções (Coxinha, Quibe, Bolinha, etc.).
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn btn-primary"
          style={{
            padding: '10px 18px',
            borderRadius: 12,
            fontSize: '0.88rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Plus size={16} />
          <span>Novo Sabor</span>
        </button>
      </div>

      {/* Grid of flavors */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16
      }}>
        {flavors.map(flavor => (
          <div
            key={flavor.id}
            className="card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              opacity: flavor.is_active ? 1 : 0.6
            }}
          >
            {/* Image banner */}
            <div style={{ position: 'relative', height: 130, backgroundColor: '#f1f5f9' }}>
              {flavor.image_url ? (
                <img
                  src={flavor.image_url}
                  alt={flavor.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <ImageIcon size={36} />
                </div>
              )}

              <span style={{
                position: 'absolute',
                top: 10,
                right: 10,
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: '0.72rem',
                fontWeight: 700,
                backgroundColor: flavor.is_active ? '#dcfce7' : '#fee2e2',
                color: flavor.is_active ? '#15803d' : '#b91c1c'
              }}>
                {flavor.is_active ? 'ATIVO' : 'INATIVO'}
              </span>
            </div>

            {/* Content */}
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                  {flavor.name}
                </h3>
                {flavor.description && (
                  <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4, margin: 0 }}>
                    {flavor.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={() => handleToggleActive(flavor.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: flavor.is_active ? '#dc2626' : '#16a34a',
                    cursor: 'pointer'
                  }}
                >
                  {flavor.is_active ? 'Desativar' : 'Ativar'}
                </button>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleOpenEdit(flavor)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      cursor: 'pointer',
                      color: '#475569'
                    }}
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>

                  <button
                    onClick={() => handleDelete(flavor.id, flavor.name)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid #fecaca',
                      background: '#fff1f2',
                      cursor: 'pointer',
                      color: '#dc2626'
                    }}
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 18,
            width: '100%',
            maxWidth: 480,
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
              {editingFlavor ? 'Editar Sabor' : 'Novo Sabor'}
            </h3>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Nome do Sabor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Coxinha de Frango com Catupiry"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', borderRadius: 8, fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Descrição Curta
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Massa levinha com frango desfiado suculento"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', borderRadius: 8, fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  URL da Foto
                </label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/foto.jpg"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', borderRadius: 8, fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Sabor Ativo para Seleção</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    cursor: 'pointer',
                    fontSize: '0.88rem'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', borderRadius: 8, fontSize: '0.88rem', fontWeight: 700 }}
                >
                  Salvar Sabor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
