import http from 'node:http';
import { publicOffers, bestsellerIds } from './storefront.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { CATALOG_KEYS, validateProductBundle } from './catalog.mjs';
import { normalizePhone, cents, productPrice, openingStatus, localDate, calculateLoyaltyStatus } from './rules.mjs';
import { statusFor, pointsConfig, awardPoints, appendEntry } from './points.mjs';
import { DatabaseAdapter } from './database.mjs';
import { backupDirectory, listBackups, createBackup, isBackupName } from './backups.mjs';

const port = Number(process.env.PORT || 3001);
const production = process.env.NODE_ENV === 'production';
let publicUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '';
if (production && (!process.env.ADMIN_PASSWORD_HASH || !process.env.ADMIN_EMAIL)) {
  throw new Error('Configure o administrador (ADMIN_EMAIL e ADMIN_PASSWORD_HASH) antes de publicar.');
}

const seed = JSON.parse(fs.readFileSync(new URL('./seed.json', import.meta.url), 'utf8'));
const db = new DatabaseAdapter({ seedData: seed });
await db.init();
// Migration for installations created before quick-sale/fiado records existed.
// Only inserts missing records; existing sales and customer profiles remain untouched.
await db.ensureRecord('alfa_expenses', []);
await db.ensureRecord('alfa_cash_closures', []);
await db.ensureRecord('alfa_stock_movements', []);
await db.ensureRecord('alfa_sales_goals', []);
await db.ensureRecord('alfa_loyalty_points', []);
// Atualiza somente a configuração antiga de selos; preserva os demais ajustes do estabelecimento.
const legacySettings = await db.getRecord('alfa_settings');
if (legacySettings && legacySettings.loyalty_points_goal == null) {
  await db.putRecord('alfa_settings', { ...legacySettings,
    loyalty_program_name: legacySettings.loyalty_program_name === 'Clube 10 Pedidos' ? 'Clube de Pontos' : legacySettings.loyalty_program_name,
    loyalty_points_goal: 100, loyalty_points_per_real: 1 });
}
await db.ensureRecord('alfa_sales', Array.isArray(seed.alfa_sales) ? seed.alfa_sales : []);
await db.ensureRecord('alfa_customer_profiles', Array.isArray(seed.alfa_customer_profiles) ? seed.alfa_customer_profiles : []);

