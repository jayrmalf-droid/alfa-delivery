import { productAvailability } from '../../domain/productAvailability';
import React from 'react';
import type { Product } from '../../types';
import { productImage, fallbackProductImage } from '../../utils/productImage';
import { formatCurrency } from '../../utils/formatters';
import { Heart, Plus, SlidersHorizontal, Sparkles, Package } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  viewMode?: 'grid' | 'list';
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect, viewMode = 'grid', isFavorite = false, onToggleFavorite }) => {
  const availability = productAvailability(product);
  const isAvailable = availability.canOrder;
  const hasPromo = !!(product.promo_price && product.promo_price > 0 && product.promo_price < product.price);
  const currentPrice = hasPromo ? product.promo_price! : product.price;
  const isCombo = Boolean(
    product.product_mode === 'combo' ||
    (product.combo_max_qty && product.combo_max_qty > 0)
  );
  const configurable = Boolean(isCombo || product.has_options || product.price_display_mode === 'starting_at');

  const actionLabel = isCombo
    ? 'Montar combo'
    : configurable
    ? 'Escolher opções'
    : 'Adicionar';

  const ActionIcon = isCombo
    ? Package
    : configurable
    ? SlidersHorizontal
    : Plus;

  return (
    <article className={`product-card ${viewMode === 'list' ? 'product-card-list' : ''}${!isAvailable ? ' unavailable' : ''}`}>
      {onToggleFavorite && <button type="button" className="product-favorite" aria-pressed={isFavorite} aria-label={`${isFavorite?'Remover dos':'Adicionar aos'} favoritos: ${product.name}`} onClick={()=>onToggleFavorite(product.id)}><Heart size={19} fill={isFavorite?'currentColor':'none'}/></button>}
      <button
        type="button"
        className="product-image-button"
        disabled={!isAvailable}
        onClick={() => onSelect(product)}
        aria-label={`${actionLabel} - ${product.name}`}
      >
        <img
          src={productImage(product)}
          onError={e => {
            e.currentTarget.onerror = null;
            const fallback = fallbackProductImage(product);
            e.currentTarget.src = fallback;
            e.currentTarget.classList.toggle('product-placeholder-image', fallback === '/product-placeholder.svg');
          }}
          alt={product.name}
          loading="lazy"
          decoding="async"
          width={600}
          height={400}
          className={`product-fixed-img${productImage(product) === '/product-placeholder.svg' ? ' product-placeholder-image' : ''}`}
        />
        <span className="product-labels">
          {hasPromo && (
            <span className="product-discount">
              −{Math.round((1 - currentPrice / product.price) * 100)}%
            </span>
          )}
          {isCombo && (
            <span className="product-combo-badge">
              <Package size={11} /> Combo
            </span>
          )}
          {configurable && !isCombo && (
            <span className="product-configurable">
              <SlidersHorizontal size={11} /> Personalizável
            </span>
          )}
          {product.is_highlight && !hasPromo && (
            <span className="product-highlight-badge">
              <Sparkles size={11} /> Destaque
            </span>
          )}
        </span>
        {!isAvailable && <span className="product-unavailable">{availability.reason}</span>}
      </button>

      <div className="product-content">
        <div className="product-header-info">
          <h3>
            <button type="button" onClick={() => onSelect(product)} disabled={!isAvailable}>
              {product.name}
            </button>
          </h3>
          {product.combo_max_qty && product.combo_max_qty > 0 ? (
            <span className="product-yield-badge" title="Rendimento do combo">
              {product.combo_max_qty} un.
            </span>
          ) : null}
        </div>

        <p>{product.description || 'Confira os detalhes deste produto.'}</p>

        <div className="product-footer">
          <div className="product-price">
            {configurable && <small className="price-prefix">A partir de</small>}
            <strong className="price-bold">{formatCurrency(currentPrice)}</strong>
            {hasPromo && <del>{formatCurrency(product.price)}</del>}
          </div>

          <button
            type="button"
            className={`product-add ${isCombo ? 'product-btn-combo' : configurable ? 'product-btn-choose' : 'product-btn-simple'}`}
            disabled={!isAvailable}
            onClick={() => onSelect(product)}
            aria-label={`${actionLabel} - ${product.name}`}
          >
            <ActionIcon size={14} />
            <span>{actionLabel}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
