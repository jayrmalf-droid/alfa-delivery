-- ==============================================================================
-- ALFA SALGADOS DELIVERY — SCHEMA POSTGRESQL / SUPABASE
-- Versão 0.3.1 - Preparado para Produção
-- ==============================================================================

-- Habilitar extensão para geração de UUID caso necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. TABELA DE COMPATIBILIDADE E CONTROLE DE VERSÃO (RECORDS)
-- Mantém compatibilidade com o modelo atômico e bloqueio otimista de concorrência
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS records (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. TABELA DE CONFIGURAÇÕES DA LOJA (SINGLETON)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alfa_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
    business_name VARCHAR(150) NOT NULL DEFAULT 'ALFA SALGADOS',
    business_description TEXT,
    logo_url TEXT,
    whatsapp VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    cnpj VARCHAR(30),
    store_address TEXT,
    store_address_number VARCHAR(30),
    store_address_complement TEXT,
    store_neighborhood VARCHAR(100),
    delivery_time_estimate VARCHAR(50) DEFAULT '40-60 min',
    pickup_time_estimate VARCHAR(50) DEFAULT '20-30 min',
    min_order_value NUMERIC(10, 2) DEFAULT 0,
    pix_key VARCHAR(100),
    pix_recipient_name VARCHAR(150),
    pix_recipient_city VARCHAR(100),
    printer_paper_width VARCHAR(10) DEFAULT '58mm',
    is_open_override BOOLEAN DEFAULT NULL,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    pause_message TEXT,
    payment_pix BOOLEAN NOT NULL DEFAULT TRUE,
    payment_cash BOOLEAN NOT NULL DEFAULT TRUE,
    payment_credit BOOLEAN NOT NULL DEFAULT TRUE,
    payment_debit BOOLEAN NOT NULL DEFAULT TRUE,
    weekly_schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. CATEGORIAS DO CARDÁPIO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alfa_categories (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    image_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_available ON alfa_categories (is_available, sort_order);

-- ------------------------------------------------------------------------------
-- 4. PRODUTOS E COMBOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alfa_products (
    id VARCHAR(100) PRIMARY KEY,
    category_id VARCHAR(100) NOT NULL REFERENCES alfa_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    promo_price NUMERIC(10, 2) CHECK (promo_price IS NULL OR (promo_price >= 0 AND promo_price < price)),
    image_url TEXT,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    is_highlight BOOLEAN NOT NULL DEFAULT FALSE,
    is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
    is_preorder BOOLEAN NOT NULL DEFAULT FALSE,
    preorder_days INTEGER DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    has_options BOOLEAN NOT NULL DEFAULT FALSE,
    product_mode VARCHAR(30) NOT NULL DEFAULT 'normal', -- 'normal', 'combo', 'flavors'
    price_display_mode VARCHAR(30) NOT NULL DEFAULT 'fixed', -- 'fixed', 'starting_at'
    has_stock_control BOOLEAN NOT NULL DEFAULT FALSE,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    combo_min_qty INTEGER,
    combo_max_qty INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON alfa_products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_catalog ON alfa_products (available, is_archived, sort_order);

-- ------------------------------------------------------------------------------
-- 5. GRUPOS DE OPÇÃO / COMPLEMENTOS / SABORES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alfa_option_groups (
    id VARCHAR(100) PRIMARY KEY,
    product_id VARCHAR(100) NOT NULL REFERENCES alfa_products(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    min_select INTEGER NOT NULL DEFAULT 0 CHECK (min_select >= 0),
    max_select INTEGER NOT NULL DEFAULT 1 CHECK (max_select >= min_select),
    step INTEGER NOT NULL DEFAULT 1 CHECK (step >= 1),
    required BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    group_kind VARCHAR(30) DEFAULT 'extra', -- 'flavors', 'extra', 'choice'
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_product ON alfa_option_groups (product_id, is_active, sort_order);

-- ------------------------------------------------------------------------------
-- 6. OPÇÕES DE CADA GRUPO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alfa_product_options (
    id VARCHAR(100) PRIMARY KEY,
    group_id VARCHAR(100) NOT NULL REFERENCES alfa_option_groups(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_options_group ON alfa_product_options (group_id, is_available, is_active);

-- ------------------------------------------------------------------------------
-- 7. SABORES LEGADOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alfa_flavors (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. BANNERS PROMOCIONAIS E CAMPANHAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alfa_banners (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    subtitle TEXT,
    image_desktop TEXT NOT NULL,
    image_mobile TEXT,
    link_type VARCHAR(30) DEFAULT 'category',
    link_value TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_active ON alfa_banners (is_active, sort_order);

-- ------------------------------------------------------------------------------
-- 9. BAIRROS E TAXAS DE ENTREGA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alfa_neighborhoods (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    estimated_time VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. CUPONS DE DESCONTO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alfa_coupons (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed'
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value >= 0),
    min_order_value NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (min_order_value >= 0),
    max_uses INTEGER DEFAULT NULL CHECK (max_uses IS NULL OR max_uses > 0),
    current_uses INTEGER NOT NULL DEFAULT 0 CHECK (current_uses >= 0),
    is_single_use BOOLEAN NOT NULL DEFAULT FALSE,
    single_use_per_client BOOLEAN NOT NULL DEFAULT FALSE,
    free_shipping BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON alfa_coupons (UPPER(code));

-- ------------------------------------------------------------------------------
-- 11. PEDIDOS E TRANSAÇÕES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(100) PRIMARY KEY,
    number INTEGER UNIQUE NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    idem_hash VARCHAR(64) UNIQUE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_number ON orders (number DESC);
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders (token_hash);
CREATE INDEX IF NOT EXISTS idx_orders_idem ON orders (idem_hash);

-- ------------------------------------------------------------------------------
-- 12. SESSÕES E CONTROLE DE ACESSO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    hash VARCHAR(64) PRIMARY KEY,
    expires BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires);

-- ------------------------------------------------------------------------------
-- 13. AUDITORIA OPERACIONAL E FINANCEIRA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit (
    id VARCHAR(100) PRIMARY KEY,
    at VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit (created_at DESC);

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- Garante isolamento estrito para acesso direto via cliente Supabase
-- ==============================================================================

ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE alfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alfa_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE alfa_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE alfa_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE alfa_product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE alfa_flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE alfa_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE alfa_neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE alfa_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit ENABLE ROW LEVEL SECURITY;

-- 1. Catálogo Público: leitura permitida apenas de itens ativos/disponíveis
CREATE POLICY "Public Read Categories" ON alfa_categories
    FOR SELECT TO anon, authenticated
    USING (is_available = TRUE);

CREATE POLICY "Public Read Products" ON alfa_products
    FOR SELECT TO anon, authenticated
    USING (available = TRUE AND is_archived = FALSE);

CREATE POLICY "Public Read Option Groups" ON alfa_option_groups
    FOR SELECT TO anon, authenticated
    USING (is_active = TRUE);

CREATE POLICY "Public Read Product Options" ON alfa_product_options
    FOR SELECT TO anon, authenticated
    USING (is_available = TRUE AND is_active = TRUE);

CREATE POLICY "Public Read Banners" ON alfa_banners
    FOR SELECT TO anon, authenticated
    USING (is_active = TRUE AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()));

CREATE POLICY "Public Read Neighborhoods" ON alfa_neighborhoods
    FOR SELECT TO anon, authenticated
    USING (is_available = TRUE);

-- 2. Pedidos, Clientes, Cupons privados, Sessões e Auditoria: BLOQUEADOS para acesso público direto
-- Somente o backend autenticado (service_role ou API Node.js via Cloud Run) tem acesso
CREATE POLICY "Service Role Full Access Records" ON records
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service Role Full Access Orders" ON orders
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service Role Full Access Audit" ON audit
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service Role Full Access Sessions" ON sessions
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service Role Full Access Settings" ON alfa_settings
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service Role Full Access Coupons" ON alfa_coupons
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
