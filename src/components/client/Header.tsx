import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../../types';
import { normalizePhone, openingStatus } from '../../domain/rules';
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  Phone,
  ShoppingCart,
  Search,
  Home,
  Menu,
  X,
  MessageCircle
} from 'lucide-react';
import { OperationalBar } from './OperationalBar';

interface HeaderProps {
  settings: StoreSettings;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  onNavigateMenuSection?: (section: 'home' | 'menu' | 'combos' | 'promos' | 'encomendas' | 'contato') => void;
  onSearchClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  cartCount,
  onOpenCart,
  onNavigateMenuSection,
  onSearchClick
}) => {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'home' | 'menu' | 'combos' | 'promos' | 'encomendas' | 'contato'>('home');
  const [, tick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => tick(v => v + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const status = openingStatus(settings);

  const navigate = (section: 'home' | 'menu' | 'combos' | 'promos' | 'encomendas' | 'contato') => {
    setActiveSection(section);
    setOpen(false);
    onNavigateMenuSection?.(section);
  };

  const phoneDigits = normalizePhone(settings.whatsapp);
  const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent('Olá! Gostaria de fazer um pedido.')}`;

  return (
    <header className="store-header">
      {/* 1. Faixa Superior Vermelha com Cidade, Status, Telefone e Redes */}
      <div className="utility-strip">
        <div className="store-container utility-inner">
          <div className="utility-left">
            <span className="location-label">
              <MapPin size={14} className="location-pin-icon" />
              <span>Vitória da Conquista, BA</span>
              <ChevronDown size={12} className="location-arrow-icon" />
            </span>

            <span className={`utility-status-pill ${status.isOpen ? 'pill-open' : 'pill-closed'}`}>
              <span className={`status-dot ${status.isOpen ? 'open' : ''}`} />
              <strong className="status-title">{status.isOpen ? 'Aberto' : 'Fechado'}</strong>
              <span className="status-separator">·</span>
              <span className="status-message">{status.message}</span>
            </span>
          </div>

          <div className="utility-right">
            <a href={`tel:+${phoneDigits}`} className="utility-phone-link" title="Ligar para a loja">
              <Phone size={13} />
              <span>{settings.whatsapp}</span>
            </a>

            <span className="utility-divider" aria-hidden="true">|</span>

            <div className="utility-social-links">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon-btn whatsapp"
                title="Fale conosco no WhatsApp"
                aria-label="WhatsApp"
              >
                <MessageCircle size={15} />
              </a>
              <a
                href={settings.instagram_url || 'https://instagram.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon-btn instagram"
                title="Siga-nos no Instagram"
                aria-label="Instagram"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Barra de Navegação Principal: Logo, Links em Pílula, Busca e Carrinho */}
      <div className="store-container navigation-inner">
        <button className="brand" onClick={() => navigate('home')} aria-label={`${settings.business_name || 'Alfa Salgados'}, início`}>
          <img
            src={settings.logo_url || '/brand.svg'}
            onError={event => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/brand.svg';
            }}
            alt={settings.business_name || 'Alfa Salgados'}
            width={52}
            height={52}
            className="brand-logo-img"
          />
          <div className="brand-text">
            <strong>{settings.business_name || 'ALFA SALGADOS'}</strong>
            <small>Cardápio Digital &amp; Delivery</small>
          </div>
        </button>

        <nav className="store-navigation" aria-label="Navegação principal">
          <button
            className={`nav-link-btn ${activeSection === 'home' ? 'nav-active-pill' : ''}`}
            onClick={() => navigate('home')}
          >
            <Home size={16} />
            <span>Início</span>
          </button>
          <button
            className={`nav-link-btn ${activeSection === 'menu' ? 'nav-active-pill' : ''}`}
            onClick={() => navigate('menu')}
          >
            Cardápio
          </button>
          <button
            className={`nav-link-btn ${activeSection === 'combos' ? 'nav-active-pill' : ''}`}
            onClick={() => navigate('combos')}
          >
            Combos
          </button>
          <button
            className={`nav-link-btn ${activeSection === 'encomendas' ? 'nav-active-pill' : ''}`}
            onClick={() => navigate('encomendas')}
          >
            Encomendas
          </button>
          <button
            className={`nav-link-btn ${activeSection === 'contato' ? 'nav-active-pill' : ''}`}
            onClick={() => navigate('contato')}
          >
            Contato
          </button>
        </nav>

        <div className="navigation-actions">
          <button
            className="header-search-btn"
            onClick={onSearchClick}
            aria-label="Buscar produtos no cardápio"
            title="Buscar no cardápio"
          >
            <Search size={20} />
          </button>

          <button
            className="header-cart-btn"
            onClick={onOpenCart}
            aria-label={`Carrinho com ${cartCount} itens`}
          >
            <ShoppingCart size={18} />
            <span className="cart-text">Carrinho ({cartCount})</span>
            <ChevronRight size={16} className="cart-chevron" />
          </button>

          <button
            className="menu-toggle"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="mobile-menu" aria-label="Menu móvel">
          <button
            className={activeSection === 'home' ? 'mobile-active' : ''}
            onClick={() => navigate('home')}
          >
            <Home size={16} /> Início
          </button>
          <button
            className={activeSection === 'menu' ? 'mobile-active' : ''}
            onClick={() => navigate('menu')}
          >
            Cardápio
          </button>
          <button
            className={activeSection === 'combos' ? 'mobile-active' : ''}
            onClick={() => navigate('combos')}
          >
            Combos e centos
          </button>
          <button
            className={activeSection === 'encomendas' ? 'mobile-active' : ''}
            onClick={() => navigate('encomendas')}
          >
            Encomendas
          </button>
          <button
            className={activeSection === 'contato' ? 'mobile-active' : ''}
            onClick={() => navigate('contato')}
          >
            Contato
          </button>
        </nav>
      )}

      {/* 3. Barra Flutuante com Informações Operacionais da Loja */}
      <OperationalBar settings={settings} />
    </header>
  );
};
