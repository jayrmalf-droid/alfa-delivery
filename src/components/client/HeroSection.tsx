import React, { useState } from 'react';
import type { StoreSettings, Product, PromoBanner } from '../../types';
import { StorageService } from '../../services/storageService';
import { normalizePhone, productPrice } from '../../domain/rules';
import { formatCurrency } from '../../utils/formatters';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Truck,
  CreditCard,
  Package,
  Flame,
  Bike,
  Tag,
  Percent,
  Sparkles
} from 'lucide-react';

interface Props {
  settings: StoreSettings;
  onScrollToMenu: () => void;
  onSelectCategory?: (id: string) => void;
  onSelectProduct?: (product: Product) => void;
  onSelectPromos?: () => void;
}

const externalLink = (value?: string) => {
  try {
    const url = new URL(value || '');
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

export const HeroSection: React.FC<Props> = ({
  settings,
  onScrollToMenu,
  onSelectCategory,
  onSelectProduct,
  onSelectPromos
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<string[]>([]);

  const products = StorageService.getProducts();
  const categories = StorageService.getCategories();
  const category = categories.find(c => c.is_available && /combo|cento/i.test(c.name));
  const combos = products.filter(
    p => p.available && !p.is_archived && p.category_id === category?.id && (!p.has_stock_control || p.stock_quantity > 0)
  );
  const from = combos.length ? Math.min(...combos.map(productPrice)) : 37.9;

  const banners = StorageService.getBanners()
    .filter(
      b =>
        b.is_active &&
        (!b.start_date || Date.parse(b.start_date) <= Date.now()) &&
        (!b.end_date || Date.parse(b.end_date) >= Date.now())
    )
    .sort((a, b) => a.sort_order - b.sort_order);

  const index = Math.max(0, banners.findIndex(b => b.id === selectedId));
  const banner = banners[index];
  const imageKey = `${banner?.image_desktop || ''}|${banner?.image_mobile || ''}`;
  const imageFailed = failedImages.includes(imageKey);

  const title = banner?.title || 'Seu momento fica melhor com Alfa Salgados';
  const subtitle = banner?.subtitle || 'Coxinhas, bolinhas de queijo e quibes crocantes, preparados na hora para você.';
  const whatsapp = `https://wa.me/${normalizePhone(settings.whatsapp)}?text=${encodeURIComponent(
    'Olá! Gostaria de encomendar salgados.'
  )}`;

  const actionFor = (item?: PromoBanner) => {
    if (item?.link_type === 'product') {
      const product = products.find(
        p =>
          p.id === item.link_value &&
          p.available &&
          !p.is_archived &&
          categories.some(c => c.id === p.category_id && c.is_available) &&
          (!p.has_stock_control || p.stock_quantity > 0)
      );
      if (product) return { label: 'Ver produto', run: () => onSelectProduct?.(product) };
    }
    if (item?.link_type === 'category') {
      const target =
        categories.find(
          c =>
            c.is_available &&
            (c.id === item.link_value || c.name.toLowerCase() === item.link_value?.toLowerCase())
        ) || (/combo|cento/i.test(item.link_value || '') ? category : undefined);
      if (target) return { label: 'Ver cardápio', run: () => onSelectCategory?.(target.id) };
    }
    return { label: 'Ver cardápio', run: onScrollToMenu };
  };

  const action = actionFor(banner);
  const link = banner?.link_type === 'external' ? externalLink(banner.link_value) : null;
  const change = (direction: number) =>
    setSelectedId(banners[(index + direction + banners.length) % banners.length].id);

  const showFloating = banner?.show_floating_button !== false;
  const floatingTitle = banner?.button_title || 'Monte seu cento';
  const floatingSubtitle = banner?.button_subtitle || 'Escolha seus sabores favoritos';
  const floatingPriceText = banner?.button_price_text || (from !== null ? `A partir de ${formatCurrency(from)}` : '');
  const floatingIcon = banner?.button_icon || 'package';
  const floatingTargetType = banner?.button_target_type || 'category';
  const floatingTargetValue = banner?.button_target_value || 'combos';

  const renderFloatingIcon = (iconName: string) => {
    switch (iconName) {
      case 'flame':
        return <Flame size={22} style={{ color: '#ea580c' }} />;
      case 'tag':
        return <Tag size={22} style={{ color: '#dc2626' }} />;
      case 'sparkles':
        return <Sparkles size={22} style={{ color: '#f59e0b' }} />;
      case 'percent':
        return <Percent size={22} style={{ color: '#16a34a' }} />;
      case 'package':
      default:
        return <Package size={22} style={{ color: '#ea580c' }} />;
    }
  };

  const handleFloatingClick = () => {
    if (floatingTargetType === 'product') {
      const prod = products.find(p => p.id === floatingTargetValue && p.available && !p.is_archived);
      if (prod) {
        onSelectProduct?.(prod);
        return;
      }
    }

    if (floatingTargetType === 'category') {
      const target = categories.find(
        c => c.is_available && (c.id === floatingTargetValue || c.name.toLowerCase() === floatingTargetValue?.toLowerCase())
      ) || (/combo|cento/i.test(floatingTargetValue || '') ? category : undefined);
      if (target) {
        onSelectCategory?.(target.id);
        return;
      }
    }

    if (floatingTargetType === 'promos') {
      if (onSelectPromos) {
        onSelectPromos();
        return;
      }
      onScrollToMenu();
      return;
    }

    if (floatingTargetType === 'external' && floatingTargetValue) {
      window.open(floatingTargetValue, '_blank', 'noopener,noreferrer');
      return;
    }

    // Default fallback
    if (category) {
      onSelectCategory?.(category.id);
    } else {
      onScrollToMenu();
    }
  };

  return (
    <section className="store-hero" aria-label="Destaques e informações da loja">
      {settings.is_paused && (
        <div className="paused-notice" role="status">
          {settings.pause_message || 'Estamos temporariamente sem receber pedidos.'}
        </div>
      )}

      <div className="store-container">
        <div className="campaign-panel">
          <div className="campaign-copy">
            <span className="campaign-eyebrow">
              <Flame size={14} className="text-red-600" /> FRITOS NA HORA
            </span>

            <div className="campaign-text" aria-live="polite" aria-atomic="true">
              <h1>
                {title.split(/(Alfa Salgados)/i).map((part, i) =>
                  /^(Alfa Salgados)$/i.test(part) ? (
                    <span className="campaign-brand-highlight" key={i}>
                      {part}
                    </span>
                  ) : (
                    part
                  )
                )}
              </h1>
              <p>{subtitle}</p>
            </div>

            <div className="campaign-actions">
              {link ? (
                <a className="campaign-primary" href={link} target="_blank" rel="noopener noreferrer">
                  {action.label} <ArrowRight size={18} />
                </a>
              ) : (
                <button className="campaign-primary" onClick={action.run}>
                  {action.label} <ArrowRight size={18} />
                </button>
              )}
              <a className="campaign-contact" href={whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} /> Encomendar pelo WhatsApp
              </a>
            </div>

            <div className="campaign-notes-row">
              <span className="campaign-note">
                <Truck size={15} /> Entrega e retirada
              </span>
              <span className="campaign-note-divider">|</span>
              <span className="campaign-note">
                <CreditCard size={15} /> Pix, cartão ou dinheiro
              </span>
            </div>
          </div>

          <div className="campaign-visual">
            <picture key={banner?.id || 'default'}>
              <source
                media="(max-width:640px)"
                srcSet={imageFailed ? '/hero-salgados.webp' : banner?.image_mobile || banner?.image_desktop || '/hero-salgados.webp'}
              />
              <img
                src={imageFailed ? '/hero-salgados.webp' : banner?.image_desktop || '/hero-salgados.webp'}
                onError={() => {
                  if (!imageFailed) setFailedImages(previous => [...previous, imageKey]);
                }}
                alt={banner?.title || 'Seleção de salgados frescos Alfa'}
                fetchPriority="high"
                width={740}
                height={520}
              />
            </picture>

            {/* Floating offer card matching reference image */}
            {showFloating && (
              <button
                className="campaign-floating-offer"
                onClick={handleFloatingClick}
                aria-label={`${floatingTitle} - ${floatingPriceText}`}
              >
                <span className="floating-offer-icon">
                  {renderFloatingIcon(floatingIcon)}
                </span>
                <span className="floating-offer-title">
                  <strong>{floatingTitle}</strong>
                  <small>{floatingSubtitle}</small>
                </span>
                {floatingPriceText && (
                  <span className="floating-offer-price">
                    {/a partir de/i.test(floatingPriceText) ? (
                      <>
                        <small>A partir de</small>
                        <strong>{floatingPriceText.replace(/a partir de\s*/i, '').trim()}</strong>
                      </>
                    ) : (
                      <strong>{floatingPriceText}</strong>
                    )}
                  </span>
                )}
                <span className="floating-offer-arrow">
                  <ArrowRight size={16} />
                </span>
              </button>
            )}
          </div>
        </div>

        {banners.length > 1 && (
          <div className="campaign-bottom">
            <div className="campaign-pagination" aria-label="Navegação dos banners">
              <span className="campaign-counter">
                {String(index + 1).padStart(2, '0')}{' '}
                <span>/ {String(banners.length).padStart(2, '0')}</span>
              </span>
              <div className="campaign-dots">
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    className={i === index ? 'active' : ''}
                    onClick={() => setSelectedId(b.id)}
                    aria-label={`Mostrar banner ${i + 1}: ${b.title}`}
                    aria-pressed={i === index}
                  />
                ))}
              </div>
              <button className="campaign-arrow" onClick={() => change(-1)} aria-label="Banner anterior">
                <ChevronLeft size={18} />
              </button>
              <button className="campaign-arrow" onClick={() => change(1)} aria-label="Próximo banner">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* 4 Feature cards strip matching reference image */}
        <div className="benefits-row">
          {[
            {
              icon: Flame,
              title: 'Fritos na hora',
              description: 'Crocantes e saborosos'
            },
            {
              icon: Bike,
              title: 'Entrega e retirada',
              description: 'Peça e receba como preferir'
            },
            {
              icon: Package,
              title: 'Monte seu cento',
              description: 'Escolha seus sabores favoritos'
            },
            {
              icon: CreditCard,
              title: 'Pagamento fácil',
              description: 'Pix, cartão ou dinheiro'
            }
          ].map(({ icon: Icon, title, description }) => (
            <div className="benefit" key={title}>
              <span>
                <Icon size={22} />
              </span>
              <div>
                <strong>{title}</strong>
                <small>{description}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
