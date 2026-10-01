import { apiState, refresh, logout, trackedOrder } from './services/api';
import { normalizePhone } from './domain/rules';
import { ConnectionNotice } from './components/ConnectionNotice';
import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import {
  Product,
  Category,
  CartItem,
  Order,
  OrderStatus,
  StoreSettings
} from './types';
import { StorageService, subscribeToStorage } from './services/storageService';
import { playNewOrderSound } from './utils/sound';
import { applyThemeColor } from './utils/theme';

// Client Components
import { Header } from './components/client/Header';
import { HeroSection } from './components/client/HeroSection';
import { CategoryBar } from './components/client/CategoryBar';
import { ProductCard } from './components/client/ProductCard';
import { ProductDetailModal } from './components/client/ProductDetailModal';
import { CartDrawer } from './components/client/CartDrawer';
import { CheckoutModal } from './components/client/CheckoutModal';
import { OrderTracker } from './components/client/OrderTracker';
import { MobileBottomNav } from './components/client/MobileBottomNav';

// Admin Components
import { AdminSidebar, AdminTab } from './components/admin/AdminSidebar';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
const DashboardTab = lazy(() => import('./components/admin/DashboardTab').then(module => ({ default: module.DashboardTab })));
const OrdersManagerTab = lazy(() => import('./components/admin/OrdersManagerTab').then(module => ({ default: module.OrdersManagerTab })));
const ScheduleTab = lazy(() => import('./components/admin/ScheduleTab').then(module => ({ default: module.ScheduleTab })));
const ProductsTab = lazy(() => import('./components/admin/ProductsTab').then(module => ({ default: module.ProductsTab })));
const CategoriesTab = lazy(() => import('./components/admin/CategoriesTab').then(module => ({ default: module.CategoriesTab })));
const BannersTab = lazy(() => import('./components/admin/BannersTab').then(module => ({ default: module.BannersTab })));
const NeighborhoodsTab = lazy(() => import('./components/admin/NeighborhoodsTab').then(module => ({ default: module.NeighborhoodsTab })));
const CouponsTab = lazy(() => import('./components/admin/CouponsTab').then(module => ({ default: module.CouponsTab })));
const CustomersTab = lazy(() => import('./components/admin/CustomersTab').then(module => ({ default: module.CustomersTab })));
const SettingsTab = lazy(() => import('./components/admin/SettingsTab').then(module => ({ default: module.SettingsTab })));
const ThermalReceipt = lazy(() => import('./components/admin/ThermalReceipt').then(module => ({ default: module.ThermalReceipt })));