// Ensure upload directory exists
const uploadsDir = path.resolve('public/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const hash = value => createHash('sha256').update(value).digest('hex');
const get = async key => db.getRecord(key);
const put = async (key, value) => db.putRecord(key, value);
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function safeEqual(a, b) { const aa = Buffer.from(a), bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }
const allOrders = async () => db.getAllOrders();
const audit = async (action, resource) => db.addAudit(randomUUID(), new Date().toISOString(), action, resource);

async function session(req) {
  // 1. Suporte a cookie alfa_session e __session (exigido pelo Firebase Hosting)
  const cookies = (req.headers.cookie || '').split(';').map(x => x.trim());
  const sessionCookie = cookies.find(x => x.startsWith('__session=')) || cookies.find(x => x.startsWith('alfa_session='));
  let tokenVal = sessionCookie ? sessionCookie.split('=')[1] : null;

  // 2. Suporte a Authorization: Bearer <token> (apenas tokens autenticados e persistidos no banco)
  if (!tokenVal && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    tokenVal = req.headers.authorization.slice(7).trim();
  }

  // 3. Suporte a ?token= na URL para downloads seguros e diretos no navegador
  if (!tokenVal && req.url) {
    try {
      const u = new URL(req.url, 'http://localhost');
      const qToken = u.searchParams.get('token');
      if (qToken) tokenVal = qToken.trim();
    } catch {}
  }

  if (tokenVal) {
    const row = await db.getSession(hash(tokenVal));
    if (row && row.expires > Date.now()) return true;
  }

  // Administrative access is granted only by server-issued, persisted sessions.
  // Decoding a Bearer payload does not authenticate its signature or identity.

  return false;
}

function privateOrder(order) { const copy = { ...order }; delete copy.tracking_token; delete copy.idempotency_key; return copy; }

const limits = new Map();
function rate(req, category, maximum, span = 60000) {
  const key = `${req.socket.remoteAddress}:${category}`; const now = Date.now();
  if (limits.size > 10000) for (const [k, v] of limits) if (v.until < now) limits.delete(k);
  let item = limits.get(key); if (!item || item.until < now) item = { until: now + span, count: 0 }; item.count++; limits.set(key, item);
  if (item.count > maximum) fail('Muitas tentativas. Aguarde um pouco e tente novamente.', 429);
}

async function body(req, maxBytes = 3 * 1024 * 1024) {
  let value = ''; for await (const chunk of req) { value += chunk; if (Buffer.byteLength(value) > maxBytes) fail('Dados excedem o limite permitido.', 413); }
  try { const result = JSON.parse(value || '{}'); if (!result || typeof result !== 'object' || Array.isArray(result)) fail('Formato de dados inválido.'); return result; } catch (e) { if (e.status) throw e; fail('Dados JSON inválidos.'); }
}

const text = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';

async function calculate(payload, submission = false) {
  const settings = await get('alfa_settings');
  const products = await get('alfa_products');
  const categories = await get('alfa_categories');
  const allGroups = await get('alfa_option_groups');
  const groups = allGroups.filter(g => g.is_active !== false);
  const options = await get('alfa_product_options');
  const flavors = await get('alfa_flavors');

  if (payload.apply_loyalty_reward && payload.coupon_code) {
    fail('A recompensa do programa de fidelidade não pode ser combinada com outro cupom de desconto.');
  }

  if (!Array.isArray(payload.items) || !payload.items.length || payload.items.length > 100) fail('Seu carrinho está vazio ou excede o limite de itens.');
  let subtotal = 0; const requested = new Map();
  const items = payload.items.map(item => {
    const product = products.find(p => p.id === item.product_id);
    if (!product || !product.available || product.is_archived || !categories.some(c => c.id === product.category_id && c.is_available)) fail('Um produto não está mais disponível. Atualize o carrinho.');
    const qty = item.quantity; if (!Number.isInteger(qty) || qty < 1 || qty > 999) fail('Quantidade de produto inválida.');
    requested.set(product.id, (requested.get(product.id) || 0) + qty);
    if (product.has_stock_control && requested.get(product.id) > product.stock_quantity) fail(`Estoque insuficiente para ${product.name}.`);
    const selected = Array.isArray(item.selections) ? item.selections : []; if (selected.length > 200) fail('Excesso de adicionais.');
    const seen = new Set();
    const totals = new Map();
    const groupSelections = new Map();

    const selections = selected.map(selection => {
      const count = selection.quantity ?? 1;
      if (!Number.isInteger(count) || count < 1 || count > 999) fail('Quantidade de adicional inválida.');
      const identity = `${selection.groupId}:${selection.optionId}`;
      if (seen.has(identity)) fail('Adicional duplicado.');
      seen.add(identity);

      if (selection.groupId === 'flavors') {
        const flavor = flavors.find(f => f.id === selection.optionId && f.is_active && (!product.available_flavor_ids?.length || product.available_flavor_ids.includes(f.id)));
        if (!flavor || !product.combo_max_qty || count % (product.combo_step || 10) !== 0) fail('Sabor ou quantidade inválidos.');
        totals.set('flavors', (totals.get('flavors') || 0) + count);
        return {
          groupId: 'flavors',
          groupName: 'Sabores escolhidos',
          optionId: flavor.id,
          optionName: `${count}x ${flavor.name}`,
          price: 0,
          unitPrice: 0,
          quantity: count,
          tipo_cobranca: 'soma'
        };
      }

      const group = groups.find(g =>
        g.id === selection.groupId &&
        (g.product_id === product.id ||
         (Array.isArray(g.product_ids) && g.product_ids.includes(product.id)) ||
         (Array.isArray(g.category_ids) && g.category_ids.includes(product.category_id)))
      );
      if (!group) fail('Adicional não pertence a este produto.');

      const option = options.find(o =>
        o.id === selection.optionId &&
        o.group_id === group.id &&
        (o.is_available ?? true) &&
        (o.is_active ?? true) &&
        o.is_paused !== true
      );
      if (!option || count % (group.step || option.step || 1) !== 0) fail('Adicional inválido ou indisponível.');

      if (group.permite_repetir === false && count > 1) {
        fail(`O grupo ${group.name} não permite repetição do mesmo adicional.`);
      }

      totals.set(group.id, (totals.get(group.id) || 0) + count);
      if (!groupSelections.has(group.id)) groupSelections.set(group.id, []);
      groupSelections.get(group.id).push({ option, count, group });

      const unitCents = cents(option.price || 0);
      return {
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: `${count}x ${option.name.replace(/^\d+\s+/, '')}`,
        price: (unitCents * count) / 100,
        unitPrice: unitCents / 100,
        quantity: count,
        tipo_cobranca: group.tipo_cobranca || 'soma'
      };
    });

    let extra = 0;
    for (const [groupId, list] of groupSelections.entries()) {
      const g = groups.find(x => x.id === groupId);
      const tipo = g?.tipo_cobranca || 'soma';
      if (tipo === 'maior_valor') {
        const maxPrice = Math.max(...list.map(item => cents(item.option.price || 0)));
        extra += maxPrice;
      } else if (tipo === 'media') {
        const totalUnits = list.reduce((sum, item) => sum + item.count, 0);
        const sumPrice = list.reduce((sum, item) => sum + (cents(item.option.price || 0) * item.count), 0);
        extra += totalUnits > 0 ? Math.round(sumPrice / totalUnits) : 0;
      } else {
        for (const item of list) {
          extra += cents(item.option.price || 0) * item.count;
        }
      }
    }

    const linkedGroups = groups.filter(g =>
      g.product_id === product.id ||
      (Array.isArray(g.product_ids) && g.product_ids.includes(product.id)) ||
      (Array.isArray(g.category_ids) && g.category_ids.includes(product.category_id))
    );

    for (const group of linkedGroups) {
      const count = totals.get(group.id) || 0;
      const min = group.min_select ?? group.min_options ?? 0;
      const max = group.max_select ?? group.max_options ?? 0;
      if (((group.required ?? group.is_required) || count > 0) && count < min || max > 0 && count > max) fail(`Confira as quantidades de ${group.name}.`);
    }

    if (!linkedGroups.length && product.combo_max_qty && (totals.get('flavors') || 0) !== product.combo_max_qty) fail(`Escolha exatamente ${product.combo_max_qty} salgados.`);

    const unit = cents(productPrice(product)) + extra;
    const itemSubtotal = unit * qty;
    subtotal += itemSubtotal;

    const order_item_addons = selections.map(s => ({
      adicional_id: s.optionId,
      nome_historico: s.optionName,
      preco_unitario_historico: s.unitPrice,
      quantidade: s.quantity,
      subtotal: s.price,
      tipo_cobranca: s.tipo_cobranca || 'soma'
    }));

    return {
      id: randomUUID(),
      product_id: product.id,
      product_name: product.name,
      product_price: productPrice(product),
      unit_price: unit / 100,
      quantity: qty,
      subtotal: itemSubtotal / 100,
      notes: text(item.notes),
      selections,
      order_item_addons
    };
  });
  if (!['pickup', 'delivery'].includes(payload.delivery_type)) fail('Escolha entrega ou retirada.');
  let neighborhood = null, fee = 0;
  if (payload.delivery_type === 'delivery') {
    const neighborhoods = await get('alfa_neighborhoods');
    neighborhood = neighborhoods.find(n => n.id === payload.neighborhood_id && (n.is_available ?? true)); if (!neighborhood) fail('Selecione um bairro atendido pela loja.'); fee = cents(neighborhood.delivery_fee);
  }
  let discount = 0, coupon = null, usedLoyaltyReward = false, loyaltyDiscount = 0;
  if (payload.apply_loyalty_reward && !payload.customer_phone) fail('Informe o telefone para resgatar pontos.');
  if (payload.apply_loyalty_reward && payload.customer_phone) {
    if (settings.loyalty_enabled === false) fail('O programa de fidelidade não está ativo no momento.');
    if (payload.coupon_code) fail('A recompensa do programa de fidelidade não pode ser combinada com outro cupom de desconto.');
    const ledger = await get('alfa_loyalty_points');
    const loyalty = statusFor(ledger, payload.customer_phone, settings);
    if (!loyalty.has_reward) fail('Você ainda não acumulou pontos suficientes para esta recompensa.');
    const rawDisc = Math.round(subtotal * (loyalty.discount_percent / 100));
    const capCents = cents(loyalty.max_discount_value);
    loyaltyDiscount = Math.min(rawDisc, capCents);
    loyaltyDiscount = Math.min(subtotal, Math.max(0, loyaltyDiscount));
    discount += loyaltyDiscount;
    usedLoyaltyReward = true;
  } else if (payload.coupon_code) {
    const coupons = await get('alfa_coupons');
    coupon = coupons.find(c => c.code.toUpperCase() === String(payload.coupon_code).trim().toUpperCase());
    if (!coupon || !coupon.is_active || coupon.expires_at && Date.parse(coupon.expires_at) < Date.now()) fail('Cupom inválido ou expirado.');
    if (subtotal < cents(coupon.min_order_value || 0)) fail('O pedido não atingiu o mínimo para este cupom.');
    if (coupon.max_uses && (coupon.current_uses || 0) >= coupon.max_uses || coupon.is_single_use && (coupon.current_uses || 0) > 0) fail('Limite de uso deste cupom atingido.');
    if (coupon.single_use_per_client) {
      const phone = normalizePhone(payload.customer_phone);
      const orders = await allOrders();
      if (orders.some(o => o.status !== 'cancelled' && o.customer_phone === phone && o.coupon_code === coupon.code)) fail('Este cupom já foi utilizado por este telefone.');
    }
    const amount = coupon.discount_value ?? coupon.value ?? 0;
    discount = (coupon.discount_type || coupon.type) === 'percentage' ? Math.round(subtotal * amount / 100) : cents(amount);
    discount = Math.min(subtotal, Math.max(0, discount)); if (coupon.free_shipping) fee = 0;
  }
  if (subtotal < cents(settings.min_order_value || 0)) fail('O pedido não atingiu o valor mínimo da loja.');
  if (submission) {
    if (!text(payload.customer_name, 100)) fail('Informe seu nome.'); normalizePhone(payload.customer_phone);
    if (!settings[`payment_${payload.payment_method}`] || !['pix', 'cash', 'credit', 'debit'].includes(payload.payment_method)) fail('Forma de pagamento indisponível.');
    if (payload.delivery_type === 'delivery' && (!text(payload.address) || !text(payload.address_number, 30))) fail('Informe rua e número.');
    if (payload.preorder_date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.preorder_date) || !/^\d{2}:\d{2}$/.test(payload.preorder_time || '')) fail('Informe data e horário válidos.');
      const scheduled = new Date(`${payload.preorder_date}T${payload.preorder_time}:00-03:00`);
      if (!Number.isFinite(+scheduled) || localDate(scheduled) !== payload.preorder_date || scheduled <= new Date(Date.now() + 30 * 60000) || !openingStatus({ ...settings, is_open_override: null, is_paused: false }, scheduled).isOpen) fail('Escolha um horário de funcionamento com pelo menos 30 minutos de antecedência.');
      for (const item of items) { const p = products.find(p => p.id === item.product_id); if (p.preorder_days && +scheduled < Date.now() + p.preorder_days * 86400000) fail(`Respeite a antecedência de ${p.name}.`); }
      if (settings.is_paused) fail(settings.pause_message || 'Pedidos pausados.');
    } else {
      if (!openingStatus(settings).isOpen) fail('A loja não recebe pedidos imediatos agora. Escolha um agendamento disponível.');
      if (items.some(i => products.find(p => p.id === i.product_id)?.is_preorder)) fail('Este produto precisa de agendamento.');
    }
    if (payload.payment_method === 'cash' && payload.needs_change && (!Number.isFinite(payload.change_amount) || cents(payload.change_amount) < subtotal + fee - discount)) fail('O valor para troco não pode ser menor que o total.');
  }
  return { items, subtotal: subtotal / 100, delivery_fee: fee / 100, discount_value: discount / 100, total: (subtotal + fee - discount) / 100, coupon_code: coupon?.code || (usedLoyaltyReward ? 'CLUBE_FIDELIDADE' : null), used_loyalty_reward: usedLoyaltyReward, loyalty_discount: loyaltyDiscount / 100, neighborhood, requested, coupon };
}

