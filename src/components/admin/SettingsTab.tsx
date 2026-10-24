import { useConfirmedSave } from '../../utils/useConfirmedSave';
import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings } from '../../types';
import { StorageService } from '../../services/storageService';
import { request, getApiBaseUrl } from '../../services/api';
import {
  applyTheme,
  applyThemeColor,
  SPECIALIZED_PALETTES,
  STANDARD_PALETTES,
  ALL_THEME_PALETTES,
  THEME_PRESETS,
  StructuredPalette,
  findPaletteByPrimary,
  findPaletteById,
  generatePalette
} from '../../utils/theme';
import { printThermalReceipt } from '../../utils/printThermalReceipt';
import {
  Save,
  CheckCircle,
  Store,
  Clock,
  QrCode,
  Printer,
  CreditCard,
  RotateCcw,
  Palette,
  Sparkles,
  Check,
  Image as ImageIcon,
  Upload,
  Eye,
  Sliders,
  FileText,
  CheckSquare,
  Volume2,
  Volume1,
  VolumeX,
  Bell,
  Play,
  Square,
  Music,
  Coins,
  Cpu,
  AlertCircle,
  Building2,
  Phone,
  MapPin,
  PauseCircle,
  PlayCircle,
  Copy,
  Flame,
  Leaf,
  Coffee,
  Award,
  Database,
  Download,
  ShieldCheck,
  HardDrive,
  Cloud,
  Server,
  RefreshCw,
  FileDown,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { SOUND_TYPES, playNewOrderSound, stopOrderSound } from '../../utils/sound';

interface SettingsTabProps {
  settings: StoreSettings;
}

type SettingsSection = 'general' | 'theme' | 'sounds' | 'printer' | 'payments' | 'schedule' | 'loyalty' | 'backup' | 'audit';

export const SettingsTab: React.FC<SettingsTabProps> = ({ settings }) => {
  const { saving, saveError, runSave } = useConfirmedSave();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [formData, setFormData] = useState<StoreSettings>(settings);
  const [previewScheduledOrder, setPreviewScheduledOrder] = useState(false);
  const savedSettingsRef = useRef(settings);
  useEffect(() => { savedSettingsRef.current = settings; }, [settings]);
  useEffect(() => () => { applyTheme(savedSettingsRef.current); }, []);
  const themeFields = ['primary_color', 'secondary_color', 'bg_color', 'text_color', 'palette_id'] as const;
  const themeHasChanges = themeFields.some(key => formData[key] !== settings[key]);
  const restoreSavedTheme = () => {
    setFormData(previous => ({ ...previous,
      primary_color: settings.primary_color, secondary_color: settings.secondary_color,
      bg_color: settings.bg_color, text_color: settings.text_color, palette_id: settings.palette_id
    }));
    applyTheme(settings);
  };
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupData, setBackupData] = useState<{ files: {name:string;size:number;createdAt:string}[];stale:boolean } | null>(null);
  const [systemHealth, setSystemHealth] = useState<{database:string;integrityOk:boolean;lastBackupAt:string|null;backupCount:number;backupStale:boolean;retentionKeep:number;excessBackups:number;automaticDeletion:boolean}|null>(null);
  const [retentionKeep, setRetentionKeep] = useState(10);
  const refreshHealth = async () => {
    try {
      const data = await request('/admin/backups/health');
      setSystemHealth(data);
      if (typeof data.retentionKeep === 'number') {
        setRetentionKeep(data.retentionKeep);
      }
    } catch (e) {
      setBackupMessage(e instanceof Error ? e.message : 'Erro ao consultar sistema');
    }
  };
  const saveRetention = async () => {
    setBackupBusy(true); setBackupMessage('');
    try {
      await request('/admin/backups/retention', { method: 'POST', body: JSON.stringify({ keep: retentionKeep }) });
      setBackupMessage('Preferência de retenção salva. Nenhum backup foi excluído.');
      await refreshHealth();
    } catch (e) {
      setBackupMessage(e instanceof Error ? e.message : 'Erro ao salvar política');
    } finally {
      setBackupBusy(false);
    }
  };
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const refreshBackups = async () => {
    try {
      const data = await request('/admin/backups');
      setBackupData(data);
    } catch(e) {
      setBackupMessage(e instanceof Error ? e.message : 'Erro ao consultar backups');
    }
  };
  const createBackup = async () => {
    setBackupBusy(true);
    setBackupMessage('Gerando ponto de backup verificado no servidor...');
    try {
      const res = await request('/admin/backups', { method: 'POST', body: '{}' });
      setBackupMessage(`✓ Backup gerado e verificado com sucesso no servidor (${res?.name || 'arquivo criado'}).`);
      await refreshBackups();
      await refreshHealth();
    } catch(e) {
      setBackupMessage(e instanceof Error ? e.message : 'Erro ao criar backup');
    } finally {
      setBackupBusy(false);
    }
  };
  const verifyDatabase = async () => {
    setBackupBusy(true);
    setBackupMessage('Verificando integridade das tabelas e do banco de dados...');
    try {
      const data = await request('/admin/backups/integrity');
      const details = Array.isArray(data.result) ? data.result.filter((x: string) => x !== 'ok').join(' | ') : '';
      setBackupMessage(data.ok ? `✓ Integridade do banco de dados: 100% OK. ${details}` : 'ATENÇÃO: Verificação de integridade detectou inconsistências.');
      await refreshHealth();
    } catch(e) {
      setBackupMessage(e instanceof Error ? e.message : 'Erro na verificação de integridade');
    } finally {
      setBackupBusy(false);
    }
  };

  const downloadJsonBackup = async () => {
    setBackupBusy(true);
    setBackupMessage('Gerando arquivo completo de backup em formato JSON...');
    try {
      const base = getApiBaseUrl();
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('alfa_admin_token') : null;
      const url = `${base}/api/admin/backups/export.json${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const res = await fetch(url, {
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao baixar backup JSON');
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const dateStamp = new Date().toISOString().slice(0, 10);
      a.download = `alfa-backup-${dateStamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      setBackupMessage('✓ Cópia de segurança JSON baixada com sucesso no seu dispositivo!');
    } catch (e) {
      setBackupMessage(e instanceof Error ? e.message : 'Erro ao baixar backup JSON');
    } finally {
      setBackupBusy(false);
    }
  };

  const downloadFileBackup = async (fileName: string) => {
    try {
      setBackupBusy(true);
      setBackupMessage(`Iniciando download do arquivo ${fileName}...`);
      const base = getApiBaseUrl();
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('alfa_admin_token') : null;
      const url = `${base}/api/admin/backups/download/${encodeURIComponent(fileName)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const res = await fetch(url, {
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao baixar arquivo de backup');
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      setBackupMessage(`✓ Arquivo de backup ${fileName} baixado com sucesso!`);
    } catch (e) {
      setBackupMessage(e instanceof Error ? e.message : 'Erro ao baixar arquivo');
    } finally {
      setBackupBusy(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'backup') {
      refreshBackups();
      refreshHealth();
    }
  }, [activeSection]);
  const [auditRows, setAuditRows] = useState<{id:string;at:string;action:string;resource:string}[]>([]);
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [auditError, setAuditError] = useState('');
  const [auditLoaded, setAuditLoaded] = useState(false);
  const auditQuery = () => new URLSearchParams([
    ...(auditFrom ? [['from', auditFrom]] : []),
    ...(auditTo ? [['to', auditTo]] : []),
    ...(auditAction ? [['action', auditAction]] : [])
  ]).toString();
  const refreshAudit = async () => {
    setAuditError('');
    try {
      const data = await request('/admin/audit?' + auditQuery());
      setAuditRows(data.rows); setAuditLoaded(true);
    } catch(e) { setAuditError(e instanceof Error ? e.message : 'Falha ao consultar registros'); }
  };
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);

  const currentColor = formData.primary_color || '#dc2626';
  const currentSecondary = formData.secondary_color || '#f59e0b';
  const currentBgLight = formData.bg_color || '#fefbf6';
  const currentTextDark = formData.text_color || '#1c1917';
  const currentPaletteId = formData.palette_id || findPaletteByPrimary(currentColor)?.id || 'alfa_padrao';

  const daysLabels = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const handleTestSound = (soundId: string, durationSec: number = 3) => {
    if (playingPreviewId === soundId) {
      stopOrderSound();
      setPlayingPreviewId(null);
    } else {
      stopOrderSound();
      setPlayingPreviewId(soundId);
      const vol = (formData.order_sound_volume ?? 85) / 100;
      playNewOrderSound(soundId, durationSec, vol);
      setTimeout(() => {
        setPlayingPreviewId(prev => prev === soundId ? null : prev);
      }, durationSec * 1000 + 250);
    }
  };

  const handleChange = (field: keyof StoreSettings, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectPalette = (palette: StructuredPalette) => {
    setFormData(prev => ({
      ...prev,
      primary_color: palette.primary,
      secondary_color: palette.secondary,
      bg_color: palette.bgLight,
      text_color: palette.textDark,
      palette_id: palette.id
    }));
    applyTheme(palette);
  };

  const handleCustomTokenChange = (
    field: 'primary_color' | 'secondary_color' | 'bg_color' | 'text_color',
    val: string
  ) => {
    let cleaned = val.trim();
    if (!cleaned.startsWith('#') && cleaned.length > 0) {
      cleaned = '#' + cleaned;
    }
    const updated = {
      ...formData,
      [field]: cleaned,
      palette_id: 'custom'
    };
    setFormData(updated);
    if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
      applyTheme({
        primary: updated.primary_color,
        secondary: updated.secondary_color,
        bgLight: updated.bg_color,
        textDark: updated.text_color
      });
    }
  };

  const handleColorChange = (newColor: string) => {
    const match = findPaletteByPrimary(newColor);
    if (match) {
      handleSelectPalette(match);
    } else {
      handleCustomTokenChange('primary_color', newColor);
    }
  };

  const handleHexInput = (val: string) => {
    handleCustomTokenChange('primary_color', val);
  };

  const handleScheduleChange = (day: string, field: 'isOpen' | 'open' | 'close', value: unknown) => {
    setFormData(prev => ({
      ...prev,
      weekly_schedule: {
        ...prev.weekly_schedule,
        [day]: {
          ...prev.weekly_schedule[day],
          [field]: value
        }
      }
    }));
  };

  const handleCopyMondayToAll = () => {
    const monday = formData.weekly_schedule?.['1'] || { isOpen: true, open: '10:00', close: '22:00' };
    const newSchedule: Record<string, { isOpen: boolean; open: string; close: string }> = {};
    for (let i = 0; i <= 6; i++) {
      newSchedule[i.toString()] = { ...monday };
    }
    setFormData(prev => ({ ...prev, weekly_schedule: newSchedule }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavedSuccess(false);
    if (!await runSave(() => StorageService.updateSettings(formData))) return;
    savedSettingsRef.current = formData;
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestPrint = () => {
    const testOrder: any = {
      id: 'test_order_receipt',
      order_number: 26,
      customer_name: 'Cliente Demonstração',
      customer_phone: '(77) 99194-7697',
      address: formData.store_address,
      address_number: formData.store_address_number,
      complement: formData.store_address_complement || 'Loja',
      neighborhood_name: formData.store_neighborhood,
      reference_point: 'Próximo à Praça Central',
      delivery_type: 'delivery',
      delivery_fee: 5.00,
      subtotal: 96.00,
      discount_value: 0,
      total: 101.00,
      payment_method: 'pix',
      status: 'confirmed',
      created_at: new Date().toISOString(),
      preorder_date: previewScheduledOrder ? '2026-10-25' : null,
      preorder_time: previewScheduledOrder ? '18:30' : null,
      items: [
        {
          quantity: 1,
          product_name: '80 Salgados (10 em 10)',
          unit_price: 96.00,
          subtotal: 96.00,
          selections: [
            { optionName: '30x Coxinha de frango com requeijão' },
            { optionName: '20x Bolinha de queijo crocante' },
            { optionName: '20x Quibe com hortelã fresca' },
            { optionName: '10x Rissole de presunto e queijo' }
          ],
          notes: 'Fritar bem douradinho'
        }
      ],
      notes: 'Entregar na portaria com embalagem térmica'
    };

    printThermalReceipt(
      testOrder,
      formData,
      formData.printer_paper_width,
      formData.printer_include_logo ?? true
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem do cupom deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        handleChange('printer_logo_url', dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    alert('A restauração automática foi desativada para proteger seus dados. Utilize um backup validado.');
  };

  const sectionsList: { id: SettingsSection; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'general', label: 'Geral & Empresa', icon: <Building2 size={16} /> },
    { id: 'theme', label: 'Visual & Cores', icon: <Palette size={16} /> },
    { id: 'sounds', label: 'Sons & Alertas', icon: <Volume2 size={16} />, badge: 'Novo' },
    { id: 'printer', label: 'Comanda Térmica', icon: <Printer size={16} /> },
    { id: 'payments', label: 'Pagamentos & Pix', icon: <CreditCard size={16} /> },
    { id: 'schedule', label: 'Horários da semana', icon: <Clock size={16} /> },
    { id: 'loyalty', label: 'Fidelidade & Pontos', icon: <Award size={16} />, badge: 'Clube' },
    { id: 'backup', label: 'Backup & Segurança', icon: <Database size={16} /> },
    { id: 'audit', label: 'Auditoria', icon: <FileText size={16} /> }
  ];

  return (
    <fieldset disabled={saving} aria-busy={saving} className="confirmed-save-fields admin-settings-polish">
      {saveError && <p role="alert" className="confirmed-save-error">{saveError}</p>}
      {saving && <p role="status">Aguardando confirmação de gravação…</p>}
    <div style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      {/* 1. TOP HEADER & GLOBAL ACTIONS */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 14,
        paddingBottom: 4
      }} data-admin-ui="toolbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Configurações
            </h2>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '3px 9px',
              borderRadius: 20,
              backgroundColor: '#e2e8f0',
              color: '#334155'
            }}>
              Painel de Controle
            </span>
          </div>
          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '3px 0 0' }}>
            Personalize a identidade da loja, alertas sonoros, pagamentos, horários e comanda de impressão.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 10,
              border: '1px solid #fee2e2',
              backgroundColor: '#fff1f2',
              color: '#dc2626',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Informações sobre restauração de backup"
           data-admin-ui="button">
            <RotateCcw size={15} />
            <span>Sobre restauração</span>
          </button>

          <button
            onClick={() => handleSubmit()}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 20px',
              borderRadius: 10,
              fontSize: '0.86rem',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)'
            }}
           data-admin-ui="button">
            <Save size={16} />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {savedSuccess && (
        <div role="status" style={{
          padding: '12px 18px',
          backgroundColor: '#dcfce7',
          border: '1.5px solid #86efac',
          borderRadius: 12,
          color: '#15803d',
          fontWeight: 700,
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: 'slideUp 0.2s ease'
        }}>
          <CheckCircle size={18} />
          <span>Configurações salvas e aplicadas com sucesso em todo o sistema!</span>
        </div>
      )}

      {/* 2. SUB-NAVIGATION TABS (Modern Segmented Bar) */}
      <div className="admin-settings-tabs" role="tablist" aria-label="Seções de configurações" style={{
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: '6px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        overflowX: 'auto',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }} data-admin-ui="panel">
        {sectionsList.map((tab, index) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`settings-tab-${tab.id}`}
              aria-selected={isActive}
              aria-pressed={isActive}
              aria-controls="settings-content"
              tabIndex={isActive ? 0 : -1}
              onKeyDown={event => { let next=index; if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%sectionsList.length;else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index+sectionsList.length-1)%sectionsList.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=sectionsList.length-1;else return;event.preventDefault();setActiveSection(sectionsList[next].id);document.getElementById(`settings-tab-${sectionsList[next].id}`)?.focus(); }}
              onClick={() => setActiveSection(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 16px',
                borderRadius: 9,
                border: 'none',
                backgroundColor: isActive ? 'var(--color-primary, #dc2626)' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
             data-admin-ui="button">
              <span style={{ display: 'flex', alignItems: 'center' }}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: 10,
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                  color: isActive ? '#ffffff' : '#dc2626',
                  textTransform: 'uppercase'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. ACTIVE TAB CONTENT PANEL */}
      <div className="settings-section-intro"><div><span>SEÇÃO ATUAL</span><h3>{sectionsList.find(section=>section.id===activeSection)?.label}</h3><p>{({general:'Dados da empresa e informações de contato exibidas na loja.',theme:'Cores e aparência do painel e do cardápio. Pré-visualize e salve para manter a escolha.',sounds:'Alertas de novos pedidos e opções de reprodução.',printer:'Identidade e formato da comanda térmica.',payments:'Formas de pagamento e dados para Pix.',schedule:'Dias e horários de funcionamento da loja.',loyalty:'Regras de pontos e recompensas para os clientes.',backup:'Cópias de segurança, diagnóstico e integridade do banco.',audit:'Consulta e exportação dos eventos registrados pelo sistema.'})[activeSection]}</p></div><span className="settings-draft-status" role="status">{JSON.stringify(formData)!==JSON.stringify(settings)?'Alterações ainda não salvas':'Configurações carregadas'}</span></div>
      <form id="settings-content" role="tabpanel" aria-labelledby={`settings-tab-${activeSection}`} tabIndex={0} onSubmit={handleSubmit} data-admin-ui="form">
        {/* ========================================================================= */}
        {/* TAB 1: GERAL & EMPRESA */}
        {/* ========================================================================= */}
        {activeSection === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Identificação Principal */}
            <div className="card" style={{ padding: 22, backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }} data-admin-ui="panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Store size={18} style={{ color: 'var(--color-primary-dark, #dc2626)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Identificação do Estabelecimento
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }} data-admin-ui="grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Nome do Estabelecimento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    className="form-input"
                   data-admin-ui="field"/>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Slogan / Descrição
                  </label>
                  <input
                    type="text"
                    value={formData.business_description}
                    onChange={(e) => handleChange('business_description', e.target.value)}
                    className="form-input"
                   data-admin-ui="field"/>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    WhatsApp para Pedidos *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(77) 99194-7697"
                    value={formData.whatsapp}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                    className="form-input"
                   data-admin-ui="field"/>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Status da Loja (Override)
                  </label>
                  <select
                    value={formData.is_open_override === null ? 'schedule' : formData.is_open_override ? 'open' : 'closed'}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleChange('is_open_override', val === 'schedule' ? null : val === 'open');
                    }}
                    className="form-input"
                    style={{ background: '#fff', cursor: 'pointer' }}
                   data-admin-ui="field">
                    <option value="schedule">🕒 Seguir Horário Semanal Automático</option>
                    <option value="open">🟢 Forçar ABERTO Agora</option>
                    <option value="closed">🔴 Forçar FECHADO Agora</option>
                  </select>
                </div>
              </div>

              {/* Pausa Temporária de Pedidos */}
              <div style={{
                marginTop: 16,
                padding: 16,
                backgroundColor: formData.is_paused ? '#fef2f2' : '#f8fafc',
                border: formData.is_paused ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }} data-admin-ui="toolbar">
                <div style={{ maxWidth: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {formData.is_paused ? <PauseCircle size={18} color="#dc2626" /> : <PlayCircle size={18} color="#16a34a" />}
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: formData.is_paused ? '#b91c1c' : '#0f172a' }}>
                      Pausar Recebimento de Novos Pedidos
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '3px 0 0' }}>
                    Bloqueia temporariamente novos pedidos no checkout com banner informativo aos clientes (ideal em picos de demanda na cozinha).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleChange('is_paused', !formData.is_paused)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 9,
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: formData.is_paused ? '#dc2626' : '#e2e8f0',
                    color: formData.is_paused ? '#ffffff' : '#334155',
                    transition: 'all 0.15s ease'
                  }}
                 data-admin-ui="button">
                  {formData.is_paused ? 'Reativar Pedidos' : 'Pausar Loja Agora'}
                </button>
              </div>
            </div>

            {/* Redes Sociais & Endereço */}
            <div className="card" style={{ padding: 22, backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }} data-admin-ui="panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <MapPin size={18} style={{ color: 'var(--color-primary-dark, #dc2626)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Endereço & Localização
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }} data-admin-ui="grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Instagram (@)
                  </label>
                  <input
                    type="text"
                    placeholder="@alfasalgados"
                    value={formData.instagram || ''}
                    onChange={(e) => handleChange('instagram', e.target.value)}
                    className="form-input"
                   data-admin-ui="field"/>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Link Google Maps
                  </label>
                  <input
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={formData.google_maps_url || ''}
                    onChange={(e) => handleChange('google_maps_url', e.target.value)}
                    className="form-input"
                   data-admin-ui="field"/>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: 12 }} data-admin-ui="grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Rua / Logradouro
                  </label>
                  <input
                    type="text"
                    value={formData.store_address}
                    onChange={(e) => handleChange('store_address', e.target.value)}
                    className="form-input"
                   data-admin-ui="field"/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.store_address_number}
                    onChange={(e) => handleChange('store_address_number', e.target.value)}
                    className="form-input"
                   data-admin-ui="field"/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={formData.store_address_complement}
                    onChange={(e) => handleChange('store_address_complement', e.target.value)}
                    className="form-input"
                   data-admin-ui="field"/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={formData.store_neighborhood}
                    onChange={(e) => handleChange('store_neighborhood', e.target.value)}
                    className="form-input"
                   data-admin-ui="field"/>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: VISUAL & CORES DO TEMA */}
        {/* ========================================================================= */}
        {activeSection === 'theme' && (
          <div className="card" style={{ padding: 24, backgroundColor: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 26 }} data-admin-ui="panel">
          <section className="theme-preview-panel" aria-label="Prévia da identidade visual">
            <div className="theme-preview-copy">
              <span className="theme-preview-eyebrow">IDENTIDADE DA LOJA</span>
              <h3>{findPaletteById(currentPaletteId)?.name || 'Cores personalizadas'}</h3>
              <p role="status">{themeHasChanges ? 'Prévia não salva. Salve as configurações para aplicar à loja.' : 'Estas são as cores salvas da loja.'}</p>
              <div className="theme-preview-swatches" aria-label="Cores escolhidas">
                {[['Principal',currentColor],['Destaque',currentSecondary],['Fundo',currentBgLight],['Texto',currentTextDark]].map(([label,color]) => <span key={label}><i style={{backgroundColor:color}} aria-hidden="true"/><span>{label}<small>{color}</small></span></span>)}
              </div>
              <button type="button" disabled={!themeHasChanges} onClick={restoreSavedTheme}>Restaurar cores salvas</button>
              <small>A restauração mantém as outras configurações que você editou. Ao sair desta tela, uma prévia não salva é desfeita.</small>
            </div>
            <div className="theme-preview-example" aria-label="Exemplo de cartão do cardápio">
              <span>EXEMPLO DO CARDÁPIO</span><h4>Feito com carinho</h4><p>Uma identidade que acompanha cada pedido.</p>
              <div><strong>R$ 29,90</strong><span className="theme-preview-action">Escolher opções</span></div>
            </div>
          </section>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }} data-admin-ui="toolbar">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Palette size={22} style={{ color: 'var(--color-primary)' }} />
                  <span>Personalização Visual & Paletas do Cardápio</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4, maxWidth: 740, lineHeight: 1.5 }}>
                  Estruture a identidade da sua loja com paletas de alto impacto. Cada paleta combina 4 tokens harmônicos:
                  <strong> Cor Primária</strong> (Ação), <strong>Secundária</strong> (Destaque/Acento), <strong>Fundo Claro</strong> e <strong>Texto Principal</strong>.
                </p>
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 20,
                backgroundColor: 'var(--color-primary-subtle, #fef2f2)',
                border: '1px solid var(--color-primary-border, #fecaca)',
                fontSize: '0.8rem',
                fontWeight: 800,
                color: 'var(--color-primary-dark, #dc2626)'
              }}>
                <Sparkles size={14} />
                <span>Paletas Multi-Token Ativas</span>
              </div>
            </div>

            {/* SEÇÃO 1: AS 3 NOVAS PALETAS ESPECIALIZADAS */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }} data-admin-ui="toolbar">
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} style={{ color: '#ea580c' }} />
                    <span>Paletas Especializadas por Proposta Gastronômica</span>
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                    Cores formuladas estrategicamente para estimular o apetite, destacar ofertas e transmitir a proposta certa.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }} data-admin-ui="grid">
                {SPECIALIZED_PALETTES.map((palette) => {
                  const isSelected =
                    currentPaletteId === palette.id ||
                    (currentColor.toLowerCase() === palette.primary.toLowerCase() &&
                     currentSecondary.toLowerCase() === palette.secondary.toLowerCase());
                  const IconComp = palette.id === 'classica_energetica' ? Flame : palette.id === 'saudavel_sustentavel' ? Leaf : Coffee;
                  return (
                    <div
                      key={palette.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Usar paleta ${palette.name}`}
                      aria-pressed={isSelected}
                      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleSelectPalette(palette); } }}
                      onClick={() => handleSelectPalette(palette)}
                      style={{
                        padding: 16,
                        borderRadius: 14,
                        border: isSelected ? `2.5px solid ${palette.primary}` : '1.5px solid #e2e8f0',
                        backgroundColor: isSelected ? '#fafafc' : '#ffffff',
                        boxShadow: isSelected ? `0 8px 24px ${palette.primary}25` : '0 2px 6px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 12,
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: `${palette.primary}18`,
                            color: palette.primary,
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            <IconComp size={12} />
                            {palette.category}
                          </span>

                          {isSelected && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: palette.primary,
                              backgroundColor: `${palette.primary}15`,
                              padding: '2px 8px',
                              borderRadius: 10
                            }}>
                              <Check size={12} /> Ativa
                            </span>
                          )}
                        </div>

                        <strong style={{ fontSize: '0.98rem', color: '#1e293b', display: 'block' }}>
                          {palette.name}
                        </strong>
                        <p style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 4, lineHeight: 1.45 }}>
                          {palette.description}
                        </p>
                      </div>

                      {/* 4 Swatches Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 6,
                        padding: '8px 10px',
                        backgroundColor: '#f8fafc',
                        borderRadius: 10,
                        border: '1px solid #edf2f7'
                      }} data-admin-ui="grid grid-fixed">
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ height: 22, borderRadius: 6, backgroundColor: palette.primary, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                          <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#334155', marginTop: 3 }}>Primária</span>
                          <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace' }}>{palette.primary}</span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ height: 22, borderRadius: 6, backgroundColor: palette.secondary, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                          <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#334155', marginTop: 3 }}>Destaque</span>
                          <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace' }}>{palette.secondary}</span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ height: 22, borderRadius: 6, backgroundColor: palette.bgLight, border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} />
                          <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#334155', marginTop: 3 }}>Fundo</span>
                          <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace' }}>{palette.bgLight}</span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ height: 22, borderRadius: 6, backgroundColor: palette.textDark, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                          <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800, color: '#334155', marginTop: 3 }}>Texto</span>
                          <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace' }}>{palette.textDark}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO 2: PALETAS TRADICIONAIS DO SISTEMA */}
            <div>
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  Paletas do Sistema Adaptadas com os 4 Tokens Estruturados
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                  Todas as paletas tradicionais da Alfa foram aprimoradas com harmonia de 4 cores (ação, acento, fundo claro e contraste).
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }} data-admin-ui="grid">
                {STANDARD_PALETTES.map((preset) => {
                  const isSelected =
                    currentPaletteId === preset.id ||
                    (currentColor.toLowerCase() === preset.primary.toLowerCase() &&
                     currentSecondary.toLowerCase() === preset.secondary.toLowerCase());
                  return (
                    <button
                      key={preset.id}
                      aria-label={`Usar paleta ${preset.name}`}
                      aria-pressed={isSelected}
                      type="button"
                      onClick={() => handleSelectPalette(preset)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: isSelected ? `2px solid ${preset.primary}` : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                     data-admin-ui="button">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 800 : 700, color: '#1e293b' }}>
                          {preset.name}
                        </span>
                        {isSelected && <Check size={14} style={{ color: preset.primary }} />}
                      </div>

                      {/* 4 dots row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: preset.primary, boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} title="Primária" />
                        <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: preset.secondary, boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} title="Secundária" />
                        <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: preset.bgLight, border: '1px solid #cbd5e1' }} title="Fundo Claro" />
                        <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: preset.textDark }} title="Texto Escuro" />
                        <span style={{ fontSize: '0.68rem', color: '#64748b', marginLeft: 'auto', fontWeight: 600 }}>
                          {preset.category.split('&')[0]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO 3: AJUSTE FINO DOS 4 TOKENS & DEMONSTRAÇÃO AO VIVO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }} data-admin-ui="grid">
              {/* Left: 4 Fine-tuning Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sliders size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>Ajuste Fino dos 4 Tokens de Cor (Códigos HEX)</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} data-admin-ui="grid grid-fixed">
                  {/* Token 1: Primária */}
                  <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      1. Primária (Apetite/Ação)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        style={{ width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0 }}
                      />
                      <input
                        type="text"
                        value={currentColor}
                        onChange={(e) => handleHexInput(e.target.value)}
                        placeholder="#dc2626"
                        maxLength={7}
                        className="form-input"
                        style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', height: 34, padding: '4px 8px' }}
                       data-admin-ui="field"/>
                    </div>
                  </div>

                  {/* Token 2: Secundária */}
                  <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      2. Secundária (Destaque)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="color"
                        value={currentSecondary}
                        onChange={(e) => handleCustomTokenChange('secondary_color', e.target.value)}
                        style={{ width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0 }}
                      />
                      <input
                        type="text"
                        value={currentSecondary}
                        onChange={(e) => handleCustomTokenChange('secondary_color', e.target.value)}
                        placeholder="#f59e0b"
                        maxLength={7}
                        className="form-input"
                        style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', height: 34, padding: '4px 8px' }}
                       data-admin-ui="field"/>
                    </div>
                  </div>

                  {/* Token 3: Fundo Claro */}
                  <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      3. Fundo Claro (Página)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="color"
                        value={currentBgLight}
                        onChange={(e) => handleCustomTokenChange('bg_color', e.target.value)}
                        style={{ width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0 }}
                      />
                      <input
                        type="text"
                        value={currentBgLight}
                        onChange={(e) => handleCustomTokenChange('bg_color', e.target.value)}
                        placeholder="#fefbf6"
                        maxLength={7}
                        className="form-input"
                        style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', height: 34, padding: '4px 8px' }}
                       data-admin-ui="field"/>
                    </div>
                  </div>

                  {/* Token 4: Texto Escuro */}
                  <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                      4. Fundo Escuro / Texto
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="color"
                        value={currentTextDark}
                        onChange={(e) => handleCustomTokenChange('text_color', e.target.value)}
                        style={{ width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0 }}
                      />
                      <input
                        type="text"
                        value={currentTextDark}
                        onChange={(e) => handleCustomTokenChange('text_color', e.target.value)}
                        placeholder="#1c1917"
                        maxLength={7}
                        className="form-input"
                        style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', height: 34, padding: '4px 8px' }}
                       data-admin-ui="field"/>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Live Interactive Cardápio Preview Mockup */}
              <div style={{
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                backgroundColor: currentBgLight,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: currentTextDark }}>
                    Demonstração do Cardápio em Tempo Real:
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Simulação dos 4 tokens
                  </span>
                </div>

                <div style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                  border: '1px solid #e2e8f0'
                }} data-admin-ui="panel">
                  {/* Top Header */}
                  <div style={{
                    background: `linear-gradient(135deg, ${currentColor} 0%, var(--color-primary-dark) 100%)`,
                    padding: '10px 14px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontWeight: 800, fontSize: '0.86rem' }}>{formData.business_name || 'Alfa Salgados'}</span>
                    <span style={{
                      backgroundColor: '#ffffff',
                      color: currentColor,
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      🛒 Carrinho (0)
                    </span>
                  </div>

                  {/* Body Preview */}
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, backgroundColor: currentBgLight }}>
                    {/* Categories Row */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} data-admin-ui="toolbar">
                      <span style={{ backgroundColor: currentColor, color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                        Todos
                      </span>
                      <span style={{ backgroundColor: '#ffffff', color: currentTextDark, border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>
                        Salgados
                      </span>
                      <span style={{ backgroundColor: '#ffffff', color: currentTextDark, border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>
                        Combos
                      </span>
                      <span style={{
                        backgroundColor: `${currentSecondary}22`,
                        color: currentSecondary,
                        border: `1px solid ${currentSecondary}44`,
                        padding: '4px 8px',
                        borderRadius: 20,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        marginLeft: 'auto'
                      }}>
                        ★ Promoção Ativa
                      </span>
                    </div>

                    {/* Simulated Mini Card */}
                    <div style={{
                      backgroundColor: '#ffffff',
                      padding: 12,
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }} data-admin-ui="panel">
                      <div>
                        <strong style={{ fontSize: '0.82rem', color: currentTextDark, display: 'block' }}>
                          Cento de Salgados Sortidos
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Escolha até 4 sabores crocantes
                        </span>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: currentColor, marginTop: 4 }}>
                          R$ 37,90
                        </div>
                      </div>

                      <button
                        type="button"
                        style={{
                          backgroundColor: currentColor,
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '7px 12px',
                          fontWeight: 800,
                          fontSize: '0.74rem',
                          cursor: 'default',
                          boxShadow: `0 2px 8px ${currentColor}35`,
                          whiteSpace: 'nowrap'
                        }}
                       data-admin-ui="button">
                        + Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SONS & ALERTAS DE PEDIDOS */}
        {/* ========================================================================= */}
        {activeSection === 'sounds' && (
          <div className="card" style={{ padding: 22, backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }} data-admin-ui="panel">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }} data-admin-ui="toolbar">
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Volume2 size={20} style={{ color: 'var(--color-primary, #dc2626)' }} />
                  <span>Som & Notificações de Novos Pedidos</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4, maxWidth: 680 }}>
                  Personalize o aviso sonoro tocado na cozinha/atendimento quando chega um novo pedido.
                </p>
              </div>

              {/* Toggle Som */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px',
                borderRadius: 12,
                backgroundColor: (formData.order_sound_enabled ?? true) ? '#f0fdf4' : '#f8fafc',
                border: `1.5px solid ${(formData.order_sound_enabled ?? true) ? '#86efac' : '#e2e8f0'}`
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: (formData.order_sound_enabled ?? true) ? '#15803d' : '#64748b' }}>
                  {(formData.order_sound_enabled ?? true) ? '🔔 Som Ativado' : '🔕 Som Silenciado'}
                </span>
                <button
                  type="button"
                  onClick={() => handleChange('order_sound_enabled', !(formData.order_sound_enabled ?? true))}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: (formData.order_sound_enabled ?? true) ? '#22c55e' : '#cbd5e1',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.2s ease'
                  }}
                 data-admin-ui="button">
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    left: (formData.order_sound_enabled ?? true) ? 22 : 2,
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

            {/* Sound Cards Grid */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 800, color: '#334155', marginBottom: 10 }}>
                Escolha o Tipo de Som (6 Opções Disponíveis):
              </label>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 12
              }} data-admin-ui="grid">
                {SOUND_TYPES.map(sound => {
                  const isSelected = (formData.order_sound_type || 'bell') === sound.id;
                  const isPreviewing = playingPreviewId === sound.id;

                  const getIcon = () => {
                    switch (sound.id) {
                      case 'alarm': return <AlertCircle size={18} />;
                      case 'digital': return <Cpu size={18} />;
                      case 'marimba': return <Music size={18} />;
                      case 'cash': return <Coins size={18} />;
                      case 'siren': return <Volume2 size={18} />;
                      case 'bell':
                      default: return <Bell size={18} />;
                    }
                  };

                  return (
                    <div
                      key={sound.id}
                      onClick={() => handleChange('order_sound_type', sound.id)}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        border: `2px solid ${isSelected ? 'var(--color-primary, #dc2626)' : '#e2e8f0'}`,
                        backgroundColor: isSelected ? 'var(--color-primary-subtle, #fef2f2)' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 10,
                        boxShadow: isSelected ? '0 4px 14px rgba(220, 38, 38, 0.12)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: isSelected ? 'var(--color-primary-dark, #dc2626)' : '#64748b' }}>
                              {getIcon()}
                            </span>
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: isSelected ? '#0f172a' : '#334155' }}>
                              {sound.name}
                            </span>
                          </div>
                          {isSelected && <Check size={14} color="var(--color-primary, #dc2626)" strokeWidth={3} />}
                        </div>
                        <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0, lineHeight: 1.35 }}>
                          {sound.description}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: 6, backgroundColor: '#f1f5f9', color: '#475569' }}>
                          {sound.previewNote}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestSound(sound.id, 3);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 11px',
                            borderRadius: 7,
                            border: isPreviewing ? '1px solid #dc2626' : '1px solid #cbd5e1',
                            backgroundColor: isPreviewing ? '#fee2e2' : '#ffffff',
                            color: isPreviewing ? '#dc2626' : '#334155',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                         data-admin-ui="button">
                          {isPreviewing ? <Square size={12} fill="#dc2626" /> : <Play size={12} fill="#334155" />}
                          <span>{isPreviewing ? 'Parar' : 'Ouvir Teste'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Duration & Volume Controls */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
              padding: 16,
              backgroundColor: '#f8fafc',
              borderRadius: 14,
              border: '1px solid #e2e8f0'
            }} data-admin-ui="grid">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} style={{ color: 'var(--color-primary, #dc2626)' }} />
                    <span>Duração do Toque (Segundos)</span>
                  </label>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: 6 }}>
                    {formData.order_sound_duration || 5}s
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={formData.order_sound_duration || 5}
                  onChange={(e) => handleChange('order_sound_duration', parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--color-primary, #dc2626)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }} data-admin-ui="toolbar">
                  {[2, 5, 10, 15, 20, 30].map(sec => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => handleChange('order_sound_duration', sec)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: (formData.order_sound_duration || 5) === sec ? '1px solid #dc2626' : '1px solid #cbd5e1',
                        backgroundColor: (formData.order_sound_duration || 5) === sec ? '#fee2e2' : '#ffffff',
                        color: (formData.order_sound_duration || 5) === sec ? '#b91c1c' : '#475569',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                     data-admin-ui="button">
                      {sec}s{sec === 5 ? ' (Padrão)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {(formData.order_sound_volume ?? 85) > 60 ? <Volume2 size={16} /> : <Volume1 size={16} />}
                    <span>Volume do Alerta</span>
                  </label>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 6 }}>
                    {formData.order_sound_volume ?? 85}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={formData.order_sound_volume ?? 85}
                  onChange={(e) => handleChange('order_sound_volume', parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--color-primary, #dc2626)', cursor: 'pointer' }}
                />
                <button
                  type="button"
                  onClick={() => handleTestSound(formData.order_sound_type || 'bell', formData.order_sound_duration || 5)}
                  style={{
                    width: '100%',
                    marginTop: 10,
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: playingPreviewId ? '#dc2626' : '#0f172a',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                 data-admin-ui="button">
                  {playingPreviewId ? <Square size={13} fill="#fff" /> : <Play size={13} fill="#fff" />}
                  <span>{playingPreviewId ? 'Parar Teste de Som' : `Testar Toque Completo (${formData.order_sound_duration || 5}s)`}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: COMANDA TÉRMICA & IMPRESSÃO */}
        {/* ========================================================================= */}
        {activeSection === 'printer' && (
          <div className="card" style={{ padding: 22, backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }} data-admin-ui="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }} data-admin-ui="toolbar">
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Printer size={20} style={{ color: 'var(--color-primary, #dc2626)' }} />
                  <span>Configurações da Comanda Térmica</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4, maxWidth: 680 }}>
                  Ajuste o layout, itens e largura do papel para imprimir nas bobinas de 80mm ou 58mm.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestPrint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
               data-admin-ui="button">
                <Printer size={15} />
                <span>Testar Impressão Agora</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }} data-admin-ui="grid">
              {/* Form Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* 1. LARGURA DA BOBINA */}
                <div style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                    Largura da Bobina Térmica:
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['80mm', '58mm'] as const).map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => handleChange('printer_paper_width', w)}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          borderRadius: 8,
                          border: `2px solid ${formData.printer_paper_width === w ? 'var(--color-primary, #dc2626)' : '#e2e8f0'}`,
                          backgroundColor: formData.printer_paper_width === w ? '#fee2e2' : '#ffffff',
                          color: formData.printer_paper_width === w ? '#b91c1c' : '#475569',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                       data-admin-ui="button">
                        {w} {w === '80mm' ? '(Padrão / Mais Larga)' : '(Mini / Portátil)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. LOGOTIPO DO CUPOM */}
                <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ImageIcon size={16} style={{ color: 'var(--color-primary, #dc2626)' }} />
                      Logotipo no Topo do Cupom:
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.printer_include_logo ?? true}
                        onChange={(e) => handleChange('printer_include_logo', e.target.checked)}
                        style={{ accentColor: 'var(--color-primary, #dc2626)' }}
                      />
                      <span>Imprimir Logo</span>
                    </label>
                  </div>

                  {(formData.printer_include_logo ?? true) && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: 12,
                      backgroundColor: '#ffffff',
                      borderRadius: 8,
                      border: '1px dashed #cbd5e1'
                    }} data-admin-ui="panel">
                      <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: 8,
                        backgroundColor: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                        flexShrink: 0
                      }}>
                        {(formData.printer_logo_url || formData.logo_url) ? (
                          <img
                            src={formData.printer_logo_url || formData.logo_url}
                            alt="Logo Cupom"
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <ImageIcon size={28} style={{ color: '#94a3b8' }} />
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {formData.printer_logo_url ? (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>
                              ✓ Usando logo personalizado para o cupom
                            </span>
                          ) : (
                            <span>Usando mesmo logo principal da loja</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} data-admin-ui="toolbar">
                          <label style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            backgroundColor: 'var(--color-primary, #dc2626)',
                            color: '#ffffff',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}>
                            <Upload size={13} />
                            <span>Alterar Imagem do Cupom</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              style={{ display: 'none' }}
                            />
                          </label>

                          {formData.printer_logo_url && (
                            <button
                              type="button"
                              onClick={() => handleChange('printer_logo_url', '')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 10px',
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: 6,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                             data-admin-ui="button">
                              <RotateCcw size={12} />
                              <span>Sobre restauração</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. DADOS DO CABEÇALHO (MOSTRAR / OCULTAR) */}
                <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#1e293b', display: 'block', marginBottom: 4 }}>
                    Cabeçalho da Comanda (Mostrar / Ocultar):
                  </span>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 12px 0' }}>
                    Escolha quais informações da sua empresa devem constar no topo impresso:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.printer_header_show_name !== false}
                        onChange={(e) => handleChange('printer_header_show_name', e.target.checked)}
                        style={{ accentColor: 'var(--color-primary, #dc2626)' }}
                      />
                      <span><strong>Nome da Loja</strong> ({formData.business_name || 'Alfa Salgados'})</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.printer_header_show_address !== false}
                        onChange={(e) => handleChange('printer_header_show_address', e.target.checked)}
                        style={{ accentColor: 'var(--color-primary, #dc2626)' }}
                      />
                      <span><strong>Endereço da Loja</strong> ({formData.store_address}, {formData.store_address_number})</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.printer_header_show_phone !== false}
                        onChange={(e) => handleChange('printer_header_show_phone', e.target.checked)}
                        style={{ accentColor: 'var(--color-primary, #dc2626)' }}
                      />
                      <span><strong>Telefone / WhatsApp</strong> ({formData.whatsapp})</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.printer_header_show_cnpj !== false}
                        onChange={(e) => handleChange('printer_header_show_cnpj', e.target.checked)}
                        style={{ accentColor: 'var(--color-primary, #dc2626)' }}
                      />
                      <span><strong>CNPJ</strong> {formData.cnpj ? `(${formData.cnpj})` : '(Configurado na aba Geral)'}</span>
                    </label>

                    <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer', marginBottom: 6 }}>
                        <input
                          type="checkbox"
                          checked={formData.printer_header_show_slogan !== false}
                          onChange={(e) => handleChange('printer_header_show_slogan', e.target.checked)}
                          style={{ accentColor: 'var(--color-primary, #dc2626)' }}
                        />
                        <span><strong>Slogan / Frase de Destaque no Cabeçalho</strong></span>
                      </label>

                      {(formData.printer_header_show_slogan !== false) && (
                        <input
                          type="text"
                          value={formData.printer_header_custom_text !== undefined ? formData.printer_header_custom_text : 'QUEM NÃO GOSTA? • MELHOR SALGADO'}
                          onChange={(e) => handleChange('printer_header_custom_text', e.target.value)}
                          placeholder="Ex: QUEM NÃO GOSTA? • MELHOR SALGADO"
                          className="form-input"
                          style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                         data-admin-ui="field"/>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. DESTAQUES DE ITENS */}
                <div style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#1e293b', display: 'block', marginBottom: 8 }}>
                    Destaques na Lista de Produtos:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.printer_items_bold !== false}
                        onChange={(e) => handleChange('printer_items_bold', e.target.checked)}
                        style={{ accentColor: 'var(--color-primary, #dc2626)' }}
                      />
                      <span>Produtos em negrito ampliado</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.printer_items_highlight_flavors !== false}
                        onChange={(e) => handleChange('printer_items_highlight_flavors', e.target.checked)}
                        style={{ accentColor: 'var(--color-primary, #dc2626)' }}
                      />
                      <span>Destacar sabores e adicionais com marcadores (▶)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.printer_items_separator !== false}
                        onChange={(e) => handleChange('printer_items_separator', e.target.checked)}
                        style={{ accentColor: 'var(--color-primary, #dc2626)' }}
                      />
                      <span>Linha divisória pontilhada entre cada item</span>
                    </label>
                  </div>
                </div>

                {/* 5. RODAPÉ DA COMANDA (MOSTRAR / OCULTAR) */}
                <div style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#1e293b', display: 'block', marginBottom: 8 }}>
                    Rodapé da Comanda (Mostrar / Ocultar):
                  </span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer', marginBottom: 6 }}>
                        <input
                          type="checkbox"
                          checked={formData.printer_footer_show_text !== false}
                          onChange={(e) => handleChange('printer_footer_show_text', e.target.checked)}
                          style={{ accentColor: 'var(--color-primary, #dc2626)' }}
                        />
                        <span><strong>Frase de Agradecimento no Rodapé</strong></span>
                      </label>

                      {(formData.printer_footer_show_text !== false) && (
                        <input
                          type="text"
                          value={formData.printer_footer_custom_text !== undefined ? formData.printer_footer_custom_text : 'Alfa Salgados • Os melhores sabores se faz com carinho!'}
                          onChange={(e) => handleChange('printer_footer_custom_text', e.target.value)}
                          placeholder="Ex: Alfa Salgados • Os melhores sabores se faz com carinho!"
                          className="form-input"
                          style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                         data-admin-ui="field"/>
                      )}
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.printer_footer_show_website !== false}
                        onChange={(e) => handleChange('printer_footer_show_website', e.target.checked)}
                        style={{ accentColor: 'var(--color-primary, #dc2626)' }}
                      />
                      <span>Exibir site no rodapé (www.alfasalgados.com.br)</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* Live Preview Mockup */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>
                    Prévia em Tempo Real ({formData.printer_paper_width || '80mm'}):
                  </span>
                  <div style={{ display: 'flex', gap: 4, background: '#e2e8f0', padding: 2, borderRadius: 6 }}>
                    <button
                      type="button"
                      onClick={() => setPreviewScheduledOrder(false)}
                      style={{
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: !previewScheduledOrder ? 'var(--color-primary, #dc2626)' : 'transparent',
                        color: !previewScheduledOrder ? '#ffffff' : '#475569'
                      }}
                      data-admin-ui="button"
                    >
                      Imediato
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewScheduledOrder(true)}
                      style={{
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: previewScheduledOrder ? 'var(--color-primary, #dc2626)' : 'transparent',
                        color: previewScheduledOrder ? '#ffffff' : '#475569'
                      }}
                      data-admin-ui="button"
                    >
                      Agendamento
                    </button>
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#334155',
                  borderRadius: 12,
                  padding: '20px 14px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    width: formData.printer_paper_width === '58mm' ? 220 : 280,
                    backgroundColor: '#ffffff',
                    padding: '16px 12px',
                    fontFamily: '"Courier New", Courier, monospace',
                    fontSize: formData.printer_paper_width === '58mm' ? 10 : 11,
                    lineHeight: 1.25,
                    color: '#000000',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    borderRadius: 2
                  }} data-admin-ui="panel">
                    {/* Header: Logo */}
                    {(formData.printer_include_logo ?? true) && (formData.printer_logo_url || formData.logo_url) && (
                      <div style={{ textAlign: 'center', marginBottom: 6 }}>
                        <img
                          src={formData.printer_logo_url || formData.logo_url}
                          alt="Logo"
                          style={{
                            maxWidth: formData.printer_paper_width === '58mm' ? 90 : 120,
                            maxHeight: 45,
                            objectFit: 'contain',
                            filter: 'grayscale(100%) contrast(150%)',
                            display: 'inline-block'
                          }}
                        />
                      </div>
                    )}

                    {/* Header: Store Info */}
                    <div style={{ textAlign: 'center', marginBottom: 4 }}>
                      {formData.printer_header_show_name !== false && (
                        <div style={{
                          fontWeight: 'bold',
                          fontSize: formData.printer_paper_width === '58mm' ? 12 : 14,
                          letterSpacing: 0.5
                        }}>
                          {formData.business_name || 'ALFA SALGADOS'}
                        </div>
                      )}
                      
                      {formData.printer_header_show_address !== false && (
                        <div style={{ fontSize: 9 }}>
                          {formData.store_address || 'Rua E'}, {formData.store_address_number || '39'}<br />
                          {formData.store_neighborhood || 'Ibirapuera'} - Vitória da Conquista
                        </div>
                      )}

                      {formData.printer_header_show_phone !== false && (
                        <div style={{ fontSize: 9 }}>
                          WhatsApp: {formData.whatsapp || '77 99194-7697'}
                        </div>
                      )}

                      {formData.printer_header_show_cnpj !== false && formData.cnpj && (
                        <div style={{ fontSize: 9 }}>
                          CNPJ: {formData.cnpj}
                        </div>
                      )}

                      {formData.printer_header_show_slogan !== false && (
                        <div style={{
                          fontSize: 9,
                          fontWeight: 'bold',
                          marginTop: 4,
                          border: '1px solid #000',
                          padding: '2px 4px',
                          display: 'inline-block'
                        }}>
                          {formData.printer_header_custom_text !== undefined
                            ? formData.printer_header_custom_text
                            : 'QUEM NÃO GOSTA? • MELHOR SALGADO'}
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                    {/* Order Number & Type */}
                    <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 'bold' }}>PEDIDO #026</div>

                    {previewScheduledOrder ? (
                      <div style={{
                        border: '2px solid #000',
                        padding: '5px 3px',
                        margin: '5px 0',
                        textAlign: 'center',
                        backgroundColor: '#f8fafc'
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.5 }}>
                          *** PEDIDO AGENDADO ***
                        </div>
                        <div style={{ fontSize: 9, marginTop: 2 }}>
                          <strong>Pedido feito em:</strong> 29/09/2026 às 19:15
                        </div>
                        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
                        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                          📅 ENTREGA AGENDADA PARA:
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 900, marginTop: 2 }}>
                          Data: 30/09/2026
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 900 }}>
                          Horário: 18:30
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ textAlign: 'center', fontSize: 9, marginTop: 2 }}>29/09/2026, 19:15:00</div>
                        <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 'bold', marginTop: 2 }}>*** ENTREGA EM DOMICÍLIO ***</div>
                      </>
                    )}

                    <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                    {/* Customer */}
                    <div style={{ fontSize: 9 }}><strong>Cliente:</strong> Tayay do Be</div>
                    <div style={{ fontSize: 9 }}><strong>WhatsApp:</strong> (77) 98157-7827</div>
                    <div style={{ fontSize: 9 }}><strong>Endereço:</strong> Rua 7, Nº 33</div>
                    <div style={{ fontSize: 9 }}><strong>Bairro:</strong> Ibirapuera</div>

                    <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                    {/* Items */}
                    <div style={{ fontWeight: 'bold', fontSize: 10, marginBottom: 3 }}>ITENS DO PEDIDO:</div>
                    <div style={{ marginBottom: formData.printer_items_separator !== false ? 4 : 2 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: formData.printer_items_bold !== false ? 800 : 600,
                        fontSize: formData.printer_items_bold !== false ? 11 : 10
                      }}>
                        <span>1x 80 Salgados</span>
                        <span>R$ 80,00</span>
                      </div>
                      <div style={{ paddingLeft: 8, fontSize: 8 }}>
                        <div>{formData.printer_items_highlight_flavors !== false ? '▶ ' : '+ '}30x Bolinha de Queijo Crocante</div>
                        <div>{formData.printer_items_highlight_flavors !== false ? '▶ ' : '+ '}50x Coxinha de Frango</div>
                      </div>
                    </div>

                    {formData.printer_items_separator !== false && (
                      <div style={{ borderTop: '1px dotted #888', margin: '4px 0' }} />
                    )}

                    <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                    {/* Values */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                      <span>Subtotal:</span>
                      <span>R$ 80,00</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                      <span>Taxa de Entrega:</span>
                      <span>R$ 5,00</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 'bold',
                      fontSize: 12,
                      marginTop: 2
                    }}>
                      <span>TOTAL:</span>
                      <span>R$ 85,00</span>
                    </div>

                    <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                    {/* Payment */}
                    <div style={{ fontSize: 9 }}>
                      <strong>Pagamento:</strong> DINHEIRO (Não precisa de troco)
                    </div>

                    <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                    {/* Footer */}
                    {formData.printer_footer_show_text !== false && (
                      <div style={{ textAlign: 'center', fontSize: 9, marginTop: 4, fontStyle: 'italic' }}>
                        {formData.printer_footer_custom_text !== undefined
                          ? formData.printer_footer_custom_text
                          : 'Alfa Salgados • Os melhores sabores se faz com carinho!'}
                      </div>
                    )}

                    {formData.printer_footer_show_website !== false && (
                      <div style={{ textAlign: 'center', fontSize: 8, color: '#555', marginTop: 2 }}>
                        www.alfasalgados.com.br
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PAGAMENTOS & CHAVE PIX */}
        {/* ========================================================================= */}
        {activeSection === 'payments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Chave Pix */}
            <div className="card" style={{ padding: 22, backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }} data-admin-ui="panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <QrCode size={18} style={{ color: 'var(--color-primary-dark, #dc2626)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Chave Pix para Pagamento Instantâneo
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }} data-admin-ui="grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Chave Pix (CNPJ, Telefone, E-mail ou Aleatória) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pix_key}
                    onChange={(e) => handleChange('pix_key', e.target.value)}
                    className="form-input"
                   data-admin-ui="field"/>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Nome do Titular / Beneficiário *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pix_recipient_name}
                    onChange={(e) => handleChange('pix_recipient_name', e.target.value)}
                    className="form-input"
                   data-admin-ui="field"/>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Cidade do Beneficiário *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pix_recipient_city}
                    onChange={(e) => handleChange('pix_recipient_city', e.target.value)}
                    className="form-input"
                   data-admin-ui="field"/>
                </div>
              </div>
            </div>

            {/* Formas de Pagamento Aceitas */}
            <div className="card" style={{ padding: 22, backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }} data-admin-ui="panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <CreditCard size={18} style={{ color: 'var(--color-primary-dark, #dc2626)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Formas de Pagamento Habilitadas no Cardápio
                </h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 14 }}>
                Marque quais métodos seus clientes podem escolher na finalização do pedido:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }} data-admin-ui="grid">
                {[
                  { id: 'payment_pix', label: 'Pix Instantâneo' },
                  { id: 'payment_cash', label: 'Dinheiro (Espécie)' },
                  { id: 'payment_credit', label: 'Cartão de Crédito' },
                  { id: 'payment_debit', label: 'Cartão de Débito' }
                ].map(p => (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '12px 14px',
                      backgroundColor: formData[p.id as keyof StoreSettings] ? '#f0fdf4' : '#f8fafc',
                      borderRadius: 10,
                      border: `1.5px solid ${formData[p.id as keyof StoreSettings] ? '#86efac' : '#e2e8f0'}`
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(formData[p.id as keyof StoreSettings])}
                      onChange={(e) => handleChange(p.id as keyof StoreSettings, e.target.checked)}
                      style={{ accentColor: '#16a34a' }}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: HORÁRIOS DE FUNCIONAMENTO SEMANAL */}
        {/* ========================================================================= */}
        {activeSection === 'schedule' && (
          <div className="card" style={{ padding: 22, backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }} data-admin-ui="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }} data-admin-ui="toolbar">
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={20} style={{ color: 'var(--color-primary-dark, #dc2626)' }} />
                  <span>Horários de Funcionamento Semanal</span>
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: 3 }}>
                  Configure os dias e horários em que o restaurante abre automaticamente para pedidos.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyMondayToAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#334155',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Aplica o horário de Segunda-feira para todos os outros dias"
               data-admin-ui="button">
                <Copy size={13} />
                <span>Copiar Segunda para Todos</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {daysLabels.map((dayLabel, idx) => {
                const dayStr = idx.toString();
                const schedule = formData.weekly_schedule ? formData.weekly_schedule[dayStr] : { isOpen: true, open: '10:00', close: '22:00' };

                return (
                  <div
                    key={dayStr}
                    className="settings-schedule-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 10,
                      backgroundColor: schedule?.isOpen ? '#ffffff' : '#f8fafc',
                      border: `1px solid ${schedule?.isOpen ? '#e2e8f0' : '#f1f5f9'}`,
                      flexWrap: 'wrap',
                      gap: 10
                    }}
                   data-admin-ui="toolbar">
                    <div style={{ width: 140, fontWeight: 800, color: schedule?.isOpen ? '#0f172a' : '#94a3b8' }}>
                      {dayLabel}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', cursor: 'pointer', fontWeight: 700 }}>
                        <input
                          type="checkbox"
                          aria-label={`Loja aberta — ${dayLabel}`}
                          checked={schedule?.isOpen ?? true}
                          onChange={(e) => handleScheduleChange(dayStr, 'isOpen', e.target.checked)}
                          style={{ accentColor: 'var(--color-primary, #dc2626)' }}
                        />
                        <span style={{ color: schedule?.isOpen ? '#15803d' : '#94a3b8' }}>
                          {schedule?.isOpen ? 'Aberto' : 'Fechado'}
                        </span>
                      </label>

                      {schedule?.isOpen && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem' }}>
                          <input
                            aria-label={`Abertura — ${dayLabel}`}
                            type="time"
                            value={schedule.open || '10:00'}
                            onChange={(e) => handleScheduleChange(dayStr, 'open', e.target.value)}
                            className="form-input"
                            style={{ padding: '4px 8px', width: 95, fontSize: '0.82rem', fontWeight: 700 }}
                           data-admin-ui="field"/>
                          <span style={{ color: '#64748b' }}>às</span>
                          <input
                            aria-label={`Fechamento — ${dayLabel}`}
                            type="time"
                            value={schedule.close || '22:00'}
                            onChange={(e) => handleScheduleChange(dayStr, 'close', e.target.value)}
                            className="form-input"
                            style={{ padding: '4px 8px', width: 95, fontSize: '0.82rem', fontWeight: 700 }}
                           data-admin-ui="field"/>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: PROGRAMA DE FIDELIDADE POR PONTOS */}
        {/* ========================================================================= */}
        {activeSection === 'audit' && (
          <div style={{ padding: 24, background: '#fff', borderRadius: 12, marginTop: 20 }} data-admin-ui="panel">
            <h3>Auditoria administrativa</h3>
            <p>Consulta somente leitura dos eventos registrados pelo sistema. Exibe até 200 eventos recentes por consulta; o CSV exporta até 1.000. O histórico anterior é preservado.</p>
            <p>O registro atual identifica ação e recurso, mas não guarda a identidade individual do operador. Não atribuímos ações a pessoas sem evidência.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 16 }} data-admin-ui="toolbar">
              <label>De <input type="date" value={auditFrom} onChange={e => setAuditFrom(e.target.value)}  data-admin-ui="field"/></label>
              <label>Até <input type="date" value={auditTo} onChange={e => setAuditTo(e.target.value)}  data-admin-ui="field"/></label>
              <label>Ação <input type="text" placeholder="Ex.: order_payment" value={auditAction} onChange={e => setAuditAction(e.target.value)}  data-admin-ui="field"/></label>
              <button type="button" onClick={refreshAudit} data-admin-ui="button">Consultar</button>
              <a href={`${getApiBaseUrl()}/api/admin/audit.csv?` + auditQuery()} download="auditoria-alfa.csv">Exportar CSV</a>
            </div>
            {auditError && <p role="alert" style={{ color: '#b91c1c' }}>{auditError}</p>}
            {auditLoaded && <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Tabela de dados — role para ver todas as colunas" data-admin-ui="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead><tr><th style={{padding:8}}>Data/hora</th><th style={{padding:8}}>Ação</th><th style={{padding:8}}>Recurso</th></tr></thead>
                <tbody>{auditRows.map(row => <tr key={row.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{padding:8,whiteSpace:'nowrap'}}>{new Date(row.at).toLocaleString('pt-BR')}</td>
                  <td style={{padding:8}}>{row.action}</td><td style={{padding:8,wordBreak:'break-word'}}>{row.resource}</td>
                </tr>)}</tbody>
              </table>
              {auditRows.length === 0 && <p>Nenhum evento encontrado para esses filtros.</p>}
            </div>}
          </div>
        )}
        {activeSection === 'backup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header & Status Card */}
            <div className="card" style={{ padding: 24, backgroundColor: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }} data-admin-ui="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ padding: 8, borderRadius: 10, backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Database size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                        Central de Backup & Integridade de Dados
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0' }}>
                        Gerencie pontos de restauração no servidor e baixe cópias de segurança completas offline para o seu computador.
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    backgroundColor: systemHealth?.integrityOk ? '#ecfdf5' : '#fffbeb',
                    color: systemHealth?.integrityOk ? '#059669' : '#d97706',
                    border: `1px solid ${systemHealth?.integrityOk ? '#a7f3d0' : '#fde68a'}`
                  }}>
                    {systemHealth?.integrityOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    <span>{systemHealth?.integrityOk ? 'Sistema & Banco Íntegros' : 'Verificação Recomendada'}</span>
                  </span>
                </div>
              </div>

              {/* 4 Metric Status Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 22 }}>
                {/* 1. Engine */}
                <div style={{ padding: '16px 18px', borderRadius: 12, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Banco Ativo</span>
                    <Cloud size={16} style={{ color: '#0284c7' }} />
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                    {systemHealth?.database || 'Detectando banco...'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 4 }}>
                    {systemHealth?.database?.includes('Nuvem') ? 'Supabase / PostgreSQL Cloud' : 'Armazenamento Local'}
                  </div>
                </div>

                {/* 2. Último Backup */}
                <div style={{ padding: '16px 18px', borderRadius: 12, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Último Backup</span>
                    <ShieldCheck size={16} style={{ color: '#059669' }} />
                  </div>
                  <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#0f172a' }}>
                    {systemHealth?.lastBackupAt ? new Date(systemHealth.lastBackupAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Nenhum ainda'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: systemHealth?.backupStale ? '#b45309' : '#059669', fontWeight: 700, marginTop: 4 }}>
                    {systemHealth?.backupStale ? 'Atenção: sem backup nos últimos 7 dias' : 'Ponto de restauração recente'}
                  </div>
                </div>

                {/* 3. Arquivos no Servidor */}
                <div style={{ padding: '16px 18px', borderRadius: 12, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cópias no Servidor</span>
                    <HardDrive size={16} style={{ color: '#7c3aed' }} />
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                    {systemHealth?.backupCount ?? backupData?.files?.length ?? 0} {((systemHealth?.backupCount ?? backupData?.files?.length ?? 0) === 1 ? 'backup' : 'backups')}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 4 }}>
                    Retenção configurada: {retentionKeep} cópias
                  </div>
                </div>

                {/* 4. Cópia Offline Imediata */}
                <div style={{ padding: '16px 18px', borderRadius: 12, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Download Offline</span>
                    <Download size={16} style={{ color: '#16a34a' }} />
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#14532d' }}>
                    Exportação Imediata
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#15803d', marginTop: 4 }}>
                    Download direto em JSON ou SQLite
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }} data-admin-ui="toolbar">
                {/* Botão Baixar JSON Agora */}
                <button
                  type="button"
                  disabled={backupBusy}
                  onClick={downloadJsonBackup}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    cursor: backupBusy ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  data-admin-ui="button"
                >
                  <Download size={16} />
                  <span>Baixar Backup Completo (.JSON)</span>
                </button>

                {/* Botão Criar Backup no Servidor */}
                <button
                  type="button"
                  disabled={backupBusy}
                  onClick={createBackup}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: 'var(--color-primary, #dc2626)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    cursor: backupBusy ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.2)',
                    transition: 'all 0.15s ease'
                  }}
                  data-admin-ui="button"
                >
                  <Database size={16} />
                  <span>Criar Backup no Servidor</span>
                </button>

                {/* Botão Verificar Integridade */}
                <button
                  type="button"
                  disabled={backupBusy}
                  onClick={verifyDatabase}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 15px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: backupBusy ? 'not-allowed' : 'pointer'
                  }}
                  data-admin-ui="button"
                >
                  <ShieldCheck size={16} />
                  <span>Verificar Integridade</span>
                </button>

                {/* Botão Atualizar */}
                <button
                  type="button"
                  disabled={backupBusy}
                  onClick={() => { refreshBackups(); refreshHealth(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 15px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: backupBusy ? 'not-allowed' : 'pointer'
                  }}
                  data-admin-ui="button"
                >
                  <RefreshCw size={15} className={backupBusy ? 'spin' : ''} />
                  <span>Atualizar Status</span>
                </button>
              </div>

              {/* Status Message Alert */}
              {backupMessage && (
                <div role="status" style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  borderRadius: 10,
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: backupMessage.toLowerCase().includes('erro') || backupMessage.toLowerCase().includes('atenção') ? '#fff1f2' : '#f0fdf4',
                  color: backupMessage.toLowerCase().includes('erro') || backupMessage.toLowerCase().includes('atenção') ? '#991b1b' : '#166534',
                  border: `1px solid ${backupMessage.toLowerCase().includes('erro') || backupMessage.toLowerCase().includes('atenção') ? '#fecdd3' : '#bbf7d0'}`
                }}>
                  {backupMessage.toLowerCase().includes('erro') || backupMessage.toLowerCase().includes('atenção') ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  <span>{backupMessage}</span>
                </div>
              )}
            </div>

            {/* Banner Informativo sobre Nuvem e Segurança Offline */}
            <div className="card" style={{
              padding: 20,
              backgroundColor: '#f8fafc',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14
            }}>
              <div style={{ padding: 10, borderRadius: 10, backgroundColor: '#e0f2fe', color: '#0369a1', flexShrink: 0 }}>
                <Cloud size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Soberania dos Dados & Armazenamento Seguro
                </h4>
                <p style={{ fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                  Mesmo com a base de dados operando sincronizada em nuvem (PostgreSQL / Supabase), você tem a opção de fazer o download do arquivo de backup a qualquer instante para o seu dispositivo. Isso assegura que sua empresa mantenha cópias de segurança locais e autônomas contra qualquer eventualidade externa.
                </p>
                <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={backupBusy}
                    onClick={downloadJsonBackup}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#0369a1',
                      backgroundColor: '#e0f2fe',
                      border: '1px solid #bae6fd',
                      borderRadius: 8,
                      padding: '6px 12px',
                      cursor: 'pointer'
                    }}
                  >
                    <FileDown size={14} />
                    <span>Baixar Backup Completo em JSON</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card: Histórico de Arquivos e Política de Retenção */}
            <div className="card" style={{ padding: 24, backgroundColor: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0' }} data-admin-ui="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Histórico de Backups no Servidor
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0' }}>
                    Cópias compactas verificadas armazenadas na pasta de segurança do servidor.
                  </p>
                </div>

                {/* Retenção */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                    Guardar referência de:
                  </label>
                  <select
                    value={retentionKeep}
                    onChange={e => setRetentionKeep(Number(e.target.value))}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      backgroundColor: '#ffffff'
                    }}
                    data-admin-ui="field"
                  >
                    {[5, 10, 20, 30, 50].map(n => <option key={n} value={n}>{n} cópias</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={backupBusy}
                    onClick={saveRetention}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    data-admin-ui="button"
                  >
                    Salvar
                  </button>
                </div>
              </div>

              {/* Lista de Arquivos */}
              {!backupData || backupData.files.length === 0 ? (
                <div style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: 12,
                  border: '1px dashed #cbd5e1'
                }}>
                  <Database size={32} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                    Nenhum backup em arquivo gerado ainda no servidor.
                  </p>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 14px' }}>
                    Clique no botão abaixo para criar a primeira cópia de segurança verificada agora mesmo.
                  </p>
                  <button
                    type="button"
                    disabled={backupBusy}
                    onClick={createBackup}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: 'var(--color-primary, #dc2626)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Database size={15} />
                    <span>Criar Primeiro Backup Agora</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {backupData.files.map(file => (
                    <div
                      key={file.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                        padding: '14px 18px',
                        backgroundColor: '#f8fafc',
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          backgroundColor: '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#475569'
                        }}>
                          <Database size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                            {file.name}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', gap: 12, marginTop: 2 }}>
                            <span>Gerado em: {new Date(file.createdAt).toLocaleString('pt-BR')}</span>
                            <span>•</span>
                            <span>Tamanho: {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          disabled={backupBusy}
                          onClick={() => downloadFileBackup(file.name)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#0f172a',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}
                        >
                          <Download size={14} style={{ color: 'var(--color-primary, #dc2626)' }} />
                          <span>Baixar Arquivo (.sqlite)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 14, fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} />
                <span>Restauração automática desativada por política de segurança para evitar sobreposição acidental de dados em produção.</span>
              </div>
            </div>
          </div>
        )}
        {activeSection === 'loyalty' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Status Geral do Programa */}
            <div className="card" style={{ padding: 22, backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }} data-admin-ui="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }} data-admin-ui="toolbar">
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    <Award size={22} style={{ color: 'var(--color-primary, #dc2626)' }} />
                    <span>Programa de Fidelidade por Pontos</span>
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: 4 }}>
                    Estimule compras recorrentes com acúmulo de pontos e travas inteligentes de proteção de margem.
                  </p>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.loyalty_enabled ?? true}
                    onChange={(e) => handleChange('loyalty_enabled', e.target.checked)}
                    style={{ accentColor: 'var(--color-primary, #dc2626)', width: 18, height: 18 }}
                  />
                  <span style={{ color: (formData.loyalty_enabled ?? true) ? '#16a34a' : '#94a3b8' }}>
                    {(formData.loyalty_enabled ?? true) ? 'Programa Ativo' : 'Programa Desativado'}
                  </span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }} data-admin-ui="grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Nome do Programa
                  </label>
                  <input
                    type="text"
                    value={formData.loyalty_program_name || 'Clube de Pontos'}
                    onChange={(e) => handleChange('loyalty_program_name', e.target.value)}
                    className="form-input"
                    placeholder="Ex: Clube de Pontos"
                   data-admin-ui="field"/>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4, display: 'block' }}>
                    Exibido no cartão virtual e alertas aos clientes.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Pontos para Resgatar a Recompensa
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={formData.loyalty_points_goal ?? 100}
                    onChange={(e) => handleChange('loyalty_points_goal', parseInt(e.target.value) || 100)}
                    className="form-input"
                   data-admin-ui="field"/>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4, display: 'block' }}>
                    Pontos necessários para liberar o desconto (padrão: 100).
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Pedido Mínimo para Pontuar (R$) 🛡️
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min={0}
                    value={formData.loyalty_min_order_value ?? 45}
                    onChange={(e) => handleChange('loyalty_min_order_value', parseFloat(e.target.value) || 0)}
                    className="form-input"
                   data-admin-ui="field"/>
                  <span style={{ fontSize: '0.74rem', color: '#b45309', marginTop: 4, display: 'block' }}>
                    Trava essencial: evita que clientes comprem só refrigerante para juntar pontos.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Desconto da Recompensa (%)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={formData.loyalty_discount_percent ?? 50}
                    onChange={(e) => handleChange('loyalty_discount_percent', parseInt(e.target.value) || 50)}
                    className="form-input"
                   data-admin-ui="field"/>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4, display: 'block' }}>
                    % de desconto aplicado no pedido premiado (ex: 50%).
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Teto Máximo de Desconto (R$) 🛡️
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min={1}
                    value={formData.loyalty_max_discount_value ?? 35}
                    onChange={(e) => handleChange('loyalty_max_discount_value', parseFloat(e.target.value) || 35)}
                    className="form-input"
                   data-admin-ui="field"/>
                  <span style={{ fontSize: '0.74rem', color: '#b45309', marginTop: 4, display: 'block' }}>
                    Trava de margem: se o cliente pedir R$ 200, o desconto não passa deste teto.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Pontos por R$ 1 de Compra
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.loyalty_points_per_real ?? 1}
                    onChange={(e) => handleChange('loyalty_points_per_real', parseInt(e.target.value) || 1)}
                    className="form-input"
                   data-admin-ui="field"/>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4, display: 'block' }}>
                    Pontos por real do subtotal de cada pedido elegível. Pontos não expiram.
                  </span>
                </div>
              </div>
            </div>

            {/* Quadro Explicativo de Travas de Margem */}
            <div style={{
              padding: 20,
              borderRadius: 14,
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#92400e', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🛡️ Como as Travas Protegem o Seu Lucro</span>
              </h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.84rem', color: '#78350f', lineHeight: 1.6 }}>
                <li>
                  <strong>Ticket Mínimo (R$ {(formData.loyalty_min_order_value ?? 45).toFixed(2)}):</strong> Só gera pontos quando o cliente consome um valor significativo, garantindo rentabilidade acumulada antes de qualquer premiação.
                </li>
                <li>
                  <strong>Teto Máximo de Desconto (R$ {(formData.loyalty_max_discount_value ?? 35).toFixed(2)}):</strong> Impede que pedidos gigantescos tenham descontos excessivos em reais, blindando a margem operacional.
                </li>
                <li>
                  <strong>Não Cumulativo:</strong> O sistema bloqueia automaticamente o uso conjunto da recompensa de fidelidade com outros cupons promocionais.
                </li>
                <li>
                  <strong>Saldo de Pontos:</strong> O cliente visualiza seus pontos em tempo real tanto no carrinho quanto no acompanhamento do pedido.
                </li>
              </ul>
            </div>
          </div>
        )}
        {!['backup','audit'].includes(activeSection)&&<div className="settings-save-footer"><p>Salvar alterações aplica os ajustes de todas as seções editadas.</p><button type="submit" className="btn btn-primary" data-admin-ui="button"><Save size={16}/> Salvar configurações</button></div>}
      </form>
    </div>
    </fieldset>
  );
};
