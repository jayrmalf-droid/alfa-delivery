import React, { useState } from 'react';
import { Customer } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatCurrency } from '../../utils/formatters';
import { Users, Search, ShoppingBag, ShieldCheck, MapPin, Phone, Calendar, ArrowUpRight } from 'lucide-react';

export const CustomersTab: React.FC = () => {
  const customers:Customer[] = StorageService.getCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filtered = customers.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.whatsapp.includes(term);
  });

  const totalSpentAll = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  const avgTicketAll = customers.length > 0 ? totalSpentAll / customers.reduce((sum, c) => sum + (c.orders_count || 1), 0) : 0;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Clientes e histórico de pedidos
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '4px 0 0' }}>
            Base de dados gerada automaticamente a cada pedido, com histórico de compras e métricas de fidelização.
          </p>
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <input
            type="text"
            placeholder="Buscar por nome ou WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 36, fontSize: '0.88rem', borderRadius: 10 }}
          />
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div style={{ background: '#ffffff', padding: 18, borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total de Clientes</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
            {customers.length}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: 18, borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Valor de pedidos não cancelados</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a', marginTop: 4 }}>
            {formatCurrency(totalSpentAll)}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: 18, borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Ticket Médio Geral</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-primary-dark)', marginTop: 4 }}>
            {formatCurrency(avgTicketAll)}
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '12px 18px' }}>Cliente</th>
              <th style={{ padding: '12px 18px' }}>WhatsApp</th>
              <th style={{ padding: '12px 18px' }}>Pedidos</th>
              <th style={{ padding: '12px 18px' }}>Total Gasto</th>
              <th style={{ padding: '12px 18px' }}>Ticket Médio</th>
              <th style={{ padding: '12px 18px' }}>Último Pedido</th>
              <th style={{ padding: '12px 18px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px 18px', textAlign: 'center', color: '#94a3b8' }}>
                  Nenhum cliente cadastrado no momento. Os clientes serão salvos automaticamente conforme realizarem pedidos.
                </td>
              </tr>
            ) : (
              filtered.map(cust => (
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
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 18,
            width: '100%',
            maxWidth: 520,
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
              {selectedCustomer.name}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px' }}>
              WhatsApp: {selectedCustomer.whatsapp} • Cadastrado em {new Date(selectedCustomer.created_at).toLocaleDateString()}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
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
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