async function validateRecord(key, value) {
  if (key === 'alfa_settings') {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !text(value.business_name, 100)) fail('Configurações inválidas.');
    normalizePhone(value.whatsapp);
    if (value.loyalty_points_goal != null && (!Number.isInteger(value.loyalty_points_goal) || value.loyalty_points_goal < 1 || value.loyalty_points_goal > 100000)) fail('Meta de pontos inválida.');
    if (value.loyalty_points_per_real != null && (!Number.isInteger(value.loyalty_points_per_real) || value.loyalty_points_per_real < 1 || value.loyalty_points_per_real > 100)) fail('Pontuação por real inválida.');
    if (value.loyalty_discount_percent != null && (!Number.isFinite(value.loyalty_discount_percent) || value.loyalty_discount_percent < 0 || value.loyalty_discount_percent > 100 || (value.loyalty_enabled !== false && value.loyalty_discount_percent === 0))) fail('Desconto de fidelidade inválido. Use um percentual maior que zero e até 100.');
    for (const key of ['loyalty_min_order_value', 'loyalty_max_discount_value']) if (value[key] != null && (!Number.isFinite(value[key]) || value[key] < 0 || (key === 'loyalty_max_discount_value' && value.loyalty_enabled !== false && value[key] === 0))) fail('Confira o valor mínimo e o limite de desconto da fidelidade.');
    if (value.min_order_value != null && (!Number.isFinite(value.min_order_value) || value.min_order_value < 0)) fail('Pedido mínimo inválido.');
    for (const d of Object.values(value.weekly_schedule || {})) {
      if (d && d.isOpen !== false) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.close)) fail('Horário inválido.');
      } else if (d) {
        if (!d.open || !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.open)) d.open = '10:00';
        if (!d.close || !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.close)) d.close = '22:00';
      }
    }
    return;
  }
  if (!Array.isArray(value) || value.length > 5000) fail('Lista inválida.');
  if (key === 'alfa_sales_goals') {
    const months = new Set();
    if (value.length > 240) fail('Limite de metas excedido.');
    for (const goal of value) {
      if (!goal || !/^\d{4}-(0[1-9]|1[0-2])$/.test(goal.month || '') || months.has(goal.month)) fail('Mês de meta inválido ou duplicado.');
      if (!Number.isFinite(goal.amount) || goal.amount <= 0 || goal.amount > 1e9 || Math.abs(goal.amount * 100 - Math.round(goal.amount * 100)) > 0.00001) fail('Valor da meta inválido.');
      months.add(goal.month);
    }
    return;
  }
  if (key === 'alfa_cash_closures') {
    if (!Array.isArray(value) || value.length > 2000) fail('Fechamentos inválidos.');
    const dates = new Set();
    for (const c of value) {
      if (!c || !/^\d{4}-\d{2}-\d{2}$/.test(c.date || '') || !Number.isFinite(Date.parse(c.date + 'T12:00:00Z')) || dates.has(c.date)) fail('Data de fechamento inválida ou duplicada.');
      dates.add(c.date);
      for (const field of ['expected', 'counted', 'difference', 'sales_receipts', 'order_receipts', 'expenses_paid']) {
        if (!Number.isFinite(c[field]) || Math.abs(c[field]) > 1e10) fail('Valor de fechamento inválido.');
      }
      if (Math.abs(Math.round((c.counted - c.expected - c.difference)*100)) > 1) fail('Diferença de fechamento inconsistente.');
      if (!/^\d{4}-\d{2}-\d{2}T/.test(c.closed_at || '') || !text(c.id, 100)) fail('Registro de fechamento inválido.');
      if (c.notes != null && (typeof c.notes !== 'string' || c.notes.length > 500)) fail('Observação muito longa.');
    }
    return;
  }
  if (key === 'alfa_expenses') {
    const ids = new Set();
    for (const e of value) {
      if (!e || typeof e.id !== 'string' || !e.id || ids.has(e.id)) fail('Despesa com ID inválido.');
      ids.add(e.id);
      if (!text(e.description, 160) || !text(e.category, 60)) fail('Informe descrição e categoria.');
      if (!Number.isFinite(e.amount) || e.amount <= 0 || Math.abs(Math.round(e.amount * 100) - e.amount * 100) > 1e-6) fail('Valor da despesa inválido.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.due_date || '') || !Number.isFinite(Date.parse(e.due_date + 'T12:00:00Z'))) fail('Vencimento inválido.');
      if (!['pending','paid','cancelled'].includes(e.status)) fail('Situação inválida.');
      if (e.status === 'paid' && (!/^\d{4}-\d{2}-\d{2}$/.test(e.paid_date || '') || !Number.isFinite(Date.parse(e.paid_date + 'T12:00:00Z')))) fail('Data do pagamento inválida.');
      if (e.status === 'paid' && !text(e.payment_method, 60)) fail('Informe a forma de pagamento.');
    }
    return;
  }
  if (key === 'alfa_sales') {
    const ids = new Set();
    for (const sale of value) {
      if (!sale || typeof sale.id !== 'string' || !sale.id || ids.has(sale.id)) fail('Venda com identificador inválido.');
      ids.add(sale.id);
      if (!text(sale.customer_name, 100) || !text(sale.customer_phone, 30)) fail('Informe nome e telefone do cliente.');
      if (!Number.isFinite(sale.total) || sale.total <= 0 || !Number.isFinite(sale.paid_amount) || sale.paid_amount < 0 || sale.paid_amount > sale.total) fail('Valores da venda inválidos.');
      if (!['paid', 'open', 'partial', 'cancelled'].includes(sale.payment_status)) fail('Situação financeira inválida.');
      if (sale.discount_value != null && (!Number.isFinite(sale.discount_value) || sale.discount_value < 0 || sale.discount_value > sale.total)) fail('Desconto da venda inválido.');
      if (sale.subtotal != null && (!Number.isFinite(sale.subtotal) || sale.subtotal < sale.total)) fail('Subtotal da venda inválido.');
      if (!Array.isArray(sale.items) || sale.items.length < 1 || sale.items.length > 100) fail('Itens da venda inválidos.');
    }
    return;
  }
  if (key === 'alfa_customer_profiles') {
    const ids = new Set();
    const phones = new Set();
    for (const customer of value) {
      const phone = String(customer?.phone || '').replace(/\D/g, '');
      if (!customer || typeof customer.id !== 'string' || !customer.id || ids.has(customer.id)) fail('Cadastro de cliente inválido.');
      if (!text(customer.name, 100) || phone.length < 10 || phone.length > 13 || phones.has(phone)) fail('Nome ou telefone inválido/duplicado.');
      if (customer.credit_limit != null && (!Number.isFinite(customer.credit_limit) || customer.credit_limit < 0)) fail('Limite de crédito inválido.');
      ids.add(customer.id); phones.add(phone);
    }
    return;
  }
  const ids = new Set();
  const categories = await get('alfa_categories');
  for (const item of value) {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) fail('Identificador duplicado ou inválido.'); ids.add(item.id);
    for (const field of ['price', 'promo_price', 'delivery_fee', 'stock_quantity', 'discount_value', 'value', 'min_order_value']) if (item[field] != null && (!Number.isFinite(item[field]) || item[field] < 0)) fail('Valor numérico inválido.');
    if (key === 'alfa_products' && (!item.name || !categories.some(c => c.id === item.category_id))) fail('Produto sem categoria válida.');
    if (key === 'alfa_coupons') { const amount = item.discount_value ?? item.value ?? 0; if ((item.discount_type || item.type) === 'percentage' && amount > 100) fail('Desconto percentual deve ser entre 0 e 100.'); }
  }

  // Regra de segurança: Bloquear exclusão de categoria utilizada por produtos
  if (key === 'alfa_categories') {
    const products = await get('alfa_products');
    const newCatIds = new Set(value.map(c => c.id));
    const blocked = products.find(p => !p.is_archived && !newCatIds.has(p.category_id));
    if (blocked) {
      fail(`A categoria utilizada pelo produto "${blocked.name}" não pode ser excluída. Mova ou arquive o produto antes de excluir a categoria.`, 400);
    }
  }
}

