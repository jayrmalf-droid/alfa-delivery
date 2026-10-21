import { Feedback, useFeedback } from '../common/Feedback';
import { parseMoneyInput, parseOptionalMoneyInput, matchesCustomerSearch, matchesSalesView, type SalesViewFilter } from '../../domain/adminInput';
import { receivableTotal, customerDebt, saleBalance } from '../../domain/receivables';
import { businessDate, formatBusinessDate, formatBusinessDateTime } from '../../domain/businessDates';
import { useConfirmedSave } from '../../utils/useConfirmedSave';
import React, { useMemo, useState } from 'react';
import { BadgeDollarSign, Plus, Search, ShoppingCart, Wallet, CheckCircle2, UserRound, CreditCard, CircleDollarSign } from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { formatCurrency } from '../../utils/formatters';
import type { Product } from '../../types';

type SaleItem = { product_id: string; name: string; quantity: number; unit_price: number; subtotal: number };
type Sale = { id: string; customer_id?: string; customer_name: string; customer_phone: string; items: SaleItem[]; subtotal?: number; discount_value?: number; total: number; paid_amount: number; payment_status: 'paid'|'open'|'partial'|'cancelled'; payment_method: string; due_date?: string; created_at: string; payments: {id:string;amount:number;method:string;created_at:string}[]; notes?: string; cancellation_reason?: string; cancelled_at?: string };
type CustomerProfile = {id:string;name:string;phone:string;credit_limit:number;notes?:string;created_at:string};
const money = (n:number) => formatCurrency(n || 0);
const newId = () => globalThis.crypto?.randomUUID?.() || `sale_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

export const SalesTab: React.FC<{ products: Product[] }> = ({ products }) => {
  const { saving, saveError, runSave } = useConfirmedSave();
  const [revision, setRevision] = useState(0);
  const sales = StorageService.getSales() as Sale[];
  const profiles = StorageService.getCustomerProfiles() as CustomerProfile[];
  const availableProducts = products.filter(p => p.available && !p.is_archived);
  const [query, setQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<SalesViewFilter>('all');
  const [ledgerSort, setLedgerSort] = useState('recent');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [discountInput, setDiscountInput] = useState('0');
  const [discountType, setDiscountType] = useState<'fixed'|'percentage'>('fixed');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [isFiado, setIsFiado] = useState(false);
  const [initialPayment, setInitialPayment] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const {message,setMessage}=useFeedback();
  const [paymentFor, setPaymentFor] = useState<Sale | null>(null);
  const {message:paymentMessage,setMessage:setPaymentMessage}=useFeedback();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Dinheiro');

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const parsedDiscount=parseOptionalMoneyInput(discountInput);
  const parsedEntry=parseOptionalMoneyInput(initialPayment);
  const parsedLimit=parseOptionalMoneyInput(creditLimit);
  const requestedDiscount = parsedDiscount ?? 0;
  const discountValue = Math.min(subtotal, discountType === 'percentage' ? subtotal * Math.min(100, requestedDiscount) / 100 : requestedDiscount);
  const total = Number(Math.max(0, subtotal - discountValue).toFixed(2));
  const openSales = sales.filter(s => s.payment_status !== 'paid' && s.payment_status !== 'cancelled');
  const today = businessDate();
  const receivedToday = sales.filter(s => s.payment_status !== 'cancelled').reduce((sum, sale) => sum + (sale.payments || []).filter(p => businessDate(p.created_at) === today).reduce((n,p) => n + p.amount, 0), 0);
  const totalReceivable = receivableTotal(openSales);
  const ledgerFilters: {id: SalesViewFilter; label: string}[] = [{id:'all',label:'Todas'},{id:'open',label:'Em aberto'},{id:'overdue',label:'Vencidas'},{id:'paid',label:'Quitadas'},{id:'cancelled',label:'Canceladas'}];
  const filteredSales = useMemo(() => sales.filter(s => matchesCustomerSearch(s.customer_name, s.customer_phone, query, s.id) && matchesSalesView(s, viewFilter, today)).sort((a,b) => ledgerSort === 'balance' ? saleBalance(b)-saleBalance(a) : ledgerSort === 'oldest' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)), [sales, query, viewFilter, ledgerSort, today, revision]);
  const clearLedgerFilters = () => { setQuery(''); setViewFilter('all'); setLedgerSort('recent'); };
  const selectedCustomer = profiles.find(c => c.id === customerId);

  const chooseCustomer = (id:string) => {
    setCustomerId(id);
    const c = profiles.find(x => x.id === id);
    setCustomerName(c?.name || ''); setCustomerPhone(c?.phone || ''); setCreditLimit(c ? String(c.credit_limit || 0) : '');
  };
  const addItem = () => {
    const product = availableProducts.find(p => p.id === productId);
    const qty = Number(quantity);
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 999) { setMessage('Selecione um produto e uma quantidade válida.'); return; }
    const price = Number(product.promo_price || product.price);
    setItems(prev => { const existing = prev.find(i => i.product_id === product.id); return existing ? prev.map(i => i.product_id === product.id ? {...i,quantity:i.quantity+qty,subtotal:(i.quantity+qty)*i.unit_price} : i) : [...prev,{product_id:product.id,name:product.name,quantity:qty,unit_price:price,subtotal:price*qty}]; });
    setProductId(''); setQuantity('1'); setMessage('');
  };
  const saveSale = async () => {
    const name = customerName.trim(); const phone = customerPhone.replace(/\D/g,'');
    if (!name || phone.length < 10 || items.length === 0 || total <= 0) { setMessage('Informe cliente, telefone e pelo menos um produto.'); return; }
    if(parsedDiscount===null){setMessage('Informe um desconto válido com até duas casas decimais. Ex.: 10,50.');return;}
    if(parsedLimit===null){setMessage('Informe um limite de fiado válido. Ex.: 1.250,50.');return;}
    const paid = isFiado ? parsedEntry : total;
    if (paid===null || paid < 0 || paid > total) { setMessage('O valor recebido deve estar entre R$ 0,00 e o total da venda.'); return; }
    const normalizedPhone = phone;
    const existingDebt = customerDebt(sales, normalizedPhone);
    const proposedDebt = Math.max(0, total-paid);
    const requestedLimit = parsedLimit;
    if (isFiado && requestedLimit > 0 && existingDebt + proposedDebt > requestedLimit + 0.001) { setMessage(`Venda não registrada: o saldo de fiado ultrapassaria o limite de ${money(requestedLimit)}. Saldo atual: ${money(existingDebt)}.`); return; }
    let customer = profiles.find(c => c.id === customerId) || profiles.find(c => c.phone.replace(/\D/g,'') === normalizedPhone);
    const nextProfiles = [...profiles];
    if (!customer) { customer = {id:newId(),name,phone:customerPhone.trim(),credit_limit:requestedLimit,created_at:new Date().toISOString()}; nextProfiles.push(customer); }
    else if (customer.name !== name || customer.phone !== customerPhone.trim() || customer.credit_limit !== requestedLimit) {
      const updated = {...customer,name,phone:customerPhone.trim(),credit_limit:requestedLimit};
      nextProfiles.splice(nextProfiles.findIndex(c=>c.id===customer!.id), 1, updated); customer=updated;
    }
    const now = new Date().toISOString();
    const status: Sale['payment_status'] = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'open';
    if (status !== 'paid' && dueDate && dueDate < businessDate(now)) { setMessage('A data de vencimento não pode estar no passado.'); return; }
    const sale: Sale = {id:newId(),customer_id:customer.id,customer_name:name,customer_phone:customerPhone.trim(),items,subtotal:Number(subtotal.toFixed(2)),discount_value:Number(discountValue.toFixed(2)),total:Number(total.toFixed(2)),paid_amount:Number(paid.toFixed(2)),payment_status:status,payment_method:isFiado?(paid>0?paymentMethod:'Fiado'):paymentMethod,due_date:dueDate||undefined,created_at:now,payments:paid>0?[{id:newId(),amount:Number(paid.toFixed(2)),method:paymentMethod,created_at:now}]:[],notes:notes.trim()||undefined};
    setMessage('');
    if (!await runSave(async () => {
      if (JSON.stringify(nextProfiles) !== JSON.stringify(profiles)) await StorageService.saveCustomerProfiles(nextProfiles);
      await StorageService.saveSales([sale,...sales]);
    })) return;
    setItems([]); setCustomerId(''); setCustomerName(''); setCustomerPhone(''); setCreditLimit(''); setInitialPayment('0'); setDueDate(''); setNotes(''); setIsFiado(false); setDiscountInput('0'); setDiscountType('fixed'); setMessage('Venda registrada com sucesso.','success'); setRevision(v=>v+1);
  };
  const cancelSale = async (sale: Sale) => {
    if (sale.payment_status === 'cancelled') return;
    if (sale.paid_amount > 0) { setMessage('Por segurança, não é possível cancelar por aqui uma venda que já teve recebimento. Registre o estorno/ajuste financeiro antes.'); return; }
    const reason = window.prompt('Motivo do cancelamento da venda:');
    if (!reason?.trim()) return;
    if (!window.confirm(`Confirmar cancelamento da venda de ${sale.customer_name} no valor de ${money(sale.total)}?`)) return;
    const updated = {...sale, payment_status: 'cancelled' as const, cancellation_reason: reason.trim().slice(0,200), cancelled_at: new Date().toISOString()};
    setMessage('');
    if (!await runSave(() => StorageService.saveSales(sales.map(item => item.id === sale.id ? updated : item)))) return;
    setMessage('Venda cancelada. O registro foi mantido no histórico.','success'); setRevision(v=>v+1);
  };

  const receivePayment = async () => {
    if (!paymentFor) return;
    const amount = parseMoneyInput(paymentAmount);
    const balance = Math.max(0,paymentFor.total-paymentFor.paid_amount);
    if (amount===null || amount <= 0 || amount > balance + 0.001) { setPaymentMessage('Informe um pagamento maior que zero e até o saldo pendente, com até duas casas decimais.'); return; }
    const paid = Number((paymentFor.paid_amount+amount).toFixed(2));
    const updated:Sale = {...paymentFor,paid_amount:paid,payment_status:paid >= paymentFor.total-0.001?'paid':'partial',payments:[...(paymentFor.payments||[]),{id:newId(),amount:Number(amount.toFixed(2)),method:paymentType,created_at:new Date().toISOString()}]};
    setMessage('');
    if (!await runSave(() => StorageService.saveSales(sales.map(s=>s.id===updated.id?updated:s)))) return;
    setPaymentFor(null); setPaymentAmount(''); setMessage('Recebimento registrado.','success'); setRevision(v=>v+1);
  };

  return <fieldset disabled={saving} aria-busy={saving} className="confirmed-save-fields">{saveError && <p role="alert" className="confirmed-save-error">{saveError}</p>}{saving && <p role="status">Aguardando confirmação de gravação…</p>}<div className="sales-workspace sales-074 sales-layout-085">
    <header className="sales-heading admin-section-heading"><div><span className="sales-eyebrow">OPERAÇÃO DE CAIXA</span><h2>Venda rápida e fiado</h2><p>Registre vendas presenciais e acompanhe os valores a receber sem misturar com os pedidos online.</p></div><div className="sales-heading-icon"><BadgeDollarSign size={27}/></div></header>
    <div className="sales-kpis"><div className="sales-kpi"><span>Vendas avulsas</span><strong>{sales.filter(s=>s.payment_status!=='cancelled').length}</strong><small>vendas válidas no histórico</small></div><div className="sales-kpi"><span>Recebido hoje</span><strong>{money(receivedToday)}</strong><small>entradas registradas na data de hoje</small></div><div className="sales-kpi sales-kpi-warning"><span>Total a receber</span><strong>{money(totalReceivable)}</strong><small>saldo devedor atual</small></div></div>
    <div className="sales-columns">
      <section className="sales-panel sales-new-sale"><div className="sales-panel-title"><div><h3><ShoppingCart size={18}/> Nova venda</h3><p>Preencha o cliente e adicione os itens.</p></div><span className="sales-step">01 / VENDA</span></div>
        <section className="sales-form-section"><h4><span>1</span> Cliente</h4>
        <div className="sales-form-grid"><label>Cliente cadastrado<select className="form-input" value={customerId} onChange={e=>chooseCustomer(e.target.value)} data-admin-ui="field"><option value="">Novo cliente / cadastro rápido</option>{profiles.map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select></label>
          <label>Nome do cliente<input className="form-input" value={customerName} onChange={e=>setCustomerName(e.target.value)} maxLength={100} placeholder="Nome completo"  data-admin-ui="field"/></label>
          <label>Telefone / WhatsApp<input className="form-input" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} maxLength={20} placeholder="(77) 99999-9999"  data-admin-ui="field"/></label>
          <label>Limite de fiado (R$)<input className="form-input" type="text" inputMode="decimal" value={creditLimit} onChange={e=>setCreditLimit(e.target.value)} placeholder="0,00"  data-admin-ui="field"/></label>
        </div>
        {selectedCustomer && <div className="sales-credit-note"><UserRound size={16}/> Cliente selecionado · Limite cadastrado: <b>{money(selectedCustomer.credit_limit)}</b></div>}
        </section>
        <section className="sales-form-section"><h4><span>2</span> Produtos e desconto</h4>
        <div className="sales-add-row"><label>Produto<select className="form-input" value={productId} onChange={e=>setProductId(e.target.value)} data-admin-ui="field"><option value="">Selecione um produto</option>{availableProducts.map(p=><option key={p.id} value={p.id}>{p.name} · {money(Number(p.promo_price||p.price))}</option>)}</select></label><label className="sales-qty">Qtd.<input className="form-input" type="number" min="1" max="999" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} data-admin-ui="field"/></label><button type="button" className="sales-add-button" onClick={addItem} data-admin-ui="button"><Plus size={17}/> Adicionar</button></div>
        {items.length>0 && <div className="sales-items">{items.map(item=><div className="sales-item" key={item.product_id}><div><b>{item.name}</b><small>{item.quantity} × {money(item.unit_price)}</small></div><strong>{money(item.subtotal)}</strong><button type="button" aria-label={`Remover ${item.name}`} onClick={()=>setItems(prev=>prev.filter(i=>i.product_id!==item.product_id))} data-admin-ui="button">×</button></div>)}</div>}
        <p className="money-input-help">Valores em reais: 1.250,50 ou 1250.50. Quantidades continuam sendo números inteiros.</p><div className="sales-form-grid sales-discount-fields"><label>Desconto autorizado<select className="form-input" value={discountType} onChange={e=>setDiscountType(e.target.value as 'fixed'|'percentage')} data-admin-ui="field"><option value="fixed">Valor em R$</option><option value="percentage">Percentual (%)</option></select></label><label>Valor do desconto<input className="form-input" type="text" inputMode="decimal" placeholder="Ex.: 10,50" value={discountInput} onChange={e=>setDiscountInput(e.target.value)}  data-admin-ui="field"/></label></div>
        </section>
        <div className="sales-total-summary">
        <div className="sales-total-line"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
        {discountValue > 0 && <div className="sales-total-line sales-discount-line"><span>Desconto ({discountType==='percentage'?`${Math.min(100,requestedDiscount)}%`:'valor fixo'})</span><strong>−{money(discountValue)}</strong></div>}
        <div className="sales-total-line"><span>Total da venda</span><strong>{money(total)}</strong></div>
        </div>
        <section className="sales-form-section"><h4><span>3</span> Pagamento</h4>
        <label className="sales-check"><input type="checkbox" checked={isFiado} onChange={e=>setIsFiado(e.target.checked)}/> Registrar como venda a prazo / fiado</label>
        {isFiado && <div className="sales-form-grid sales-finance-fields"><label>Entrada recebida (R$)<input className="form-input" type="text" inputMode="decimal" placeholder="Ex.: 50,00" value={initialPayment} onChange={e=>setInitialPayment(e.target.value)} data-admin-ui="field"/></label><label>Vencimento (opcional)<input className="form-input" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} data-admin-ui="field"/></label></div>}
        <div className="sales-form-grid"><label>Forma de pagamento{isFiado&&(parsedEntry??0)===0?<select className="form-input" value="Fiado" disabled data-admin-ui="field"><option>Fiado</option></select>:<select className="form-input" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} data-admin-ui="field"><option>Dinheiro</option><option>Pix</option><option>Cartão de débito</option><option>Cartão de crédito</option></select>}</label><label>Observações<input className="form-input" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={300} placeholder="Opcional" data-admin-ui="field"/></label></div>
        {isFiado && (parsedLimit??0)>0 && total-(parsedEntry??0) > (parsedLimit??0) && <div className="sales-alert">Atenção: o saldo desta venda ultrapassa o limite informado para o cliente.</div>}
        </section>
        <Feedback message={message}/>
        <button type="button" className="sales-primary-button" onClick={saveSale} data-admin-ui="button"><CheckCircle2 size={18}/> Registrar venda · {money(total)}</button>
      </section>
      <section className="sales-panel sales-receivables"><div className="sales-panel-title"><div><h3><Wallet size={18}/> Histórico de vendas e recebimentos</h3><p>Consulte as vendas e registre pagamentos parciais ou quitações.</p></div><span className="sales-step">02 / FIADO</span></div>
        <div className="sales-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Buscar contas a receber" placeholder="Buscar cliente, telefone ou venda"  data-admin-ui="field"/></div>
        <div className="ledger-filters" role="group" aria-label="Situação das vendas">{ledgerFilters.map(filter=><button type="button" key={filter.id} aria-pressed={viewFilter===filter.id} onClick={()=>setViewFilter(filter.id)}>{filter.label} <span>{sales.filter(s=>matchesSalesView(s,filter.id,today)).length}</span></button>)}</div>
        <div className="ledger-results"><span role="status">{filteredSales.length} de {sales.length} vendas · Saldo em aberto nesta seleção: <strong>{money(receivableTotal(filteredSales))}</strong></span><label>Ordenar vendas<select value={ledgerSort} onChange={e=>setLedgerSort(e.target.value)}><option value="recent">Mais recentes</option><option value="oldest">Mais antigas</option><option value="balance">Maior saldo</option></select></label>{(query || viewFilter!=='all' || ledgerSort!=='recent')&&<button type="button" onClick={clearLedgerFilters}>Limpar filtros</button>}</div>
        <div className="sales-ledger">{filteredSales.length===0?<div className="sales-empty"><CircleDollarSign size={28}/><b>Nenhuma venda encontrada</b><span>{sales.length ? 'Nenhuma venda corresponde aos filtros selecionados.' : 'As vendas avulsas aparecerão aqui.'}</span></div>:filteredSales.map(sale=>{const balance=saleBalance(sale);return <article className="sales-ledger-item" key={sale.id}><div className="sales-ledger-top"><div><b>{sale.customer_name}</b><small>{sale.customer_phone} · {formatBusinessDate(sale.created_at)}</small></div><span className={`sales-status ${sale.payment_status}`}>{sale.payment_status==='cancelled'?'Cancelada':sale.payment_status==='paid'?'Quitado':sale.payment_status==='partial'?'Parcial':'Em aberto'}</span></div><div className="sales-ledger-amounts"><span>Total <b>{money(sale.total)}</b></span>{(sale.discount_value||0)>0&&<span>Desconto <b>{money(sale.discount_value||0)}</b></span>}<span>Pago <b>{money(sale.paid_amount)}</b></span><span>Saldo <b className={balance>0?'debt':''}>{money(balance)}</b></span></div>{sale.due_date&&sale.payment_status!=='cancelled'&&<small className="sales-due-date">Vencimento: {formatBusinessDate(sale.due_date)}</small>}{sale.payment_status==='cancelled'&&<small className="sales-due-date">Cancelada em {sale.cancelled_at?formatBusinessDateTime(sale.cancelled_at):'—'} · Motivo: {sale.cancellation_reason||'Não informado'}</small>}<div className="sales-ledger-bottom"><span>{sale.items.map(i=>`${i.quantity}× ${i.name}`).join(', ')}</span>{sale.payment_status!=='cancelled'&&balance>0&&<button type="button" onClick={()=>{setPaymentFor(sale);setPaymentAmount(balance.toFixed(2));setMessage('');setPaymentMessage('');}} data-admin-ui="button">Registrar recebimento</button>}{sale.payment_status!=='cancelled'&&sale.paid_amount===0&&<button type="button" className="sales-cancel-button" onClick={()=>cancelSale(sale)} data-admin-ui="button">Cancelar venda</button>}</div>{paymentFor?.id===sale.id&&<div className="sales-payment-form"><Feedback message={paymentMessage}/><label>Valor recebido (saldo: {money(balance)})<input className="form-input" type="text" inputMode="decimal" placeholder="Ex.: 1.250,50" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} data-admin-ui="field"/></label><label>Meio<select className="form-input" value={paymentType} onChange={e=>setPaymentType(e.target.value)} data-admin-ui="field"><option>Dinheiro</option><option>Pix</option><option>Cartão de débito</option><option>Cartão de crédito</option></select></label><div><button type="button" className="sales-primary-button compact" onClick={receivePayment} data-admin-ui="button">Confirmar recebimento</button><button type="button" className="sales-cancel-button" onClick={()=>setPaymentFor(null)} data-admin-ui="button">Cancelar</button></div></div>}</article>;})}</div>
      </section>
    </div>
    <div className="sales-footnote"><CreditCard size={16}/> Vendas avulsas e pedidos do cardápio são armazenados separadamente. O limite de crédito é um alerta operacional; confirme a política de concessão antes de liberar fiado.</div>
  </div></fieldset>;
};
