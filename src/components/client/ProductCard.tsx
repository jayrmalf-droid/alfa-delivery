import React from 'react';
import type { Product } from '../../types';
import { productImage, fallbackProductImage } from '../../utils/productImage';
import { formatCurrency } from '../../utils/formatters';
import { ShoppingCart, Package } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const isAvailable = product.available && (!product.has_stock_control || product.stock_quantity > 0);
  const hasPromo = !!(product.promo_price && product.promo_price > 0 && product.promo_price < product.price);
  const currentPrice = hasPromo ? product.promo_price! : product.price;
  const configurable = product.has_options || product.product_mode === 'combo';

  return (
    <article className={`product-card${!isAvailable ? ' unavailable' : ''}`}>
      <button
        className="product-image-button"
        disabled={!isAvailable}
        onClick={() => onSelect(product)}
        aria-label={`Ver ${product.name}`}
      >
        <img
          src={productImage(product)}
          onError={e => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = fallbackProductImage(product);
          }}
          alt={product.name}
          loading="lazy"
          width={600}
          height={420}
        />
        <span className="product-labels">
          {hasPromo && (
            <span className="product-discount">
              −{Math.round((1 - currentPrice / product.price) * 100)}%
            </span>
          )}
          {configurable && (
            <span className="product-configurable">
              <Package size={12} />
              Personalizável
            </span>
          )}
        </span>
        {!isAvailable && <span className="product-unavailable">Indisponível no momento</span>}
      </button>

      <div className="product-content">
        <h3>
          <button onClick={() => onSelect(product)} disabled={!isAvailable}>
            {product.name}
          </button>
        </h3>
        <p>{product.description || 'Confira os detalhes e as opções deste produto.'}</p>
        <div className="product-footer">
          <div className="product-price">
            {product.price_display_mode === 'starting_at' && <small>A partir de</small>}
            <strong>{formatCurrency(currentPrice)}</strong>
            {hasPromo && <del>{formatCurrency(product.price)}</del>}
          </div>
          <button
            className="product-add"
            disabled={!isAvailable}
            onClick={() => onSelect(product)}
            aria-label={`Escolher ${product.name}`}
          >
            <ShoppingCart size={15} />
            <span>{configurable ? 'Montar' : 'Adicionar'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