async function bootstrap(isAdmin) {
  const data = {}, versions = {};
  const records = await db.getAllRecords();
  for (const row of records) {
    if (!isAdmin && ['alfa_coupons', 'alfa_sales', 'alfa_customer_profiles', 'alfa_expenses', 'alfa_cash_closures', 'alfa_stock_movements', 'alfa_sales_goals', 'alfa_loyalty_points'].includes(row.key)) continue;
    data[row.key] = row.value;
    versions[row.key] = row.version;
  }
  const orders = await allOrders();
  data.alfa_orders = isAdmin ? orders.map(privateOrder) : [];
  data.alfa_customers = [];
  if (isAdmin) {
    const byPhone = new Map();
    const settings = await get('alfa_settings');
    for (const o of orders.filter(o => o.status !== 'cancelled')) {
      let c = byPhone.get(o.customer_phone);
      if (!c) {
        c = { id: hash(o.customer_phone).slice(0, 20), name: o.customer_name, whatsapp: o.customer_phone, addresses: [], orders_count: 0, total_spent: 0, average_ticket: 0, last_order_at: o.created_at, created_at: o.created_at };
        byPhone.set(o.customer_phone, c);
      }
      c.orders_count++; c.total_spent += o.total; c.average_ticket = c.total_spent / c.orders_count;
      if (o.address) c.addresses.push({ street: o.address, number: o.address_number, neighborhood: o.neighborhood_name });
    }
    const loyaltyLedger = await get('alfa_loyalty_points');
    for (const [phone, cust] of byPhone.entries()) {
      const loyalty = statusFor(loyaltyLedger, phone, settings);
      cust.loyalty_points = loyalty.points;
      cust.loyalty_stamps = loyalty.points;
      cust.loyalty_has_reward = loyalty.has_reward;
      cust.loyalty_rewards_count = loyalty.rewards_redeemed_count;
      cust.loyalty_history = loyalty.history;
    }
    data.alfa_customers = [...byPhone.values()];
  }
  data.alfa_public_offers = publicOffers(await get('alfa_coupons'));
  data.alfa_bestsellers = bestsellerIds(orders);
  data.alfa_loyalty_program = pointsConfig(await get('alfa_settings'));
  return { admin: isAdmin, configured: !!process.env.ADMIN_PASSWORD_HASH, data, versions };
}

function send(res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(value));
}

