import React, { useState, useEffect } from 'react';
import { fetchLoyaltyStatus } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { useDialog } from '../../utils/useDialog';
import type { LoyaltyStatus } from '../../types';
import {
  Ticket,
  Award,
  X,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Percent,
  Search,
  AlertCircle
} from 'lucide-react';

type Offer = {
  code: string;
  type: string;
  value: number;
  min_order_value: number;
  expires_at: string | null;
  single_use_per_client: boolean;
};

type Program = {
  enabled: boolean;
  program_name: string;
  goal: number;
  min_order_value: number;
  earn_per_real: number;
  discount_percent: number;
  max_discount_value: number;
};

interface CatalogBenefitsProps {
  offers: Offer[];
  program?: Program;
}

export function CatalogBenefits({ offers, program }: CatalogBenefitsProps) {
  const [activeModal, setActiveModal] = useState<'coupons' | 'loyalty' | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Loyalty lookup state
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<LoyaltyStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupTick, setLookupTick] = useState(0);

  // Accessible dialog management
  useDialog(activeModal !== null, () => setActiveModal(null));

  function handleCheckLoyalty(e: React.FormEvent) {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Informe o WhatsApp completo com DDD.');
      return;
    }
    setLookupPhone(phone);
    setLookupTick((val) => val + 1);
  }

  useEffect(() => {
    if (!lookupPhone || !program?.enabled) return;
    let active = true;
    setBusy(true);
    setError('');

    void fetchLoyaltyStatus(lookupPhone)
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Não foi possível consultar os pontos.');
      })
      .finally(() => {
        if (active) setBusy(false);
      });

    return () => {
      active = false;
    };
  }, [lookupPhone, lookupTick, program]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 3000);
    } catch {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 3000);
    }
  };

  const hasOffers = offers && offers.length > 0;
  const hasProgram = Boolean(program?.enabled);

  if (!hasOffers && !hasProgram) {
    return null;
  }

  return (
    <>
      {/* Quick Action Trigger Buttons Bar */}
      <section className="catalog-benefits store-container" aria-label="Vantagens e fidelidade">
        <div className="benefits-triggers-grid">
          {hasOffers && (
            <button
              type="button"
              className="benefit-trigger-button benefit-trigger-coupons"
              onClick={() => setActiveModal('coupons')}
              aria-haspopup="dialog"
              aria-label="Abrir Cupons da loja"
            >
              <div className="benefit-trigger-icon-wrap coupons-icon">
                <Ticket size={22} />
              </div>
              <div className="benefit-trigger-content">
                <span className="benefit-trigger-badge">VANTAGENS PARA SEU PEDIDO</span>
                <strong className="benefit-trigger-title">Cupons da loja</strong>
                <span className="benefit-trigger-subtitle">
                  {offers.length === 1 ? '1 cupom disponível' : `${offers.length} cupons disponíveis`} • Toque para ver
                </span>
              </div>
              <div className="benefit-trigger-arrow">
                <span>Ver cupons</span>
                <ChevronRight size={16} />
              </div>
            </button>
          )}

          {hasProgram && program && (
            <button
              type="button"
              className="benefit-trigger-button benefit-trigger-loyalty"
              onClick={() => setActiveModal('loyalty')}
              aria-haspopup="dialog"
              aria-label={`Abrir ${program.program_name || 'Clube de Pontos'}`}
            >
              <div className="benefit-trigger-icon-wrap loyalty-icon">
                <Award size={22} />
              </div>
              <div className="benefit-trigger-content">
                <span className="benefit-trigger-badge">CADA PEDIDO CONTA</span>
                <strong className="benefit-trigger-title">{program.program_name || 'Clube de Pontos'}</strong>
                <span className="benefit-trigger-subtitle">
                  Consulte seus pontos e ganhe recompensas
                </span>
              </div>
              <div className="benefit-trigger-arrow">
                <span>Consultar</span>
                <ChevronRight size={16} />
              </div>
            </button>
          )}
        </div>
      </section>

      {/* MODAL 1: CUPONS DA LOJA */}
      {activeModal === 'coupons' && (
        <div
          className="benefits-modal-backdrop animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Cupons da loja"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <div className="benefits-modal-dialog animate-scale-up">
            <div className="benefits-modal-header">
              <div className="benefits-modal-header-info">
                <div className="benefits-modal-tag coupons-tag">
                  <Ticket size={13} />
                  <span>VANTAGENS PARA SEU PEDIDO</span>
                </div>
                <h2>Cupons da loja</h2>
                <p>Escolha um código e informe no checkout ao finalizar seu pedido.</p>
              </div>
              <button
                type="button"
                className="benefits-modal-close"
                onClick={() => setActiveModal(null)}
                aria-label="Fechar janela de cupons"
              >
                <X size={18} />
              </button>
            </div>

            <div className="benefits-modal-body">
              <div className="offers-modal-list">
                {offers.map((offer) => {
                  const discountLabel =
                    offer.type === 'shipping'
                      ? 'Frete grátis'
                      : offer.type === 'percentage'
                      ? `${offer.value}% de desconto`
                      : `${formatCurrency(offer.value)} de desconto`;
                  const isCopied = copiedCode === offer.code;

                  return (
                    <article key={offer.code} className="offer-ticket-card">
                      <div className="offer-ticket-main">
                        <div className="offer-ticket-discount">
                          <Percent size={18} className="offer-ticket-icon" />
                          <strong>{discountLabel}</strong>
                        </div>
                        <div className="offer-ticket-rules">
                          <p>
                            {offer.min_order_value > 0
                              ? `Itens a partir de ${formatCurrency(offer.min_order_value)}.`
                              : 'Sem valor mínimo de itens.'}{' '}
                            {offer.single_use_per_client ? 'Válido 1 vez por cliente. ' : ''}
                            {offer.expires_at
                              ? `Válido até ${new Date(offer.expires_at).toLocaleDateString('pt-BR', {
                                  timeZone: 'America/Bahia',
                                })}.`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="offer-ticket-action-row">
                        <div className="offer-ticket-code-pill">
                          <span className="offer-ticket-label">Código:</span>
                          <code>{offer.code}</code>
                        </div>
                        <button
                          type="button"
                          className={`offer-ticket-copy-btn ${isCopied ? 'copied' : ''}`}
                          onClick={() => handleCopyCode(offer.code)}
                        >
                          {isCopied ? (
                            <>
                              <Check size={15} />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={15} />
                              <span>Copiar código</span>
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="benefits-modal-footer">
              <button
                type="button"
                className="benefits-modal-action-btn"
                onClick={() => setActiveModal(null)}
              >
                Fechar e continuar no cardápio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CLUBE DE PONTOS */}
      {activeModal === 'loyalty' && program && (
        <div
          className="benefits-modal-backdrop animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={program.program_name || 'Clube de Pontos'}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <div className="benefits-modal-dialog animate-scale-up">
            <div className="benefits-modal-header">
              <div className="benefits-modal-header-info">
                <div className="benefits-modal-tag loyalty-tag">
                  <Award size={13} />
                  <span>CADA PEDIDO CONTA</span>
                </div>
                <h2>{program.program_name || 'Clube de Pontos'}</h2>
                <p>Acumule pontos em cada compra e resgate descontos exclusivos.</p>
              </div>
              <button
                type="button"
                className="benefits-modal-close"
                onClick={() => setActiveModal(null)}
                aria-label="Fechar janela do clube de pontos"
              >
                <X size={18} />
              </button>
            </div>

            <div className="benefits-modal-body">
              {/* Rules Explanatory Banner */}
              <div className="loyalty-rules-card">
                <div className="loyalty-rule-item">
                  <span className="loyalty-rule-icon">🌟</span>
                  <div>
                    <strong>Ganhe {program.earn_per_real} ponto(s) por real</strong>
                    <p>Em pedidos elegíveis a partir de {formatCurrency(program.min_order_value)}.</p>
                  </div>
                </div>
                <div className="loyalty-rule-item">
                  <span className="loyalty-rule-icon">🎁</span>
                  <div>
                    <strong>Com {program.goal} pontos, ganhe {program.discount_percent}% OFF</strong>
                    <p>Desconto limitado a até {formatCurrency(program.max_discount_value)}.</p>
                  </div>
                </div>
                <small className="loyalty-rule-note">
                  * Pontos concedidos após a conclusão dos pedidos. O resgate é feito diretamente no checkout e não se acumula com cupons promocionais.
                </small>
              </div>

              {/* Consultation Form */}
              <div className="loyalty-lookup-box">
                <h3>Consulte seus pontos com WhatsApp</h3>
                <form onSubmit={handleCheckLoyalty} className="loyalty-lookup-form">
                  <div className="loyalty-input-row">
                    <input
                      id="loyalty-modal-phone"
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setLookupPhone('');
                        setStatus(null);
                        setError('');
                      }}
                      placeholder="DDD + número de WhatsApp"
                      required
                    />
                    <button type="submit" disabled={busy} className="loyalty-submit-btn">
                      {busy ? (
                        'Consultando…'
                      ) : (
                        <>
                          <Search size={15} />
                          <span>Consultar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {error && (
                    <div className="loyalty-alert-error" role="alert">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  {status && (
                    <div className="loyalty-status-card" role="status">
                      <div className="loyalty-status-head">
                        <strong>
                          {(status.points ?? 0)} de {status.goal} pontos
                        </strong>
                        <span className="loyalty-percent-badge">
                          {Math.round(((status.points ?? 0) / Math.max(1, status.goal)) * 100)}%
                        </span>
                      </div>
                      <div className="loyalty-progress-track">
                        <div
                          className="loyalty-progress-fill"
                          style={{
                            width: `${Math.max(0, Math.min(100, ((status.points ?? 0) / Math.max(1, status.goal)) * 100))}%`,
                          }}
                        />
                      </div>
                      <p className={`loyalty-status-message ${status.has_reward ? 'has-reward' : ''}`}>
                        {status.has_reward ? (
                          <>
                            <Sparkles size={16} />
                            <span>Parabéns! Você tem recompensa disponível para resgatar no checkout.</span>
                          </>
                        ) : (
                          <span>
                            Faltam {Math.max(0, status.goal - (status.points ?? 0))} pontos para desbloquear sua recompensa!
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </form>
              </div>
            </div>

            <div className="benefits-modal-footer">
              <button
                type="button"
                className="benefits-modal-action-btn"
                onClick={() => setActiveModal(null)}
              >
                Fechar e voltar ao cardápio
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
