import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { CATALOG_KEYS, validateProductBundle } from './catalog.mjs';
import { normalizePhone, cents, productPrice, openingStatus, localDate } from './rules.mjs';
import { DatabaseAdapter } from './database.mjs';

const port = Number(process.env.PORT || 3001);
const production = process.env.NODE_ENV === 'production';
const publicUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL;
if (production && (!publicUrl?.startsWith('https://') || !process.env.ADMIN_PASSWORD_HASH || !process.env.ADMIN_EMAIL)) {
  throw new Error('Configure PUBLIC_URL com HTTPS e o administrador antes de publicar.');
}

const seed = JSON.parse(fs.readFileSync(new URL('./seed.json', import.meta.url), 'utf8'));
const db = new DatabaseAdapter({ seedData: seed });
await db.init();

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
  if (sessionCookie) {
    const tokenVal = sessionCookie.split('=')[1];
    const row = await db.getSession(hash(tokenVal));
    if (row && row.expires > Date.now()) return true;
  }

  // 2. Suporte a Supabase Auth Bearer Token se configurado
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (payload.exp && payload.exp * 1000 < Date.now()) return false;
        if (payload.email && process.env.ADMIN_EMAIL && payload.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
          return true;
        }
        if (payload.user_metadata?.role === 'admin' || payload.app_metadata?.role === 'admin') {
          return true;
        }
      }
    } catch {
      // invalid token
    }
  }

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

  if (!Array.isArray(payload.items) || !payload.items.length || payload.items.length > 100) fail('Seu carrinho está vazio ou excede o limite de itens.');
  let subtotal = 0; const requested = new Map();
  const items = payload.items.map(item => {
    const product = products.find(p => p.id === item.product_id);
    if (!product || !product.available || product.is_archived || !categories.some(c => c.id === product.category_id && c.is_available)) fail('Um produto não está mais disponível. Atualize o carrinho.');
    const qty = item.quantity; if (!Number.isInteger(qty) || qty < 1 || qty > 999) fail('Quantidade de produto inválida.');
    requested.set(product.id, (requested.get(product.id) || 0) + qty);
    if (product.has_stock_control && requested.get(product.id) > product.stock_quantity) fail(`Estoque insuficiente para ${product.name}.`);
    const selected = Array.isArray(item.selections) ? item.selections : []; if (selected.length > 200) fail('Excesso de adicionais.');
    const seen = new Set(); let extra = 0; const totals = new Map();
    const selections = selected.map(selection => {
      const count = selection.quantity ?? 1; if (!Number.isInteger(count) || count < 1 || count > 999) fail('Quantidade de adicional inválida.');
      const identity = `${selection.groupId}:${selection.optionId}`; if (seen.has(identity)) fail('Adicional duplicado.'); seen.add(identity);
      if (selection.groupId === 'flavors') {
        const flavor = flavors.find(f => f.id === selection.optionId && f.is_active && (!product.available_flavor_ids?.length || product.available_flavor_ids.includes(f.id)));
        if (!flavor || !product.combo_max_qty || count % (product.combo_step || 10) !== 0) fail('Sabor ou quantidade inválidos.');
        totals.set('flavors', (totals.get('flavors') || 0) + count);
        return { groupId: 'flavors', groupName: 'Sabores escolhidos', optionId: flavor.id, optionName: `${count}x ${flavor.name}`, price: 0, quantity: count };
      }
      const group = groups.find(g => g.id === selection.groupId && g.product_id === product.id);
      const option = options.find(o => o.id === selection.optionId && o.group_id === group?.id && (o.is_available ?? true) && (o.is_active ?? true));
      if (!group || !option || count % (group.step || option.step || 1) !== 0) fail('Adicional inválido ou indisponível.');
      totals.set(group.id, (totals.get(group.id) || 0) + count); extra += cents(option.price || 0) * count;
      return { groupId: group.id, groupName: group.name, optionId: option.id, optionName: `${count}x ${option.name.replace(/^\d+\s+/, '')}`, price: (cents(option.price || 0) * count) / 100, quantity: count };
    });
    for (const group of groups.filter(g => g.product_id === product.id)) {
      const count = totals.get(group.id) || 0; const min = group.min_select ?? group.min_options ?? 0, max = group.max_select ?? group.max_options ?? 0;
      if (((group.required ?? group.is_required) || count > 0) && count < min || max > 0 && count > max) fail(`Confira as quantidades de ${group.name}.`);
    }
    if (!groups.some(g => g.product_id === product.id) && product.combo_max_qty && (totals.get('flavors') || 0) !== product.combo_max_qty) fail(`Escolha exatamente ${product.combo_max_qty} salgados.`);
    const unit = cents(productPrice(product)) + extra; const itemSubtotal = unit * qty; subtotal += itemSubtotal;
    return { id: randomUUID(), product_id: product.id, product_name: product.name, product_price: productPrice(product), unit_price: unit / 100, quantity: qty, subtotal: itemSubtotal / 100, notes: text(item.notes), selections };
  });
  if (!['pickup', 'delivery'].includes(payload.delivery_type)) fail('Escolha entrega ou retirada.');
  let neighborhood = null, fee = 0;
  if (payload.delivery_type === 'delivery') {
    const neighborhoods = await get('alfa_neighborhoods');
    neighborhood = neighborhoods.find(n => n.id === payload.neighborhood_id && (n.is_available ?? true)); if (!neighborhood) fail('Selecione um bairro atendido pela loja.'); fee = cents(neighborhood.delivery_fee);
  }
  let discount = 0, coupon = null;
  if (payload.coupon_code) {
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
  return { items, subtotal: subtotal / 100, delivery_fee: fee / 100, discount_value: discount / 100, total: (subtotal + fee - discount) / 100, coupon_code: coupon?.code || null, neighborhood, requested, coupon };
}