const updateClients = new Set();
let updateRevision = 0;
function notifyUpdates() {
  const message = `event: update\nid: ${++updateRevision}\ndata: {}\n\n`;
  for (const client of updateClients) { if (!client.destroyed) client.write(message); }
}
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self' https://viacep.com.br; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  const origin = req.headers.origin;
  if (origin && (
    origin.endsWith('.web.app') || 
    origin.endsWith('.firebaseapp.com') || 
    origin.includes('localhost') || 
    origin.includes('127.0.0.1') ||
    origin.endsWith('.onrender.com')
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');

  try {
    // Health check endpoint for Cloud Run and monitors
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      return send(res, 200, {
        status: 'ok',
        database: db.type,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname.startsWith('/api/')) {
      rate(req, 'api', 250);
      if (req.method !== 'GET') {
        if (!String(req.headers['content-type']).startsWith('application/json')) fail('Formato de requisição inválido.', 415);
        const originHost = req.headers['x-forwarded-host'] || req.headers.host;
        const originProto = req.headers['x-forwarded-proto'] || (production ? 'https' : 'http');
        const currentOrigin = `${originProto}://${originHost}`;
        const allowed = (publicUrl && publicUrl.startsWith('http')) ? new URL(publicUrl).origin : currentOrigin;
        const reqOrigin = req.headers.origin;
        const isTrustedOrigin = reqOrigin && (
          reqOrigin === allowed ||
          reqOrigin === currentOrigin ||
          reqOrigin.endsWith('.web.app') ||
          reqOrigin.endsWith('.firebaseapp.com') ||
          reqOrigin.includes('localhost') ||
          reqOrigin.includes('127.0.0.1')
        );
        if (reqOrigin && !isTrustedOrigin) fail('Origem não autorizada.', 403);
        if (req.headers['sec-fetch-site'] === 'cross-site' && !isTrustedOrigin) fail('Requisição não autorizada.', 403);
      }
      const isAdmin = await session(req);
      if (req.method === 'GET' && url.pathname === '/api/events') {
        if (updateClients.size >= 100) return send(res,503,{error:'Atualização automática temporariamente indisponível.'});
        res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
        res.write('retry: 3000\nevent: update\ndata: {}\n\n');
        updateClients.add(res);
        const heartbeat = setInterval(() => res.write(': keep-alive\n\n'),25000);
        req.on('close',() => { clearInterval(heartbeat); updateClients.delete(res); });
        return;
      }
      if (['POST','PUT','PATCH','DELETE'].includes(req.method) && /^\/api\/(data|catalog|orders)(?:\/|$)/.test(url.pathname)) {
        res.on('finish',() => { if (res.statusCode < 400) notifyUpdates(); });
      }

      // Read-only administrative audit, limited and filtered on the server.
      if (url.pathname === '/api/admin/audit' || url.pathname === '/api/admin/audit.csv') {
        if (!isAdmin) fail('Acesso administrativo necessário.', 401);
        if (req.method !== 'GET') fail('Método não permitido.', 405);
        rate(req, 'audit-read', 60, 60000);
        const fromDate = url.searchParams.get('from') || '';
        const toDate = url.searchParams.get('to') || '';
        const action = text(url.searchParams.get('action') || '', 100);
        if ((fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) || (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate))) fail('Data inválida.', 400);
        if (fromDate && toDate && fromDate > toDate) fail('Período inválido.', 400);
        const toExclusive = toDate ? new Date(Date.parse(toDate + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10) : '';
        if (toDate && !Number.isFinite(Date.parse(toDate + 'T00:00:00Z'))) fail('Data inválida.', 400);
        const rows = await db.listAudit({ from: fromDate, to: toExclusive, action, limit: url.pathname.endsWith('.csv') ? 1000 : 200 });
        if (url.pathname.endsWith('.csv')) {
          const csvCell = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'").replace(/"/g, '""') + '"';
          const csv = '\ufeff' + ['Data/Hora;Ação;Recurso', ...rows.map(row => [row.at, row.action, row.resource].map(csvCell).join(';'))].join('\r\n');
          res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="auditoria-alfa.csv"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          return res.end(csv);
        }
        return send(res, 200, { rows, limit: 200 });
      }

      // Backups administrative suite - supports SQLite and PostgreSQL (Cloud / Supabase)
      if (url.pathname.startsWith('/api/admin/backups')) {
        if (!isAdmin) fail('Acesso administrativo necessário.', 401);
        const backupDir = backupDirectory();
        const entries = () => listBackups(backupDir);
        fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
        const retentionFile = path.join(backupDir, 'retention-policy.json');
        const retentionPolicy = () => {
          try { const data = JSON.parse(fs.readFileSync(retentionFile, 'utf8')); return [5, 10, 20, 30, 50].includes(data.keep) ? data.keep : 10; }
          catch { return 10; }
        };

        if (req.method === 'GET' && url.pathname === '/api/admin/backups/export.json') {
          rate(req, 'backup-export', 10, 60000);
          const bootstrapData = await bootstrap(true);
          const stamp = new Date().toISOString().slice(0, 10);
          const jsonString = JSON.stringify({
            exportedAt: new Date().toISOString(),
            databaseEngine: db.type === 'postgres' ? 'PostgreSQL (Nuvem / Supabase)' : 'SQLite (Local)',
            system: 'Alfa Salgados Delivery PRO',
            ...bootstrapData
          }, null, 2);
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="alfa-backup-${stamp}.json"`,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
          });
          return res.end(jsonString);
        }

        if (req.method === 'GET' && url.pathname === '/api/admin/backups/health') {
          const files = entries();
          const last = files[0]?.createdAt || null;
          let integrityOk = true;
          const database = db.type === 'postgres' ? 'PostgreSQL (Nuvem)' : 'SQLite';
          if (db.type === 'sqlite') {
            const integrity = db.sqliteDb.prepare('PRAGMA quick_check').all().map(x => Object.values(x)[0]);
            integrityOk = integrity.length === 1 && integrity[0] === 'ok';
          } else {
            try {
              await db.pgPool.query('SELECT 1');
              integrityOk = true;
            } catch {
              integrityOk = false;
            }
          }
          const keep = retentionPolicy();
          return send(res, 200, { database, integrityOk, lastBackupAt: last, backupCount: files.length, backupStale: !last || Date.now() - Date.parse(last) > 7 * 86400000, retentionKeep: keep, excessBackups: Math.max(0, files.length - keep), automaticDeletion: false });
        }
        if (req.method === 'POST' && url.pathname === '/api/admin/backups/retention') {
          rate(req, 'retention', 10, 3600000);
          const payload = await body(req);
          if (![5, 10, 20, 30, 50].includes(payload.keep)) fail('Escolha uma quantidade válida de backups.', 400);
          const temp = retentionFile + '.tmp-' + randomBytes(4).toString('hex');
          try { fs.writeFileSync(temp, JSON.stringify({ keep: payload.keep }), { flag: 'wx', mode: 0o600 }); fs.renameSync(temp, retentionFile); }
          finally { try { fs.rmSync(temp, { force: true }); } catch {} }
          await audit('backup_retention_updated', String(payload.keep));
          return send(res, 200, { ok: true, keep: payload.keep, automaticDeletion: false });
        }
        if (req.method === 'GET' && url.pathname === '/api/admin/backups') {
          const files = entries();
          const last = files[0]?.createdAt || null;
          return send(res, 200, { files, lastBackupAt: last, stale: !last || Date.now() - Date.parse(last) > 7 * 86400000 });
        }
        if (req.method === 'GET' && url.pathname === '/api/admin/backups/integrity') {
          if (db.type === 'sqlite') {
            const result = db.sqliteDb.prepare('PRAGMA integrity_check').all().map(x => Object.values(x)[0]);
            return send(res, 200, { ok: result.length === 1 && result[0] === 'ok', result });
          } else {
            try {
              const recCount = await db.pgPool.query('SELECT COUNT(*) FROM records');
              const ordCount = await db.pgPool.query('SELECT COUNT(*) FROM orders');
              const audCount = await db.pgPool.query('SELECT COUNT(*) FROM audit');
              return send(res, 200, {
                ok: true,
                result: [
                  'ok',
                  `Banco PostgreSQL em nuvem conectado e íntegro.`,
                  `Tabelas verificadas: ${recCount.rows[0].count} registros em catálogo/configurações, ${ordCount.rows[0].count} pedidos, ${audCount.rows[0].count} eventos de auditoria.`
                ]
              });
            } catch (err) {
              return send(res, 200, { ok: false, result: ['Falha na verificação PostgreSQL: ' + err.message] });
            }
          }
        }
        if (req.method === 'POST' && url.pathname === '/api/admin/backups') {
          rate(req, 'backup', 5, 3600000);
          const dbSource = db.type === 'postgres' ? db.pgPool : db.sqliteDb;
          const { name } = await createBackup(dbSource, backupDir);
          await audit('backup_created', name);
          return send(res, 201, { ok: true, name });
        }
        const downloadMatch = url.pathname.match(/^\/api\/admin\/backups\/download\/([^/]+)$/);
        if (req.method === 'GET' && downloadMatch && isBackupName(downloadMatch[1])) {
          const name = downloadMatch[1];
          if (!entries().some(x => x.name === name)) fail('Backup não encontrado.', 404);
          const file = path.join(backupDir, name);
          res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${name}"`, 'Content-Length': fs.statSync(file).size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          fs.createReadStream(file).pipe(res);
          return;
        }
        fail('Recurso não encontrado.', 404);
      }

      if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
        return send(res, 200, await bootstrap(isAdmin));
      }

      if (req.method === 'POST' && url.pathname === '/api/login') {
        rate(req, 'login', 8, 15 * 60000);
        const input = await body(req);
        if (!process.env.ADMIN_PASSWORD_HASH || !process.env.ADMIN_EMAIL) fail('Acesso administrativo ainda não configurado. Consulte o guia do projeto.', 503);
        const [salt, expected] = process.env.ADMIN_PASSWORD_HASH.split(':');
        const actual = scryptSync(typeof input.password === 'string' ? input.password.slice(0, 512) : '', salt, 64).toString('hex');
        if (text(input.email, 200).toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase() || !safeEqual(actual, expected)) fail('E-mail ou senha incorretos.', 401);

        const token = randomBytes(32).toString('hex');
        await db.insertSession(hash(token), Date.now() + 8 * 3600000);

        // Sets both alfa_session and __session (for Firebase Hosting rewrite compatibility)
        const cookieOpts = `HttpOnly; SameSite=${production ? 'None; Secure' : 'Lax'}; Path=/; Max-Age=28800`;
        return send(res, 200, { ok: true, token }, {
          'Set-Cookie': [
            `alfa_session=${token}; ${cookieOpts}`,
            `__session=${token}; ${cookieOpts}`
          ]
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/logout') {
        const cookies = (req.headers.cookie || '').split(';').map(x => x.trim());
        const token = (cookies.find(x => x.startsWith('__session=')) || cookies.find(x => x.startsWith('alfa_session=')))?.split('=')[1];
        if (token) await db.deleteSession(hash(token));
        const cookieOpts = `HttpOnly; SameSite=Strict; Path=/; Max-Age=0${production ? '; Secure' : ''}`;
        return send(res, 200, { ok: true }, {
          'Set-Cookie': [
            `alfa_session=; ${cookieOpts}`,
            `__session=; ${cookieOpts}`
          ]
        });
      }

      // Upload endpoint for photos & banners
      if (req.method === 'POST' && url.pathname === '/api/upload') {
        if (!isAdmin) fail('Acesso administrativo necessário.', 401);
        rate(req, 'upload', 30);
        const input = await body(req, 10 * 1024 * 1024);
        if (!input.data || !input.filename) fail('Dados da imagem ausentes.');
        const matchMime = input.data.match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
        if (!matchMime) fail('Formato de imagem inválido. Use JPG, PNG ou WebP.');
        const mimeType = matchMime[1];
        const buffer = Buffer.from(matchMime[3], 'base64');
        if (buffer.length > 8 * 1024 * 1024) fail('Imagem excede o limite de 8 MB.');

        const ext = mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/png' ? '.png' : '.webp';
        const fileId = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;

        // If Supabase Storage is configured with bucket
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'images';
          const uploadRes = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${bucket}/${fileId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': mimeType,
              'x-upsert': 'true'
            },
            body: buffer
          });
          if (uploadRes.ok) {
            const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileId}`;
            return send(res, 200, { url: publicUrl, filename: fileId, size: buffer.length });
          }
        }

        // Local storage in public/uploads
        const targetPath = path.join(uploadsDir, fileId);
        fs.writeFileSync(targetPath, buffer);
        await audit('image_uploaded', fileId);
        const imagePrefix = (publicUrl && publicUrl.startsWith('http')) ? publicUrl.replace(/\/$/, '') : '';
        return send(res, 200, { url: `${imagePrefix}/uploads/${fileId}`, filename: fileId, size: buffer.length });
      }

      // Movimentações de estoque: transação única para quantidade, histórico e auditoria.
      if (url.pathname === '/api/stock' && req.method === 'GET') {
        if (!isAdmin) fail('Acesso administrativo necessário.', 401);
        return send(res, 200, { movements: await get('alfa_stock_movements') });
      }
      if (url.pathname === '/api/stock' && req.method === 'POST') {
        if (!isAdmin) fail('Acesso administrativo necessário.', 401);
        rate(req, 'stock', 60);
        const input = await body(req);
        if (typeof input.product_id !== 'string' || !['entry', 'adjustment'].includes(input.type)) fail('Movimentação inválida.');
        if (!Number.isSafeInteger(input.quantity) || input.quantity < 0 || input.quantity > 1000000) fail('Quantidade inválida.');
        if (input.type === 'entry' && input.quantity === 0) fail('Informe uma quantidade positiva.');
        const note = text(input.note || '', 180);
        const result = await db.transaction(async tx => {
          const products = await tx.getRecord('alfa_products');
          const p = products.find(x => x.id === input.product_id && !x.is_archived);
          if (!p || !p.has_stock_control) fail('Produto sem controle de estoque ativo.', 404);
          const before = p.stock_quantity;
          const after = input.type === 'entry' ? before + input.quantity : input.quantity;
          if (!Number.isSafeInteger(after) || after > 100000000) fail('Estoque fora do limite permitido.');
          p.stock_quantity = after;
          const movements = await tx.getRecord('alfa_stock_movements');
          const movement = { id: randomUUID(), product_id: p.id, product_name: p.name, type: input.type, quantity: input.type === 'entry' ? input.quantity : after - before, before, after, note, created_at: new Date().toISOString() };
          movements.unshift(movement);
          await tx.putRecord('alfa_products', products);
          await tx.putRecord('alfa_stock_movements', movements);
          await tx.addAudit(randomUUID(), movement.created_at, 'stock_movement', `${p.id} | ${before} -> ${after} | ${input.type}`);
          return movement;
        });
        return send(res, 200, result);
      }

      if (req.method === 'POST' && url.pathname === '/api/catalog/product') {
        if (!isAdmin) fail('Acesso administrativo necessário.', 401);
        const input = await body(req);
        try { validateProductBundle(input); } catch (e) { fail(e.message); }
        const categories = await get('alfa_categories');
        if (!categories.some(c => c.id === input.product.category_id)) fail('Categoria não encontrada.');

        await db.transaction(async tx => {
          for (const key of CATALOG_KEYS) {
            const rec = await tx.getRecordWithVersion(key);
            if (!rec || rec.version !== input.versions?.[key]) {
              fail('O catálogo ou estoque mudou durante a edição. Feche e reabra o cadastro para conferir os dados atuais. Seu rascunho não foi salvo.', 409);
            }
          }
          const oldProducts = await tx.getRecord('alfa_products');
          const oldGroups = await tx.getRecord('alfa_option_groups');
          const oldOptions = await tx.getRecord('alfa_product_options');

          const original = oldProducts.find(p => p.id === input.product.id);
          const oldGroupIds = new Set(oldGroups.filter(g => g.product_id === input.product.id).map(g => g.id));
          const product = { ...original, ...input.product, created_at: original?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
          const products = original ? oldProducts.map(p => p.id === product.id ? product : p) : [product, ...oldProducts];
          const groups = [...oldGroups.filter(g => g.product_id !== product.id), ...input.groups.map(e => ({ ...e.group, product_id: product.id }))];
          const options = [...oldOptions.filter(o => !oldGroupIds.has(o.group_id)), ...input.groups.flatMap(e => e.options.map(o => ({ ...o, group_id: e.group.id })))];

          await validateRecord('alfa_products', products);
          await validateRecord('alfa_option_groups', groups);
          await validateRecord('alfa_product_options', options);

          await tx.putRecord('alfa_products', products);
          await tx.putRecord('alfa_option_groups', groups);
          await tx.putRecord('alfa_product_options', options);
          await tx.addAudit(randomUUID(), new Date().toISOString(), 'product_bundle_saved', product.id);
        });
        return send(res, 200, await bootstrap(true));
      }

      if (req.method === 'PUT' && url.pathname.startsWith('/api/data/')) {
        if (!isAdmin) fail('Entre no painel para alterar dados.', 401);
        const key = url.pathname.slice(10);
        if (key === 'alfa_loyalty_points') fail('Movimentações de pontos são registradas exclusivamente pelos pedidos.', 403);
        const current = await db.getRecordWithVersion(key);
        if (!current) fail('Recurso inválido.', 404);
        const input = await body(req);
        await validateRecord(key, input.value);

        await db.transaction(async tx => {
          const rec = await tx.getRecordWithVersion(key);
          if (!rec || rec.version !== input.version) {
            fail('Os dados foram alterados em outro dispositivo. Atualize e tente novamente.', 409);
          }
          // Financial audit is written atomically with the updated record.
          // No financial values are recalculated and no historical rows are changed.
          if (key === 'alfa_sales') {
            const previous = Array.isArray(rec.value) ? rec.value : await tx.getRecord(key);
            const before = new Map(previous.map(sale => [sale.id, sale]));
            for (const sale of input.value) {
              const old = before.get(sale.id);
              const now = new Date().toISOString();
              const log = async (action, detail) => tx.addAudit(randomUUID(), now, action, `${sale.id} | ${detail}`);
              if (!old) {
                await log('sale_created', `total=${sale.total}; paid=${sale.paid_amount}; status=${sale.payment_status}`);
                continue;
              }
              if (old.payment_status !== sale.payment_status) {
                await log(sale.payment_status === 'cancelled' ? 'sale_cancelled' : 'sale_payment_status_changed', `${old.payment_status} -> ${sale.payment_status}`);
              }
              if (old.paid_amount !== sale.paid_amount) {
                await log('sale_payment_amount_changed', `${old.paid_amount} -> ${sale.paid_amount}`);
              }
              if (old.discount_value !== sale.discount_value || old.total !== sale.total) {
                await log('sale_amount_adjusted', `total ${old.total} -> ${sale.total}; discount ${old.discount_value ?? 0} -> ${sale.discount_value ?? 0}`);
              }
            }
            const nextIds = new Set(input.value.map(sale => sale.id));
            for (const old of previous) {
              if (!nextIds.has(old.id)) await tx.addAudit(randomUUID(), new Date().toISOString(), 'sale_removed', old.id);
            }
          }
          await tx.putRecord(key, input.value);
          if (key === 'alfa_cash_closures') {
            const oldRows = Array.isArray(rec.value) ? rec.value : [];
            for (const row of input.value) {
              const old = oldRows.find(x => x.date === row.date);
              if (!old || JSON.stringify(old) !== JSON.stringify(row)) await tx.addAudit(randomUUID(), new Date().toISOString(), old ? 'cash_closure_updated' : 'cash_closure_created', `${row.date} | esperado=${row.expected} | conferido=${row.counted} | diferenca=${row.difference}`);
            }
          }
          if (key === 'alfa_expenses') {
            const previous = Array.isArray(rec.value) ? rec.value : [];
            const oldById = new Map(previous.map(e => [e.id, e]));
            for (const e of input.value) {
              const old = oldById.get(e.id);
              if (!old || JSON.stringify(old) !== JSON.stringify(e)) {
                await tx.addAudit(randomUUID(), new Date().toISOString(), !old ? 'expense_created' : e.status === 'cancelled' ? 'expense_cancelled' : e.status === 'paid' && old.status !== 'paid' ? 'expense_paid' : 'expense_updated', `${e.id} | ${e.description} | R$ ${e.amount} | ${e.status}`);
              }
            }
            const nextIds = new Set(input.value.map(e => e.id));
            if (previous.some(e => !nextIds.has(e.id))) fail('Exclusão de despesa não permitida. Cancele o lançamento.', 400);
          }
          await tx.addAudit(randomUUID(), new Date().toISOString(), 'update', key);
        });
        return send(res, 200, { version: current.version + 1 });
      }

      if (req.method === 'GET' && url.pathname === '/api/loyalty') {
        rate(req, 'loyalty', 60);
        const phoneParam = url.searchParams.get('phone');
        if (!phoneParam) fail('Telefone não informado.');
        const settings = await get('alfa_settings');
        const ledger = await get('alfa_loyalty_points');
        const loyalty = statusFor(ledger, phoneParam, settings);
        return send(res, 200, loyalty);
      }

      if (req.method === 'POST' && url.pathname === '/api/quote') {
        rate(req, 'quote', 50);
        const q = await calculate(await body(req));
        return send(res, 200, {
          subtotal: q.subtotal,
          delivery_fee: q.delivery_fee,
          discount_value: q.discount_value,
          total: q.total,
          coupon_code: q.coupon_code,
          used_loyalty_reward: q.used_loyalty_reward,
          loyalty_discount: q.loyalty_discount
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/orders') {
        rate(req, 'orders', 20);
        const input = await body(req);
        if (!/^[a-zA-Z0-9-]{20,100}$/.test(input.idempotency_key || '')) fail('Chave do pedido inválida.');
        const idem = hash(input.idempotency_key);
        const existing = await db.getOrderByIdemHash(idem);
        if (existing) return send(res, 200, existing);

        const result = await db.transaction(async tx => {
          const q = await calculate(input, true);
          if (!Number.isFinite(input.total) || cents(input.total) !== cents(q.total)) {
            fail('O valor do pedido mudou. Atualize o carrinho e confira o resumo antes de finalizar.', 409);
          }
          const id = randomUUID(), token = randomBytes(32).toString('hex');
          const number = await tx.getNextOrderNumber();
          const settings = await tx.getRecord('alfa_settings');
          const order = {
            id,
            order_number: number,
            customer_name: text(input.customer_name, 100),
            customer_phone: normalizePhone(input.customer_phone),
            delivery_type: input.delivery_type,
            address: input.delivery_type === 'delivery' ? text(input.address) : null,
            address_number: text(input.address_number, 30),
            complement: text(input.complement),
            reference_point: text(input.reference_point),
            neighborhood_id: q.neighborhood?.id || null,
            neighborhood_name: q.neighborhood?.name || null,
            delivery_fee: q.delivery_fee,
            subtotal: q.subtotal,
            discount_value: q.discount_value,
            coupon_code: q.coupon_code,
            used_loyalty_reward: !!q.used_loyalty_reward,
            loyalty_discount: q.loyalty_discount || 0,
            loyalty_stamp_earned: false,
            loyalty_points_earned: 0,
            loyalty_points_redeemed: 0,
            total: q.total,
            payment_method: input.payment_method,
            payment_status: 'pending',
            needs_change: !!input.needs_change,
            change_amount: input.change_amount || null,
            status: 'pending',
            notes: text(input.notes),
            preorder_date: input.preorder_date || null,
            preorder_time: input.preorder_time || null,
            items: q.items.map(i => ({ ...i, order_id: id })),
            stock_reservations: [...q.requested].map(([product_id, quantity]) => ({ product_id, quantity })),
            created_at: new Date().toISOString(),
            tracking_token: token,
            audit_logs: []
          };

          const prodRecord = await (tx.getRecordForUpdate ? tx.getRecordForUpdate('alfa_products') : tx.getRecordWithVersion('alfa_products'));
          const products = Array.isArray(prodRecord?.value) ? prodRecord.value : [];
          const prodVersion = prodRecord?.version;
          const movements = await tx.getRecord('alfa_stock_movements');
          order.stock_reservations = order.stock_reservations.filter(r => products.some(p => p.id === r.product_id && p.has_stock_control));
          for (const p of products) {
            if (p.has_stock_control && q.requested.has(p.id)) {
              const before = p.stock_quantity;
              const quantity = q.requested.get(p.id);
              if (before < quantity) fail(`Estoque insuficiente para ${p.name}.`, 409);
              p.stock_quantity -= quantity;
              movements.unshift({ id: randomUUID(), product_id:p.id, product_name:p.name, type:'sale', quantity:-quantity, before, after:p.stock_quantity, note:`Pedido ${number}`, created_at:new Date().toISOString(), order_id:id });
            }
          }
          await tx.putRecord('alfa_products', products, prodVersion);
          await tx.putRecord('alfa_stock_movements', movements);
          const ledger = await tx.getRecord('alfa_loyalty_points');
          if (q.used_loyalty_reward) {
            const balance = statusFor(ledger, order.customer_phone, settings);
            if (balance.points < balance.goal) fail('Saldo de pontos insuficiente. Atualize o pedido.', 409);
            order.loyalty_points_redeemed = balance.goal;
            appendEntry(ledger, order, 'redeem', -balance.goal);
          }
          order.loyalty_points_earned = awardPoints(order, settings);
          appendEntry(ledger, order, 'earn', order.loyalty_points_earned);
          await tx.putRecord('alfa_loyalty_points', ledger);
          await tx.insertOrder(id, number, hash(token), idem, order);

          if (q.coupon) {
            const coupons = await tx.getRecord('alfa_coupons');
            const coupon = coupons.find(c => c.id === q.coupon.id);
            if (coupon) {
              coupon.current_uses = (coupon.current_uses || 0) + 1;
              await tx.putRecord('alfa_coupons', coupons);
            }
          }
          await tx.addAudit(randomUUID(), new Date().toISOString(), 'order_created', id);
          return order;
        });
        return send(res, 201, result);
      }

      // Order status or tracking
      const match = url.pathname.match(/^\/api\/orders\/([^/]+)(\/(status|payment))?$/);
      if (match) {
        const orderId = match[1];
        const actionType = match[3]; // 'status', 'payment' or undefined
        const row = await db.getOrderById(orderId);
        if (!row) fail('Pedido não encontrado.', 404);
        let order = row.data;

        // View single order (tracking or admin)
        if (req.method === 'GET' && !actionType) {
          if (!isAdmin && !safeEqual(hash(url.searchParams.get('token') || ''), row.token_hash)) {
            fail('Acesso ao pedido não autorizado.', 403);
          }
          return send(res, 200, privateOrder(order));
        }

        // Change operational status
        if (req.method === 'POST' && actionType === 'status') {
          if (!isAdmin) fail('Acesso administrativo necessário.', 401);
          const { status } = await body(req);
          const freshRow = await db.getOrderById(orderId);
          order = freshRow.data;
          const transitions = {
            pending: ['confirmed', 'cancelled'],
            new: ['confirmed', 'cancelled'],
            confirmed: ['preparing', 'cancelled'],
            preparing: ['ready', 'cancelled'],
            ready: ['delivering', 'delivered', 'cancelled'],
            delivering: ['delivered', 'cancelled'],
            delivered: [],
            cancelled: []
          };
          if (order.status === status) return send(res, 200, privateOrder(order));
          if (!transitions[order.status]?.includes(status)) fail('Transição de pedido inválida.');

          await db.transaction(async tx => {
            if (status === 'cancelled') {
              const products = await tx.getRecord('alfa_products');
              const movements = await tx.getRecord('alfa_stock_movements');
              for (const item of order.stock_reservations || []) {
                const p = products.find(p => p.id === item.product_id && p.has_stock_control);
                if (p) {
                  const before = p.stock_quantity;
                  p.stock_quantity += item.quantity;
                  movements.unshift({ id:randomUUID(), product_id:p.id, product_name:p.name, type:'cancellation', quantity:item.quantity, before, after:p.stock_quantity, note:`Cancelamento pedido ${order.order_number}`, created_at:new Date().toISOString(), order_id:order.id });
                }
              }
              await tx.putRecord('alfa_products', products);
              await tx.putRecord('alfa_stock_movements', movements);
              const ledger = await tx.getRecord('alfa_loyalty_points');
              appendEntry(ledger, order, 'reverse_earn', -Number(order.loyalty_points_earned || 0));
              appendEntry(ledger, order, 'refund_redeem', Number(order.loyalty_points_redeemed || 0));
              await tx.putRecord('alfa_loyalty_points', ledger);
            }
            if (!order.audit_logs) order.audit_logs = [];
            order.audit_logs.unshift({
              id: randomUUID(),
              order_id: order.id,
              previous_status: order.status,
              new_status: status,
              changed_at: new Date().toISOString(),
              user_responsible: process.env.ADMIN_EMAIL || 'admin'
            });
            order.status = status;
            order.updated_at = new Date().toISOString();
            await tx.updateOrder(order.id, order);
            await tx.addAudit(randomUUID(), new Date().toISOString(), status === 'cancelled' ? 'order_cancelled' : 'order_status', `${order.id} | ${row.data.status} -> ${status}`);
          });
          return send(res, 200, privateOrder(order));
        }

        // Change financial / payment status
        if (req.method === 'POST' && actionType === 'payment') {
          if (!isAdmin) fail('Acesso administrativo necessário.', 401);
          const { payment_status, notes } = await body(req);
          if (!['pending', 'confirmed', 'cancelled', 'refunded'].includes(payment_status)) {
            fail('Status de pagamento inválido.');
          }
          const freshRow = await db.getOrderById(orderId);
          order = freshRow.data;
          const previousPaymentStatus = order.payment_status || 'pending';
          if (order.payment_status === payment_status) return send(res, 200, privateOrder(order));

          await db.transaction(async tx => {
            if (!order.audit_logs) order.audit_logs = [];
            order.audit_logs.unshift({
              id: randomUUID(),
              order_id: order.id,
              action: 'payment_status_changed',
              previous_payment_status: previousPaymentStatus,
              new_payment_status: payment_status,
              changed_at: new Date().toISOString(),
              user_responsible: process.env.ADMIN_EMAIL || 'admin',
              notes: text(notes, 200) || undefined
            });
            order.payment_status = payment_status;
            // Somente novas confirmações recebem data de recebimento; registros antigos não são presumidos.
            if (payment_status === 'confirmed') order.payment_confirmed_at = new Date().toISOString();
            else order.payment_confirmed_at = null;
            order.updated_at = new Date().toISOString();
            await tx.updateOrder(order.id, order);
            await tx.addAudit(randomUUID(), new Date().toISOString(), 'order_payment', `${order.id} | ${previousPaymentStatus} -> ${payment_status}`);
          });
          return send(res, 200, privateOrder(order));
        }
      }

      fail('Recurso não encontrado.', 404);
    }

    // Serve public uploads statically if requested
    if (req.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      const relPath = path.normalize(url.pathname.replace(/^\/uploads\//, ''));
      const filePath = path.join(uploadsDir, relPath);
      if (filePath.startsWith(uploadsDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const mime = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
        res.setHeader('Content-Type', mime[path.extname(filePath)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return fs.createReadStream(filePath).pipe(res);
      }
      return send(res, 404, { error: 'Arquivo não encontrado.' });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') fail('Método não permitido.', 405);
    const root = path.resolve('dist');
    let file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(root + path.sep) && file !== root) fail('Recurso não encontrado.', 404);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html');
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', file.includes('/assets/') ? 'public,max-age=31536000,immutable' : 'no-cache');
    fs.createReadStream(file).on('error', () => { res.statusCode = 503; res.end('Execute npm run build antes de abrir a loja.'); }).pipe(res);
  } catch (error) {
    send(res, error.status || 500, { error: error.status ? error.message : 'Não foi possível concluir a operação. Tente novamente.' });
    if (!error.status) console.error('Erro interno:', error.message);
  }
});

server.listen(port, process.env.HOST || '0.0.0.0', () => {
  const p = server.address().port;
  console.log(`Alfa Delivery disponível em http://localhost:${p}`);
  let nets = {};
  try { nets = os.networkInterfaces(); }
  catch { console.warn('Não foi possível listar os endereços da rede local. O servidor continua disponível no endereço configurado.'); }
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`Acesso na rede local (celular / outro PC): http://${net.address}:${p}`);
      }
    }
  }
});