import { Search, ShoppingBag, ShieldCheck, Heart, MapPin, Phone, Clock, MessageCircle, Globe, X, Flame, Sparkles, Menu as MenuIcon } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation / View state
  const [currentView, setCurrentView] = useState<'store' | 'admin'>(() => {
    return window.location.pathname.startsWith('/admin') ? 'admin' : 'store';
  });
  const [adminTab, setAdminTab] = useState<AdminTab>('orders');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(apiState().admin);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAdminMobileOpen, setIsAdminMobileOpen] = useState(false);
  const [isAdminSidebarCollapsed, setIsAdminSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('alfa_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleAdminSidebar = () => {
    setIsAdminSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('alfa_admin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Live Database State from StorageService
  const [settings, setSettings] = useState<StoreSettings>(() => StorageService.getSettings());
  const [categories, setCategories] = useState<Category[]>(() => StorageService.getCategories());
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [neighborhoods, setNeighborhoods] = useState(() => StorageService.getNeighborhoods());
  const [orders, setOrders] = useState<Order[]>(() => StorageService.getOrders());

  // Client App State with Cart Persistence (Section 8)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [filterOnlyPromos, setFilterOnlyPromos] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('alfa_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  useEffect(() => {
    let running = false;
    const timer = setInterval(() => { if (running) return; running = true; void refresh().catch(() => {}).finally(() => { running = false; }); }, currentView === 'admin' ? 6000 : 30000);
    return () => clearInterval(timer);
  }, [currentView]);
  useEffect(() => {
    if (!trackingOrder) return;
    const id = trackingOrder.id;
    const timer = setInterval(() => { void trackedOrder(id).then(order => { if (order) setTrackingOrder(order); }).catch(() => {}); }, 5000);
    return () => clearInterval(timer);
  }, [trackingOrder?.id]);

  // Admin Print Modal State & Audio chime
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const st = StorageService.getSettings();
      return st.order_sound_enabled !== false;
    } catch {
      return true;
    }
  });
  const prevPendingCountRef = useRef(orders.filter(o => o.status === 'pending' || o.status === 'new').length);

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    const curr = StorageService.getSettings();
    StorageService.updateSettings({ ...curr, order_sound_enabled: nextVal });
  };

  // Save cart changes to localStorage (Section 8)
  useEffect(() => {
    try {
      localStorage.setItem('alfa_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Error saving cart to localStorage', e);
    }
  }, [cart]);

  // Subscribe to storage mutations for reactive sync across tabs
  useEffect(() => {
    const unsubscribe = subscribeToStorage(() => {
      const newOrders = StorageService.getOrders();
      const currentPending = newOrders.filter(o => o.status === 'pending' || o.status === 'new').length;

      // Play chime if new pending orders arrived
      if (soundEnabled && currentPending > prevPendingCountRef.current) {
        const freshSettings = StorageService.getSettings();
        if (freshSettings.order_sound_enabled !== false) {
          playNewOrderSound(
            freshSettings.order_sound_type || 'bell',
            freshSettings.order_sound_duration || 5,
            (freshSettings.order_sound_volume ?? 85) / 100
          );
        }
      }
      prevPendingCountRef.current = currentPending;

      setSettings(StorageService.getSettings());
      setCategories(StorageService.getCategories());
      setProducts(StorageService.getProducts());
      setNeighborhoods(StorageService.getNeighborhoods());
      setOrders(newOrders);
      setIsAdminAuthenticated(apiState().admin);
    });
    return unsubscribe;
  }, [soundEnabled]);

  // Apply dynamic theme color on startup and settings update
  useEffect(() => {
    applyThemeColor(settings);
  }, [settings.primary_color, settings.secondary_color, settings.bg_color, settings.text_color, settings.palette_id]);

  // Sync URL changes
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(window.location.pathname.startsWith('/admin') ? 'admin' : 'store');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (view: 'store' | 'admin') => {
    setCurrentView(view);
    const path = view === 'admin' ? '/admin' : '/';
    window.history.pushState(null, '', path);
  };

  // Cart operations
  const handleAddToCart = (item: CartItem) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(i =>
        i.product.id === item.product.id &&
        JSON.stringify(i.selectedOptions) === JSON.stringify(item.selectedOptions) &&
        i.notes === item.notes
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + item.quantity;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          totalPrice: updated[existingIdx].unitPrice * newQty
        };
        return updated;
      }
      return [...prev, item];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(id);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantity: newQty,
          totalPrice: item.unitPrice * newQty
        };
      }
      return item;
    }));
  };

  const handleRemoveCartItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Filter products for client view (apenas produtos ativos/disponíveis e não arquivados)
  const displayProducts = useMemo(() => {
    return products.filter(p => {
      if (p.is_archived || !p.available || !categories.some(c => c.id === p.category_id && c.is_available)) return false;
      if (filterOnlyPromos && (!p.promo_price || p.promo_price <= 0 || p.promo_price >= p.price)) return false;
      if (selectedCategoryId && p.category_id !== selectedCategoryId) return false;
      if (clientSearchTerm.trim()) {
        const term = clientSearchTerm.toLowerCase();
        return p.name.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term);
      }
      return true;
    });
  }, [products, categories, selectedCategoryId, clientSearchTerm, filterOnlyPromos]);

  // Group products by category when no specific category is filtered
  const productsByCategory = useMemo(() => {
    if (selectedCategoryId !== null || clientSearchTerm.trim() || filterOnlyPromos) {
      return null; // show single flat grid
    }
    const grouped: { category: Category; items: Product[] }[] = [];
    const availableCategories = categories.filter(c => c.is_available).sort((a, b) => a.sort_order - b.sort_order);

    availableCategories.forEach(cat => {
      const items = products.filter(p => !p.is_archived && p.available && p.category_id === cat.id);
      if (items.length > 0) {
        grouped.push({ category: cat, items });
      }
    });
    return grouped;
  }, [categories, products, selectedCategoryId, clientSearchTerm, filterOnlyPromos]);

  // Categorias ativas com produtos disponíveis para o cardápio público
  const clientCategories = useMemo(() => {
    return categories
      .filter(c => c.is_available && products.some(p => !p.is_archived && p.available && p.category_id === c.id))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [categories, products]);

  // Highlights / Most Popular Products for Homepage
  const featuredProducts = useMemo(() => {
    return products
      .filter(p => !p.is_archived && p.available && (!p.has_stock_control || (p.stock_quantity||0)>0) && categories.some(c=>c.id===p.category_id&&c.is_available) && (p.is_best_seller || p.is_highlight || p.product_mode === 'combo'))
      .sort((a,b)=>Number(!!b.is_highlight)-Number(!!a.is_highlight))
      .slice(0, 3);
  }, [products, categories]);

  const pendingOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'new').length;

  // Header Menu Navigation (Section 2)
  const handleNavigateMenu = (section: 'home' | 'menu' | 'combos' | 'promos' | 'encomendas' | 'contato') => {
    if (section === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSelectedCategoryId(null);
    } else if (section === 'menu') {
      const el = document.getElementById('cardapio-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      setSelectedCategoryId(null);
    } else if (section === 'combos') {
      const comboCat = categories.find(c => c.name.toLowerCase().includes('combo'));
      if (comboCat) setSelectedCategoryId(comboCat.id);
      const el = document.getElementById('cardapio-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'promos') {
      setFilterOnlyPromos(true);
      setSelectedCategoryId(null);
      const el = document.getElementById('cardapio-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'encomendas') {
      const encCat = categories.find(c =>
        c.name.toLowerCase().includes('porção') ||
        c.name.toLowerCase().includes('diversos') ||
        c.name.toLowerCase().includes('mini')
      );
      if (encCat) setSelectedCategoryId(encCat.id);
      const el = document.getElementById('cardapio-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'contato') {
      const el = document.getElementById('footer-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Mobile Bottom Navigation handler (Section 31)
  const handleMobileNavSelect = (tab: 'home' | 'menu' | 'orders' | 'cart') => {
    if (tab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'menu') {
      const el = document.getElementById('cardapio-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (tab === 'orders') {
      if (orders.length > 0) {
        setTrackingOrder(orders[0]);
      } else {
        alert('Nenhum pedido recente encontrado.');
      }
    } else if (tab === 'cart') {
      setIsCartOpen(true);
    }
  };

  // Render Admin View
  if (currentView === 'admin') {
    if (!isAdminAuthenticated) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <AdminLoginModal
            isOpen={true}
            onClose={() => navigateTo('store')}
            onLoginSuccess={() => { setIsAdminAuthenticated(true); setOrders(StorageService.getOrders()); setProducts(StorageService.getProducts()); }}
          />
        </div>
      );
    }

    return (
      <Suspense fallback={<main className="connection-screen">Carregando o painel…</main>}>
      <div className="admin-layout-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', flexDirection: 'column' }}>
        <ConnectionNotice />
        {/* Universal Admin Topbar with Hamburger Toggle */}
        <header className="admin-topbar"
          style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth <= 1024) {
                  setIsAdminMobileOpen(!isAdminMobileOpen);
                } else {
                  handleToggleAdminSidebar();
                }
              }}
              style={{
                backgroundColor: isAdminSidebarCollapsed ? '#fef2f2' : '#f8fafc',
                border: isAdminSidebarCollapsed ? '1.5px solid #fecaca' : '1px solid #cbd5e1',
                color: isAdminSidebarCollapsed ? '#dc2626' : '#1e293b',
                width: 38,
                height: 38,
                borderRadius: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              title={isAdminSidebarCollapsed ? 'Mostrar Menu Lateral (Expandir)' : 'Ocultar Menu Lateral (Recolher)'}
              aria-label="Alternar Menu Lateral"
            >
              <MenuIcon size={20} />
            </button>

            {/* When collapsed on desktop, show the brand mini logo */}
            {isAdminSidebarCollapsed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 10, borderRight: '1px solid #e2e8f0' }}>
                {settings.logo_url && (
                  <img
                    src={settings.logo_url}
                    alt="Logo"
                    style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--color-primary)', objectFit: 'cover' }}
                  />
                )}
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                  {settings.business_name}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {adminTab === 'dashboard' && 'Dashboard Geral'}
                {adminTab === 'orders' && 'Pedidos em Andamento (Kanban)'}
                {adminTab === 'schedule' && 'Agenda & Horários'}
                {adminTab === 'products' && 'Cardápio & Produtos'}
                {adminTab === 'categories' && 'Categorias de Produtos'}
                {adminTab === 'banners' && 'Banners Promocionais'}
                {adminTab === 'neighborhoods' && 'Bairros & Taxas de Entrega'}
                {adminTab === 'coupons' && 'Cupons & Descontos'}
                {adminTab === 'customers' && 'Clientes Cadastrados (LGPD)'}
                {adminTab === 'settings' && 'Configurações da Loja'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Audio chime status button */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 8,
                backgroundColor: soundEnabled ? '#f0fdf4' : '#f1f5f9',
                border: soundEnabled ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                color: soundEnabled ? '#15803d' : '#64748b',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title={soundEnabled ? 'Som de pedido ativado' : 'Som de pedido desativado'}
            >
              <span>{soundEnabled ? '🔔 Som Ativo' : '🔕 Sem Som'}</span>
            </button>

            {pendingOrdersCount > 0 && (
              <span style={{
                background: 'var(--color-primary, #dc2626)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: 9999
              }}>
                {pendingOrdersCount} pendente(s)
              </span>
            )}

            <button
              onClick={() => navigateTo('store')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span>Ver Cardápio</span>
            </button>
          </div>
        </header>

        <div style={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
          <AdminSidebar
            currentTab={adminTab}
            onSelectTab={setAdminTab}
            pendingOrdersCount={pendingOrdersCount}
            settings={settings}
            onGoToStore={() => navigateTo('store')}
            onLogout={() => {
              void logout().then(() => setIsAdminAuthenticated(false));
              navigateTo('store');
            }}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            isOpenOnMobile={isAdminMobileOpen}
            onCloseMobile={() => setIsAdminMobileOpen(false)}
            isCollapsed={isAdminSidebarCollapsed}
            onToggleCollapse={handleToggleAdminSidebar}
          />

          <main className="admin-content" style={{ flexGrow: 1, minWidth: 0 }}>
          {adminTab === 'dashboard' && (
            <DashboardTab
              orders={orders}
              products={products}
              onSelectOrder={() => setAdminTab('orders')}
            />
          )}

          {adminTab === 'orders' && (
            <OrdersManagerTab
              orders={orders}
              onUpdateStatus={(id, status) => { void StorageService.updateOrderStatus(id, status).catch(error => window.dispatchEvent(new CustomEvent('alfa-save', { detail: { status: 'error', message: error.message } }))); }}
              onPrintOrder={(ord) => setPrintingOrder(ord)}
              settings={settings}
            />
          )}

          {adminTab === 'schedule' && (
            <ScheduleTab
              orders={orders}
              onSelectOrder={() => setAdminTab('orders')}
            />
          )}

          {adminTab === 'products' && (
            <ProductsTab
              products={products}
              categories={categories}
            />
          )}

          {adminTab === 'categories' && (
            <CategoriesTab
              categories={categories}
            />
          )}

          {adminTab === 'banners' && (
            <BannersTab />
          )}

          {adminTab === 'neighborhoods' && (
            <NeighborhoodsTab
              neighborhoods={neighborhoods}
            />
          )}

          {adminTab === 'coupons' && (
            <CouponsTab
              coupons={StorageService.getCoupons()}
            />
          )}

          {adminTab === 'customers' && (
            <CustomersTab />
          )}

          {adminTab === 'settings' && (
            <SettingsTab
              settings={settings}
            />
          )}

          {/* Thermal Receipt Print Preview */}
          {printingOrder && (
            <ThermalReceipt
              order={printingOrder}
              settings={settings}
              onClose={() => setPrintingOrder(null)}
            />
          )}
        </main>
      </div>
    </div>
    </Suspense>
  );
}

  // Render Client Storefront View
  return (
    <div className="storefront" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#fcfaf7',
      paddingBottom: cart.length > 0 ? 130 : 70
    }}>
      {/* Storefront Header (Section 2) */}
      <Header
        settings={settings}
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={() => navigateTo('admin')}
        onNavigateMenuSection={handleNavigateMenu}
      />

      {/* Hero Section & Promotional Banners (Section 3 & 21) */}
      <HeroSection
        settings={settings}
        onSelectProduct={setSelectedProduct}
        onScrollToMenu={() => {
          setFilterOnlyPromos(false);
          const el = document.getElementById('cardapio-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onSelectCategory={(catId) => {
          setFilterOnlyPromos(false);
          setSelectedCategoryId(catId);
          const el = document.getElementById('cardapio-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onSelectPromos={() => {
          setFilterOnlyPromos(true);
          setSelectedCategoryId(null);
          const el = document.getElementById('cardapio-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Main Catalog Content */}
      <main id="cardapio-section" className="catalog-main">
        <div className="catalog-heading"><div><h2>Nosso cardápio</h2><p>Escolha seus favoritos e faça seu pedido.</p></div><div className="catalog-search"><Search size={18}/><input type="search" aria-label="Buscar no cardápio" placeholder="Buscar no cardápio..." value={clientSearchTerm} onChange={e=>setClientSearchTerm(e.target.value)}/>{clientSearchTerm&&<button onClick={()=>setClientSearchTerm('')} aria-label="Limpar busca"><X size={16}/></button>}</div></div>

        {/* Categories Bar (Section 4) */}
        <CategoryBar
          categories={clientCategories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(id) => {
            setFilterOnlyPromos(false);
            setSelectedCategoryId(id);
            setClientSearchTerm('');
          }}
        />

        {/* Promo Filter Chip */}
        {filterOnlyPromos && (
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '6px 14px',
              borderRadius: 9999,
              fontWeight: 800,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              🏷️ Mostrando Promoções & Descontos Especiais
            </span>
            <button
              onClick={() => setFilterOnlyPromos(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Ver cardápio completo
            </button>
          </div>
        )}

        {/* Quick Search Suggestion Chips (quando houver busca ativa ou como atalhos) */}
        {clientSearchTerm && (
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Filtrando por:</span>
            <span style={{
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              padding: '4px 12px',
              borderRadius: 9999,
              fontWeight: 700,
              fontSize: '0.84rem'
            }}>
              "{clientSearchTerm}"
            </span>
            <button
              onClick={() => setClientSearchTerm('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Limpar filtro
            </button>
          </div>
        )}

        {/* Os Mais Pedidos da Galera (Quando estiver na visão geral sem filtro de busca) */}
        {!clientSearchTerm && selectedCategoryId === null && featuredProducts.length > 0 && (
          <section className="catalog-featured" style={{ marginBottom: 40 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18
            }}>
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#dc2626',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  marginBottom: 3
                }}>
                  <Flame size={15} />
                  <span>Destaques da Alfa</span>
                </div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Destaques do cardápio
                </h2>
                <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '4px 0 0' }}>
                  Escolha a quantidade e personalize seus sabores.
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: 24
            }}>
              {featuredProducts.map(product => (
                <ProductCard
                  key={`feat-${product.id}`}
                  product={product}
                  onSelect={(p) => setSelectedProduct(p)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Product Sections */}
        {productsByCategory ? (
          /* Multi-Category grouped display */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {productsByCategory.map(({ category, items }) => (
              <section className="catalog-group" key={category.id} id={`category-${category.id}`}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 18,
                  borderBottom: '2px solid #f1f5f9',
                  paddingBottom: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      {category.name}
                    </h2>
                    <span style={{
                      fontSize: '0.78rem',
                      color: '#64748b',
                      fontWeight: 800,
                      backgroundColor: '#f1f5f9',
                      padding: '3px 10px',
                      borderRadius: 9999
                    }}>
                      {items.length} itens
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                  gap: 24
                }}>
                  {items.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={(p) => setSelectedProduct(p)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Single category or search result grid */
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                {clientSearchTerm ? `Resultados para "${clientSearchTerm}"` : 'Produtos'}
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                {displayProducts.length} produto(s) encontrado(s)
              </span>
            </div>

            {displayProducts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#94a3b8',
                backgroundColor: '#ffffff',
                borderRadius: 20,
                border: '1px solid #e2e8f0'
              }}>
                <Search size={48} strokeWidth={1.5} style={{ marginBottom: 12, color: '#cbd5e1' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569' }}>
                  Nenhum produto encontrado
                </h3>
                <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  Tente buscar por outro termo ou escolha uma categoria acima.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setClientSearchTerm('');
                    setSelectedCategoryId(null);
                  }}
                  className="btn btn-primary"
                  style={{ marginTop: 16, padding: '8px 18px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700 }}
                >
                  Ver Todos os Produtos
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                gap: 24
              }}>
                {displayProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={(p) => setSelectedProduct(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Informative / Trust Section */}
        <section style={{
          marginTop: 64,
          padding: '36px 28px',
          backgroundColor: '#ffffff',
          borderRadius: 24,
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 32px' }}>
            <span style={{
              color: '#dc2626',
              fontSize: '0.8rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Tradição e Compromisso
            </span>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 8px' }}>
              Por que pedir na Alfa Salgados?
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
              Levamos carinho, sabor e pontualidade para seus lanches, reuniões e eventos.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: 20
          }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Flame size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Receitas Tradicionais
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  Massa leve e douradinha, recheios fartos e tempero artesanal de família.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Clock size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Embalagem Térmica
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  Caixa térmica protetora que mantém os salgados crocantes e quentinhos até sua mesa.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Sparkles size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Agendamento de Eventos
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  Programe sua encomenda com dia e hora marcada para festas sem preocupação.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Qualidade Garantida
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  Ingredientes inspecionados de primeira linha e processo higiênico rigoroso.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Bottom Cart Bar (for Mobile & Desktop) */}
      {cart.length > 0 && (
        <div className="floating-cart-bar" style={{
          filter: 'drop-shadow(0 10px 25px var(--color-primary-glow))'
        }}>
          <button
            onClick={() => setIsCartOpen(true)}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 16,
              fontSize: '1rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 30px var(--color-primary-glow)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                background: '#ffffff',
                color: 'var(--color-primary-dark)',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem'
              }}>
                {cart.reduce((acc, i) => acc + i.quantity, 0)}
              </div>
              <span>Ver Carrinho</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  cart.reduce((acc, i) => acc + i.totalPrice, 0)
                )}
              </span>
              <ShoppingBag size={18} />
            </div>
          </button>
        </div>
      )}

      {/* Storefront Footer (Section 23) */}
      <footer className="store-footer" id="footer-section" style={{
        marginTop: 60,
        backgroundColor: '#0f172a',
        color: '#94a3b8',
        padding: '50px 16px 40px',
        borderTop: '1px solid #1e293b'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: 32,
          textAlign: 'left'
        }}>
          {/* Col 1: Brand */}
          <div>
            <h3 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 900, marginBottom: 8 }}>
              {settings.business_name}
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: 16 }}>
              {settings.business_description || 'Os melhores sabores se faz com carinho. Salgadinhos fritos na hora para suas comemorações.'}
            </p>
            {settings.cnpj && (
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                CNPJ: {settings.cnpj}
              </p>
            )}
          </div>

          {/* Col 2: Location & Hours */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
              Endereço & Atendimento
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
              <MapPin size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
              <span>{settings.store_address}, Nº {settings.store_address_number} - {settings.store_neighborhood}, Vitória da Conquista - BA</span>
            </p>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Clock size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <span>Entrega estimada em ~{settings.delivery_time_estimate || '40 min'}</span>
            </p>
          </div>

          {/* Col 3: Social & Contact */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
              Canais de Contato
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a
                href={`https://wa.me/${normalizePhone(settings.whatsapp || '77991947697')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#86efac', textDecoration: 'none', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <MessageCircle size={16} />
                <span>WhatsApp: {settings.whatsapp || '(77) 99194-7697'}</span>
              </a>

              {settings.instagram && (
                <a
                  href={`https://instagram.com/${settings.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#f472b6', textDecoration: 'none', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Globe size={16} />
                  <span>Instagram: {settings.instagram}</span>
                </a>
              )}

              <button
                onClick={() => navigateTo('admin')}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  width: 'fit-content',
                  marginTop: 8
                }}
              >
                <ShieldCheck size={14} />
                <span>Acesso Painel Administrativo</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{
          maxWidth: 1200,
          margin: '32px auto 0',
          paddingTop: 20,
          borderTop: '1px solid #1e293b',
          textAlign: 'center',
          fontSize: '0.78rem',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4
        }}>
          <span>Alfa Salgados Delivery &copy; {new Date().getFullYear()} • Plataforma Própria Independente</span>
          <Heart size={12} style={{ color: '#ef4444' }} />
        </div>
      </footer>

      {/* Fixed Mobile Bottom Nav (Section 31) */}
      <MobileBottomNav
        currentTab={isCartOpen ? "cart" : trackingOrder ? "orders" : "home"}
        onSelectTab={handleMobileNavSelect}
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)}
      />

      <ConnectionNotice />
      {/* Modals */}
      {selectedProduct && selectedProduct.available && !selectedProduct.is_archived && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        settings={settings}
        neighborhoods={neighborhoods}
        onOrderCompleted={(order) => {
          setCart([]);
          setTrackingOrder(order);
        }}
      />

      {trackingOrder && (
        <OrderTracker
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
          settings={settings}
        />
      )}
    </div>
  );
};
