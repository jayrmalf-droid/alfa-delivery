import { normalizeAdminSearch } from '../../domain/adminInput';
import { useDialog } from '../../utils/useDialog';
import { quote, fetchLoyaltyStatus } from '../../services/api';
import { normalizePhone, localDate, cents } from '../../domain/rules';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CartItem, StoreSettings, Neighborhood, Order, DeliveryType, PaymentMethod, LoyaltyStatus } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import confetti from 'canvas-confetti';
import { LoyaltyCard } from './LoyaltyCard';
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

  // Loyalty Program State (Clube 10 Pedidos com Travas de Margem)
  const [loyaltyStatus, setLoyaltyStatus] = useState<LoyaltyStatus | null>(null);
  const [isLoyaltyRewardApplied, setIsLoyaltyRewardApplied] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);

  useEffect(() => {
    const rawDigits = customerPhone.replace(/\D/g, '');
    if (rawDigits.length >= 10 && settings.loyalty_enabled !== false) {
      let isMounted = true;
      fetchLoyaltyStatus(rawDigits)
        .then(res => {
          if (isMounted) setLoyaltyStatus(res);
        })
        .catch(() => {
          if (isMounted) setLoyaltyStatus(null);
        });
      return () => { isMounted = false; };
    } else {
      setLoyaltyStatus(null);
      setIsLoyaltyRewardApplied(false);
    }
  }, [customerPhone, settings.loyalty_enabled]);

  const handleToggleLoyaltyReward = async () => {
    if (!loyaltyStatus?.has_reward) return;
    setCouponError(null);
    setLoyaltyError(null);
    if (isLoyaltyRewardApplied) {
      setIsLoyaltyRewardApplied(false);
      setServerQuote(null);
      return;
    }

    try {
      setAppliedCoupon(null);
      setCouponCode('');
      const result = await quote({
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, selections: i.selectedOptions, notes: i.notes })),
        delivery_type: deliveryType,
        neighborhood_id: selectedNeighborhoodId,
        customer_phone: customerPhone,
        apply_loyalty_reward: true
      });
      setServerQuote(result);
      setIsLoyaltyRewardApplied(true);
    } catch (err) {
      setIsLoyaltyRewardApplied(false);
      setLoyaltyError(err instanceof Error ? err.message : 'Não foi possível resgatar a recompensa.');
    }
  };

  const [notes, setNotes] = useState('');
  const [pixCopied, setPixCopied] = useState(false);
  const errorRef=useRef<HTMLDivElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(()=>{if(formError){errorRef.current?.focus();errorRef.current?.scrollIntoView({block:'nearest'});}},[formError]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverQuote, setServerQuote] = useState<{ subtotal:number; delivery_fee:number; discount_value:number; total:number } | null>(null);
  const submittingRef = useRef(false);
  const idempotencyRef = useRef(crypto.randomUUID());
  useEffect(() => { if (!submittingRef.current) idempotencyRef.current = crypto.randomUUID(); }, [cart, deliveryType, selectedNeighborhoodId, paymentMethod, scheduleDate, scheduleTime, couponCode, isLoyaltyRewardApplied]);
  useEffect(() => { setAppliedCoupon(null); setServerQuote(null); setIsLoyaltyRewardApplied(false); }, [cart, customerPhone, deliveryType, selectedNeighborhoodId]);

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
    setLoyaltyError(null);
    setIsLoyaltyRewardApplied(false);
    try {
      const result = await quote({ items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, selections: i.selectedOptions, notes: i.notes })), delivery_type: deliveryType, neighborhood_id: selectedNeighborhoodId, customer_phone: customerPhone, coupon_code: couponCode });
      setServerQuote(null);
      setAppliedCoupon({ code: result.coupon_code, discount: result.discount_value, freeShipping: result.delivery_fee === 0 });
    } catch (error) { setAppliedCoupon(null); setCouponError(error instanceof Error ? error.message : 'Não foi possível aplicar o cupom.'); }
  };

  // Search in neighborhood dropdown
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');
  const filteredNeighborhoods = useMemo(() => {
    if (!neighborhoodSearch.trim()) return availableNeighborhoods;
    const term = normalizeAdminSearch(neighborhoodSearch);
    return availableNeighborhoods.filter(n => normalizeAdminSearch(n.name).includes(term));
  }, [availableNeighborhoods, neighborhoodSearch]);

  // Quick change chips helper
  const handleQuickChange = (amount: number | 'none') => {
    if (amount === 'none') {
      setNeedsChange(false);
      setChangeAmount('');
    } else {
      setNeedsChange(true);
      setChangeAmount(`${amount},00`);
    }
    setFormError(null);
  };

  // Copy Pix Key with microinteraction feedback
  const handleCopyPix = async () => {
    try {
      const key = settings.pix_key || '58990735000190';
      await navigator.clipboard.writeText(key);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3500);
    } catch {
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3500);
    }
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
      coupon_code: isLoyaltyRewardApplied ? 'CLUBE_FIDELIDADE' : (appliedCoupon ? appliedCoupon.code : null),
      apply_loyalty_reward: isLoyaltyRewardApplied,
      used_loyalty_reward: isLoyaltyRewardApplied,
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
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) confetti.create(undefined, { resize: true, useWorker: false })({
        disableForReducedMotion: true,
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
    if (discount > 0) {
      if (isLoyaltyRewardApplied) {
        msg += `*Desconto:* -${formatCurrency(discount)} (🎉 Clube Fidelidade por Pontos)\n`;
      } else {
        msg += `*Desconto:* -${formatCurrency(discount)} (${appliedCoupon?.code})\n`;
      }
    }
    if (savedOrder.loyalty_points_earned > 0) {
      msg += `⭐ *Clube de Pontos:* +${savedOrder.loyalty_points_earned} pontos neste pedido!\n`;
    }
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Finalizar pedido"
      className="checkout-modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="checkout-modal-sheet animate-fade-in">
        {/* Header */}
        <div className="checkout-modal-header">
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
            aria-label="Fechar"
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

        {/* Form with Scrollable Body and Sticky Footer */}
        <form onSubmit={handleSubmitOrder} className="checkout-modal-form">
          <div className="checkout-modal-scroll-body">
            <nav className="checkout-section-nav" aria-label="Etapas para finalizar o pedido">{['Identificação','Entrega ou retirada','Pagamento'].map((label,index)=><button type="button" key={label} onClick={()=>{const section=document.getElementById(`checkout-step-${index+1}`);section?.scrollIntoView({block:'start',behavior:'auto'});section?.focus({preventScroll:true});}}><span>{index+1}</span>{label}</button>)}</nav>
            <p className="checkout-required-help">Preencha os campos com * e confira o total antes de confirmar.</p>
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

          {/* CARD 1 – IDENTIFICAÇÃO */}
          <div id="checkout-step-1" tabIndex={-1} className="checkout-step-card">
            <h3 className="checkout-step-title">
              <User size={18} className="text-primary" />
              <span>1. Identificação</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <div>
                <label className="checkout-field-label" htmlFor="checkout-field-1">
                  Nome Completo *
                </label>
                <input id="checkout-field-1"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Seu nome"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', borderRadius: 10, fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label className="checkout-field-label" htmlFor="checkout-field-2">
                  WhatsApp / Celular *
                </label>
                <input id="checkout-field-2"
                  type="tel"
                  autoComplete="tel-national"
                  inputMode="tel"
                  required
                  placeholder="(77) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                  className="form-input"
                  style={{ width: '100%', borderRadius: 10, fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {loyaltyStatus && (
              <div style={{ marginTop: 14 }}>
                <LoyaltyCard
                  loyalty={loyaltyStatus}
                  currentOrderSubtotal={subtotal}
                  compact={false}
                  onApplyReward={loyaltyStatus.has_reward ? handleToggleLoyaltyReward : undefined}
                  isRewardApplied={isLoyaltyRewardApplied}
                />
              </div>
            )}
          </div>

          {/* CARD 2 – TIPO E ENDEREÇO */}
          <div id="checkout-step-2" tabIndex={-1} className="checkout-step-card">
            <h3 className="checkout-step-title">
              <Bike size={18} className="text-primary" />
              <span>2. Tipo e Endereço</span>
            </h3>

            {/* Segmented Control */}
            <div className="segmented-control" role="group" aria-label="Tipo de entrega">
              <button
                type="button"
                className={`segmented-btn ${deliveryType === 'delivery' ? 'active' : ''}`}
                aria-pressed={deliveryType==='delivery'}
                onClick={() => setDeliveryType('delivery')}
              >
                <Bike size={18} />
                <span>Entrega em Domicílio</span>
              </button>

              <button
                type="button"
                className={`segmented-btn ${deliveryType === 'pickup' ? 'active' : ''}`}
                aria-pressed={deliveryType==='pickup'}
                onClick={() => setDeliveryType('pickup')}
              >
                <Store size={18} />
                <span>Retirada no Balcão</span>
              </button>
            </div>

            {deliveryType === 'delivery' ? (
              <div className="checkout-delivery-panel">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  <div>
                    <label className="checkout-field-label" htmlFor="checkout-field-3">
                      CEP (opcional para preenchimento)
                    </label>
                    <input id="checkout-field-3"
                      type="text"
                      autoComplete="postal-code"
                      inputMode="numeric"
                      placeholder="45000-000"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      onBlur={handleCepBlur}
                      className="form-input"
                      style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label className="checkout-field-label" htmlFor="checkout-neighborhood">
                      Bairro de Entrega *
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {availableNeighborhoods.length > 6 && (
                        <input
                          type="text"
                          aria-label="Buscar bairro de entrega"
                          placeholder="Buscar bairro..."
                          value={neighborhoodSearch}
                          onChange={e => setNeighborhoodSearch(e.target.value)}
                          className="form-input"
                          style={{ width: '100%', borderRadius: 8, fontSize: '0.82rem', padding: '6px 10px' }}
                        />
                      )}
                      <select id="checkout-neighborhood"
                        required
                        value={selectedNeighborhoodId}
                        onChange={(e) => setSelectedNeighborhoodId(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
                      >
                        <option value="">Selecione seu bairro...</option>
                        {filteredNeighborhoods.map((n: Neighborhood) => (
                          <option key={n.id} value={n.id}>
                            {n.name} — Taxa: {formatCurrency(n.delivery_fee)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 10 }}>
                  <div>
                    <label className="checkout-field-label" htmlFor="checkout-field-4">
                      Rua / Avenida *
                    </label>
                    <input id="checkout-field-4"
                      type="text"
                      required
                      autoComplete="address-line1"
                      placeholder="Ex: Rua das Flores"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label className="checkout-field-label" htmlFor="checkout-field-5">
                      Número *
                    </label>
                    <input id="checkout-field-5"
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
                    <label className="checkout-field-label" htmlFor="checkout-field-6">
                      Complemento (Apto, Bloco)
                    </label>
                    <input id="checkout-field-6"
                      type="text"
                      placeholder="Ex: Apto 102"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label className="checkout-field-label" htmlFor="checkout-field-7">
                      Ponto de Referência
                    </label>
                    <input id="checkout-field-7"
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
              <div className="checkout-pickup-panel">
                <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 4px', fontSize: '0.92rem' }}>
                  Retirada no Balcão da Alfa Salgados:
                </p>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569' }}>
                  {settings.store_address}, {settings.store_address_number} - {settings.store_neighborhood}
                </p>
                <p style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: 4, fontWeight: 700 }}>
                  ⏱️ Tempo estimado de preparo: ~{settings.pickup_time_estimate || '30 min'}
                </p>
              </div>
            )}

            {/* Horário / Agendamento */}
            <div style={{ marginTop: 14 }}>
              <label className="checkout-field-label">
                Horário do Pedido
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <button
                  type="button"
                  className={`schedule-choice-btn ${scheduleType === 'now' ? 'active' : ''}`}
                  aria-pressed={scheduleType==='now'}
                onClick={() => setScheduleType('now')}
                >
                  ⚡ Entregar Agora (~{settings.delivery_time_estimate || '40 min'})
                </button>

                <button
                  type="button"
                  className={`schedule-choice-btn ${scheduleType === 'scheduled' ? 'active' : ''}`}
                  aria-pressed={scheduleType==='scheduled'}
                onClick={() => setScheduleType('scheduled')}
                >
                  📅 Agendar Pedido / Festa
                </button>
              </div>

              {scheduleType === 'scheduled' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div>
                    <label className="checkout-field-label" htmlFor="checkout-field-8">Data da Entrega</label>
                    <input id="checkout-field-8"
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
                    <label className="checkout-field-label" htmlFor="checkout-field-9">Horário Desejado</label>
                    <input id="checkout-field-9"
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
          </div>

          {/* CARD 3 – FORMA DE PAGAMENTO */}
          <div id="checkout-step-3" tabIndex={-1} className="checkout-step-card">
            <h3 className="checkout-step-title">
              <Banknote size={18} className="text-primary" />
              <span>3. Forma de Pagamento</span>
            </h3>

            {/* Seletores em cartões clicáveis */}
            <div className="payment-cards-grid">
              <button
                type="button"
                disabled={!settings.payment_pix}
                aria-pressed={paymentMethod==='pix'}
                onClick={() => setPaymentMethod('pix')}
                className={`payment-choice-card ${paymentMethod === 'pix' ? 'active' : ''}`}
              >
                <QrCode size={22} />
                <strong>PIX</strong>
                <small>Instantâneo</small>
              </button>

              <button
                type="button"
                disabled={!settings.payment_cash}
                aria-pressed={paymentMethod==='cash'}
                onClick={() => setPaymentMethod('cash')}
                className={`payment-choice-card ${paymentMethod === 'cash' ? 'active' : ''}`}
              >
                <Banknote size={22} />
                <strong>Dinheiro</strong>
                <small>Na entrega</small>
              </button>

              <button
                type="button"
                disabled={!settings.payment_credit}
                aria-pressed={paymentMethod==='credit'}
                onClick={() => setPaymentMethod('credit')}
                className={`payment-choice-card ${paymentMethod === 'credit' ? 'active' : ''}`}
              >
                <CreditCard size={22} />
                <strong>Cartão Crédito</strong>
                <small>Maquininha</small>
              </button>

              <button
                type="button"
                disabled={!settings.payment_debit}
                aria-pressed={paymentMethod==='debit'}
                onClick={() => setPaymentMethod('debit')}
                className={`payment-choice-card ${paymentMethod === 'debit' ? 'active' : ''}`}
              >
                <CreditCard size={22} />
                <strong>Cartão Débito</strong>
                <small>Maquininha</small>
              </button>
            </div>

            {/* Microinteração PIX com feedback visual instantâneo */}
            {paymentMethod === 'pix' && (
              <div className="pix-box-panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 800 }}>
                    Chave PIX da Loja ({settings.pix_recipient_name || 'Alfa Salgados'}):
                  </span>
                  {pixCopied && (
                    <span className="pix-copied-feedback">
                      <CheckCircle size={14} /> Chave copiada!
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code className="pix-key-display">
                    {settings.pix_key || '58990735000190'}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className={`btn-copy-pix ${pixCopied ? 'copied' : ''}`}
                  >
                    {pixCopied ? <CheckCircle size={15} /> : <Copy size={15} />}
                    <span>{pixCopied ? 'Copiado!' : 'Copiar Chave'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Dinheiro com Chips Rápidos (R$ 50, R$ 100, Não preciso) */}
            {paymentMethod === 'cash' && (
              <div className="cash-box-panel">
                <p style={{ fontSize: '0.86rem', fontWeight: 800, color: '#334155', margin: '0 0 10px' }}>
                  Precisa de troco? Escolha um chip rápido ou digite o valor:
                </p>

                <div className="quick-change-chips">
                  <button
                    type="button"
                    className={`chip-btn ${!needsChange ? 'active' : ''}`}
                    onClick={() => handleQuickChange('none')}
                  >
                    Não preciso
                  </button>
                  <button
                    type="button"
                    className={`chip-btn ${needsChange && changeAmount === '50,00' ? 'active' : ''}`}
                    onClick={() => handleQuickChange(50)}
                  >
                    R$ 50
                  </button>
                  <button
                    type="button"
                    className={`chip-btn ${needsChange && changeAmount === '100,00' ? 'active' : ''}`}
                    onClick={() => handleQuickChange(100)}
                  >
                    R$ 100
                  </button>
                </div>

                {needsChange && (
                  <div style={{ marginTop: 10 }}>
                    <label className="checkout-field-label" htmlFor="checkout-field-10">
                      Outro valor para troco:
                    </label>
                    <input id="checkout-field-10"
                      type="text"
                      required
                      placeholder="Ex: 80,00"
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
                aria-label="Código do cupom"
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
            {loyaltyError && (
              <span style={{ fontSize: '0.75rem', color: '#dc2626', display: 'block', marginTop: 4, fontWeight: 600 }}>
                {loyaltyError}
              </span>
            )}
            {appliedCoupon && (
              <span style={{ fontSize: '0.75rem', color: '#16a34a', display: 'block', marginTop: 4, fontWeight: 700 }}>
                ✓ Cupom {appliedCoupon.code} aplicado com sucesso! (-{formatCurrency(appliedCoupon.discount)})
              </span>
            )}
            {isLoyaltyRewardApplied && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>
                  🎉 Recompensa do Clube Fidelidade ativa! (-{formatCurrency(discount)})
                </span>
                <button
                  type="button"
                  onClick={() => { setIsLoyaltyRewardApplied(false); setServerQuote(null); }}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.73rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Remover
                </button>
              </div>
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
                  <span>{isLoyaltyRewardApplied ? 'Desconto Clube Fidelidade (50% OFF)' : `Desconto Cupom (${appliedCoupon?.code})`}</span>
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

          </div>

          {/* Sticky Modal Footer */}
          <div className="checkout-modal-footer">
            {formError && (
              <div role="alert" tabIndex={-1} ref={errorRef} className="checkout-form-error" style={{
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 10,
                color: '#b91c1c',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <div className="checkout-footer-total-row">
              <div>
                <span className="checkout-footer-total-label">Total a pagar</span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>
                  {cart.reduce((sum,item)=>sum+item.quantity,0)} {cart.reduce((sum,item)=>sum+item.quantity,0) === 1 ? 'item' : 'itens'} • {deliveryType === 'delivery' ? 'Entrega em domicílio' : 'Retirada no balcão'}
                </span>
              </div>
              <span className="checkout-footer-total-val">{formatCurrency(total)}</span>
            </div>

            <button
              type="submit"
              aria-busy={isSubmitting}
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '15px',
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

            <p style={{ textAlign: 'center', fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
              🔒 Pedido registrado com segurança em nosso sistema.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
