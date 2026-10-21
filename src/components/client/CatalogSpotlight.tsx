import React from 'react';
import type { Product, Category } from '../../types';
import { Flame, Trophy, Plus, SlidersHorizontal, Package, Heart } from 'lucide-react';
import { productAvailability } from '../../domain/productAvailability';
import { productImage, fallbackProductImage } from '../../utils/productImage';
import { formatCurrency } from '../../utils/formatters';

interface CatalogSpotlightProps {
  products: Product[];
  categories: Category[];
  bestsellingIds: string[];
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
  onSelect: (p: Product) => void;
}

interface CompactProductCardProps {
  product: Product;
  rank?: number;
  isFavoriteSection?: boolean;
  onSelect: (product: Product) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

function CompactProductCard({
  product,
  rank,
  isFavoriteSection = false,
  onSelect,
  isFavorite = false,
  onToggleFavorite,
}: CompactProductCardProps) {
  const availability = productAvailability(product);
  const isAvailable = availability.canOrder;
  const hasPromo = Boolean(product.promo_price && product.promo_price > 0 && product.promo_price < product.price);
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
    <article className={`bestseller-compact-card${!isAvailable ? ' unavailable' : ''}`}>
      {/* Indicador circular no canto superior esquerdo: ranking ou coração de favorito */}
      {rank !== undefined ? (
        <span className={`bestseller-rank-badge rank-${rank}`} aria-label={`${rank}º mais vendido`}>
          {rank}º
        </span>
      ) : isFavoriteSection ? (
        <span className="bestseller-rank-badge rank-favorite" aria-label="Produto favorito">
          <Heart size={13} fill="#ffffff" />
        </span>
      ) : null}

      {/* Botão de desfavoritar / favoritar no canto superior direito */}
      {onToggleFavorite && (
        <button
          type="button"
          className="bestseller-favorite-btn"
          aria-pressed={isFavorite}
          aria-label={`${isFavorite ? 'Remover dos' : 'Adicionar aos'} favoritos: ${product.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
        >
          <Heart size={13} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      )}

      {/* Imagem Compacta com cantos arredondados e bordas suaves */}
      <button
        type="button"
        className="bestseller-image-wrapper"
        disabled={!isAvailable}
        onClick={() => onSelect(product)}
        aria-label={`${actionLabel} - ${product.name}`}
      >
        <img
          src={productImage(product)}
          onError={(e) => {
            e.currentTarget.onerror = null;
            const fallback = fallbackProductImage(product);
            e.currentTarget.src = fallback;
            e.currentTarget.classList.toggle('product-placeholder-image', fallback === '/product-placeholder.svg');
          }}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="bestseller-image"
        />
        {hasPromo && (
          <span className="bestseller-promo-badge">
            −{Math.round((1 - currentPrice / product.price) * 100)}%
          </span>
        )}
        {!isAvailable && (
          <span className="bestseller-unavailable-badge">{availability.reason}</span>
        )}
      </button>

      {/* Conteúdo Essencial Reduzido: Apenas Título, Preço e Botão de Ação Circular */}
      <div className="bestseller-body">
        <h3 className="bestseller-product-name">
          <button type="button" onClick={() => onSelect(product)} disabled={!isAvailable}>
            {product.name}
          </button>
        </h3>

        <div className="bestseller-bottom-row">
          <div className="bestseller-price-wrap">
            {configurable && <small className="bestseller-price-prefix">A partir de</small>}
            <strong className="bestseller-current-price">{formatCurrency(currentPrice)}</strong>
            {hasPromo && <del className="bestseller-old-price">{formatCurrency(product.price)}</del>}
          </div>

          <button
            type="button"
            className="bestseller-action-btn"
            disabled={!isAvailable}
            onClick={() => onSelect(product)}
            aria-label={`${actionLabel} - ${product.name}`}
            title={actionLabel}
          >
            <ActionIcon size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function CatalogSpotlight({
  products,
  categories,
  bestsellingIds,
  favoriteIds,
  onToggleFavorite,
  onSelect,
}: CatalogSpotlightProps) {
  const available = products.filter(
    (p) => !p.is_archived && p.available && categories.some((c) => c.id === p.category_id && c.is_available)
  );

  // Top 5 mais vendidos
  let best = bestsellingIds
    .map((id) => available.find((p) => p.id === id))
    .filter((p): p is Product => !!p)
    .slice(0, 5);

  // Se houver menos de 5 produtos no ranking por vendas, complementa com itens disponíveis em destaque
  if (best.length < 5 && available.length > best.length) {
    const existingIds = new Set(best.map((p) => p.id));
    const remainder = available.filter((p) => !existingIds.has(p.id));
    remainder.sort((a, b) => (b.is_highlight ? 1 : 0) - (a.is_highlight ? 1 : 0));
    best = [...best, ...remainder].slice(0, 5);
  }

  const favorites = available.filter((p) => favoriteIds.includes(p.id));

  return (
    <div className="catalog-spotlights">
      {best.length > 0 && (
        <section aria-label="Mais vendidos" className="bestsellers-spotlight-card">
          <div className="bestsellers-header">
            <div className="bestsellers-title-wrap">
              <div className="bestsellers-title-group">
                <h2 className="bestsellers-title">Mais vendidos</h2>
                <span className="bestsellers-top-badge">
                  <Trophy size={13} />
                  TOP {best.length}
                </span>
              </div>
              <div className="bestsellers-tag">
                <Flame size={13} className="bestsellers-tag-icon" />
                <span>OS PREFERIDOS DOS CLIENTES</span>
              </div>
            </div>
          </div>
          <div className="bestsellers-compact-grid">
            {best.map((product, index) => (
              <CompactProductCard
                key={product.id}
                product={product}
                rank={index + 1}
                onSelect={onSelect}
                isFavorite={favoriteIds.includes(product.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {favorites.length > 0 && (
        <section aria-label="Seus favoritos" className="favorites-spotlight-card">
          <div className="favorites-header">
            <div className="favorites-title-wrap">
              <div className="favorites-title-group">
                <h2 className="favorites-title">Seus favoritos</h2>
                <span className="favorites-top-badge">
                  <Heart size={13} fill="currentColor" />
                  {favorites.length} {favorites.length === 1 ? 'salvo' : 'salvos'}
                </span>
              </div>
              <div className="favorites-tag">
                <Heart size={13} className="favorites-tag-icon" fill="currentColor" />
                <span>SUA SELEÇÃO</span>
              </div>
            </div>
          </div>
          <div className="favorites-compact-grid">
            {favorites.map((product) => (
              <CompactProductCard
                key={product.id}
                product={product}
                isFavoriteSection={true}
                onSelect={onSelect}
                isFavorite={true}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
