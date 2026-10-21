import { Order, StoreSettings } from '../types';
import { formatCurrency } from './formatters';

export const printThermalReceipt = (
  order: Order,
  settings: StoreSettings,
  overridePaperWidth?: '80mm' | '58mm',
  overrideIncludeLogo?: boolean
) => {
  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]!));

  const escapeData = (value: any): any =>
    typeof value === 'string'
      ? escapeHtml(value)
      : Array.isArray(value)
      ? value.map(escapeData)
      : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, escapeData(item)]))
      : value;

  const originalLogo = settings.printer_logo_url || settings.logo_url || '';
  order = escapeData(order);
  settings = escapeData(settings);
  const validLogo = /^(https?:\/\/|\/(?!\/)|data:image\/(png|jpeg|webp);base64,)/i.test(originalLogo) ? escapeHtml(originalLogo) : '';
  settings.printer_logo_url = validLogo;
  settings.logo_url = validLogo;

  const paperWidth = overridePaperWidth || settings.printer_paper_width || '80mm';
  const includeLogo = overrideIncludeLogo ?? settings.printer_include_logo ?? true;
  const logoUrl = settings.printer_logo_url || settings.logo_url;

  // Header settings
  const showName = settings.printer_header_show_name !== false;
  const showAddress = settings.printer_header_show_address !== false;
  const showPhone = settings.printer_header_show_phone !== false;
  const showCnpj = settings.printer_header_show_cnpj !== false;
  const showSlogan = settings.printer_header_show_slogan !== false;
  const headerCustomText = showSlogan ? (settings.printer_header_custom_text || '') : '';

  // Items settings
  const isItemsBold = settings.printer_items_bold !== false;
  const highlightFlavors = settings.printer_items_highlight_flavors !== false;
  const showItemSeparator = settings.printer_items_separator !== false;

  // Footer settings
  const showFooterText = settings.printer_footer_show_text !== false;
  const footerCustomText = showFooterText
    ? (settings.printer_footer_custom_text !== undefined
        ? settings.printer_footer_custom_text
        : 'Alfa Salgados • Os melhores sabores se faz com carinho!')
    : '';
  const showWebsite = settings.printer_footer_show_website !== false;
  const showSignature = Boolean(settings.printer_footer_show_signature);

  const widthCss = paperWidth === '58mm' ? '48mm' : '72mm';
  const fontSize = paperWidth === '58mm' ? '11px' : '12px';
  const dividerString = paperWidth === '58mm' ? '============================' : '================================';
  const subDividerString = paperWidth === '58mm' ? '----------------------------' : '--------------------------------';

  // Date formatting helpers without external relative imports (preserves unit test compatibility)
  const formatOrderDate = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const pad = (n: number) => String(n).padStart(2, '0');
      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    } catch {
      return String(dateStr || '');
    }
  };

  const formatPreorderDate = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const cleanStr = String(dateStr).split('T')[0];
    if (cleanStr.includes('-')) {
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return cleanStr;
  };

  const isScheduled = Boolean(order.preorder_date || order.is_scheduled);
  const scheduledDate = formatPreorderDate(order.preorder_date);
  const scheduledTime = order.preorder_time || 'Horário não informado';
  const orderCreatedFormatted = formatOrderDate(order.created_at || new Date().toISOString());

  // Forma de pagamento formatada
  let paymentText = 'PIX PAGO';
  if (order.payment_method === 'cash') {
    paymentText = order.needs_change
      ? `DINHEIRO (Troco p/ ${formatCurrency(order.change_amount || 0)})`
      : 'DINHEIRO';
  } else if (order.payment_method === 'credit') {
    paymentText = 'CARTÃO CRÉDITO';
  } else if (order.payment_method === 'debit') {
    paymentText = 'CARTÃO DÉBITO';
  } else if (order.payment_status === 'pending') {
    paymentText = 'PIX A PAGAR';
  }

  // Delivery type label
  const deliveryTypeLabel = order.delivery_type === 'delivery' ? 'ENTREGA' : 'RETIRADA';

  // Build items HTML
  const itemsCount = (order.items || []).length;
  const itemsHtml = (order.items || []).map((item, index) => {
    // Adicionais e variações
    let addonsLines: string[] = [];
    const bullet = highlightFlavors ? '▶ ' : '+ ';

    // Se houver snapshot congelado de order_item_addons
    if (item.addons && item.addons.length > 0) {
      item.addons.forEach((a: any) => {
        const addonPrice = a.subtotal > 0 ? formatCurrency(a.subtotal) : 'GRÁTIS';
        addonsLines.push(`
          <div class="addon-line">
            <span>&nbsp;&nbsp;&nbsp;${bullet}${a.quantidade}x ${a.nome_historico}</span>
            <span>${addonPrice}</span>
          </div>
        `);
      });
    } else if (item.selections && item.selections.length > 0) {
      item.selections.forEach(s => {
        const isPoint = /ponto|carne|cozimento/i.test(s.groupName || '');
        if (isPoint) {
          addonsLines.push(`
            <div class="addon-line">
              <span>&nbsp;&nbsp;&nbsp;[PONTO]: ${s.optionName}</span>
            </div>
          `);
        } else {
          const sPrice = s.price && s.price > 0 ? formatCurrency(s.price) : '';
          addonsLines.push(`
            <div class="addon-line">
              <span>&nbsp;&nbsp;&nbsp;${bullet}${s.quantity ? s.quantity + 'x ' : ''}${s.optionName}</span>
              <span>${sPrice}</span>
            </div>
          `);
        }
      });
    }

    // Observações do item
    let obsHtml = '';
    const itemObs = item.observation || item.notes;
    if (itemObs) {
      obsHtml = `
        <div class="item-obs-divider">-----------------------------</div>
        <div class="item-obs">&gt;&gt; OBS: ${itemObs} &lt;&lt;</div>
      `;
    }

    const separatorHtml = (showItemSeparator && index < itemsCount - 1)
      ? '<div style="border-top: 1px dotted #888888; margin: 4px 0;"></div>'
      : '';

    return `
      <div class="order-item-block">
        <div class="item-main-line" style="font-weight: ${isItemsBold ? '800' : '600'};">
          <span class="item-name">${item.quantity}x ${item.product_name}</span>
          <span class="item-dots">...................</span>
          <span class="item-price">${formatCurrency(item.subtotal)}</span>
        </div>
        ${addonsLines.join('')}
        ${obsHtml}
        ${separatorHtml}
      </div>
    `;
  }).join('');

  // Logo HTML
  const logoHtml = (includeLogo && logoUrl) ? `
    <div style="text-align: center; margin-bottom: 6px;">
      <img
        src="${logoUrl}"
        alt="${settings.business_name || 'Logo'}"
        style="max-width: ${paperWidth === '58mm' ? '36mm' : '48mm'}; max-height: 22mm; object-fit: contain; filter: grayscale(100%) contrast(160%); display: inline-block;"
      />
    </div>
  ` : '';

  // Store Header HTML following settings model
  const storeHeaderHtml = `
    <div style="text-align: center; margin-bottom: 4px;">
      ${showName ? `
        <div class="title" style="font-size: ${paperWidth === '58mm' ? '13px' : '15px'}; font-weight: bold; letter-spacing: 0.5px;">
          ${settings.business_name || 'ALFA SALGADOS'}
        </div>
      ` : ''}
      ${showAddress ? `
        <div style="font-size: 9px; line-height: 1.3; margin-top: 2px;">
          ${settings.store_address || 'Rua E'}${settings.store_address_number ? ', Nº ' + settings.store_address_number : ''}<br />
          ${settings.store_neighborhood || 'Ibirapuera'}${settings.pix_recipient_city ? ' - ' + settings.pix_recipient_city : ' - Vitória da Conquista'}
        </div>
      ` : ''}
      ${showPhone && settings.whatsapp ? `
        <div style="font-size: 9px; margin-top: 2px;">
          WhatsApp: ${settings.whatsapp}
        </div>
      ` : ''}
      ${showCnpj && settings.cnpj ? `
        <div style="font-size: 9px; margin-top: 1px;">
          CNPJ: ${settings.cnpj}
        </div>
      ` : ''}
      ${headerCustomText ? `
        <div style="font-size: 9px; font-weight: bold; margin-top: 4px; border: 1px solid #000; padding: 2px 4px; display: inline-block;">
          ${headerCustomText}
        </div>
      ` : ''}
    </div>
  `;

  // Scheduled or Regular Order Header HTML
  const orderSchedulingHtml = isScheduled ? `
    <div class="scheduled-box">
      <div class="scheduled-badge">*** PEDIDO AGENDADO ***</div>
      <div class="scheduled-date-row">
        <strong>Pedido feito em:</strong> ${orderCreatedFormatted}
      </div>
      <div class="divider-dash">${subDividerString}</div>
      <div class="scheduled-target-title">
        ${order.delivery_type === 'delivery' ? '📅 ENTREGA AGENDADA PARA:' : '📅 RETIRADA AGENDADA PARA:'}
      </div>
      <div class="scheduled-target-date">
        Data: ${scheduledDate}
      </div>
      <div class="scheduled-target-time">
        Horário: ${scheduledTime}
      </div>
    </div>
  ` : `
    <div class="meta-line" style="margin-top: 2px;">
      <span>Data: ${orderCreatedFormatted}</span>
    </div>
    <div class="text-center bold" style="margin-top: 2px; font-size: 11px;">
      ${order.delivery_type === 'delivery' ? '*** ENTREGA EM DOMICÍLIO ***' : '*** RETIRADA NO BALCÃO ***'}
    </div>
  `;

  // Full HTML Content
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Comanda #${order.order_number} - ${deliveryTypeLabel}</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: ${widthCss};
            margin: 0 auto;
            padding: 2mm 1mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: ${fontSize};
            line-height: 1.25;
            color: #000000;
            background: #ffffff;
          }
          .divider-equal {
            font-weight: bold;
            white-space: nowrap;
            overflow: hidden;
            letter-spacing: -0.5px;
            margin: 3px 0;
            text-align: center;
          }
          .divider-dash {
            white-space: nowrap;
            overflow: hidden;
            letter-spacing: -0.5px;
            margin: 3px 0;
            text-align: center;
          }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .title {
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .meta-line {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
          }
          .scheduled-box {
            border: 2px solid #000000;
            padding: 6px 4px;
            margin: 6px 0;
            text-align: center;
            background-color: #f8fafc;
          }
          .scheduled-badge {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.5px;
          }
          .scheduled-date-row {
            font-size: 10px;
            margin-top: 3px;
          }
          .scheduled-target-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            margin-top: 4px;
          }
          .scheduled-target-date {
            font-size: 13px;
            font-weight: 900;
            margin-top: 2px;
          }
          .scheduled-target-time {
            font-size: 12px;
            font-weight: 900;
          }
          .order-item-block {
            margin: 5px 0;
          }
          .item-main-line {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
          }
          .item-name {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 65%;
          }
          .item-dots {
            flex-grow: 1;
            overflow: hidden;
            margin: 0 4px;
            white-space: nowrap;
            opacity: 0.6;
          }
          .item-price {
            white-space: nowrap;
          }
          .addon-line {
            display: flex;
            justify-content: space-between;
            font-size: 0.9em;
            color: #111;
            margin-top: 1px;
          }
          .item-obs-divider {
            font-size: 0.85em;
            color: #333;
            margin: 2px 0 1px 12px;
          }
          .item-obs {
            font-weight: 800;
            font-size: 0.9em;
            padding-left: 12px;
            margin-top: 1px;
          }
          .total-box {
            font-size: 14px;
            font-weight: 900;
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
          }
        </style>
      </head>
      <body>
        ${logoHtml}
        ${storeHeaderHtml}
        <div class="divider-dash">${subDividerString}</div>

        <div class="text-center" style="font-size: 15px; font-weight: bold; letter-spacing: 0.5px;">
          PEDIDO #${order.order_number}
        </div>
        ${orderSchedulingHtml}
        <div class="divider-dash">${subDividerString}</div>

        <div>CLIENTE: <span class="bold">${order.customer_name || 'Consumidor'}</span></div>
        <div>TEL: <span class="bold">${order.customer_phone || 'Não informado'}</span></div>
        ${order.delivery_type === 'delivery' ? `
          <div>END: ${order.address || ''}, Nº ${order.address_number || 'S/N'}${order.complement ? ' - ' + order.complement : ''}</div>
          <div>Bairro: <span class="bold">${order.neighborhood_name || settings.store_neighborhood || 'Centro'}</span></div>
          ${order.reference_point ? `<div>Ref: ${order.reference_point}</div>` : ''}
        ` : `
          <div class="bold">*** RETIRADA NO BALCÃO ***</div>
        `}
        <div class="divider-dash">${subDividerString}</div>

        <div style="font-weight: bold; font-size: 10px; margin-bottom: 3px;">ITENS DO PEDIDO:</div>
        ${itemsHtml}

        <div class="divider-equal">${dividerString}</div>
        ${order.delivery_fee > 0 ? `
          <div style="display:flex; justify-content:space-between;">
            <span>Subtotal:</span>
            <span>${formatCurrency(order.subtotal)}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Taxa Entrega:</span>
            <span>${formatCurrency(order.delivery_fee)}</span>
          </div>
        ` : ''}
        ${order.discount_value > 0 ? `
          <div style="display:flex; justify-content:space-between;">
            <span>Desconto:</span>
            <span>-${formatCurrency(order.discount_value)}</span>
          </div>
        ` : ''}
        ${(order.loyalty_discount && order.loyalty_discount > 0) ? `
          <div style="display:flex; justify-content:space-between;">
            <span>Desconto Fidelidade:</span>
            <span>-${formatCurrency(order.loyalty_discount)}</span>
          </div>
        ` : ''}
        <div class="total-box">
          <span>TOTAL:</span>
          <span>${formatCurrency(order.total)} (${paymentText})</span>
        </div>
        <div class="divider-equal">${dividerString}</div>

        <div>
          <strong>Pagamento:</strong> ${paymentText}
        </div>

        ${order.notes ? `
          <div style="margin: 4px 0; padding: 4px; border: 1px dashed #000; font-size: 11px;">
            <strong>&gt;&gt; OBS DO PEDIDO:</strong> ${order.notes} &lt;&lt;
          </div>
        ` : ''}

        ${showSignature ? `
          <div style="margin-top: 18px; text-align: center;">
            <div style="border-top: 1px solid #000; width: 85%; margin: 0 auto 3px auto;"></div>
            <div style="font-size: 9px;">Assinatura do Cliente</div>
          </div>
        ` : ''}

        <div class="divider-dash" style="margin-top: 8px;">${subDividerString}</div>
        ${footerCustomText ? `
          <div class="text-center" style="font-size: 9px; margin-top: 4px; font-style: italic;">
            ${footerCustomText}
          </div>
        ` : ''}
        ${showWebsite ? `
          <div class="text-center" style="font-size: 8px; margin-top: 2px; color: #555;">
            www.alfasalgados.com.br
          </div>
        ` : ''}

        <div class="text-center" style="font-size: 9px; margin-top: 6px; color: #666;">
          ALFA DELIVERY PRO • SISTEMA DE GESTÃO
        </div>
      </body>
    </html>
  `;

  // Create or reuse hidden printing iframe
  let iframe = typeof document !== 'undefined' ? (document.getElementById('thermal-print-frame') as HTMLIFrameElement | null) : null;
  if (!iframe && typeof document !== 'undefined' && document.createElement) {
    iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  const doc = iframe?.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Wait for images and fonts before print dialog
  const images = Array.from(doc.images || []).map(img => (img as HTMLImageElement).complete ? Promise.resolve() : new Promise<void>(resolve => {
    (img as HTMLImageElement).onload = () => resolve();
    (img as HTMLImageElement).onerror = () => resolve();
    setTimeout(resolve, 3000);
  }));
  void Promise.all([...images, doc.fonts?.ready ?? Promise.resolve()]).then(() => {
    try {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    } catch {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('alfa-save', { detail: { status: 'error', message: 'Não foi possível disparar a impressão.' } }));
      }
    }
  });
};
