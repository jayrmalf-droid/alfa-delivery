import React, { useState, useEffect } from 'react';
import type { StoreSettings, Product } from '../../types';
import { StorageService } from '../../services/storageService';
import { productPrice } from '../../domain/rules';
import { formatCurrency } from '../../utils/formatters';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Package,
  Flame,
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

export const HeroSection: React.FC<Props> = ({
  settings,
  onScrollToMenu,
  onSelectCategory,
  onSelectProduct,
  onSelectPromos
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);

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

  const autoRotate = settings?.banner_auto_rotate !== false;
  const intervalSeconds = Math.max(1, settings?.banner_rotate_interval || 4);
  const transitionEffect = settings?.banner_transition_effect || 'slide';

  const index = Math.max(0, banners.findIndex(b => b.id === selectedId));
  const banner = banners[index];
  const imageKey = `${banner?.image_desktop || ''}|${(banner?.image_mobile?.includes('hero-salgados') ? '/hero-artisan.webp' : banner?.image_mobile) || ''}`;
  const imageFailed = failedImages.includes(imageKey);

  // Carrossel digital rotativo automático com tempo configurável
  useEffect(() => {
    if (!autoRotate || banners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setSelectedId(prevId => {
        const currentIndex = Math.max(0, banners.findIndex(b => b.id === prevId));
        const nextIndex = (currentIndex + 1) % banners.length;
        return banners[nextIndex].id;
      });
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [autoRotate, banners, intervalSeconds, isPaused]);

  const title = index === 0 ? 'Seu momento fica muito melhor com Alfa Sabores VCA' : banner?.title || 'Seu momento fica muito melhor com Alfa Sabores VCA';
  const subtitle = index === 0 ? 'Coxinhas douradas, bolinhas de queijo e quibes crocantes fritos na hora com muito carinho' : banner?.subtitle || 'Coxinhas douradas, bolinhas de queijo e quibes crocantes fritos na hora com muito carinho';

  const change = (direction: number) =>
    setSelectedId(banners[(index + direction + banners.length) % banners.length].id);

  const showFloating = banner?.show_floating_button !== false;
  const floatingTitle = index === 0 ? 'Monte seu combo' : banner?.button_title || 'Monte seu combo';
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
    <section
      className="store-hero"
      aria-label="Destaques e informações da loja"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="store-container">
        <div className="campaign-panel">
          <div className="campaign-copy">
            <span className="campaign-eyebrow">
              <Flame size={14} className="text-red-600" /> FRITOS NA HORA
            </span>

            <div className="campaign-text" aria-live="polite" aria-atomic="true">
              <h1>
                {title.split(/(Alfa Sabores VCA|Alfa Salgados)/i).map((part, i) =>
                  /^(Alfa Sabores VCA|Alfa Salgados)$/i.test(part) ? (
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
          </div>

          <div className="campaign-visual">
            <picture key={banner?.id || 'default'} className={`banner-effect-${transitionEffect}`} style={{ display: 'block', width: '100%', height: '100%' }}>

              <source
                media="(max-width:640px)"
                srcSet={imageFailed ? '/hero-artisan.webp' : (banner?.image_mobile?.includes('hero-salgados') ? '/hero-artisan.webp' : banner?.image_mobile) || (banner?.image_desktop?.includes('hero-salgados') ? '/hero-artisan.webp' : banner?.image_desktop) || '/hero-artisan.webp'}
              />
              <img
                src={imageFailed ? '/hero-artisan.webp' : (banner?.image_desktop?.includes('hero-salgados') ? '/hero-artisan.webp' : banner?.image_desktop) || '/hero-artisan.webp'}
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
      </div>
    </section>
  );
};
