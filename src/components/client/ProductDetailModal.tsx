import { productImage, fallbackProductImage } from '../../utils/productImage';
import { useDialog } from '../../utils/useDialog';
import { productPrice } from '../../domain/rules';
import React, { useState, useMemo } from 'react';
import { Product, CartItem, CartItemOption, Flavor } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatCurrency } from '../../utils/formatters';
import { X, Plus, Minus, AlertCircle, CheckCircle2, Sparkles, Utensils } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart
}) => {
  useDialog(true, onClose);
  const [productQuantity, setProductQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Group option quantities: { [groupId]: { [optionId]: quantity } }
  const [groupOptionQtys, setGroupOptionQtys] = useState<Record<string, Record<string, number>>>({});

  // Fallback flavors selection when no custom option groups are defined
  const [selectedFlavorQtys, setSelectedFlavorQtys] = useState<Record<string, number>>({});

  // Load option groups for this product
  const optionGroups = useMemo(() => {
    const allGroups = StorageService.getOptionGroups();
    return allGroups
      .filter(g => g.product_id === product.id && g.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [product.id]);

  // Load options by group
  const optionsByGroup = useMemo(() => {
    const allOptions = StorageService.getProductOptions();
    const map: Record<string, typeof allOptions> = {};
    optionGroups.forEach(g => {
      map[g.id] = allOptions
        .filter(o => o.group_id === g.id && (o.is_available ?? true) && (o.is_active ?? true))
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });
    return map;
  }, [optionGroups]);

  // All active flavors from global catalogue (fallback for standard combos)
  const availableFlavors: Flavor[] = useMemo(() => {
    return StorageService.getFlavors().filter(f => f.is_active && (!product.available_flavor_ids?.length || product.available_flavor_ids.includes(f.id)));
  }, [product.available_flavor_ids]);

  // Determine if this product allows flavor customization via fallback
  const productFlavorMeta = useMemo(() => {
    if (optionGroups.length > 0) {
      return { hasFlavorSelection: false, targetQuantity: 0, step: 10 };
    }

    if (product.product_mode !== 'combo') return { hasFlavorSelection: false, targetQuantity: 0, step: 1 };
    const target=product.combo_max_qty || 0;
    return { hasFlavorSelection: target>0, targetQuantity:target, step:product.combo_step||1 };
  }, [product, optionGroups.length]);

  // Handler for custom group option quantities
  const handleOptionQtyChange = (
    groupId: string,
    optionId: string,
    delta: number,
    maxSelect: number,
    step: number = 1
  ) => {
    setGroupOptionQtys(prev => {
      const groupQtys = prev[groupId] || {};
      const currentVal = groupQtys[optionId] || 0;
      const groupTotal = Object.values(groupQtys).reduce((sum, q) => sum + q, 0);

      if (delta > 0 && maxSelect > 0 && groupTotal + delta > maxSelect) {
        setValidationError(`O limite máximo para este grupo é de ${maxSelect} itens.`);
        setTimeout(() => setValidationError(null), 3000);
        return prev;
      }

      const nextVal = Math.max(0, currentVal + delta);
      return {
        ...prev,
        [groupId]: {
          ...groupQtys,
          [optionId]: nextVal
        }
      };
    });
  };

  // Handler for fallback flavors
  const totalFallbackChosen = useMemo(() => {
    return Object.values(selectedFlavorQtys).reduce((sum, q) => sum + q, 0);
  }, [selectedFlavorQtys]);

  const handleFallbackFlavorChange = (id: string, delta: number) => {
    setSelectedFlavorQtys(prev => {
      const cur = prev[id] || 0;
      const targetCount = productFlavorMeta.targetQuantity;
      if (delta > 0 && targetCount > 0 && totalFallbackChosen + delta > targetCount) {
        setValidationError(`Você não pode selecionar mais que o limite de ${targetCount} salgados.`);
        setTimeout(() => setValidationError(null), 3000);
        return prev;
      }
      const next = Math.max(0, cur + delta);
      return { ...prev, [id]: next };
    });
  };

  // Check validation for all option groups
  const validationStatus = useMemo(() => {
    if (optionGroups.length > 0) {
      for (const group of optionGroups) {
        const minSelect = group.min_select ?? group.min_options ?? (group.required ? 1 : 0);
        const groupQtys = groupOptionQtys[group.id] || {};
        const total = Object.values(groupQtys).reduce((sum, q) => sum + q, 0);

        if (((group.required ?? group.is_required) || total > 0) && minSelect > 0 && total < minSelect) {
          return {
            isValid: false,
            missing: minSelect - total,
            groupName: group.name
          };
        }
      }
      return { isValid: true, missing: 0, groupName: '' };
    }

    if (productFlavorMeta.hasFlavorSelection && productFlavorMeta.targetQuantity > 0) {
      const diff = productFlavorMeta.targetQuantity - totalFallbackChosen;
      return {
        isValid: diff <= 0,
        missing: Math.max(0, diff),
        groupName: 'Sabores'
      };
    }

    return { isValid: true, missing: 0, groupName: '' };
  }, [optionGroups, groupOptionQtys, productFlavorMeta, totalFallbackChosen]);

  // Flatten selected options for cart
  const flatSelectedOptions = useMemo(() => {
    const list: CartItemOption[] = [];

    // From custom option groups
    optionGroups.forEach(group => {
      const groupQtys = groupOptionQtys[group.id] || {};
      const options = optionsByGroup[group.id] || [];

      options.forEach(opt => {
        const qty = groupQtys[opt.id] || 0;
        if (qty > 0) {
          list.push({
            groupId: group.id,
            groupName: group.name,
            optionId: opt.id,
            optionName: qty > 1 ? `${qty}x ${opt.name}` : opt.name,
            price: (opt.price || 0) * qty,
            quantity: qty
          });
        }
      });
    });

    // From fallback flavors
    if (optionGroups.length === 0 && productFlavorMeta.hasFlavorSelection) {
      Object.entries(selectedFlavorQtys).forEach(([flavorId, qty]) => {
        if (qty > 0) {
          const item = availableFlavors.find(f => f.id === flavorId);
          if (item) {
            list.push({
              groupId: 'flavors',
              groupName: 'Sabores Escolhidos',
              optionId: item.id,
              optionName: `${qty}x ${item.name}`,
              price: 0,
              quantity: qty
            });
          }
        }
      });
    }

    return list;
  }, [optionGroups, groupOptionQtys, optionsByGroup, productFlavorMeta, selectedFlavorQtys, availableFlavors]);

  // Unit price calculation
  const unitPrice = useMemo(() => {
    let base = productPrice(product);
    flatSelectedOptions.forEach(opt => {
      base += (opt.price || 0);
    });
    return base;
  }, [product.price, product.promo_price, flatSelectedOptions]);

  const totalPrice = unitPrice * productQuantity;

  // Final submit to cart
  const validateAndAdd = () => {
    if (product.has_stock_control && productQuantity > product.stock_quantity) { setValidationError('Quantidade maior que o estoque disponível.'); return; }
    if (!validationStatus.isValid) {
      setValidationError(`Por favor, selecione mais ${validationStatus.missing} itens em "${validationStatus.groupName}".`);
      return;
    }

    const cartItem: CartItem = {
      id: `${product.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      product,
      quantity: productQuantity,
      selectedOptions: flatSelectedOptions,
      notes: notes.trim() || undefined,
      unitPrice,
      totalPrice
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Personalizar produto" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 580,
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative'
        }}
      >
        {/* Header with product image matching screenshot */}
        <div style={{ position: 'relative', height: 210, backgroundColor: '#f8fafc', flexShrink: 0 }}>
          {product.image_url ? (
            <img
              src={productImage(product)} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackProductImage(product); }}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              backgroundColor: '#f1f5f9'
            }}>
              <Utensils size={48} />
            </div>
          )}

          {/* Circular close button on top right */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'rgba(0, 0, 0, 0.6)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              transition: 'background 0.2s',
              zIndex: 10
            }}
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flexGrow: 1 }}>
          {/* Title, description & Price */}
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {product.name}
            </h2>
            {product.description && (
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: 4, lineHeight: 1.4, margin: '4px 0 0' }}>
                {product.description}
              </p>
            )}

            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#dc2626' }}>
                {formatCurrency(productPrice(product))}
              </span>
              {product.promo_price && product.promo_price > 0 && product.promo_price < product.price && (
                <span style={{ fontSize: '1rem', color: '#94a3b8', textDecoration: 'line-through', marginLeft: 10 }}>
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>
          </div>

          {/* DYNAMIC OPTION GROUPS (CONFORME A IMAGEM MODELO) */}
          {optionGroups.map(group => {
            const options = optionsByGroup[group.id] || [];
            if (options.length === 0) return null;

            const minSelect = group.min_select ?? group.min_options ?? (group.required ? 1 : 0);
            const maxSelect = group.max_select ?? group.max_options ?? 999;
            const step = group.step || 1;
            const isRequired = !!(group.required ?? group.is_required);
            const groupQtys = groupOptionQtys[group.id] || {};
            const currentTotal = Object.values(groupQtys).reduce((sum, q) => sum + q, 0);
            const isComplete = (!isRequired && currentTotal === 0) || (currentTotal >= minSelect && currentTotal <= maxSelect);
            const remaining = !isRequired && currentTotal === 0 ? 0 : Math.max(0, minSelect - currentTotal);

            return (
              <div
                key={group.id}
                style={{
                  margin: '18px 0',
                  padding: 16,
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                {/* Header matching screenshot */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                      <Sparkles size={16} style={{ color: '#dc2626' }} />
                      {group.name}
                    </h3>
                    {group.description && (
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0' }}>
                        {group.description}
                      </p>
                    )}
                  </div>

                  {/* Badge TOTAL: X / MAX matching screenshot */}
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: isComplete ? '#dcfce7' : '#fef2f2',
                    border: isComplete ? '1px solid #bbf7d0' : '1px solid #fee2e2',
                    color: isComplete ? '#15803d' : '#dc2626',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap'
                  }}>
                    TOTAL: {currentTotal} / {maxSelect === 999 ? minSelect : maxSelect}
                  </div>
                </div>

                <div style={{ height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 }} />

                {/* Items list matching screenshot */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {options.map(opt => {
                    const qty = groupQtys[opt.id] || 0;
                    const itemStep = step;

                    return (
                      <div
                        key={opt.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: '#ffffff',
                          borderRadius: 12,
                          border: qty > 0 ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.92rem' }}>
                            {opt.name}
                          </span>
                          {opt.price > 0 && (
                            <span style={{ display: 'block', fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, marginTop: 2 }}>
                              +{formatCurrency(opt.price)} cada
                            </span>
                          )}
                        </div>

                        {/* Counter [-] qty [+] matching screenshot */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleOptionQtyChange(group.id, opt.id, -itemStep, maxSelect, itemStep)}
                            disabled={qty === 0}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              color: qty === 0 ? '#cbd5e1' : '#475569',
                              cursor: qty === 0 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1rem',
                              outline: 'none'
                            }}
                          >
                            <Minus size={14} />
                          </button>

                          <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                            {qty}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleOptionQtyChange(group.id, opt.id, itemStep, maxSelect, itemStep)}
                            disabled={currentTotal + itemStep > maxSelect}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: 'none',
                              background: currentTotal + itemStep > maxSelect ? '#e2e8f0' : '#dc2626',
                              color: currentTotal + itemStep > maxSelect ? '#94a3b8' : '#ffffff',
                              cursor: currentTotal + itemStep > maxSelect ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              outline: 'none',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Warning or Success message matching screenshot */}
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                  {isComplete ? (
                    <span style={{ color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={16} /> Seleção concluída com sucesso!
                    </span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={16} /> Faltam {remaining} {minSelect >= 10 ? 'salgados' : 'itens'} para completar sua seleção.
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* FALLBACK FLAVOR SELECTOR (FOR COMBOS WITHOUT CUSTOM GROUPS) */}
          {optionGroups.length === 0 && productFlavorMeta.hasFlavorSelection && (
            <div style={{
              margin: '18px 0',
              padding: 16,
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <Sparkles size={16} style={{ color: '#dc2626' }} />
                    Escolha seus sabores
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0' }}>
                    Defina a quantidade de cada sabor para montar seu pedido.
                  </p>
                </div>

                <div style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: totalFallbackChosen === productFlavorMeta.targetQuantity ? '#dcfce7' : '#fef2f2',
                  border: totalFallbackChosen === productFlavorMeta.targetQuantity ? '1px solid #bbf7d0' : '1px solid #fee2e2',
                  color: totalFallbackChosen === productFlavorMeta.targetQuantity ? '#15803d' : '#dc2626',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  letterSpacing: '0.5px'
                }}>
                  TOTAL: {totalFallbackChosen} / {productFlavorMeta.targetQuantity}
                </div>
              </div>

              <div style={{ height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {availableFlavors.map(flavor => {
                  const qty = selectedFlavorQtys[flavor.id] || 0;
                  const step = productFlavorMeta.step;

                  return (
                    <div
                      key={flavor.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#ffffff',
                        borderRadius: 12,
                        border: qty > 0 ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.92rem' }}>
                        {step > 1 ? `${step} ` : ''}{flavor.name}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleFallbackFlavorChange(flavor.id, -step)}
                          disabled={qty === 0}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: qty === 0 ? '#cbd5e1' : '#475569',
                            cursor: qty === 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            outline: 'none'
                          }}
                        >
                          <Minus size={14} />
                        </button>

                        <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                          {qty}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleFallbackFlavorChange(flavor.id, step)}
                          disabled={totalFallbackChosen + step > productFlavorMeta.targetQuantity}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: 'none',
                            background: totalFallbackChosen + step > productFlavorMeta.targetQuantity ? '#e2e8f0' : '#dc2626',
                            color: totalFallbackChosen + step > productFlavorMeta.targetQuantity ? '#94a3b8' : '#ffffff',
                            cursor: totalFallbackChosen + step > productFlavorMeta.targetQuantity ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            outline: 'none',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                {totalFallbackChosen === productFlavorMeta.targetQuantity ? (
                  <span style={{ color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={16} /> Seleção concluída com sucesso!
                  </span>
                ) : (
                  <span style={{ color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={16} /> Faltam {productFlavorMeta.targetQuantity - totalFallbackChosen} salgados para completar sua seleção.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Special Notes */}
          <div style={{ margin: '18px 0' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Alguma observação especial?
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Fritar bem douradinho, colocar guardanapos extras..."
              rows={2}
              className="form-input"
              style={{ width: '100%', fontSize: '0.88rem', borderRadius: 12, resize: 'none' }}
            />
          </div>

          {/* Validation Alert */}
          {validationError && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 12,
              color: '#b91c1c',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16
            }}>
              <AlertCircle size={16} />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Footer actions with quantity and Add Button matching screenshot */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0
        }}>
          {/* Base Product Quantity Selector [-] 1 [+] */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            padding: 3,
            background: '#ffffff'
          }}>
            <button
              type="button"
              onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}
              disabled={productQuantity <= 1}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                color: productQuantity <= 1 ? '#cbd5e1' : '#0f172a',
                cursor: productQuantity <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Minus size={14} />
            </button>

            <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
              {productQuantity}
            </span>

            <button
              type="button"
              onClick={() => setProductQuantity(productQuantity + 1)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Action Button matching salmon incomplete state and red active state */}
          <button
            type="button"
            onClick={validateAndAdd}
            disabled={!validationStatus.isValid}
            style={{
              flexGrow: 1,
              padding: '14px 20px',
              borderRadius: 12,
              fontSize: '0.95rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: validationStatus.isValid ? '#dc2626' : '#ea7a7a',
              color: '#ffffff',
              border: 'none',
              cursor: validationStatus.isValid ? 'pointer' : 'not-allowed',
              boxShadow: validationStatus.isValid ? '0 4px 14px rgba(220, 38, 38, 0.35)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <span>
              {validationStatus.isValid
                ? 'ADICIONAR AO PEDIDO'
                : `ESCOLHA OS SABORES (${validationStatus.missing} restantes)`}
            </span>
            <span>{formatCurrency(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
