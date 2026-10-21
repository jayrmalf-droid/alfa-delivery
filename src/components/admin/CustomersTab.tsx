import { Feedback, useFeedback } from '../common/Feedback';
import { parseOptionalMoneyInput, matchesCustomerSearch } from '../../domain/adminInput';
import { customerDebt } from '../../domain/receivables';
import { useDialog } from '../../utils/useDialog';
import { useConfirmedSave } from '../../utils/useConfirmedSave';
import React, { useState } from 'react';
import { Customer } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatCurrency } from '../../utils/formatters';
import { Users, Search, ShoppingBag, ShieldCheck, MapPin, Phone, Calendar, ArrowUpRight, Award } from 'lucide-react';

export const CustomersTab: React.FC = () => {
  const { saving, saveError, runSave } = useConfirmedSave();
  const customers: Customer[] = StorageService.getCustomers();
  const settings = StorageService.getSettings();
  const orders = StorageService.getOrders();
  // Indicadores calculados dos pedidos existentes, sem alterar os registros financeiros.
  const normalizePhone = (value: string) => String(value || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  const validOrders = orders.filter(order => order.status !== 'cancelled');
  const ordersByPhone = (phone: string) => validOrders.filter(order => normalizePhone(order.customer_phone) === normalizePhone(phone) && !!normalizePhone(phone))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const purchaseMetrics = (phone: string) => {
    const history = ordersByPhone(phone);
    const dates = history.map(order => new Date(order.created_at).getTime()).filter(Number.isFinite).sort((a,b) => a-b);
    const intervals = dates.slice(1).map((date, i) => (date - dates[i]) / 86400000);
    const last = dates.length ? dates[dates.length - 1] : null;
    const daysSince = last === null ? null : Math.max(0, Math.floor((Date.now() - last) / 86400000));
    return { history, count: history.length, total: history.reduce((sum, order) => sum + Number(order.total || 0), 0),
      averageDays: intervals.length ? Math.round(intervals.reduce((sum, days) => sum + days, 0) / intervals.length) : null,
      daysSince, segment: !history.length ? 'Sem pedidos' : history.length === 1 ? 'Novo' : daysSince !== null && daysSince >= 60 ? 'Inativo (60+ dias)' : 'Recorrente' };
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [manualQuery, setManualQuery] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('all');
  const [relationshipSort, setRelationshipSort] = useState('recent');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [manualProfiles, setManualProfiles] = useState<any[]>(() => StorageService.getCustomerProfiles());
  // O saldo devedor é derivado do livro de vendas e recebimentos, evitando divergência entre telas.
  const manualSales = StorageService.getSales() as Array<{ customer_phone?: string; total: number; paid_amount: number; payment_status?: string }>;
  const debtForPhone = (phone: string) => customerDebt(manualSales, phone);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileLimit, setProfileLimit] = useState('0');
  const {message:profileMessage,setMessage:setProfileMessage}=useFeedback();
  const saveProfile = async () => {
    const name = profileName.trim(); const phone = profilePhone.trim(); const digits = phone.replace(/\D/g, ''); const limit = parseOptionalMoneyInput(profileLimit);
    if (name.length < 2 || digits.length < 10 || digits.length > 13 || limit===null || limit < 0) { setProfileMessage('Confira nome, telefone e limite de crédito.'); return; }
    if (manualProfiles.some(c => c.phone.replace(/\D/g, '') === digits)) { setProfileMessage('Já existe um cadastro com esse telefone.'); return; }
    const next = [{ id: crypto.randomUUID(), name, phone, credit_limit: limit, created_at: new Date().toISOString() }, ...manualProfiles];
    setProfileMessage('');
    if (!await runSave(() => StorageService.saveCustomerProfiles(next))) return;
    setManualProfiles(next); setProfileName(''); setProfilePhone(''); setProfileLimit('0'); setProfileMessage('Cliente cadastrado com sucesso.','success');
  };
  const removeProfile = async (id: string) => { const next = manualProfiles.filter(c => c.id !== id); setProfileMessage(''); if (await runSave(() => StorageService.saveCustomerProfiles(next))) setManualProfiles(next); };

  useDialog(!!selectedCustomer, () => { if (saving) return; setSelectedCustomer(null); });

  const filtered = customers.filter(c => matchesCustomerSearch(c.name, c.whatsapp, searchTerm));
  const visibleProfiles = manualProfiles.filter(c => matchesCustomerSearch(c.name, c.phone, manualQuery));

  // Segmentos exclusivos por tempo sem comprar; baseados somente em pedidos válidos.
  const customerMetrics = customers.map(customer => ({ customer, metrics: purchaseMetrics(customer.whatsapp) }));
  const inactive30 = customerMetrics.filter(item => item.metrics.daysSince !== null && item.metrics.daysSince >= 30).length;
  const inactive60 = customerMetrics.filter(item => item.metrics.daysSince !== null && item.metrics.daysSince >= 60).length;
  const inactive90 = customerMetrics.filter(item => item.metrics.daysSince !== null && item.metrics.daysSince >= 90).length;
  const relationshipCustomers = customerMetrics.filter(({ customer, metrics }) => {
    if (!matchesCustomerSearch(customer.name, customer.whatsapp, searchTerm)) return false;
    const days = metrics.daysSince;
    switch (relationshipFilter) {
      case '30': return days !== null && days >= 30 && days < 60;
      case '60': return days !== null && days >= 60 && days < 90;
      case '90': return days !== null && days >= 90;
      case 'active': return days !== null && days < 30;
      case 'repeat': return metrics.count >= 2;
      case 'never': return metrics.count === 0;
      default: return true;
    }
  }).sort((a, b) => relationshipSort === 'orders' ? b.metrics.count - a.metrics.count
    : relationshipSort === 'spent' ? b.metrics.total - a.metrics.total
    : (b.metrics.history[0] ? new Date(b.metrics.history[0].created_at).getTime() : 0) - (a.metrics.history[0] ? new Date(a.metrics.history[0].created_at).getTime() : 0));
  const whatsappLink = (customer: Customer) => {
    const digits = String(customer.whatsapp || '').replace(/\D/g, '');
    const phone = digits.startsWith('55') && (digits.length === 12 || digits.length === 13) ? digits : `55${digits}`;
    const message = `Olá, ${customer.name}! Tudo bem? Sentimos sua falta por aqui no Alfa Delivery. Quando quiser fazer um novo pedido, estamos à disposição!`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const totalSpentAll = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  const avgTicketAll = customers.length > 0 ? totalSpentAll / customers.reduce((sum, c) => sum + (c.orders_count || 1), 0) : 0;

  return (
    <fieldset disabled={saving} aria-busy={saving} className="confirmed-save-fields">
      {saveError && <p role="alert" className="confirmed-save-error">{saveError}</p>}
      {saving && <p role="status">Aguardando confirmação de gravação…</p>}
    <div className="admin-customers-refresh" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header className="admin-section-heading"><div><span className="admin-section-eyebrow">CLIENTES E VENDAS</span><h2>Clientes e fidelidade</h2><p>Cadastros, saldos de fiado e relacionamento em um só lugar.</p></div><div className="customer-heading-counts"><span><strong>{manualProfiles.length}</strong> cadastros manuais</span><span><strong>{customers.length}</strong> clientes com pedidos</span></div></header>
      <section style={{ background: '#fff', border: '1px solid #e8e1db', borderRadius: 18, padding: 20, boxShadow: '0 6px 20px rgba(40,25,15,.03)' }} data-admin-ui="panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}><Users size={20} color="#b8461e"/><div><h3 style={{ margin: 0, fontSize: '1.05rem', color: '#29201a' }}>Cadastro manual de clientes</h3><p style={{ margin: '4px 0 0', fontSize: '.82rem', color: '#81756c' }}>Cadastre clientes para vendas rápidas e controle de fiado.</p></div></div>
        <details className="customer-registration"><summary><span>Novo cadastro manual</span><small>Nome, telefone e limite de fiado</small></summary><div className="customer-registration-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, alignItems: 'end' }} data-admin-ui="grid">
          <label style={{ fontSize: '.8rem', fontWeight: 700, color: '#63574e' }}>Nome<input className="form-input" value={profileName} onChange={e=>setProfileName(e.target.value)} maxLength={100} placeholder="Nome do cliente" style={{ marginTop: 6, borderRadius: 10 }} data-admin-ui="field"/></label>
          <label style={{ fontSize: '.8rem', fontWeight: 700, color: '#63574e' }}>Telefone / WhatsApp<input className="form-input" value={profilePhone} onChange={e=>setProfilePhone(e.target.value)} maxLength={20} placeholder="(77) 99999-9999" style={{ marginTop: 6, borderRadius: 10 }} data-admin-ui="field"/></label>
          <label style={{ fontSize: '.8rem', fontWeight: 700, color: '#63574e' }}>Limite de fiado (R$)<input className="form-input" type="text" inputMode="decimal" placeholder="Ex.: 1.250,50" value={profileLimit} onChange={e=>setProfileLimit(e.target.value)} style={{ marginTop: 6, borderRadius: 10 }} data-admin-ui="field"/></label>
          <button type="button" className="btn btn-primary" onClick={saveProfile} style={{ minHeight: 42, borderRadius: 10, fontWeight: 800 }} data-admin-ui="button">Cadastrar cliente</button>
        </div>
        </div></details>
        <Feedback message={profileMessage}/>
        <div className="manual-search-toolbar"><label>Buscar cadastro manual<input className="form-input" value={manualQuery} onChange={e=>setManualQuery(e.target.value)} placeholder="Nome ou telefone"/></label><span role="status">{visibleProfiles.length} de {manualProfiles.length} cadastros</span>{manualQuery&&<button type="button" onClick={()=>setManualQuery('')}>Limpar busca</button>}</div>
        {manualProfiles.length>0 && visibleProfiles.length===0 && <p role="status">Nenhum cadastro encontrado. Tente outro nome ou telefone.</p>}
        {visibleProfiles.length > 0 && <div className="customer-manual-table" style={{ overflowX: 'auto', marginTop: 16 }} tabIndex={0} role="region" aria-label="Tabela de Cliente — role para ver todas as colunas" data-admin-ui="table-scroll"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}><thead><tr style={{ textAlign: 'left', color: '#81756c', background: '#faf7f4' }}><th style={{ padding: 10 }}>Cliente</th><th style={{ padding: 10 }}>Telefone</th><th style={{ padding: 10 }}>Limite de fiado</th><th style={{ padding: 10 }}>Saldo devedor</th><th style={{ padding: 10 }}>Cadastro</th><th style={{ padding: 10 }}></th></tr></thead><tbody>{visibleProfiles.map(c=><tr key={c.id} style={{ borderTop: '1px solid #f0e9e3' }}><td style={{ padding: 10, fontWeight: 750 }}>{c.name}</td><td style={{ padding: 10 }}>{c.phone}</td><td style={{ padding: 10 }}>{formatCurrency(c.credit_limit||0)}</td><td style={{ padding: 10, fontWeight: 800, color: debtForPhone(c.phone) > 0 ? '#b45309' : '#166534' }}>{formatCurrency(debtForPhone(c.phone))}</td><td style={{ padding: 10 }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td><td style={{ padding: 10, textAlign: 'right' }}><button type="button" onClick={()=>removeProfile(c.id)} style={{ border: '1px solid #eaded6', background: '#fff', color: '#9a3412', borderRadius: 8, padding: '6px 9px', cursor: 'pointer' }} data-admin-ui="button">Excluir</button></td></tr>)}</tbody></table></div>}
      </section>
      {/* Header */}
      <div className="customer-history-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }} data-admin-ui="toolbar">
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Histórico dos clientes com pedidos
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '4px 0 0' }}>
            Base de dados gerada automaticamente a cada pedido, com histórico de compras e métricas de fidelização.
          </p>
        </div>

        <div className="customers-search-field" style={{ position: 'relative', width: 280 }}>
          <input
            type="text"
            aria-label="Buscar clientes com pedidos" placeholder="Buscar por nome ou WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 36, fontSize: '0.88rem', borderRadius: 10 }}
           data-admin-ui="field"/>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="customer-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }} data-admin-ui="grid">
        <div style={{ background: '#ffffff', padding: 18, borderRadius: 14, border: '1px solid #e2e8f0' }} data-admin-ui="panel">
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total de Clientes</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
            {customers.length}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: 18, borderRadius: 14, border: '1px solid #e2e8f0' }} data-admin-ui="panel">
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Valor de pedidos não cancelados</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a', marginTop: 4 }}>
            {formatCurrency(totalSpentAll)}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: 18, borderRadius: 14, border: '1px solid #e2e8f0' }} data-admin-ui="panel">
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Ticket Médio Geral</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-primary-dark)', marginTop: 4 }}>
            {formatCurrency(avgTicketAll)}
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }} data-admin-ui="panel">
        <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Tabela de Cliente — role para ver todas as colunas" data-admin-ui="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '12px 18px' }}>Cliente</th>
              <th style={{ padding: '12px 18px' }}>WhatsApp</th>
              <th style={{ padding: '12px 18px' }}>Pedidos</th>
              <th style={{ padding: '12px 18px' }}>Fidelidade</th>
              <th style={{ padding: '12px 18px' }}>Total Gasto</th>
              <th style={{ padding: '12px 18px' }}>Ticket Médio</th>
              <th style={{ padding: '12px 18px' }}>Último Pedido</th>
              <th style={{ padding: '12px 18px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px 18px', textAlign: 'center', color: '#94a3b8' }}>
                  Nenhum cliente cadastrado no momento. Os clientes serão salvos automaticamente conforme realizarem pedidos.
                </td>
              </tr>
            ) : (
              filtered.map(cust => {
                const loyalty = (cust.loyalty_stamps !== undefined && cust.loyalty_stamps !== null)
                  ? { stamps: cust.loyalty_points ?? cust.loyalty_stamps, has_reward: cust.loyalty_has_reward }
                  : { stamps: 0, has_reward: false };

                return (
                <tr key={cust.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0f172a' }}>
                    {cust.name}
                  </td>
                  <td style={{ padding: '12px 18px', color: '#475569' }}>
                    <a
                      href={`https://wa.me/55${cust.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#16a34a', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Phone size={13} />
                      <span>{cust.whatsapp}</span>
                    </a>
                  </td>
                  <td style={{ padding: '12px 18px', fontWeight: 800 }}>
                    <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: 9999 }}>
                      {cust.orders_count || 1}
                    </span>
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    {loyalty.has_reward ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 9999,
                        backgroundColor: '#fef3c7',
                        color: '#b45309',
                        fontWeight: 800,
                        fontSize: '0.78rem'
                      }}>
                        <Award size={13} />
                        <span>Prêmio Pronto! 🎁</span>
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 9999,
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        fontWeight: 700,
                        fontSize: '0.78rem'
                      }}>
                        <span>⭐ {loyalty.stamps || 0} pontos</span>
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 18px', fontWeight: 800, color: '#16a34a' }}>
                    {formatCurrency(cust.total_spent || 0)}
                  </td>
                  <td style={{ padding: '12px 18px', fontWeight: 700 }}>
                    {formatCurrency(cust.average_ticket || 0)}
                  </td>
                  <td style={{ padding: '12px 18px', color: '#64748b', fontSize: '0.82rem' }}>
                    {cust.last_order_at ? new Date(cust.last_order_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedCustomer(cust)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                     data-admin-ui="button">
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
        </div>
      </div>

      <section style={{ background: '#fff', border: '1px solid #e8e1db', borderRadius: 16, padding: 18 }} data-admin-ui="panel">
        <h3 style={{ margin: '0 0 8px', color: '#29201a' }}>Recompra e relacionamento</h3>
        <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '.84rem' }}>Indicadores dos pedidos não cancelados. Clientes sem pedidos não entram na contagem de recompra.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }} data-admin-ui="grid">
          {[
            ['Clientes recorrentes', customers.filter(c => purchaseMetrics(c.whatsapp).count >= 2).length],
            ['Novos (1 pedido)', customers.filter(c => purchaseMetrics(c.whatsapp).count === 1).length],
            ['Inativos há 60+ dias', customers.filter(c => purchaseMetrics(c.whatsapp).segment === 'Inativo (60+ dias)').length],
          ].map(([label, value]) => <div key={String(label)} style={{ background: '#f8fafc', borderRadius: 10, padding: 12 }}><div style={{ fontSize: '.78rem', color: '#64748b' }}>{label}</div><strong style={{ fontSize: '1.4rem', color: '#0f172a' }}>{value}</strong></div>)}
        </div>
      </section>

      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18 }} data-admin-ui="panel">
        <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>Painel de fidelização e recuperação</h3>
        <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '.84rem' }}>Acompanhe clientes e abra mensagens individuais no WhatsApp. Nenhuma mensagem é enviada automaticamente.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 16 }} data-admin-ui="grid">
          {[
            ['Ativos (últimos 29 dias)', customerMetrics.filter(item => item.metrics.daysSince !== null && item.metrics.daysSince < 30).length],
            ['Sem comprar há 30+ dias', inactive30],
            ['Sem comprar há 60+ dias', inactive60],
            ['Sem comprar há 90+ dias', inactive90],
            ['Recorrentes (2+ pedidos)', customerMetrics.filter(item => item.metrics.count >= 2).length],
          ].map(([label, value]) => <div key={String(label)} style={{ background: '#f8fafc', padding: 12, borderRadius: 10 }}><div style={{ fontSize: '.77rem', color: '#64748b' }}>{label}</div><strong style={{ fontSize: '1.35rem' }}>{value}</strong></div>)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }} data-admin-ui="toolbar">
          <label style={{ fontSize: '.8rem', fontWeight: 700 }}>Segmento
            <select aria-label="Filtrar clientes por segmento" className="form-input" value={relationshipFilter} onChange={event => setRelationshipFilter(event.target.value)} style={{ display: 'block', marginTop: 5 }} data-admin-ui="field">
              <option value="all">Todos os clientes</option><option value="active">Ativos (menos de 30 dias)</option>
              <option value="30">30 a 59 dias sem comprar</option><option value="60">60 a 89 dias sem comprar</option>
              <option value="90">90 dias ou mais sem comprar</option><option value="repeat">Recorrentes (2+ pedidos)</option>
              <option value="never">Sem pedidos</option>
            </select>
          </label>
          <label style={{ fontSize: '.8rem', fontWeight: 700 }}>Ordenação
            <select aria-label="Ordenar clientes" className="form-input" value={relationshipSort} onChange={event => setRelationshipSort(event.target.value)} style={{ display: 'block', marginTop: 5 }} data-admin-ui="field">
              <option value="recent">Compra mais recente</option><option value="orders">Mais pedidos</option><option value="spent">Maior valor comprado</option>
            </select>
          </label>
        </div>
        <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Tabela de Cliente — role para ver todas as colunas" data-admin-ui="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.83rem' }}>
            <thead><tr style={{ textAlign: 'left', background: '#f8fafc', color: '#475569' }}><th style={{ padding: 10 }}>Cliente</th><th style={{ padding: 10 }}>Pedidos</th><th style={{ padding: 10 }}>Total comprado</th><th style={{ padding: 10 }}>Última compra</th><th style={{ padding: 10 }}>Contato</th></tr></thead>
            <tbody>{relationshipCustomers.map(({ customer, metrics }) => <tr key={customer.id} style={{ borderTop: '1px solid #e2e8f0' }}>
              <td style={{ padding: 10, fontWeight: 700 }}>{customer.name}</td><td style={{ padding: 10 }}>{metrics.count}</td>
              <td style={{ padding: 10 }}>{formatCurrency(metrics.total)}</td>
              <td style={{ padding: 10 }}>{metrics.daysSince === null ? 'Sem pedidos' : `${metrics.daysSince} dia(s) atrás`}</td>
              <td style={{ padding: 10 }}><a href={whatsappLink(customer)} target="_blank" rel="noopener noreferrer" style={{ color: '#15803d', fontWeight: 700, whiteSpace: 'nowrap' }}>Abrir WhatsApp ↗</a></td>
            </tr>)}
            {relationshipCustomers.length === 0 && <tr><td colSpan={5} style={{ padding: 18, color: '#64748b', textAlign: 'center' }}>Nenhum cliente encontrado para o filtro selecionado.</td></tr>}</tbody>
          </table>
        </div>
      </section>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
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
        }} data-admin-ui="overlay">
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 18,
            width: '100%',
            maxWidth: 650,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }} role="dialog" aria-modal="true" aria-label="Cliente — detalhes e edição" data-admin-ui="panel dialog">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
              {selectedCustomer.name}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px' }}>
              WhatsApp: {selectedCustomer.whatsapp} • Cadastrado em {new Date(selectedCustomer.created_at).toLocaleDateString()}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }} data-admin-ui="grid grid-fixed">
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Pedidos</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{selectedCustomer.orders_count}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Gasto</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>{formatCurrency(selectedCustomer.total_spent)}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Ticket Médio</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>{formatCurrency(selectedCustomer.average_ticket)}</div>
              </div>
            </div>

            {(() => {
              const metrics = purchaseMetrics(selectedCustomer.whatsapp);
              return <section style={{ marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '.95rem' }}>Histórico e recompra</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '.83rem', marginBottom: 10 }} data-admin-ui="toolbar">
                  <span><strong>Perfil:</strong> {metrics.segment}</span>
                  <span><strong>Última compra:</strong> {metrics.daysSince === null ? '—' : `${metrics.daysSince} dia(s) atrás`}</span>
                  <span><strong>Intervalo médio:</strong> {metrics.averageDays === null ? '—' : `${metrics.averageDays} dias`}</span>
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {metrics.history.length === 0 ? <p style={{ color: '#64748b', fontSize: '.83rem' }}>Nenhum pedido encontrado para este telefone.</p> :
                    metrics.history.map(order => <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderTop: '1px solid #f1f5f9', fontSize: '.82rem' }}>
                      <span>#{order.order_number} · {new Date(order.created_at).toLocaleDateString('pt-BR')} · {order.status}</span>
                      <strong>{formatCurrency(Number(order.total || 0))}</strong>
                    </div>)}
                </div>
              </section>;
            })()}

            {/* Loyalty Status Box */}
            {(() => {
              const selLoyalty = (selectedCustomer.loyalty_stamps !== undefined && selectedCustomer.loyalty_stamps !== null)
                ? { stamps: selectedCustomer.loyalty_points ?? selectedCustomer.loyalty_stamps, has_reward: selectedCustomer.loyalty_has_reward, rewards_redeemed_count: selectedCustomer.loyalty_rewards_count || 0 }
                : { stamps: 0, has_reward: false, rewards_redeemed_count: 0 };
              return (
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Award size={16} />
                      <span>{settings.loyalty_program_name || 'Programa de Fidelidade'}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#b45309', marginTop: 3 }}>
                      {selLoyalty.has_reward
                        ? '🎉 Recompensa disponível para o próximo pedido!'
                        : `${selLoyalty.stamps || 0} pontos disponíveis`}
                      {selLoyalty.rewards_redeemed_count ? ` • ${selLoyalty.rewards_redeemed_count} resgate(s) no total` : ''}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    color: '#92400e',
                    backgroundColor: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: 20,
                    border: '1px solid #fde68a',
                    whiteSpace: 'nowrap'
                  }} data-admin-ui="panel">
                    ⭐ {selLoyalty.stamps || 0} pontos
                  </div>
                </div>
              );
            })()}

            {!!selectedCustomer.loyalty_history?.length && <details style={{marginBottom:18}}><summary style={{cursor:'pointer',fontWeight:700}}>Histórico de pontos</summary><div style={{maxHeight:180,overflowY:'auto'}}>{selectedCustomer.loyalty_history.map(entry=><div key={entry.id} style={{padding:6,fontSize:13}}>{new Date(entry.created_at).toLocaleString('pt-BR')} · Pedido {entry.order_number} · {entry.type} · {entry.points>0?'+':''}{entry.points} pontos</div>)}</div></details>}
            <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Endereços Registrados
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto', marginBottom: 20 }}>
              {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 ? (
                selectedCustomer.addresses.map((addr, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, fontSize: '0.82rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>
                      {addr.street}, Nº {addr.number} {addr.complement ? `(${addr.complement})` : ''}
                    </div>
                    <div style={{ color: '#64748b' }}>
                      Bairro: {addr.neighborhood} {addr.reference ? `• Ref: ${addr.reference}` : ''}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  Nenhum endereço registrado (pedidos com retirada no balcão).
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="btn btn-primary"
                style={{ padding: '8px 18px', borderRadius: 8, fontSize: '0.88rem' }}
               data-admin-ui="button">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </fieldset>
  );
};