async function validateRecord(key, value) {
  if (key === 'alfa_settings') {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !text(value.business_name, 100)) fail('Configurações inválidas.');
    normalizePhone(value.whatsapp); if (value.min_order_value != null && (!Number.isFinite(value.min_order_value) || value.min_order_value < 0)) fail('Pedido mínimo inválido.');
    for (const d of Object.values(value.weekly_schedule || {})) if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.close)) fail('Horário inválido.');
    return;
  }
  if (!Array.isArray(value) || value.length > 5000) fail('Lista inválida.');
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
    if (!isAdmin && row.key === 'alfa_coupons') continue;
    data[row.key] = row.value;
    versions[row.key] = row.version;
  }
  const orders = await allOrders();
  data.alfa_orders = isAdmin ? orders.map(privateOrder) : [];
  data.alfa_customers = [];
  if (isAdmin) {
    const byPhone = new Map();
    for (const o of orders.filter(o => o.status !== 'cancelled')) {
      let c = byPhone.get(o.customer_phone);
      if (!c) {
        c = { id: hash(o.customer_phone).slice(0, 20), name: o.customer_name, whatsapp: o.customer_phone, addresses: [], orders_count: 0, total_spent: 0, average_ticket: 0, last_order_at: o.created_at, created_at: o.created_at };
        byPhone.set(o.customer_phone, c);
      }
      c.orders_count++; c.total_spent += o.total; c.average_ticket = c.total_spent / c.orders_count;
      if (o.address) c.addresses.push({ street: o.address, number: o.address_number, neighborhood: o.neighborhood_name });
    }
    data.alfa_customers = [...byPhone.values()];
  }
  return { admin: isAdmin, configured: !!process.env.ADMIN_PASSWORD_HASH, data, versions };
}

function send(res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(value));
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self' https://viacep.com.br; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

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
        const allowed = publicUrl ? new URL(publicUrl).origin : `http://${req.headers.host}`;
        if (req.headers.origin && req.headers.origin !== allowed) fail('Origem não autorizada.', 403);
        if (req.headers['sec-fetch-site'] === 'cross-site') fail('Requisição não autorizada.', 403);
      }
      const isAdmin = await session(req);

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
        const cookieOpts = `HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${production ? '; Secure' : ''}`;
        return send(res, 200, { ok: true }, {
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
        return send(res, 200, { url: `/uploads/${fileId}`, filename: fileId, size: buffer.length });
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
        const current = await db.getRecordWithVersion(key);
        if (!current) fail('Recurso inválido.', 404);
        const input = await body(req);
        await validateRecord(key, input.value);

        await db.transaction(async tx => {
          const rec = await tx.getRecordWithVersion(key);
          if (!rec || rec.version !== input.version) {
            fail('Os dados foram alterados em outro dispositivo. Atualize e tente novamente.', 409);
          }
          await tx.putRecord(key, input.value);
          await tx.addAudit(randomUUID(), new Date().toISOString(), 'update', key);
        });
        return send(res, 200, { version: current.version + 1 });
      }

      if (req.method === 'POST' && url.pathname === '/api/quote') {
        rate(req, 'quote', 50);
        const q = await calculate(await body(req));
        return send(res, 200, { subtotal: q.subtotal, delivery_fee: q.delivery_fee, discount_value: q.discount_value, total: q.total, coupon_code: q.coupon_code });
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
            stock_reservations: [...q.requested]
              .filter(async ([pid]) => {
                const products = await get('alfa_products');
                return products.find(p => p.id === pid)?.has_stock_control;
              })
              .map(([product_id, quantity]) => ({ product_id, quantity })),
            created_at: new Date().toISOString(),
            tracking_token: token,
            audit_logs: []
          };

          await tx.insertOrder(id, number, hash(token), idem, order);
          const products = await tx.getRecord('alfa_products');
          for (const p of products) {
            if (p.has_stock_control && q.requested.has(p.id)) {
              p.stock_quantity -= q.requested.get(p.id);
            }
          }
          await tx.putRecord('alfa_products', products);

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
              for (const item of order.stock_reservations || []) {
                const p = products.find(p => p.id === item.product_id);
                if (p) p.stock_quantity += item.quantity;
              }
              await tx.putRecord('alfa_products', products);
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
            await tx.addAudit(randomUUID(), new Date().toISOString(), 'order_status', order.id);
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
            order.updated_at = new Date().toISOString();
            await tx.updateOrder(order.id, order);
            await tx.addAudit(randomUUID(), new Date().toISOString(), 'order_payment', order.id);
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
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`Acesso na rede local (celular / outro PC): http://${net.address}:${p}`);
      }
    }
  }
});
