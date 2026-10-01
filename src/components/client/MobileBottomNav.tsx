import React from 'react';
import { Home, Utensils, Clock, ShoppingBag } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: 'home' | 'menu' | 'orders' | 'cart';
  onSelectTab: (tab: 'home' | 'menu' | 'orders' | 'cart') => void;
  cartCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  cartCount
}) => {
  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        zIndex: 45,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)'
      }}
    >
      <button
        onClick={() => onSelectTab('home')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: 'none',
          color: currentTab === 'home' ? 'var(--color-primary)' : '#64748b',
          fontSize: '0.72rem',
          fontWeight: currentTab === 'home' ? 800 : 500,
          cursor: 'pointer',
          padding: '4px 12px'
        }}
      >
        <Home size={20} />
        <span>Início</span>
      </button>

      <button
        onClick={() => onSelectTab('menu')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: 'none',
          color: currentTab === 'menu' ? 'var(--color-primary)' : '#64748b',
          fontSize: '0.72rem',
          fontWeight: currentTab === 'menu' ? 800 : 500,
          cursor: 'pointer',
          padding: '4px 12px'
        }}
      >
        <Utensils size={20} />
        <span>Cardápio</span>
      </button>

      <button
        onClick={() => onSelectTab('orders')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: 'none',
          color: currentTab === 'orders' ? 'var(--color-primary)' : '#64748b',
          fontSize: '0.72rem',
          fontWeight: currentTab === 'orders' ? 800 : 500,
          cursor: 'pointer',
          padding: '4px 12px'
        }}
      >
        <Clock size={20} />
        <span>Pedidos</span>
      </button>

      <button
        onClick={() => onSelectTab('cart')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: 'none',
          color: currentTab === 'cart' ? 'var(--color-primary)' : '#64748b',
          fontSize: '0.72rem',
          fontWeight: currentTab === 'cart' ? 800 : 500,
          cursor: 'pointer',
          padding: '4px 12px',
          position: 'relative'
        }}
      >
        <div style={{ position: 'relative' }}>
          <ShoppingBag size={20} />
          {cartCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -6,
              right: -8,
              background: 'var(--color-primary)',
              color: '#ffffff',
              borderRadius: '50%',
              width: 17,
              height: 17,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.68rem',
              fontWeight: 800,
              border: '2px solid #ffffff'
            }}>
              {cartCount}
            </span>
          )}
        </div>
        <span>Carrinho</span>
      </button>
    </nav>
  );
};
