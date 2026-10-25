import './shopping-design.css';
import './catalog-design.css';
import { sortCatalog, type CatalogSort } from './domain/catalogBrowse';
import './catalog-sorting.css';
import './product-availability.css';
import './selection-guidance.css';
import './product-editor-usability.css';
import './catalog-filter-tools.css';
import './order-filter-chips.css';
import './navigation-shortcuts.css';
import './ledger-search.css';
import './system-feedback.css';
import './financial-inputs.css';
import './system-tracking.css';
import './system-usability.css';
import { normalizeAdminSearch } from './domain/adminInput';
import './components/admin/admin-orders-workspace.css';
import './components/admin/admin-dashboard-overview.css';
import './components/admin/admin-catalog-agenda.css';
import './components/admin/admin-settings.css';
import './components/admin/admin-finance.css';
import './components/admin/admin-layout.css';
import './components/admin/admin-modern.css';
import './components/admin/admin-usability.css';
import './components/admin/admin-workspaces.css';
import './components/admin/admin-campaigns.css';
import './components/client/storefront-modern.css';
import './storefront-refresh.css';
import './artisan-premium.css';
import './admin-premium.css';
import './theme-contrast.css';
import './theme-preview.css';
import './growth-workspace.css';
import './catalog-layout.css';
import { CatalogBenefits } from './components/client/CatalogBenefits';
import { CatalogSpotlight } from './components/client/CatalogSpotlight';
import { LiveSync } from './components/LiveSync';
import { cache } from './services/api';
import { AdminWorkspaceTools } from './components/admin/AdminWorkspaceTools';
import { ADMIN_PAGES } from './components/admin/adminPages';
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
const ProductDetailModal = lazy(() => import('./components/client/ProductDetailModal').then(module => ({ default: module.ProductDetailModal })));
import { CartDrawer } from './components/client/CartDrawer';
const CheckoutModal = lazy(() => import('./components/client/CheckoutModal').then(module => ({ default: module.CheckoutModal })));
const OrderTracker = lazy(() => import('./components/client/OrderTracker').then(module => ({ default: module.OrderTracker })));
import { MobileBottomNav } from './components/client/MobileBottomNav';
import { ErrorBoundary } from './components/common/ErrorBoundary';

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
const SalesTab = lazy(() => import('./components/admin/SalesTab').then(module => ({ default: module.SalesTab })));
const ReportsTab = lazy(() => import('./components/admin/ReportsTab').then(module => ({ default: module.ReportsTab })));
const ExpensesTab = lazy(() => import('./components/admin/ExpensesTab').then(module => ({ default: module.ExpensesTab })));
const SettingsTab = lazy(() => import('./components/admin/SettingsTab').then(module => ({ default: module.SettingsTab })));
const ThermalReceipt = lazy(() => import('./components/admin/ThermalReceipt').then(module => ({ default: module.ThermalReceipt })));

