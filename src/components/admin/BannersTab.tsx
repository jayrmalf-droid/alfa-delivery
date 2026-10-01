import React, { useState, useRef, useEffect } from 'react';
import { PromoBanner, Category, Product } from '../../types';
import { StorageService } from '../../services/storageService';
import {
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Monitor,
  Smartphone,
  FolderOpen,
  Upload,
  Check,
  Link as LinkIcon,
  X,
  Eye,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Flame,
  Tag,
  Percent,
  Package,
  Layers
} from 'lucide-react';

export const BannersTab: React.FC = () => {
  const [banners, setBanners] = useState<PromoBanner[]>(() => StorageService.getBanners());
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [formData, setFormData] = useState<Partial<PromoBanner>>({
    title: '',
    subtitle: '',
    image_desktop: '',
    image_mobile: '',
    link_type: 'category',
    link_value: 'combos',
    sort_order: 1,
    is_active: true,
    show_floating_button: true,
    button_title: 'Monte seu cento',
    button_subtitle: 'Escolha seus sabores favoritos',
    button_price_text: 'A partir de R$ 31,90',
    button_icon: 'package',
    button_target_type: 'category',
    button_target_value: 'combos'
  });

  const [sameAsDesktop, setSameAsDesktop] = useState(true);
  const [showManualUrlDesktop, setShowManualUrlDesktop] = useState(false);
  const [showManualUrlMobile, setShowManualUrlMobile] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<'desktop' | 'mobile' | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'desktop' | 'mobile'>('desktop');
  const [dragOverTarget, setDragOverTarget] = useState<'desktop' | 'mobile' | null>(null);

  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCategories(StorageService.getCategories());
    setProducts(StorageService.getProducts().filter(p => !p.is_archived));
  }, []);

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      image_desktop: '',
      image_mobile: '',
      link_type: 'category',
      link_value: categories[0]?.id || 'combos',
      sort_order: banners.length + 1,
      is_active: true,
      show_floating_button: true,
      button_title: 'Monte seu cento',
      button_subtitle: 'Escolha seus sabores favoritos',
      button_price_text: 'A partir de R$ 31,90',
      button_icon: 'package',
      button_target_type: 'category',
      button_target_value: categories[0]?.id || 'combos'
    });
    setSameAsDesktop(true);
    setShowManualUrlDesktop(false);
    setShowManualUrlMobile(false);
    setUploadError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: PromoBanner) => {
    setEditingBanner(b);
    setFormData({
      ...b,
      show_floating_button: b.show_floating_button !== false,
      button_title: b.button_title || 'Monte seu cento',
      button_subtitle: b.button_subtitle || 'Escolha seus sabores favoritos',
      button_price_text: b.button_price_text ?? 'A partir de R$ 31,90',
      button_icon: b.button_icon || 'package',
      button_target_type: b.button_target_type || 'category',
      button_target_value: b.button_target_value || 'combos'
    });
    const isSame = !b.image_mobile || b.image_mobile === b.image_desktop;
    setSameAsDesktop(isSame);
    setShowManualUrlDesktop(false);
    setShowManualUrlMobile(false);
    setUploadError('');
    setIsModalOpen(true);
  };

  const processAndUploadImage = async (file: File, target: 'desktop' | 'mobile') => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Formato inválido. Selecione uma imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('O arquivo excede o limite máximo de 8 MB.');
      return;
    }

    setUploadingTarget(target);
    setUploadError('');

    try {
      const bitmap = await createImageBitmap(file);
      const maxDim = target === 'desktop' ? 1600 : 1000;
      const ratio = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível processar a imagem no navegador.');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();

      let dataUrl = canvas.toDataURL('image/webp', 0.85);
      if (dataUrl.length > 900000) {
        dataUrl = canvas.toDataURL('image/webp', 0.70);
      }

      let finalUrl = dataUrl;
      try {
        const cleanName = (file.name || 'banner').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${cleanName}-${target}.webp`;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, data: dataUrl })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.url) finalUrl = json.url;
        }
      } catch {
        // Fallback transparent to local dataUrl
      }

      if (target === 'desktop') {
        setFormData(prev => ({
          ...prev,
          image_desktop: finalUrl,
          image_mobile: sameAsDesktop ? finalUrl : prev.image_mobile
        }));
      } else {
        setFormData(prev => ({ ...prev, image_mobile: finalUrl }));
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Falha ao processar a imagem.');
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.image_desktop?.trim()) {
      setUploadError('Por favor, informe o título e selecione a imagem do banner Desktop.');
      return;
    }

    const imgDesktop = formData.image_desktop.trim();
    const imgMobile = sameAsDesktop ? imgDesktop : (formData.image_mobile?.trim() || imgDesktop);

    const toSave: PromoBanner = {
      id: editingBanner?.id || 'ban_' + Math.random().toString(36).substring(2, 9),
      title: formData.title.trim(),
      subtitle: formData.subtitle?.trim() || '',
      image_desktop: imgDesktop,
      image_mobile: imgMobile,
      link_type: formData.link_type || 'category',
      link_value: formData.link_value?.trim() || 'combos',
      sort_order: formData.sort_order || 1,
      is_active: formData.is_active ?? true,
      show_floating_button: formData.show_floating_button ?? true,
      button_title: formData.button_title?.trim() || 'Monte seu cento',
      button_subtitle: formData.button_subtitle?.trim() || 'Escolha seus sabores favoritos',
      button_price_text: formData.button_price_text?.trim() || '',
      button_icon: formData.button_icon || 'package',
      button_target_type: formData.button_target_type || 'category',
      button_target_value: formData.button_target_value?.trim() || 'combos'
    };

    StorageService.upsertBanner(toSave);
    setBanners(StorageService.getBanners());
    setIsModalOpen(false);
  };

  const handleToggle = (id: string) => {
    StorageService.toggleBanner(id);
    setBanners(StorageService.getBanners());
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Deseja remover o banner "${title}"?`)) {
      StorageService.deleteBanner(id);
      setBanners(StorageService.getBanners());
    }
  };

  const getDestinationLabel = (type?: string, value?: string) => {
    if (type === 'category') {
      const cat = categories.find(c => c.id === value || c.name.toLowerCase() === value?.toLowerCase());
      return cat ? `Categoria: ${cat.name}` : `Categoria: ${value || 'Geral'}`;
    }
    if (type === 'product') {
      const prod = products.find(p => p.id === value);
      return prod ? `Produto: ${prod.name}` : `Produto: ${value}`;
    }
    if (type === 'promos') {
      return 'Promoções & Descontos da Loja';
    }
    return `Link: ${value || 'Nenhum'}`;
  };

  const renderIconBadge = (iconName?: string) => {
    switch (iconName) {
      case 'flame':
        return <Flame size={14} style={{ color: '#ea580c' }} />;
      case 'tag':
        return <Tag size={14} style={{ color: '#dc2626' }} />;
      case 'sparkles':
        return <Sparkles size={14} style={{ color: '#f59e0b' }} />;
      case 'percent':
        return <Percent size={14} style={{ color: '#16a34a' }} />;
      case 'package':
      default:
        return <Package size={14} style={{ color: '#ea580c' }} />;
    }
  };

  const currentPreviewImage = previewTab === 'desktop'
    ? formData.image_desktop
    : (sameAsDesktop ? formData.image_desktop : formData.image_mobile || formData.image_desktop);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Banners Promocionais & Destaques
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '4px 0 0' }}>
            Configure os banners visíveis na vitrine e o botão de isca flutuante para direcionar clientes a produtos, categorias e promoções.
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
          <span>Novo Banner</span>
        </button>
      </div>

      {/* Banners List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {banners.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: '#ffffff',
            borderRadius: 16,
            border: '2px dashed #e2e8f0'
          }}>
            <ImageIcon size={40} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>
              Nenhum banner cadastrado
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px' }}>
              Crie banners chamativos para divulgar centos, combos e novidades na página inicial.
            </p>
            <button onClick={handleOpenCreate} className="btn btn-primary">
              <Plus size={16} /> Criar Primeiro Banner
            </button>
          </div>
        ) : (
          banners.map(b => (
            <div
              key={b.id}
              className="card"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: '260px 1fr auto',
                alignItems: 'center',
                gap: 20,
                padding: 16,
                opacity: b.is_active ? 1 : 0.65,
                transition: 'all 0.2s ease'
              }}
            >
              {/* Image Preview with Desktop and Mobile indicators */}
              <div style={{
                height: 125,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: '#f1f5f9',
                position: 'relative',
                border: '1px solid #e2e8f0'
              }}>
                <img
                  src={b.image_desktop}
                  alt={b.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/hero-salgados.webp';
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  display: 'flex',
                  gap: 4
                }}>
                  <span style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}>
                    <Monitor size={10} /> PC
                  </span>
                  {b.image_mobile && b.image_mobile !== b.image_desktop && (
                    <span style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      <Smartphone size={10} /> Mobile
                    </span>
                  )}
                </div>

                <span style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 6,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4
                }}>
                  Ordem {b.sort_order}
                </span>
              </div>

              {/* Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {b.title}
                  </h3>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    backgroundColor: b.is_active ? '#dcfce7' : '#fee2e2',
                    color: b.is_active ? '#15803d' : '#b91c1c'
                  }}>
                    {b.is_active ? 'ATIVO' : 'INATIVO'}
                  </span>
                </div>

                {b.subtitle && (
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 8px', lineHeight: 1.4 }}>
                    {b.subtitle}
                  </p>
                )}

                {/* Floating Hook Button indicator */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  color: '#9a3412',
                  fontWeight: 600,
                  marginBottom: 6
                }}>
                  {renderIconBadge(b.button_icon)}
                  <span>
                    Botão de Isca:{' '}
                    <strong>{b.show_floating_button !== false ? b.button_title || 'Monte seu cento' : 'Desativado'}</strong>
                    {b.show_floating_button !== false && b.button_price_text ? ` (${b.button_price_text})` : ''}
                  </span>
                  <span style={{ color: '#ea580c' }}>→</span>
                  <span style={{ color: '#431407', fontWeight: 700 }}>
                    {b.button_target_type === 'promos'
                      ? 'Promoções & Descontos'
                      : getDestinationLabel(b.button_target_type, b.button_target_value)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                <button
                  onClick={() => handleToggle(b.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: b.is_active ? '#dc2626' : '#16a34a',
                    cursor: 'pointer'
                  }}
                >
                  {b.is_active ? 'Desativar' : 'Ativar'}
                </button>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleOpenEdit(b)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      cursor: 'pointer',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}
                    title="Editar Banner, Imagens e Botão de Isca"
                  >
                    <Edit2 size={14} /> Editar
                  </button>

                  <button
                    onClick={() => handleDelete(b.id, b.title)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #fecaca',
                      background: '#fff1f2',
                      cursor: 'pointer',
                      color: '#dc2626'
                    }}
                    title="Excluir Banner"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            width: '100%',
            maxWidth: 760,
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f97316', letterSpacing: '0.05em' }}>
                  GESTOR DE DESTAQUES E BANNERS
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0', color: '#0f172a' }}>
                  {editingBanner ? 'Editar Banner & Botão de Isca' : 'Novo Banner Promocional'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 8,
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSave} style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {uploadError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <X size={16} />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Title and Subtitle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Título Principal do Banner *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Seu momento fica muito melhor com Alfa Salgados"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', borderRadius: 10, fontSize: '0.9rem', padding: '10px 14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Subtítulo / Descrição
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Coxinhas douradas, bolinhas de queijo derretidas e quibes crocantes fritos na hora..."
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', borderRadius: 10, fontSize: '0.88rem', padding: '10px 14px' }}
                  />
                </div>
              </div>

              {/* ======================================================== */}
              {/* IMAGE SELECTION & UPLOAD SECTION (PC OR MOBILE)        */}
              {/* ======================================================== */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ImageIcon size={18} style={{ color: '#f97316' }} />
                    <span>Imagens do Banner (Desktop & Mobile)</span>
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Selecione imagens do seu dispositivo (PC ou Celular) ou insira links personalizados.
                  </p>
                </div>

                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={desktopFileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void processAndUploadImage(file, 'desktop');
                    e.target.value = '';
                  }}
                />
                <input
                  type="file"
                  ref={mobileFileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void processAndUploadImage(file, 'mobile');
                    e.target.value = '';
                  }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {/* Desktop Image Box */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: dragOverTarget === 'desktop' ? '2px dashed #f97316' : '1px solid #cbd5e1',
                      borderRadius: 14,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      transition: 'all 0.2s'
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverTarget('desktop'); }}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverTarget(null);
                      const file = e.dataTransfer.files?.[0];
                      if (file) void processAndUploadImage(file, 'desktop');
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Monitor size={15} style={{ color: '#3b82f6' }} />
                        <span>Desktop (PC / Notebook) *</span>
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                        Rec: ~1200x500px
                      </span>
                    </div>

                    {formData.image_desktop ? (
                      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 130, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                        <img
                          src={formData.image_desktop}
                          alt="Banner Desktop"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/hero-salgados.webp';
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          opacity: uploadingTarget === 'desktop' ? 1 : 0.9,
                          transition: 'opacity 0.2s'
                        }}>
                          {uploadingTarget === 'desktop' ? (
                            <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <RefreshCw size={14} className="animate-spin" /> Otimizando...
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => desktopFileInputRef.current?.click()}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  border: 'none',
                                  background: '#ffffff',
                                  color: '#0f172a',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                                }}
                              >
                                <FolderOpen size={13} /> Trocar foto
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, image_desktop: '' }))}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  border: 'none',
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                                title="Remover"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => desktopFileInputRef.current?.click()}
                        disabled={uploadingTarget === 'desktop'}
                        style={{
                          height: 130,
                          borderRadius: 10,
                          border: '2px dashed #cbd5e1',
                          background: '#f8fafc',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          padding: 12,
                          color: '#475569'
                        }}
                      >
                        {uploadingTarget === 'desktop' ? (
                          <>
                            <RefreshCw size={24} style={{ color: '#f97316' }} className="animate-spin" />
                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Otimizando e enviando foto...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={24} style={{ color: '#3b82f6' }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                              Buscar imagem no PC ou Celular
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              Clique ou arraste o arquivo (JPG, PNG ou WebP)
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    <div>
                      <button
                        type="button"
                        onClick={() => setShowManualUrlDesktop(!showManualUrlDesktop)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <LinkIcon size={11} />
                        <span>{showManualUrlDesktop ? 'Ocultar URL manual' : 'Ou colar link / endereço da imagem'}</span>
                      </button>

                      {showManualUrlDesktop && (
                        <input
                          type="text"
                          placeholder="/hero-salgados.webp ou https://..."
                          value={formData.image_desktop?.startsWith('data:') ? 'Imagem carregada localmente' : formData.image_desktop}
                          onChange={(e) => setFormData({ ...formData, image_desktop: e.target.value })}
                          className="form-input"
                          style={{ width: '100%', borderRadius: 8, fontSize: '0.78rem', marginTop: 6, padding: '6px 10px' }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Mobile Image Box */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: dragOverTarget === 'mobile' ? '2px dashed #f97316' : '1px solid #cbd5e1',
                      borderRadius: 14,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      transition: 'all 0.2s'
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverTarget('mobile'); }}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverTarget(null);
                      if (sameAsDesktop) setSameAsDesktop(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) void processAndUploadImage(file, 'mobile');
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Smartphone size={15} style={{ color: '#10b981' }} />
                        <span>Mobile (Smartphones)</span>
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                        Rec: ~800x600px
                      </span>
                    </div>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#475569',
                      background: '#f8fafc',
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={sameAsDesktop}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSameAsDesktop(checked);
                          if (checked) {
                            setFormData(prev => ({ ...prev, image_mobile: prev.image_desktop }));
                          }
                        }}
                      />
                      <span>Usar mesma imagem do Desktop no Mobile</span>
                    </label>

                    {sameAsDesktop ? (
                      <div style={{
                        height: 130,
                        borderRadius: 10,
                        background: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 12,
                        textAlign: 'center',
                        gap: 6
                      }}>
                        <Check size={20} style={{ color: '#10b981' }} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                          Sincronizado com Desktop
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          A mesma imagem selecionada no PC será adaptada para celulares.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSameAsDesktop(false);
                            mobileFileInputRef.current?.click();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3b82f6',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            marginTop: 4
                          }}
                        >
                          Escolher imagem diferente para celular
                        </button>
                      </div>
                    ) : (
                      <>
                        {formData.image_mobile ? (
                          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 130, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                            <img
                              src={formData.image_mobile}
                              alt="Banner Mobile"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/hero-salgados.webp';
                              }}
                            />
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              opacity: uploadingTarget === 'mobile' ? 1 : 0.9,
                              transition: 'opacity 0.2s'
                            }}>
                              {uploadingTarget === 'mobile' ? (
                                <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <RefreshCw size={14} className="animate-spin" /> Otimizando...
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => mobileFileInputRef.current?.click()}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: 8,
                                      border: 'none',
                                      background: '#ffffff',
                                      color: '#0f172a',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                                    }}
                                  >
                                    <FolderOpen size={13} /> Trocar foto
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, image_mobile: '' }))}
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: 8,
                                      border: 'none',
                                      background: '#fee2e2',
                                      color: '#dc2626',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                    title="Remover"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => mobileFileInputRef.current?.click()}
                            disabled={uploadingTarget === 'mobile'}
                            style={{
                              height: 130,
                              borderRadius: 10,
                              border: '2px dashed #cbd5e1',
                              background: '#f8fafc',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              cursor: 'pointer',
                              padding: 12,
                              color: '#475569'
                            }}
                          >
                            {uploadingTarget === 'mobile' ? (
                              <>
                                <RefreshCw size={24} style={{ color: '#f97316' }} className="animate-spin" />
                                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Otimizando e enviando foto...</span>
                              </>
                            ) : (
                              <>
                                <Upload size={24} style={{ color: '#10b981' }} />
                                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                                  Buscar imagem Mobile no PC ou Celular
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  Clique ou arraste o arquivo de imagem
                                </span>
                              </>
                            )}
                          </button>
                        )}

                        <div>
                          <button
                            type="button"
                            onClick={() => setShowManualUrlMobile(!showManualUrlMobile)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#64748b',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <LinkIcon size={11} />
                            <span>{showManualUrlMobile ? 'Ocultar URL manual' : 'Ou colar link / endereço da imagem'}</span>
                          </button>

                          {showManualUrlMobile && (
                            <input
                              type="text"
                              placeholder="/hero-salgados.webp ou https://..."
                              value={formData.image_mobile?.startsWith('data:') ? 'Imagem carregada localmente' : formData.image_mobile}
                              onChange={(e) => setFormData({ ...formData, image_mobile: e.target.value })}
                              className="form-input"
                              style={{ width: '100%', borderRadius: 8, fontSize: '0.78rem', marginTop: 6, padding: '6px 10px' }}
                            />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* CONFIGURAÇÃO DO BOTÃO DE ISCA FLUTUANTE (CARD ISCA)     */}
              {/* ======================================================== */}
              <div style={{
                background: '#fffaf5',
                border: '1.5px solid #fed7aa',
                borderRadius: 16,
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      padding: 8,
                      borderRadius: 10,
                      background: '#ea580c',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#9a3412' }}>
                        Botão de Isca / Destaque Flutuante (Card Promocional)
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#7c2d12' }}>
                        O card flutuante sobre o banner atrai o olhar do cliente para uma oferta, produto, categoria ou promoção.
                      </p>
                    </div>
                  </div>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#9a3412',
                    cursor: 'pointer',
                    background: '#ffedd5',
                    padding: '6px 14px',
                    borderRadius: 9999,
                    border: '1px solid #fed7aa'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.show_floating_button !== false}
                      onChange={(e) => setFormData({ ...formData, show_floating_button: e.target.checked })}
                      style={{ width: 16, height: 16 }}
                    />
                    <span>Exibir Botão de Isca</span>
                  </label>
                </div>

                {formData.show_floating_button !== false && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Title, Subtitle, Price */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#9a3412', marginBottom: 4 }}>
                          Título do Botão (Isca) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Monte seu cento"
                          value={formData.button_title || ''}
                          onChange={(e) => setFormData({ ...formData, button_title: e.target.value })}
                          className="form-input"
                          style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem', padding: '8px 12px', background: '#fff' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#9a3412', marginBottom: 4 }}>
                          Subtítulo / Chamada da Isca
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Escolha seus sabores favoritos"
                          value={formData.button_subtitle || ''}
                          onChange={(e) => setFormData({ ...formData, button_subtitle: e.target.value })}
                          className="form-input"
                          style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem', padding: '8px 12px', background: '#fff' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#9a3412', marginBottom: 4 }}>
                          Texto de Preço / Destaque
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: A partir de R$ 31,90 ou 15% OFF"
                          value={formData.button_price_text || ''}
                          onChange={(e) => setFormData({ ...formData, button_price_text: e.target.value })}
                          className="form-input"
                          style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem', padding: '8px 12px', background: '#fff' }}
                        />
                      </div>
                    </div>

                    {/* Icon Selection */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#9a3412', marginBottom: 6 }}>
                        Ícone do Botão de Isca
                      </label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {[
                          { id: 'package', label: 'Pacote / Combo', icon: <Package size={16} /> },
                          { id: 'flame', label: 'Quentinho / Frito na Hora', icon: <Flame size={16} /> },
                          { id: 'tag', label: 'Etiqueta / Desconto', icon: <Tag size={16} /> },
                          { id: 'sparkles', label: 'Especial / Destaque', icon: <Sparkles size={16} /> },
                          { id: 'percent', label: 'Porcentagem / OFF', icon: <Percent size={16} /> }
                        ].map(opt => {
                          const isSel = (formData.button_icon || 'package') === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, button_icon: opt.id as any })}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: isSel ? '2px solid #ea580c' : '1px solid #cbd5e1',
                                background: isSel ? '#ffedd5' : '#ffffff',
                                color: isSel ? '#9a3412' : '#475569',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {opt.icon}
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Button Target (Where it directs the client) */}
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #fed7aa',
                      borderRadius: 12,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                            Para onde o botão vai direcionar o cliente?
                          </label>
                          <select
                            value={formData.button_target_type || 'category'}
                            onChange={(e) => {
                              const type = e.target.value as 'category' | 'product' | 'promos' | 'external';
                              let val = formData.button_target_value;
                              if (type === 'category') val = categories[0]?.id || 'combos';
                              else if (type === 'product') val = products[0]?.id || '';
                              else if (type === 'promos') val = 'promos';
                              else if (type === 'external') val = 'https://';
                              setFormData({ ...formData, button_target_type: type, button_target_value: val });
                            }}
                            className="form-input"
                            style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem', padding: '8px 12px' }}
                          >
                            <option value="category">📁 Categoria do Cardápio</option>
                            <option value="product">🥟 Produto Específico (Abre Modal de Compra)</option>
                            <option value="promos">🏷️ Promoções & Descontos da Loja</option>
                            <option value="external">🌐 Link Externo ou WhatsApp</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                            {formData.button_target_type === 'category' && 'Selecione a Categoria'}
                            {formData.button_target_type === 'product' && 'Selecione o Produto'}
                            {formData.button_target_type === 'promos' && 'Ação da Isca'}
                            {formData.button_target_type === 'external' && 'Endereço URL / WhatsApp'}
                          </label>

                          {formData.button_target_type === 'category' ? (
                            <select
                              value={formData.button_target_value || 'combos'}
                              onChange={(e) => setFormData({ ...formData, button_target_value: e.target.value })}
                              className="form-input"
                              style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem', padding: '8px 12px' }}
                            >
                              <option value="combos">Combos e Centos (Destaque Principal)</option>
                              {categories.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          ) : formData.button_target_type === 'product' ? (
                            <select
                              value={formData.button_target_value || products[0]?.id}
                              onChange={(e) => setFormData({ ...formData, button_target_value: e.target.value })}
                              className="form-input"
                              style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem', padding: '8px 12px' }}
                            >
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} {p.promo_price ? `(Promoção: R$ ${p.promo_price.toFixed(2)})` : `(R$ ${p.price.toFixed(2)})`}
                                </option>
                              ))}
                            </select>
                          ) : formData.button_target_type === 'promos' ? (
                            <div style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              backgroundColor: '#f1f5f9',
                              fontSize: '0.8rem',
                              color: '#334155',
                              fontWeight: 600
                            }}>
                              Filtra automaticamente o cardápio com todos os produtos em promoção!
                            </div>
                          ) : (
                            <input
                              type="url"
                              placeholder="https://wa.me/... ou https://..."
                              value={formData.button_target_value || ''}
                              onChange={(e) => setFormData({ ...formData, button_target_value: e.target.value })}
                              className="form-input"
                              style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem', padding: '8px 12px' }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Destination & Order Config */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Destino do Clique Geral no Banner
                  </label>
                  <select
                    value={formData.link_type}
                    onChange={(e) => {
                      const type = e.target.value as 'category' | 'product' | 'external';
                      let val = formData.link_value;
                      if (type === 'category') val = categories[0]?.id || 'combos';
                      else if (type === 'product') val = products[0]?.id || '';
                      else if (type === 'external') val = 'https://';
                      setFormData({ ...formData, link_type: type, link_value: val });
                    }}
                    className="form-input"
                    style={{ width: '100%', borderRadius: 10, fontSize: '0.85rem', padding: '10px 12px' }}
                  >
                    <option value="category">Categoria do Cardápio</option>
                    <option value="product">Produto Específico</option>
                    <option value="external">Link Externo / URL</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Alvo do Clique Geral
                  </label>
                  {formData.link_type === 'category' ? (
                    <select
                      value={formData.link_value}
                      onChange={(e) => setFormData({ ...formData, link_value: e.target.value })}
                      className="form-input"
                      style={{ width: '100%', borderRadius: 10, fontSize: '0.85rem', padding: '10px 12px' }}
                    >
                      <option value="combos">Combos e Centos (Destaque)</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : formData.link_type === 'product' ? (
                    <select
                      value={formData.link_value}
                      onChange={(e) => setFormData({ ...formData, link_value: e.target.value })}
                      className="form-input"
                      style={{ width: '100%', borderRadius: 10, fontSize: '0.85rem', padding: '10px 12px' }}
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="url"
                      placeholder="https://wa.me/... ou https://..."
                      value={formData.link_value}
                      onChange={(e) => setFormData({ ...formData, link_value: e.target.value })}
                      className="form-input"
                      style={{ width: '100%', borderRadius: 10, fontSize: '0.85rem', padding: '10px 12px' }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                    className="form-input"
                    style={{ width: '100%', borderRadius: 10, fontSize: '0.85rem', padding: '10px 12px' }}
                  />
                </div>
              </div>

              {/* Status checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ width: 17, height: 17 }}
                  />
                  <span>Banner Ativo (visível para clientes na loja)</span>
                </label>
              </div>

              {/* ======================================================== */}
              {/* LIVE STOREFRONT PREVIEW                                 */}
              {/* ======================================================== */}
              <div style={{
                background: '#0f172a',
                borderRadius: 16,
                padding: '16px 20px',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f97316', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.05em' }}>
                    <Eye size={14} /> PRÉVIA AO VIVO NA LOJA
                  </span>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('desktop')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: previewTab === 'desktop' ? '#334155' : 'transparent',
                        color: previewTab === 'desktop' ? '#fff' : '#94a3b8',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Monitor size={12} /> PC
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('mobile')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: previewTab === 'mobile' ? '#334155' : 'transparent',
                        color: previewTab === 'mobile' ? '#fff' : '#94a3b8',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Smartphone size={12} /> Mobile
                    </button>
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: previewTab === 'desktop' ? '1fr 180px' : '1fr',
                    gap: 12,
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f97316', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Sparkles size={11} /> DESTAQUE DA LOJA
                      </span>
                      <h5 style={{ margin: '4px 0', fontSize: '1rem', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
                        {formData.title || 'Título do banner promocional'}
                      </h5>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                        {formData.subtitle || 'Subtítulo descritivo com os diferenciais e sabores.'}
                      </p>
                      <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: '#ea580c', color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>
                        Ver cardápio <ArrowRight size={11} />
                      </div>
                    </div>

                    <div style={{
                      height: previewTab === 'desktop' ? 100 : 130,
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: '#1e293b',
                      position: 'relative'
                    }}>
                      <img
                        src={currentPreviewImage || '/hero-salgados.webp'}
                        alt="Banner Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/hero-salgados.webp';
                        }}
                      />
                    </div>
                  </div>

                  {/* Floating hook preview representation */}
                  {formData.show_floating_button !== false && (
                    <div style={{
                      background: '#ffffff',
                      borderRadius: 12,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                      border: '1.5px solid #fed7aa'
                    }}>
                      <span style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: '#ffedd5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ea580c',
                        flexShrink: 0
                      }}>
                        {renderIconBadge(formData.button_icon)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', lineHeight: 1.2 }}>
                          {formData.button_title || 'Monte seu cento'}
                        </strong>
                        <small style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>
                          {formData.button_subtitle || 'Escolha seus sabores favoritos'}
                        </small>
                      </div>
                      {formData.button_price_text && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <small style={{ display: 'block', fontSize: '0.65rem', color: '#64748b' }}>A PARTIR DE</small>
                          <strong style={{ fontSize: '0.9rem', color: '#ea580c', fontWeight: 900 }}>
                            {formData.button_price_text.replace(/a partir de\s*/i, '').trim()}
                          </strong>
                        </div>
                      )}
                      <span style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: '#ea580c',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={uploadingTarget !== null}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: 600
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploadingTarget !== null}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {uploadingTarget ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Salvando imagem...</span>
                    </>
                  ) : (
                    <span>Salvar Banner</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
