import { useDialog } from '../../utils/useDialog';
import { login } from '../../services/api';
import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, AlertCircle, X } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {

  useDialog(isOpen, onClose);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true);
    try { await login(email, password); onLoginSuccess(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível entrar.'); }
    finally { setLoading(false); }
  };
  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Acesso administrativo" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#ffffff',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}
      >
        {/* Top header */}
        <div style={{
          padding: '24px 24px 20px',
          background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
          color: '#ffffff',
          textAlign: 'center',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              color: '#fff',
              background: 'rgba(255,255,255,0.2)',
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>

          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <ShieldCheck size={28} />
          </div>

          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Painel Administrativo
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
            Alfa Salgados • Gestão do Estabelecimento
          </p>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 10,
              color: '#b91c1c',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              E-mail de Acesso
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 40 }}
                placeholder="seu-email@exemplo.com"
              />
              <Mail size={18} style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 40 }}
                placeholder="••••••••"
              />
              <Lock size={18} style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 12,
              fontSize: '1rem',
              fontWeight: 700
            }}
          >
            {loading ? 'Entrando...' : 'Entrar no Painel'}
          </button>

          <p style={{
            fontSize: '0.78rem',
            color: '#94a3b8',
            textAlign: 'center',
            marginTop: 14
          }}>
            Acesso exclusivo para os administradores da Alfa Salgados.
          </p>
        </form>
      </div>
    </div>
  );
};