import { Search, ShoppingBag, ShieldCheck, Heart, MapPin, Phone, Clock, MessageCircle, Globe, X, Flame, Sparkles, LayoutGrid, List, Menu as MenuIcon } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation / View state
  const [currentView, setCurrentView] = useState<'store' | 'admin'>(() => {
    return window.location.pathname.startsWith('/admin') ? 'admin' : 'store';
  });
  const [adminTab, setAdminTab] = useState<AdminTab>('orders');
  const focusedAdminTab=useRef<AdminTab|null>(null);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(apiState().admin);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAdminMobileOpen, setIsAdminMobileOpen] = useState(false);
  const [isAdminCompact, setIsAdminCompact] = useState(() => window.innerWidth <= 1024);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)');
    const update = () => setIsAdminCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
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

  // Keep the mobile navigation predictable for keyboard and touch users.
  useEffect(() => {
    if (!isAdminMobileOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAdminMobileOpen(false);
    };
    document.addEventListener('keydown', onEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isAdminMobileOpen]);

  // Live Database State from StorageService
  const [settings, setSettings] = useState<StoreSettings>(() => StorageService.getSettings());
  const [categories, setCategories] = useState<Category[]>(() => StorageService.getCategories());
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [neighborhoods, setNeighborhoods] = useState(() => StorageService.getNeighborhoods());
  const [orders, setOrders] = useState<Order[]>(() => StorageService.getOrders());

  // Client App State with Cart Persistence (Section 8)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [clientCatalogSort] = useState<CatalogSort>('recommended');
  const [filterOnlyPromos, setFilterOnlyPromos] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('alfa_catalog_view') as 'grid' | 'list') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleSetCatalogViewMode = (mode: 'grid' | 'list') => {
    setCatalogViewMode(mode);
    try {
      localStorage.setItem('alfa_catalog_view', mode);
    } catch {}
  };
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
  useEffect(() => { setSelectedProduct(previous => previous ? products.find(p=>p.id===previous.id && p.available && !p.is_archived && categories.some(c=>c.id===p.category_id&&c.is_available)) || null : null); }, [products, categories]);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutVisited,setCheckoutVisited]=useState(false);
  useEffect(()=>{if(isCheckoutOpen)setCheckoutVisited(true);},[isCheckoutOpen]);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  useEffect(() => {
    if (!trackingOrder) return;
    const id = trackingOrder.id;
    let active = true;
    const timer = setInterval(() => { void trackedOrder(id).then(order => { if (active && order) setTrackingOrder(order); }).catch(() => {}); }, 5000);
    return () => { active = false; clearInterval(timer); };
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
    void StorageService.updateSettings({ ...curr, order_sound_enabled: nextVal }).catch(() => setSoundEnabled(!nextVal));
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

      setSettings(prev => {
        const fresh = StorageService.getSettings();
        return JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh;
      });
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
      // Se o item já existia no carrinho e estava sendo editado, atualiza no mesmo lugar
      const editingIdx = prev.findIndex(i => i.id === item.id);
      if (editingIdx >= 0) {
        const updated = [...prev];
        updated[editingIdx] = item;
        return updated;
      }

      // Senão verifica se já há um item idêntico (mesmas opções e observações)
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
    setEditingCartItem(null);
    setIsCartOpen(true);
  };

  const handleEditCartItem = (item: CartItem) => {
    setIsCartOpen(false);
    setEditingCartItem(item);
    setSelectedProduct(item.product);
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
    return sortCatalog(products.filter(p => {
      if (p.is_archived || !p.available || !categories.some(c => c.id === p.category_id && c.is_available)) return false;
      if (filterOnlyPromos && (!p.promo_price || p.promo_price <= 0 || p.promo_price >= p.price)) return false;
      if (selectedCategoryId && p.category_id !== selectedCategoryId) return false;
      if (clientSearchTerm.trim()) {
        const term = normalizeAdminSearch(clientSearchTerm);
        return normalizeAdminSearch(p.name).includes(term) || normalizeAdminSearch(p.description || '').includes(term);
      }
      return true;
    }), clientCatalogSort);
  }, [products, categories, selectedCategoryId, clientSearchTerm, filterOnlyPromos, clientCatalogSort]);

  // Group products by category when no specific category is filtered
  const productsByCategory = useMemo(() => {
    if (clientCatalogSort !== 'recommended' || selectedCategoryId !== null || clientSearchTerm.trim() || filterOnlyPromos) {
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
  }, [categories, products, selectedCategoryId, clientSearchTerm, filterOnlyPromos, clientCatalogSort]);

  // Categorias ativas com produtos disponíveis para o cardápio público
  const clientCategories = useMemo(() => {
    return categories
      .filter(c => c.is_available && products.some(p => !p.is_archived && p.available && p.category_id === c.id))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [categories, products]);

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => { try { const value=JSON.parse(localStorage.getItem('alfa_favorites')||'[]'); return Array.isArray(value)?value.filter((x:unknown)=>typeof x==='string'):[]; } catch { return []; } });
  const toggleFavorite = (id: string) => setFavoriteIds(previous => { const next=previous.includes(id)?previous.filter(x=>x!==id):[...previous,id]; try { localStorage.setItem('alfa_favorites',JSON.stringify(next)); } catch {} return next; });

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
      <div className={`admin-layout-container admin-shell admin-theme-light`} style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--admin-theme-page)', flexDirection: 'column' }}>
        <a className="admin-skip-link" href="#admin-main-content">Ir para o conteúdo</a>
        <ConnectionNotice />
        {/* Universal Admin Topbar with Hamburger Toggle */}
        <LiveSync admin={true}/>
        <header className="admin-topbar"
          style={{
            backgroundColor: 'var(--admin-theme-surface)',
            color: 'var(--admin-theme-text)',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--admin-theme-border)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div className="admin-topbar-context" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                if (isAdminCompact) {
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
              aria-label={isAdminMobileOpen ? "Fechar menu administrativo" : "Alternar menu administrativo"}
              aria-expanded={isAdminCompact ? isAdminMobileOpen : !isAdminSidebarCollapsed}
              aria-controls="admin-navigation"
            >
              <MenuIcon size={20} />
            </button>

            {/* When collapsed on desktop, show the brand mini logo */}
            {isAdminSidebarCollapsed && !isAdminCompact && (
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

            <div className="admin-location">
              <small>Painel / {ADMIN_PAGES[adminTab].group}</small>
              <strong>{ADMIN_PAGES[adminTab].title}</strong>
            </div>
          </div>

          <div className="admin-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AdminWorkspaceTools currentTab={adminTab} onNavigate={tab => { setAdminTab(tab); setIsAdminMobileOpen(false); }} />
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
              className="admin-topbar-sound"
              aria-pressed={soundEnabled}
              title={soundEnabled ? 'Som de pedido ativado' : 'Som de pedido desativado'}
            >
              <span>{soundEnabled ? '🔔 Som Ativo' : '🔕 Sem Som'}</span>
            </button>

            {pendingOrdersCount > 0 && (
              <span className="admin-pending-count" style={{
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
              className="admin-store-link"
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

        <div className="admin-layout-container" style={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
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

          <main ref={node=>{if(node&&focusedAdminTab.current!==adminTab){node.scrollTop=0;node.focus({preventScroll:true});focusedAdminTab.current=adminTab;}}} id="admin-main-content" data-admin-page={adminTab} tabIndex={-1} className="admin-content" style={{ flexGrow: 1, minWidth: 0 }}>
          {adminTab === 'dashboard' && (
            <DashboardTab
              orders={orders}
              products={products}
              onSelectOrder={() => setAdminTab('orders')}
            />
          )}

          {adminTab === 'orders' && (
            <OrdersManagerTab
              onNewOrder={() => navigateTo('store')}
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
              onPrintOrder={(ord) => setPrintingOrder(ord)}
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
          {adminTab === 'sales' && (
            <SalesTab products={products} />
          )}

          {adminTab === 'expenses' && (<ExpensesTab />)}

          {adminTab === 'reports' && (
            <ReportsTab orders={orders} />
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
      <a className="store-skip-link" href="#cardapio-section">Ir para o cardápio</a>
      {/* Storefront Header (Section 2) */}
      <LiveSync admin={false}/>
      <Header
        settings={settings}
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={() => navigateTo('admin')}
        onNavigateMenuSection={handleNavigateMenu}
        onSearchClick={() => {
          setFilterOnlyPromos(false);
          const el = document.getElementById('cardapio-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
          const searchInput = document.querySelector('input[aria-label="Buscar no cardápio"]') as HTMLInputElement;
          searchInput?.focus();
        }}
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

      <CatalogBenefits offers={cache.alfa_public_offers || []} program={cache.alfa_loyalty_program} />
      {/* Main Catalog Content */}
      <main id="cardapio-section" className="catalog-main" tabIndex={-1}>
        <div className="catalog-heading">
          <div>
            <span className="catalog-eyebrow">ESCOLHA. PERSONALIZE. APROVEITE.</span>
            <h2>O que vai ser hoje?</h2>
            <p>Escolha seus favoritos e faça seu pedido.</p>
          </div>
          <div className="catalog-toolbar">
            <div className="catalog-search">
              <Search size={18}/>
              <input
                type="search"
                aria-label="Buscar no cardápio"
                placeholder="Buscar no cardápio..."
                value={clientSearchTerm}
                onChange={e=>setClientSearchTerm(e.target.value)}
              />
              {clientSearchTerm && (
                <button onClick={()=>setClientSearchTerm('')} aria-label="Limpar busca">
                  <X size={16}/>
                </button>
              )}
            </div>

            <div className="catalog-view-toggle" role="group" aria-label="Modo de exibição do cardápio">
              <span className="catalog-view-label">Visualizar:</span>
              <div className="catalog-view-options">
                <button
                  type="button"
                  className={`catalog-view-btn ${catalogViewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => handleSetCatalogViewMode('grid')}
                  aria-pressed={catalogViewMode === 'grid'}
                  title="Visualizar em cards"
                >
                  <LayoutGrid size={16} aria-hidden="true" />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  className={`catalog-view-btn ${catalogViewMode === 'list' ? 'active' : ''}`}
                  onClick={() => handleSetCatalogViewMode('list')}
                  aria-pressed={catalogViewMode === 'list'}
                  title="Visualizar em Lista"
                >
                  <List size={16} aria-hidden="true" />
                  <span>Lista</span>
                </button>
              </div>
            </div>
          </div>
        </div>

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

        <div className="catalog-result-summary" role="status" aria-live="polite"><span>{displayProducts.length} {displayProducts.length === 1 ? 'opção no cardápio' : 'opções no cardápio'}</span><small>Toque em um produto para ver os detalhes</small></div>

        {(clientSearchTerm.trim()||selectedCategoryId!==null||filterOnlyPromos)&&<div className="catalog-filter-summary" role="group" aria-label="Filtros ativos do cardápio">
          {clientSearchTerm.trim()&&<button type="button" onClick={()=>setClientSearchTerm('')} aria-label={`Remover busca do cardápio: ${clientSearchTerm.trim()}`}><span>Busca: {clientSearchTerm.trim()}</span><span aria-hidden="true">×</span></button>}
          {selectedCategoryId!==null&&<button type="button" onClick={()=>setSelectedCategoryId(null)} aria-label="Remover categoria do cardápio"><span>Categoria: {categories.find(c=>c.id===selectedCategoryId)?.name||'Selecionada'}</span><span aria-hidden="true">×</span></button>}
          {filterOnlyPromos&&<button type="button" onClick={()=>setFilterOnlyPromos(false)} aria-label="Remover filtro de ofertas"><span>Somente ofertas</span><span aria-hidden="true">×</span></button>}
          <button type="button" className="catalog-clear-all" onClick={()=>{setClientSearchTerm('');setSelectedCategoryId(null);setFilterOnlyPromos(false);}}>Limpar filtros do cardápio</button>
        </div>}

        {!clientSearchTerm && selectedCategoryId === null && <CatalogSpotlight products={products} categories={categories} bestsellingIds={cache.alfa_bestsellers||[]} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} onSelect={setSelectedProduct} />}
        {/* Os Mais Pedidos da Galera (Quando estiver na visão geral sem filtro de busca) */}
        {clientCatalogSort==='recommended' && !clientSearchTerm && selectedCategoryId === null && featuredProducts.length > 0 && (
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
                <h2 className="artisan-section-title">
                  Destaques do cardápio
                </h2>
                <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '4px 0 0' }}>
                  Escolha a quantidade e personalize seus sabores.
                </p>
              </div>
            </div>

            <div className={`catalog-products-grid ${catalogViewMode === 'list' ? 'view-list' : ''}`}>
              {featuredProducts.map(product => (
                <ProductCard
                  key={`feat-${product.id}`}
                  product={product}
                  isFavorite={favoriteIds.includes(product.id)} onToggleFavorite={toggleFavorite}
                  viewMode={catalogViewMode}
                  onSelect={(p) => setSelectedProduct(p)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Product Sections */}
        {productsByCategory && displayProducts.length>0 ? (
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
                    <h2 className="artisan-section-title">
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

                <div className={`catalog-products-grid ${catalogViewMode === 'list' ? 'view-list' : ''}`}>
                  {items.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                  isFavorite={favoriteIds.includes(product.id)} onToggleFavorite={toggleFavorite}
                      viewMode={catalogViewMode}
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
                    setFilterOnlyPromos(false);
                  }}
                  className="btn btn-primary"
                  style={{ marginTop: 16, padding: '8px 18px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700 }}
                >
                  Ver Todos os Produtos
                </button>
              </div>
            ) : (
              <div className={`catalog-products-grid ${catalogViewMode === 'list' ? 'view-list' : ''}`}>
                {displayProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  isFavorite={favoriteIds.includes(product.id)} onToggleFavorite={toggleFavorite}
                    viewMode={catalogViewMode}
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
              <span>
                Ver Sacola • {cart.reduce((acc, i) => acc + i.quantity, 0)} {cart.reduce((acc, i) => acc + i.quantity, 0) === 1 ? 'item' : 'itens'}
              </span>
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

      {/* Storefront Footer / Card da Barra de Rodapé (Configurável no Painel) */}
      {(settings.footer_enabled ?? true) && (
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
            {((settings.footer_show_business_name ?? true) || (settings.footer_show_slogan ?? true) || ((settings.footer_show_cnpj ?? true) && settings.cnpj)) && (
              <div>
                {(settings.footer_show_business_name ?? true) && (
                  <h3 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 900, marginBottom: 8 }}>
                    {settings.business_name}
                  </h3>
                )}
                {(settings.footer_show_slogan ?? true) && (
                  <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: 16 }}>
                    {settings.business_description || 'Os melhores sabores se faz com carinho. Salgadinhos fritos na hora para suas comemorações.'}
                  </p>
                )}
                {(settings.footer_show_cnpj ?? true) && settings.cnpj && (
                  <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    CNPJ: {settings.cnpj}
                  </p>
                )}
              </div>
            )}

            {/* Col 2: Location & Hours */}
            {((settings.footer_show_address_title ?? true) || (settings.footer_show_address ?? true) || (settings.footer_show_delivery_estimate ?? true)) && (
              <div>
                {(settings.footer_show_address_title ?? true) && (
                  <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
                    Endereço & Atendimento
                  </h4>
                )}
                {(settings.footer_show_address ?? true) && (
                  <p style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                    <MapPin size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                    <span>{settings.store_address}, Nº {settings.store_address_number} - {settings.store_neighborhood}, Vitória da Conquista - BA</span>
                  </p>
                )}
                {(settings.footer_show_delivery_estimate ?? true) && (
                  <p style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Clock size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <span>Entrega estimada em ~{settings.delivery_time_estimate || '40 min'}</span>
                  </p>
                )}
              </div>
            )}

            {/* Col 3: Social & Contact */}
            {((settings.footer_show_contact_title ?? true) || (settings.footer_show_whatsapp ?? true) || ((settings.footer_show_instagram ?? true) && settings.instagram) || (settings.footer_show_admin_link ?? true)) && (
              <div>
                {(settings.footer_show_contact_title ?? true) && (
                  <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
                    Canais de Contato
                  </h4>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(settings.footer_show_whatsapp ?? true) && (
                    <a
                      href={`https://wa.me/${normalizePhone(settings.whatsapp || '77991947697')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#86efac', textDecoration: 'none', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <MessageCircle size={16} />
                      <span>WhatsApp: {settings.whatsapp || '(77) 99194-7697'}</span>
                    </a>
                  )}

                  {(settings.footer_show_instagram ?? true) && settings.instagram && (
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

                  {(settings.footer_show_admin_link ?? true) && (
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
                  )}
                </div>
              </div>
            )}
          </div>

          {(settings.footer_show_copyright ?? true) && (
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
              <span>{settings.footer_copyright_text || `Alfa Salgados Delivery © ${new Date().getFullYear()} • Plataforma Própria Independente`}</span>
              <Heart size={12} style={{ color: '#ef4444' }} />
            </div>
          )}
        </footer>
      )}

      {/* Fixed Mobile Bottom Nav (Section 31) */}
      <MobileBottomNav
        currentTab={isCartOpen ? "cart" : trackingOrder ? "orders" : "home"}
        onSelectTab={handleMobileNavSelect}
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)}
      />

      <ConnectionNotice />
      {/* Modals */}
      {selectedProduct && selectedProduct.available && !selectedProduct.is_archived && (
        <ErrorBoundary fallbackTitle="Erro ao abrir personalização" onReset={() => setSelectedProduct(null)}>
          <Suspense fallback={<div className="modal-loading" role="status">Carregando produto…</div>}>
          <ProductDetailModal
            key={selectedProduct.id}
            product={selectedProduct}
            editingItem={editingCartItem}
            onClose={() => {
              setSelectedProduct(null);
              setEditingCartItem(null);
            }}
            onAddToCart={handleAddToCart}
          />
          </Suspense>
        </ErrorBoundary>
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onEditItem={handleEditCartItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {(isCheckoutOpen||checkoutVisited)&&<ErrorBoundary fallbackTitle="Erro na finalização do pedido" onReset={() => setIsCheckoutOpen(false)}>
        <Suspense fallback={isCheckoutOpen?<div className="modal-loading" role="status">Carregando finalização…</div>:null}>
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
        </Suspense>
      </ErrorBoundary>}

      {trackingOrder && (
        <Suspense fallback={<div className="modal-loading" role="status">Carregando acompanhamento…</div>}>
        <OrderTracker
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
          settings={settings}
        />
        </Suspense>
      )}
    </div>
  );
};
