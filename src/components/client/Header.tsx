import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../../types';
import { openingStatus, normalizePhone } from '../../domain/rules';
import { MapPin, ShoppingCart, Menu, X, Phone } from 'lucide-react';

interface HeaderProps {
  settings: StoreSettings;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  onNavigateMenuSection?: (section: 'home' | 'menu' | 'combos' | 'promos' | 'encomendas' | 'contato') => void;
}

export const Header: React.FC<HeaderProps> = ({ settings, cartCount, onOpenCart, onNavigateMenuSection }) => {
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => tick(v => v + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const status = openingStatus(settings);
  const navigate = (section: any) => {
    setOpen(false);
    onNavigateMenuSection?.(section);
  };

  return (
    <header className="store-header">
      <div className="utility-strip">
        <div className="store-container utility-inner">
          <span className="store-status">
            <span className={status.isOpen ? 'status-dot open' : 'status-dot'} />
            {status.isOpen ? 'Aberto agora' : 'Fechado'}
            <span className="status-detail"> · {status.message}</span>
          </span>
          <span className="location-label">
            <MapPin size={14} /> Vitória da Conquista, BA
          </span>
          <a href={`tel:+${normalizePhone(settings.whatsapp)}`}>
            <Phone size={14} /> {settings.whatsapp}
          </a>
        </div>
      </div>

      <div className="store-container navigation-inner">
        <button className="brand" onClick={() => navigate('home')} aria-label="Alfa Salgados, início">
          <img
            src={settings.logo_url || '/brand.svg'}
            onError={event => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/brand.svg';
            }}
            alt="Alfa Salgados"
            width={48}
            height={48}
          />
          <span>
            <strong>{settings.business_name || 'ALFA SALGADOS'}</strong>
            <small>Cardápio Digital &amp; Delivery</small>
          </span>
        </button>

        <nav className="store-navigation" aria-label="Navegação principal">
          <button onClick={() => navigate('menu')}>Cardápio</button>
          <button onClick={() => navigate('combos')}>Combos</button>
          <button onClick={() => navigate('encomendas')}>Encomendas</button>
          <button onClick={() => navigate('contato')}>Contato</button>
        </nav>

        <div className="navigation-actions">
          <button className="header-cart" onClick={onOpenCart} aria-label={`Carrinho com ${cartCount} itens`}>
            <ShoppingCart size={18} />
            <span>Carrinho ({cartCount})</span>
          </button>
          <button
            className="menu-toggle"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="mobile-menu" aria-label="Menu móvel">
          <button onClick={() => navigate('menu')}>Cardápio</button>
          <button onClick={() => navigate('combos')}>Combos e centos</button>
          <button onClick={() => navigate('encomendas')}>Encomendas</button>
          <button onClick={() => navigate('contato')}>Contato</button>
        </nav>
      )}
    </header>
  );
};
