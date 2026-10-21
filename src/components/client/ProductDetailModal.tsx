import { selectionGuidance, missingSelections } from '../../domain/selectionGuidance';
import React, { useState, useMemo, useEffect } from 'react';
import { Product, CartItem, CartItemOption, ProductOptionGroup, ProductOption } from '../../types';
import { StorageService, subscribeToStorage } from '../../services/storageService';
import { formatCurrency } from '../../utils/formatters';
import { productImage, fallbackProductImage } from '../../utils/productImage';
import { useDialog } from '../../utils/useDialog';
import { productPrice } from '../../domain/rules';
import { X, Plus, Minus, Check, Sparkles, Utensils, AlertCircle, Package, CheckCircle2, ChevronRight, Info } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  editingItem?: CartItem | null;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  editingItem
}) => {
  useDialog(true, onClose);

  const [productQuantity, setProductQuantity] = useState(() => editingItem?.quantity || 1);
  const [notes, setNotes] = useState(() => editingItem?.notes || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Inscrição reativa para sincronizar com atualizações de storage/bootstrap
  const [storageVersion, setStorageVersion] = useState(0);
  useEffect(() => {
    return subscribeToStorage(() => {
      setStorageVersion(v => v + 1);
    });
  }, []);

  // Seleções dos grupos: { [groupId]: { [optionId]: quantity } }
  const [groupSelections, setGroupSelections] = useState<Record<string, Record<string, number>>>(() => {
    if (!editingItem?.selectedOptions) return {};
    const map: Record<string, Record<string, number>> = {};
    for (const opt of editingItem.selectedOptions) {
      if (!map[opt.groupId]) map[opt.groupId] = {};
      map[opt.groupId][opt.optionId] = opt.quantity || 1;
    }
    return map;
  });

  // Parâmetros de combo
  const isComboProduct = Boolean(
    product.product_mode === 'combo' ||
    (product.combo_max_qty && product.combo_max_qty > 0)
  );
  const targetComboQty = product.combo_max_qty || (isComboProduct ? 100 : 0);
  const comboStep = product.combo_step || (targetComboQty >= 50 ? 10 : (targetComboQty >= 15 ? 5 : 1));

  // Todos os grupos vinculados ao produto
  const productGroups: ProductOptionGroup[] = useMemo(() => {
    const allGroupsRaw = StorageService.getOptionGroups();
    const allGroups = allGroupsRaw.filter(g => g.is_active !== false);
    const allOptions = StorageService.getProductOptions();

    // Grupos vinculados diretamente ou via N:N (apenas ativos)
    const linked = allGroups.filter(g =>
      (g.product_id === product.id ||
      (Array.isArray(g.product_ids) && g.product_ids.includes(product.id)) ||
      (Array.isArray(g.category_ids) && g.category_ids.includes(product.category_id))) &&
      g.is_active !== false
    );

    // Para combos: incluir também grupos combo_choice inativos vinculados ao produto
    // (grupos de bebida/refrigerante frequentemente são marcados is_active:false mas
    //  são essenciais para a montagem do combo)
    if (isComboProduct) {
      const comboChoiceGroups = allGroupsRaw.filter(g =>
        g.group_kind === 'combo_choice' &&
        g.is_active === false &&
        (g.product_id === product.id ||
         (Array.isArray(g.product_ids) && g.product_ids.includes(product.id)))
      );
      for (const g of comboChoiceGroups) {
        if (!linked.some(l => l.id === g.id)) {
          linked.push({ ...g, is_active: true });
        }
      }
    }

    // Agrupa e prioriza grupos que contenham opções ativas
    const groupsByName = new Map<string, ProductOptionGroup>();
    for (const g of linked) {
      const normalized = (g.name || '').trim().toLowerCase();
      if (!normalized) continue;
      const existing = groupsByName.get(normalized);
      if (!existing) {
        groupsByName.set(normalized, g);
      } else {
        const existingOpts = allOptions.filter(o => o.group_id === existing.id && (o.is_available ?? true) && (o.is_active ?? true) && o.is_paused !== true);
        const currentOpts = allOptions.filter(o => o.group_id === g.id && (o.is_available ?? true) && (o.is_active ?? true) && o.is_paused !== true);
        if (currentOpts.length > existingOpts.length) {
          groupsByName.set(normalized, g);
        }
      }
    }

    const uniqueGroups: ProductOptionGroup[] = Array.from(groupsByName.values());

    // Se o produto for combo e ainda não tiver um grupo vinculado de sabores,
    // sintetiza um grupo oficial de sabores para que a seleção apareça na tela
    const hasFlavorGroup = uniqueGroups.some(
      g => g.group_kind === 'flavors' || ((g.name || '').toLowerCase().includes('sabores'))
    );

    if (isComboProduct && !hasFlavorGroup && targetComboQty > 0) {
      uniqueGroups.unshift({
        id: 'flavors',
        product_id: product.id,
        name: 'Escolha seus sabores',
        description: `Monte seu combo escolhendo exatamente ${targetComboQty} salgados (em blocos de ${comboStep}).`,
        min_select: targetComboQty,
        max_select: targetComboQty,
        step: comboStep,
        required: true,
        is_active: true,
        sort_order: -10,
        group_kind: 'flavors',
        permite_repetir: true
      });
    }

    // Se o combo inclui bebida no título ou descrição, garante que haja um grupo de refrigerante/bebida
    const includesBeverage = /refrigerante|bebida|coca|guaraná|suco/i.test(product.name || '') || /refrigerante|bebida/i.test(product.description || '');
    const hasBeverageGroup = uniqueGroups.some(
      g => g.group_kind === 'combo_choice' || /refrigerante|bebida/i.test(g.name || '')
    );

    if (isComboProduct && includesBeverage && !hasBeverageGroup) {
      uniqueGroups.push({
        id: `beverage-${product.id}`,
        product_id: product.id,
        name: 'Escolha o Refrigerante',
        description: 'Selecione a bebida inclusa no seu combo.',
        min_select: 1,
        max_select: 1,
        step: 1,
        required: true,
        is_active: true,
        sort_order: 10,
        group_kind: 'combo_choice',
        permite_repetir: false
      });
    }

    return uniqueGroups.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [product.id, product.category_id, isComboProduct, targetComboQty, comboStep, storageVersion]);

  // Opções disponíveis para cada grupo
  const optionsByGroup = useMemo(() => {
    const allOptions = StorageService.getProductOptions();
    const allFlavors = StorageService.getFlavors().filter(f => f.is_active !== false);
    const map: Record<string, ProductOption[]> = {};

    productGroups.forEach(g => {
      // 1. Grupo sintético de sabores
      if (g.id === 'flavors') {
        let flavorsList = allFlavors;
        if (product.available_flavor_ids && product.available_flavor_ids.length > 0) {
          const filtered = allFlavors.filter(f => product.available_flavor_ids?.includes(f.id));
          if (filtered.length > 0) flavorsList = filtered;
        }
        map[g.id] = flavorsList.map((f, idx) => ({
          id: f.id,
          group_id: 'flavors',
          name: f.name || 'Sabor',
          description: f.description,
          price: 0,
          is_available: true,
          is_active: true,
          sort_order: f.sort_order || idx
        }));
        return;
      }

      // 2. Grupo regular do banco
      let opts = allOptions
        .filter(o =>
          o.group_id === g.id &&
          (o.is_available ?? true) &&
          (o.is_active ?? true) &&
          o.is_paused !== true
        )
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      // Se for um grupo de sabores mas sem opções cadastradas em alfa_product_options,
      // preenche dinamicamente com os sabores disponíveis do sistema
      if (opts.length === 0 && (g.group_kind === 'flavors' || (g.name || '').toLowerCase().includes('sabores'))) {
        let flavorsList = allFlavors;
        if (product.available_flavor_ids && product.available_flavor_ids.length > 0) {
          const filtered = allFlavors.filter(f => product.available_flavor_ids?.includes(f.id));
          if (filtered.length > 0) flavorsList = filtered;
        }
        opts = flavorsList.map((f, idx) => ({
          id: f.id,
          group_id: g.id,
          name: f.name || 'Sabor',
          description: f.description,
          price: 0,
          is_available: true,
          is_active: true,
          sort_order: f.sort_order || idx
        }));
      }

      // Se for um grupo de refrigerante/bebida sem opções cadastradas, vincula bebidas padrão
      if (opts.length === 0 && (/refrigerante|bebida/i.test(g.name || '') || g.group_kind === 'combo_choice')) {
        const beverageProducts = StorageService.getProducts().filter(p =>
          !p.is_archived && p.available && (/refrigerante|bebida|coca|guaraná|suco/i.test(p.name || ''))
        );
        if (beverageProducts.length > 0) {
          opts = beverageProducts.map((p, idx) => ({
            id: p.id,
            group_id: g.id,
            name: p.name,
            description: p.description || undefined,
            price: 0,
            is_available: true,
            is_active: true,
            sort_order: p.sort_order || idx
          }));
        }
      }

      map[g.id] = opts;
    });

    return map;
  }, [productGroups, product.available_flavor_ids, storageVersion]);

  // Manipulador para Radio Button em complementos (escolha única)
  const handleRadioSelect = (groupId: string, optionId: string) => {
    setGroupSelections(prev => ({
      ...prev,
      [groupId]: { [optionId]: 1 }
    }));
    setValidationError(null);
  };

  // Manipulador para Checkbox em complementos (escolha múltipla sem repetição)
  const handleCheckboxToggle = (groupId: string, optionId: string, maxSelect: number) => {
    setGroupSelections(prev => {
      const currentGroup = prev[groupId] || {};
      const isSelected = (currentGroup[optionId] || 0) > 0;
      const totalSelected = Object.values(currentGroup).reduce((sum, q) => sum + (q > 0 ? 1 : 0), 0);

      if (!isSelected && maxSelect > 0 && totalSelected >= maxSelect) {
        setValidationError(`Você já escolheu o limite máximo de ${maxSelect} opções deste grupo.`);
        setTimeout(() => setValidationError(null), 3000);
        return prev;
      }

      const nextGroup = { ...currentGroup };
      if (isSelected) {
        delete nextGroup[optionId];
      } else {
        nextGroup[optionId] = 1;
      }

      setValidationError(null);
      return {
        ...prev,
        [groupId]: nextGroup
      };
    });
  };

  // Manipulador para Contador [-] qty [+] em complementos ou sabores de combo
  const handleCounterChange = (
    groupId: string,
    optionId: string,
    delta: number,
    maxSelect: number
  ) => {
    setGroupSelections(prev => {
      const currentGroup = prev[groupId] || {};
      const currentQty = currentGroup[optionId] || 0;
      const totalInGroup = Object.values(currentGroup).reduce((sum, q) => sum + q, 0);

      if (delta > 0 && maxSelect > 0 && totalInGroup + delta > maxSelect) {
        setValidationError(`Limite máximo de ${maxSelect} itens atingido.`);
        setTimeout(() => setValidationError(null), 3000);
        return prev;
      }

      const nextQty = Math.max(0, currentQty + delta);
      const nextGroup = { ...currentGroup };
      if (nextQty === 0) {
        delete nextGroup[optionId];
      } else {
        nextGroup[optionId] = nextQty;
      }

      setValidationError(null);
      return {
        ...prev,
        [groupId]: nextGroup
      };
    });
  };

  useEffect(() => {
    const next: Record<string, Record<string, number>> = {};
    for (const group of productGroups) {
      const availableIds = new Set((optionsByGroup[group.id] || []).map(option=>option.id));
      const choices = Object.fromEntries(Object.entries(groupSelections[group.id] || {}).filter(([id])=>availableIds.has(id)));
      if (Object.keys(choices).length) next[group.id]=choices;
    }
    const oldChoices=Object.fromEntries(Object.entries(groupSelections).filter(([,choices])=>Object.keys(choices).length));
    if (JSON.stringify(next) === JSON.stringify(oldChoices)) return;
    setGroupSelections(next);
    setValidationError('As opções foram atualizadas pela loja. Confira suas escolhas antes de adicionar.');
  }, [productGroups, optionsByGroup, groupSelections]);

  // Validação espelhada rigorosamente com a regra do servidor
  const validationStatus = useMemo(() => {
    for (const group of productGroups) {
      const minSelect = group.min_select ?? group.min_options ?? 0;
      const maxSelect = group.max_select ?? group.max_options ?? 0;
      const isRequired = Boolean(group.required ?? group.is_required ?? false);
      const groupQtys = groupSelections[group.id] || {};
      const totalInGroup = Object.values(groupQtys).reduce((sum, q) => sum + q, 0);

      if ((isRequired || totalInGroup > 0) && totalInGroup < minSelect) {
        const diff = minSelect - totalInGroup;
        return {
          isValid: false,
          missing: diff,
          excess: 0,
          groupName: group.name,
          message: minSelect === 1
            ? `Selecione 1 opção em "${group.name}".`
            : `Faltam ${diff} unidades em "${group.name}".`
        };
      }

      if (maxSelect > 0 && totalInGroup > maxSelect) {
        const excess = totalInGroup - maxSelect;
        return {
          isValid: false,
          missing: 0,
          excess,
          groupName: group.name,
          message: `Você selecionou ${excess} a mais em "${group.name}". Limite: ${maxSelect}.`
        };
      }
    }

    return { isValid: true, missing: 0, excess: 0, groupName: '', message: '' };
  }, [productGroups, groupSelections]);

  // Recálculo do valor extra dos adicionais
  const extraPrice = useMemo(() => {
    let extra = 0;

    productGroups.forEach(group => {
      const groupQtys = groupSelections[group.id] || {};
      const options = optionsByGroup[group.id] || [];
      const selectedList: Array<{ option: ProductOption; qty: number }> = [];

      options.forEach(opt => {
        const q = groupQtys[opt.id] || 0;
        if (q > 0) {
          selectedList.push({ option: opt, qty: q });
        }
      });

      if (selectedList.length === 0) return;

      const tipo = group.tipo_cobranca || 'soma';
      if (tipo === 'maior_valor') {
        const maxPrice = Math.max(...selectedList.map(item => item.option.price || 0));
        extra += maxPrice;
      } else if (tipo === 'media') {
        const totalUnits = selectedList.reduce((sum, item) => sum + item.qty, 0);
        const sumPrice = selectedList.reduce((sum, item) => sum + ((item.option.price || 0) * item.qty), 0);
        extra += totalUnits > 0 ? (sumPrice / totalUnits) : 0;
      } else {
        selectedList.forEach(item => {
          extra += (item.option.price || 0) * item.qty;
        });
      }
    });

    return extra;
  }, [productGroups, groupSelections, optionsByGroup]);

  // Lista achatada de seleções para persistência no carrinho e exibição do resumo
  const flatSelectedOptions = useMemo(() => {
    const list: CartItemOption[] = [];

    productGroups.forEach(group => {
      const groupQtys = groupSelections[group.id] || {};
      const options = optionsByGroup[group.id] || [];

      options.forEach(opt => {
        const qty = groupQtys[opt.id] || 0;
        if (qty > 0) {
          const optName = opt.name || 'Opção';
          list.push({
            groupId: group.id,
            groupName: group.name || 'Adicional',
            optionId: opt.id,
            optionName: qty > 1 ? `${qty}x ${optName}` : optName,
            price: (opt.price || 0) * qty,
            quantity: qty
          });
        }
      });
    });

    return list;
  }, [productGroups, groupSelections, optionsByGroup]);

  const basePrice = productPrice(product);
  const unitPrice = useMemo(() => {
    return basePrice + extraPrice;
  }, [basePrice, extraPrice]);

  const totalPrice = unitPrice * productQuantity;
  const stockLimit = product.has_stock_control ? Math.max(0, Math.floor(product.stock_quantity)) : null;
  const stockBlocked = stockLimit !== null && productQuantity > stockLimit;
  const canAdd = validationStatus.isValid && !stockBlocked;

  const handleAddToCart = () => {
    if (product.has_stock_control && productQuantity > product.stock_quantity) {
      setValidationError(`Quantidade (${productQuantity}) excede o estoque disponível (${product.stock_quantity}).`);
      return;
    }
    if (!validationStatus.isValid) {
      setValidationError(validationStatus.message || `Confira as opções em "${validationStatus.groupName}".`);
      return;
    }

    const cartItem: CartItem = {
      id: editingItem?.id || `${product.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Personalizar ${product.name}`}
      className="product-customizer-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="product-customizer-sheet">
        {/* Handle visual mobile */}
        <div className="customizer-drag-indicator" />

        {/* Topo com imagem do produto e botão de fechar */}
        <div className="customizer-image-header">
          {product.image_url ? (
            <img
              src={productImage(product)}
              onError={e => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackProductImage(product);
              }}
              alt={product.name}
              className="customizer-hero-img"
            />
          ) : (
            <div className="customizer-img-placeholder">
              <Utensils size={48} strokeWidth={1.5} />
              <span className="placeholder-text">Foto ilustrativa em breve</span>
            </div>
          )}

          <div className="customizer-image-gradient" />

          <button
            onClick={onClose}
            className="customizer-close-btn"
            aria-label="Fechar janela"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="customizer-scrollable-body">
          {/* Card com título, descrição e preço */}
          <div className="customizer-intro">
            <div className="customizer-title-row">
              <h2 className="customizer-title">{product.name}</h2>
              {isComboProduct ? (
                <span className="customizer-combo-pill">
                  <Package size={13} /> Combo • {targetComboQty} un.
                </span>
              ) : product.has_options ? (
                <span className="customizer-combo-pill">
                  <Sparkles size={13} /> Personalizável
                </span>
              ) : null}
            </div>

            {product.description && (
              <p className="customizer-desc">{product.description}</p>
            )}

            <div className="customizer-price-row">
              <div className="customizer-prices">
                <span className="customizer-price-label">Preço base:</span>
                <span className="customizer-base-price">
                  {formatCurrency(basePrice)}
                </span>
                {product.promo_price && product.promo_price > 0 && product.promo_price < product.price && (
                  <span className="customizer-strike-price">
                    {formatCurrency(product.price)}
                  </span>
                )}
              </div>

              {extraPrice > 0 && (
                <span className="customizer-addon-chip">
                  +{formatCurrency(extraPrice)} em adicionais
                </span>
              )}
            </div>
          </div>

          {validationError && (
            <div className="customizer-alert-banner" role="alert">
              <AlertCircle size={20} className="flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* RENDERIZAÇÃO DE TODOS OS GRUPOS DE ADICIONAIS / SABORES / COMPLEMENTOS */}
          {productGroups.map(group => {
            const options = optionsByGroup[group.id] || [];
            if (options.length === 0) return null;

            const minSelect = group.min_select ?? group.min_options ?? 0;
            const maxSelect = group.max_select ?? group.max_options ?? (minSelect > 0 ? minSelect : 999);
            const isRequired = Boolean(group.required ?? group.is_required ?? false);
            const permiteRepetir = group.permite_repetir ?? (group.group_kind === 'flavors' || (group.step || 1) > 1 || maxSelect > 1);
            const groupStep = group.step || 1;

            // Tipos de controle
            const isRadioMode = minSelect === 1 && maxSelect === 1 && !permiteRepetir && groupStep === 1;
            const isCounterMode = (maxSelect > 1 && permiteRepetir) || groupStep > 1 || group.group_kind === 'flavors' || (group.name || '').toLowerCase().includes('sabores');
            const isCheckboxMode = !isRadioMode && !isCounterMode;

            const groupQtys = groupSelections[group.id] || {};
            const currentTotal = Object.values(groupQtys).reduce((sum, q) => sum + q, 0);

            // Condições de status do grupo
            const isFulfilled = (isRequired ? currentTotal >= minSelect : (currentTotal === 0 || currentTotal >= minSelect)) &&
              (maxSelect === 999 || currentTotal <= maxSelect);
            const isExactComplete = maxSelect > 0 && currentTotal === maxSelect;
            const isMaxReached = maxSelect > 0 && currentTotal >= maxSelect;
            const isMissing = minSelect > currentTotal && (isRequired || currentTotal > 0);

            // Cálculo da barra de progresso (para combos e seleções com limite definido)
            const targetQty = maxSelect > 0 && maxSelect !== 999 ? maxSelect : minSelect;
            const progressPercent = targetQty > 0
              ? Math.min(100, Math.round((currentTotal / targetQty) * 100))
              : 0;

            const badgeContextText = isRequired
              ? (minSelect === maxSelect
                  ? `Obrigatório • Escolha ${minSelect} un.`
                  : `Obrigatório • Mínimo ${minSelect}${maxSelect < 999 ? ` até ${maxSelect}` : ''}`)
              : (maxSelect < 999
                  ? `Opcional • Até ${maxSelect}`
                  : 'Opcional');

            return (
              <section key={group.id} className={`customizer-group-card ${isMissing ? 'group-missing-state' : ''}`}>
                <div className="group-card-header">
                  <div className="group-header-text">
                    <div className="group-header-title-row">
                      <h3 className="group-card-title">
                        {group.group_kind === 'flavors' || (group.name || '').toLowerCase().includes('sabor') ? (
                          <Package size={18} className="text-primary-icon" />
                        ) : (
                          <Sparkles size={17} className="text-primary-icon" />
                        )}
                        <span>{group.name}</span>
                      </h3>

                      <span className={`group-badge ${isRequired ? 'group-badge-req' : 'group-badge-opt'}`}>
                        {badgeContextText}
                      </span>
                    </div>

                    <p className="client-selection-guide">{selectionGuidance(minSelect,maxSelect,groupStep,isRequired)}</p>
                    {group.description && (
                      <p className="group-card-desc">{group.description}</p>
                    )}
                  </div>

                  {/* Barra de Progresso e Alerta Visual de Contagem */}
                  {targetQty > 0 && (
                    <div className="group-progress-wrap">
                      <div className="group-progress-info">
                        <span className="group-progress-counter">
                          Progresso: <strong>{currentTotal}</strong> de <strong>{targetQty}</strong> {group.group_kind === 'flavors' || (group.name || '').toLowerCase().includes('sabor') ? 'salgados' : 'selecionados'}
                        </span>

                        {isExactComplete ? (
                          <span className="group-progress-status complete">
                            <CheckCircle2 size={14} /> Quantidade completa!
                          </span>
                        ) : isMissing ? (
                          <span className="group-progress-status pending">
                            Faltam {missingSelections(minSelect, currentTotal)} {groupStep > 1 ? `(de ${groupStep} em ${groupStep})` : ''}
                          </span>
                        ) : null}
                      </div>

                      <div className="group-progress-bar-track">
                        <div
                          className={`group-progress-bar-fill ${isExactComplete ? 'fill-complete' : ''}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {group.tipo_cobranca && group.tipo_cobranca !== 'soma' && (
                    <div className="group-cobranca-hint">
                      <Info size={14} className="flex-shrink-0" />
                      <span>
                        {group.tipo_cobranca === 'maior_valor' && 'Será cobrado o valor do adicional de maior preço escolhido.'}
                        {group.tipo_cobranca === 'media' && 'Será cobrada a média dos adicionais selecionados.'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="group-options-list">
                  {options.map(opt => {
                    const currentQty = groupQtys[opt.id] || 0;
                    const isSelected = currentQty > 0;
                    const optStep = groupStep || opt.step || 1;
                    const isDisabledCheckbox = isCheckboxMode && !isSelected && isMaxReached;
                    const isPlusDisabled = maxSelect > 0 && currentTotal + optStep > maxSelect;

                    return (
                      <div
                        key={opt.id}
                        className={`group-option-row ${isSelected ? 'option-selected' : ''} ${isDisabledCheckbox ? 'option-disabled' : ''}`}
                        onClick={() => {
                          if (isRadioMode) handleRadioSelect(group.id, opt.id);
                          else if (isCheckboxMode && !isDisabledCheckbox) handleCheckboxToggle(group.id, opt.id, maxSelect);
                        }}
                      >
                        <div className="option-info">
                          <div className="option-name-row">
                            <span className="option-name">{(opt.name || 'Opção').trim()}</span>
                            {isSelected && currentQty > 0 && (
                              <span className="option-selected-qty-tag">
                                {currentQty} un.
                              </span>
                            )}
                          </div>

                          {opt.description && (
                            <small className="option-flavor-desc">{opt.description}</small>
                          )}

                          <div className="option-pricing-tag">
                            {opt.price > 0 ? (
                              <span className="option-extra-price">
                                +{formatCurrency(opt.price)}
                              </span>
                            ) : (
                              <span className="option-free-tag">
                                Sem custo adicional
                              </span>
                            )}
                            {optStep > 1 && (
                              <span className="option-step-hint">
                                (blocos de {optStep})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="option-action" onClick={e => e.stopPropagation()}>
                          {/* 1. Radio Button */}
                          {isRadioMode && (
                            <label className="custom-radio-wrap" title={`Selecionar ${(opt.name || 'Opção').trim()}`}>
                              <input
                                type="radio"
                                aria-label={`Selecionar ${(opt.name || 'Opção').trim()} em ${group.name}`}
                                name={`radio-group-${group.id}`}
                                checked={isSelected}
                                onChange={() => handleRadioSelect(group.id, opt.id)}
                              />
                              <span className="custom-radio-dot" />
                            </label>
                          )}

                          {/* 2. Checkbox */}
                          {isCheckboxMode && (
                            <label className="custom-checkbox-wrap" title={`Selecionar ${(opt.name || 'Opção').trim()}`}>
                              <input
                                type="checkbox"
                                aria-label={`Selecionar ${(opt.name || 'Opção').trim()} em ${group.name}`}
                                checked={isSelected}
                                disabled={isDisabledCheckbox}
                                onChange={() => handleCheckboxToggle(group.id, opt.id, maxSelect)}
                              />
                              <span className="custom-checkbox-box">
                                {isSelected && <Check size={14} strokeWidth={3} />}
                              </span>
                            </label>
                          )}

                          {/* 3. Contador [-] 0 [+] com Step */}
                          {isCounterMode && (
                            <div className="custom-counter-controls">
                              <button
                                type="button"
                                className="counter-btn"
                                onClick={() => handleCounterChange(group.id, opt.id, -optStep, maxSelect)}
                                disabled={currentQty === 0}
                                aria-label={`Diminuir ${optStep} unidades de ${(opt.name || 'Opção').trim()}`}
                                title={currentQty > 0 ? `Remover ${optStep}` : undefined}
                              >
                                <Minus size={15} />
                              </button>
                              <span className="counter-value">{currentQty}</span>
                              <button
                                type="button"
                                className="counter-btn"
                                onClick={() => handleCounterChange(group.id, opt.id, optStep, maxSelect)}
                                disabled={isPlusDisabled}
                                aria-label={`Adicionar ${optStep} unidades de ${(opt.name || 'Opção').trim()}`}
                                title={isPlusDisabled ? 'Limite do combo atingido' : `Adicionar ${optStep}`}
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Resumo Interativo das Escolhas Feitas */}
          {flatSelectedOptions.length > 0 && (
            <div className="customizer-selection-summary-card">
              <div className="summary-card-header">
                <div className="summary-title-wrap">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="summary-card-title">Suas escolhas para este item:</span>
                </div>
                <span className="summary-card-total-badge">
                  {flatSelectedOptions.reduce((acc, curr) => acc + (curr.quantity || 1), 0)} itens escolhidos
                </span>
              </div>
              <div className="summary-chips-wrap">
                {flatSelectedOptions.map((item, idx) => {
                  const rawName = (item.optionName || 'Item').replace(/^\d+x\s*/, '');
                  return (
                    <span key={idx} className="summary-choice-chip">
                      <strong>{item.quantity}x</strong> {rawName}
                      {item.price > 0 && <small className="chip-price">(+{formatCurrency(item.price)})</small>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Campo de Observações para a Cozinha */}
          <div className="customizer-notes-card">
            <div className="notes-header">
              <label htmlFor="product-notes" className="notes-title">
                Alguma observação para a cozinha?
              </label>
              <span className="notes-counter">{notes.length}/200</span>
            </div>
            <p className="notes-subtitle">Ex.: bem fritos, enviar sachês à parte, sem pimenta...</p>
            <textarea
              id="product-notes"
              rows={2}
              maxLength={200}
              placeholder="Digite aqui alguma preferência especial..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="notes-textarea"
            />
          </div>
        </div>

        {/* RODAPÉ ERGONÔMICO E RESPONSIVO (SEM CORTES) */}
        <footer className="customizer-sticky-footer">
          {stockLimit !== null && <p className="customizer-stock-note" role="status">{stockLimit===0?'Este produto está sem estoque no momento.':`Disponível agora: ${stockLimit} ${stockLimit===1?'unidade':'unidades'} do produto.`} A disponibilidade será conferida ao enviar o pedido.</p>}
          <div className="footer-top-row">
            <div className="footer-qty-control-wrap">
              <span className="footer-control-label">Quantidade</span>
              <div className="footer-qty-selector" aria-label="Quantidade do produto">
                <button
                  type="button"
                  className="footer-qty-btn"
                  disabled={productQuantity <= 1}
                  onClick={() => setProductQuantity(q => Math.max(1, q - 1))}
                  aria-label="Diminuir quantidade"
                >
                  <Minus size={16} />
                </button>
                <span className="footer-qty-number" aria-live="polite" aria-atomic="true">{productQuantity}</span>
                <button
                  type="button"
                  className="footer-qty-btn"
                  disabled={stockLimit !== null && productQuantity >= stockLimit}
                  onClick={() => setProductQuantity(q => stockLimit === null ? q + 1 : Math.min(stockLimit, q + 1))}
                  aria-label="Aumentar quantidade"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="footer-price-display">
              <span className="footer-price-subtext">
                {productQuantity > 1 ? `${productQuantity}x de ${formatCurrency(unitPrice)}` : 'Subtotal do item'}
              </span>
              <strong className="footer-total-price">
                {formatCurrency(totalPrice)}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className={`footer-action-btn ${canAdd ? 'action-btn-ready' : 'action-btn-disabled'}`}
            disabled={!canAdd}
            onClick={handleAddToCart}
          >
            {canAdd ? (
              <span className="btn-content-valid">
                <span className="btn-label-text">
                  {editingItem ? 'Salvar Alterações' : 'Adicionar ao Carrinho'}
                </span>
                <span className="btn-price-tag">
                  {formatCurrency(totalPrice)} <ChevronRight size={16} />
                </span>
              </span>
            ) : (
              <span className="btn-label-warning">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{stockBlocked ? (stockLimit===0?'Produto sem estoque':'Reduza a quantidade para o estoque disponível') : validationStatus.message || 'Selecione as opções obrigatórias'}</span>
              </span>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};
