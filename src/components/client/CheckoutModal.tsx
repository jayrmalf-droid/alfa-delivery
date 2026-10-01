import { useDialog } from '../../utils/useDialog';
import { quote } from '../../services/api';
import { normalizePhone, localDate, cents } from '../../domain/rules';
import React, { useState, useEffect, useRef } from 'react';
import { CartItem, StoreSettings, Neighborhood, Order, DeliveryType, PaymentMethod } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import confetti from 'canvas-confetti';
import {
  X,
  Bike,
  Store,
  MapPin,
  Phone,
  User,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  CheckCircle,
  Copy,
  ArrowRight,
  AlertCircle,
  Calendar,
  Clock,
  Sparkles,
  BookmarkCheck
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  settings: StoreSettings;
  neighborhoods: Neighborhood[];
  onOrderCompleted: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  settings,
  neighborhoods,
  onOrderCompleted
}) => {

  // Saved customer data from local storage
  const savedData = (() => {
    try {
      const raw = localStorage.getItem('alfa_customer_pref');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  // Form State
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [customerName, setCustomerName] = useState(savedData?.name || '');
  const [customerPhone, setCustomerPhone] = useState(savedData?.phone || '');
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState(savedData?.neighborhood_id || '');
  const [cep, setCep] = useState(savedData?.cep || '');
  const [address, setAddress] = useState(savedData?.address || '');
  const [addressNumber, setAddressNumber] = useState(savedData?.number || '');
  const [complement, setComplement] = useState(savedData?.complement || '');
  const [referencePoint, setReferencePoint] = useState(savedData?.reference || '');

  // Schedule State (Section 12)
  const [scheduleType, setScheduleType] = useState<'now' | 'scheduled'>('now');
  const [scheduleDate, setScheduleDate] = useState(() => {
    const today = new Date();
    return localDate(today);
  });
  const [scheduleTime, setScheduleTime] = useState('18:00');

  // Payment State (Section 11)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>((['pix','cash','credit','debit'] as PaymentMethod[]).find(method => settings[`payment_${method}`]) || 'pix');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');

  // Coupon State (Section 20)
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; freeShipping?: boolean } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [notes, setNotes] = useState('');
  const [pixCopied, setPixCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverQuote, setServerQuote] = useState<{ subtotal:number; delivery_fee:number; discount_value:number; total:number } | null>(null);
  const submittingRef = useRef(false);
  const idempotencyRef = useRef(crypto.randomUUID());
  useEffect(() => { if (!submittingRef.current) idempotencyRef.current = crypto.randomUUID(); }, [cart, deliveryType, selectedNeighborhoodId, paymentMethod, scheduleDate, scheduleTime, couponCode]);
  useEffect(() => { setAppliedCoupon(null); setServerQuote(null); }, [cart, customerPhone, deliveryType, selectedNeighborhoodId]);

  // Available neighborhoods
  const availableNeighborhoods = neighborhoods.filter(n => n.is_available !== false);
  const selectedNeighborhood = availableNeighborhoods.find(n => n.id === selectedNeighborhoodId);

  // Pricing calculations
  const subtotal = serverQuote?.subtotal ?? cart.reduce((acc, item) => acc + cents(item.totalPrice), 0) / 100;
  let deliveryFee = serverQuote?.delivery_fee ?? (deliveryType === 'delivery' ? (selectedNeighborhood ? selectedNeighborhood.delivery_fee : 0) : 0);
  if (appliedCoupon?.freeShipping) {
    deliveryFee = 0;
  }
  const discount = serverQuote?.discount_value ?? (appliedCoupon ? appliedCoupon.discount : 0);
  const total = serverQuote?.total ?? Math.max(0, cents(subtotal) + cents(deliveryFee) - cents(discount)) / 100;

  // Quick autofill saved customer info
  const handleUseSavedData = () => {
    if (!savedData) return;
    setCustomerName(savedData.name || '');
    setCustomerPhone(savedData.phone || '');
    if (savedData.neighborhood_id) setSelectedNeighborhoodId(savedData.neighborhood_id);
    if (savedData.address) setAddress(savedData.address);
    if (savedData.number) setAddressNumber(savedData.number);
    if (savedData.complement) setComplement(savedData.complement);
    if (savedData.reference) setReferencePoint(savedData.reference);
  };

  // CEP lookup
  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          if (data.logradouro) setAddress(data.logradouro);
          if (data.bairro) {
            const matchNeighborhood = availableNeighborhoods.find(
              n => n.name.toLowerCase() === data.bairro.toLowerCase()
            );
            if (matchNeighborhood) {
              setSelectedNeighborhoodId(matchNeighborhood.id);
            }
          }
        }
      } catch {
        // ignore
      }
    }
  };

  // Apply Coupon handler
  const handleApplyCoupon = async () => {
    setCouponError(null);
    try {
      const result = await quote({ items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, selections: i.selectedOptions, notes: i.notes })), delivery_type: deliveryType, neighborhood_id: selectedNeighborhoodId, customer_phone: customerPhone, coupon_code: couponCode });
      setServerQuote(null);
      setAppliedCoupon({ code: result.coupon_code, discount: result.discount_value, freeShipping: result.delivery_fee === 0 });
    } catch (error) { setAppliedCoupon(null); setCouponError(error instanceof Error ? error.message : 'Não foi possível aplicar o cupom.'); }
  };

  // Copy Pix Key
  const handleCopyPix = async () => {
    try { await navigator.clipboard.writeText(settings.pix_key); setPixCopied(true); setTimeout(() => setPixCopied(false), 3000); }
    catch { setFormError('Não foi possível copiar. Você pode selecionar a chave Pix manualmente.'); }
  };

  // Submit Order (Section 13 & 14)
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (submittingRef.current) return;

    // Validation
    if (!customerName.trim()) {
      setFormError('Por favor, informe seu nome.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
      setFormError('Por favor, informe um telefone/WhatsApp válido.');
      return;
    }
    if (deliveryType === 'delivery') {
      if (!selectedNeighborhoodId) {
        setFormError('Por favor, selecione o bairro de entrega.');
        return;
      }
      if (!address.trim()) {
        setFormError('Por favor, informe a rua ou avenida.');
        return;
      }
      if (!addressNumber.trim()) {
        setFormError('Por favor, informe o número da residência.');
        return;
      }
    }

    if (paymentMethod === 'cash' && needsChange) {
      const val = parseFloat(changeAmount.replace(',', '.'));
      if (!val || val <= total) {
        setFormError(`O valor para troco deve ser maior que o total do pedido (${formatCurrency(total)}).`);
        return;
      }
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {

    // Save preferences in localStorage
    try {
      localStorage.setItem('alfa_customer_pref', JSON.stringify({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        neighborhood_id: selectedNeighborhoodId,
        cep,
        address: address.trim(),
        number: addressNumber.trim(),
        complement: complement.trim(),
        reference: referencePoint.trim()
      }));
    } catch {
      // ignore
    }

    const orderPayload: Omit<Order, 'id' | 'order_number' | 'created_at'> = {
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      delivery_type: deliveryType,
      address: deliveryType === 'delivery' ? address.trim() : null,
      address_number: deliveryType === 'delivery' ? addressNumber.trim() : null,
      complement: deliveryType === 'delivery' ? complement.trim() : null,
      reference_point: deliveryType === 'delivery' ? referencePoint.trim() : null,
      neighborhood_id: deliveryType === 'delivery' ? selectedNeighborhoodId : null,
      neighborhood_name: deliveryType === 'delivery' ? selectedNeighborhood?.name : null,
      delivery_fee: deliveryFee,
      subtotal,
      discount_value: discount,
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      total,
      payment_method: paymentMethod,
      needs_change: paymentMethod === 'cash' ? needsChange : false,
      change_amount: paymentMethod === 'cash' && needsChange ? parseFloat(changeAmount.replace(',', '.')) || null : null,
      preorder_date: scheduleType === 'scheduled' ? scheduleDate : null,
      preorder_time: scheduleType === 'scheduled' ? scheduleTime : null,
      status: 'pending',
      notes: notes.trim() || null,
      items: cart.map(item => ({
        id: item.id,
        order_id: '',
        product_id: item.product.id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
        subtotal: item.totalPrice,
        notes: item.notes,
        selections: item.selectedOptions
      }))
    };

    // CRÍTICO: Salva no banco de dados ANTES de abrir WhatsApp (Section 14)
    const canonical = await quote(orderPayload);
    if (cents(canonical.total) !== cents(total)) { setServerQuote(canonical); throw new Error('O valor foi atualizado no resumo abaixo. Confira o novo total e confirme novamente para concluir.'); }
    const savedOrder = await StorageService.createOrder(orderPayload, idempotencyRef.current);

    // Fire Confetti!
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    // Build structured WhatsApp message
    const storePhoneCleaned = settings.whatsapp ? settings.whatsapp.replace(/\D/g, '') : '5577991947697';
    let msg = `*NOVO PEDIDO #${savedOrder.order_number} - ALFA SALGADOS*\n`;
    msg += `--------------------------------\n`;
    msg += `👤 *Cliente:* ${savedOrder.customer_name}\n`;
    msg += `📱 *WhatsApp:* ${savedOrder.customer_phone}\n`;
    msg += `🛵 *Tipo:* ${deliveryType === 'delivery' ? 'Entrega em Domicílio' : 'Retirada no Balcão'}\n`;

    if (scheduleType === 'scheduled') {
      msg += `📅 *Agendado para:* ${scheduleDate.split('-').reverse().join('/')} às ${scheduleTime}\n`;
    } else {
      msg += `⚡ *Previsão:* Entregar agora (~${settings.delivery_time_estimate || '40 min'})\n`;
    }

    if (deliveryType === 'delivery') {
      msg += `📍 *Endereço:* ${savedOrder.address}, Nº ${savedOrder.address_number}\n`;
      if (savedOrder.complement) msg += `🏢 *Compl:* ${savedOrder.complement}\n`;
      msg += `🏘️ *Bairro:* ${savedOrder.neighborhood_name}\n`;
      if (savedOrder.reference_point) msg += `🧭 *Ref:* ${savedOrder.reference_point}\n`;
    }
    msg += `\n`;

    msg += `📋 *ITENS DO PEDIDO:*\n`;
    (savedOrder.items || []).forEach(item => {
      msg += `▪ ${item.quantity}x ${item.product_name} - ${formatCurrency(item.subtotal)}\n`;
      if (item.selections && item.selections.length > 0) {
        item.selections.forEach(opt => {
          msg += `   └ ${opt.optionName} ${opt.price > 0 ? `(+${formatCurrency(opt.price)})` : ''}\n`;
        });
      }
      if (item.notes) {
        msg += `   Obs: ${item.notes}\n`;
      }
    });

    msg += `\n--------------------------------\n`;
    msg += `*Subtotal:* ${formatCurrency(savedOrder.subtotal)}\n`;
    if (deliveryFee > 0) msg += `*Taxa de Entrega:* ${formatCurrency(deliveryFee)}\n`;
    if (discount > 0) msg += `*Desconto:* -${formatCurrency(discount)} (${appliedCoupon?.code})\n`;
    msg += `*TOTAL FINAL:* ${formatCurrency(savedOrder.total)}\n`;
    msg += `💳 *Forma de Pagamento:* ${
      paymentMethod === 'pix' ? 'PIX' :
      paymentMethod === 'cash' ? `Dinheiro ${needsChange ? `(Troco para ${formatCurrency(parseFloat(changeAmount.replace(',', '.')) || 0)})` : '(Sem troco)'}` :
      paymentMethod === 'credit' ? 'Cartão de Crédito na Entrega' : 'Cartão de Débito na Entrega'
    }\n`;

    if (savedOrder.notes) {
      msg += `\n📝 *Observações:* ${savedOrder.notes}\n`;
    }

    const whatsappUrl = `https://wa.me/${normalizePhone(storePhoneCleaned)}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    onOrderCompleted(savedOrder);
    onClose();
    idempotencyRef.current = crypto.randomUUID();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar seu pedido. Seu carrinho foi preservado.');
    } finally { submittingRef.current = false; setIsSubmitting(false); }
  };

  useDialog(isOpen, onClose);
  if (!isOpen) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Finalizar pedido" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 70,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: 22,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
          color: '#ffffff'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              Finalizar Pedido
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.9)', margin: '2px 0 0' }}>
              Alfa Salgados • Conclua em poucas etapas
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 34,
              height: 34,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmitOrder} style={{ overflowY: 'auto', flexGrow: 1, padding: '20px 24px' }}>
          {/* Saved customer shortcut */}
          {savedData && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 12,
              marginBottom: 18
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
                <BookmarkCheck size={16} />
                <span>Encontramos dados do seu último pedido ({savedData.name})</span>
              </div>
              <button
                type="button"
                onClick={handleUseSavedData}
                style={{
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Preencher
              </button>
            </div>
          )}

          {/* ETAPA 1 – CLIENTE (SECTION 9) */}
          <div style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={16} style={{ color: 'var(--color-primary)' }} />
              1. Seus Dados
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', borderRadius: 10, fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  WhatsApp / Celular *
                </label>
                <input
                  type="text"
                  required
                  placeholder="(77) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                  className="form-input"
                  style={{ width: '100%', borderRadius: 10, fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </div>

          {/* ETAPA 2 – ENTREGA OU RETIRADA (SECTION 9 & 10) */}
          <div style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bike size={16} style={{ color: 'var(--color-primary)' }} />
              2. Como deseja receber?
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: deliveryType === 'delivery' ? '2px solid var(--color-primary)' : '1px solid #cbd5e1',
                  background: deliveryType === 'delivery' ? '#fff1f2' : '#f8fafc',
                  color: deliveryType === 'delivery' ? 'var(--color-primary-dark)' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                <Bike size={18} />
                <span>Entrega em Domicílio</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('pickup')}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: deliveryType === 'pickup' ? '2px solid var(--color-primary)' : '1px solid #cbd5e1',
                  background: deliveryType === 'pickup' ? '#fff1f2' : '#f8fafc',
                  color: deliveryType === 'pickup' ? 'var(--color-primary-dark)' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                <Store size={18} />
                <span>Retirar no Balcão</span>
              </button>
            </div>

            {deliveryType === 'delivery' ? (
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 14, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      CEP (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="45000-000"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      onBlur={handleCepBlur}
                      className="form-input"
                      style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Bairro de Entrega *
                    </label>
                    <select
                      required
                      value={selectedNeighborhoodId}
                      onChange={(e) => setSelectedNeighborhoodId(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
                    >
                      <option value="">Selecione seu bairro...</option>
                      {availableNeighborhoods.map(n => (
                        <option key={n.id} value={n.id}>
                          {n.name} — Taxa: {formatCurrency(n.delivery_fee)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Rua / Avenida *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Rua das Flores"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Número *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nº"
                      value={addressNumber}
                      onChange={(e) => setAddressNumber(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Complemento (Apto, Bloco)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Apto 102"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Ponto de Referência
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Próximo à padaria"
                      value={referencePoint}
                      onChange={(e) => setReferencePoint(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '0.88rem', color: '#475569' }}>
                <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                  Retirada no Balcão da Alfa Salgados:
                </p>
                <p style={{ margin: 0 }}>
                  {settings.store_address}, {settings.store_address_number} - {settings.store_neighborhood}
                </p>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                  Tempo estimado de preparo: ~{settings.pickup_time_estimate || '30 min'}
                </p>
              </div>
            )}
          </div>

          {/* ETAPA 3 – AGENDAMENTO (SECTION 12) */}
          <div style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} style={{ color: 'var(--color-primary)' }} />
              3. Horário do Pedido
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setScheduleType('now')}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: scheduleType === 'now' ? '2px solid var(--color-primary)' : '1px solid #cbd5e1',
                  background: scheduleType === 'now' ? '#fff1f2' : '#f8fafc',
                  color: scheduleType === 'now' ? 'var(--color-primary-dark)' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                ⚡ Entregar Agora (~{settings.delivery_time_estimate || '40 min'})
              </button>

              <button
                type="button"
                onClick={() => setScheduleType('scheduled')}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: scheduleType === 'scheduled' ? '2px solid var(--color-primary)' : '1px solid #cbd5e1',
                  background: scheduleType === 'scheduled' ? '#fff1f2' : '#f8fafc',
                  color: scheduleType === 'scheduled' ? 'var(--color-primary-dark)' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                📅 Agendar Pedido / Festa
              </button>
            </div>

            {scheduleType === 'scheduled' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Data da Entrega
                  </label>
                  <input
                    type="date"
                    required
                    min={localDate()}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                    Horário Desejado
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ETAPA 4 – FORMA DE PAGAMENTO (SECTION 11) */}
          <div style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Banknote size={16} style={{ color: 'var(--color-primary)' }} />
              4. Forma de Pagamento
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                disabled={!settings.payment_pix}
                onClick={() => setPaymentMethod('pix')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: paymentMethod === 'pix' ? '2px solid var(--color-primary)' : '1px solid #cbd5e1',
                  background: paymentMethod === 'pix' ? '#fff1f2' : '#f8fafc',
                  color: paymentMethod === 'pix' ? 'var(--color-primary-dark)' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer'
                }}
              >
                <QrCode size={18} />
                <span>PIX</span>
              </button>

              <button
                type="button"
                disabled={!settings.payment_cash}
                onClick={() => setPaymentMethod('cash')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: paymentMethod === 'cash' ? '2px solid var(--color-primary)' : '1px solid #cbd5e1',
                  background: paymentMethod === 'cash' ? '#fff1f2' : '#f8fafc',
                  color: paymentMethod === 'cash' ? 'var(--color-primary-dark)' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer'
                }}
              >
                <Banknote size={18} />
                <span>Dinheiro</span>
              </button>

              <button
                type="button"
                disabled={!settings.payment_credit}
                onClick={() => setPaymentMethod('credit')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: paymentMethod === 'credit' ? '2px solid var(--color-primary)' : '1px solid #cbd5e1',
                  background: paymentMethod === 'credit' ? '#fff1f2' : '#f8fafc',
                  color: paymentMethod === 'credit' ? 'var(--color-primary-dark)' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer'
                }}
              >
                <CreditCard size={18} />
                <span>Cartão Crédito</span>
              </button>

              <button
                type="button"
                disabled={!settings.payment_debit}
                onClick={() => setPaymentMethod('debit')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: paymentMethod === 'debit' ? '2px solid var(--color-primary)' : '1px solid #cbd5e1',
                  background: paymentMethod === 'debit' ? '#fff1f2' : '#f8fafc',
                  color: paymentMethod === 'debit' ? 'var(--color-primary-dark)' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer'
                }}
              >
                <CreditCard size={18} />
                <span>Cartão Débito</span>
              </button>
            </div>

            {/* PIX instructions */}
            {paymentMethod === 'pix' && (
              <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 12, border: '1px solid #bbf7d0', marginBottom: 12 }}>
                <p style={{ fontSize: '0.82rem', color: '#166534', margin: '0 0 6px', fontWeight: 700 }}>
                  Chave PIX da Loja ({settings.pix_recipient_name || 'Alfa Salgados'}):
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ background: '#ffffff', padding: '6px 12px', borderRadius: 8, fontSize: '0.88rem', border: '1px solid #86efac', flexGrow: 1 }}>
                    {settings.pix_key || '58990735000190'}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Copy size={14} />
                    <span>{pixCopied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Cash change questions */}
            {paymentMethod === 'cash' && (
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 12 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: '0 0 8px' }}>
                  Precisa de troco?
                </p>
                <div style={{ display: 'flex', gap: 12, marginBottom: needsChange ? 10 : 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="needsChange"
                      checked={!needsChange}
                      onChange={() => setNeedsChange(false)}
                    />
                    <span>Não preciso de troco</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="needsChange"
                      checked={needsChange}
                      onChange={() => setNeedsChange(true)}
                    />
                    <span>Sim, preciso de troco</span>
                  </label>
                </div>

                {needsChange && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Troco para quanto? (Ex: 50,00 ou 100,00)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 100,00"
                      value={changeAmount}
                      onChange={(e) => setChangeAmount(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', borderRadius: 8, fontSize: '0.88rem' }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CUPOM DE DESCONTO */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
              Cupom de Desconto
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Ex: ALFA10"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="form-input"
                style={{ flexGrow: 1, borderRadius: 8, fontSize: '0.88rem', textTransform: 'uppercase' }}
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Aplicar
              </button>
            </div>
            {couponError && (
              <span style={{ fontSize: '0.75rem', color: '#dc2626', display: 'block', marginTop: 4, fontWeight: 600 }}>
                {couponError}
              </span>
            )}
            {appliedCoupon && (
              <span style={{ fontSize: '0.75rem', color: '#16a34a', display: 'block', marginTop: 4, fontWeight: 700 }}>
                ✓ Cupom {appliedCoupon.code} aplicado com sucesso! (-{formatCurrency(appliedCoupon.discount)})
              </span>
            )}
          </div>

          {/* ETAPA 5 – RESUMO DO PEDIDO (SECTION 13) */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: 16,
            marginBottom: 20
          }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
              Resumo do Pedido ({cart.length} itens)
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Subtotal dos Produtos</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {deliveryType === 'delivery' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Taxa de Entrega ({selectedNeighborhood?.name || 'Bairro'})</span>
                  <span>{appliedCoupon?.freeShipping ? 'GRÁTIS' : formatCurrency(deliveryFee)}</span>
                </div>
              )}

              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
                  <span>Desconto Cupom ({appliedCoupon?.code})</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 8,
                marginTop: 6,
                borderTop: '1px solid #cbd5e1',
                fontSize: '1.15rem',
                fontWeight: 900,
                color: 'var(--color-primary-dark)'
              }}>
                <span>TOTAL A PAGAR</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {formError && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              color: '#b91c1c',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16
            }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {/* Confirm Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 14,
              fontSize: '1.05rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 8px 25px var(--color-primary-glow)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            <span>{isSubmitting ? 'REGISTRANDO PEDIDO...' : 'CONFIRMAR PEDIDO'}</span>
            <ArrowRight size={18} />
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.74rem', color: '#64748b', marginTop: 10 }}>
            🔒 Seu pedido é registrado com segurança em nosso sistema antes de abrir o WhatsApp.
          </p>
        </form>
      </div>
    </div>
  );
};
