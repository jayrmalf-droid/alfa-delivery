import { Order, StoreSettings } from '../types';
import { formatCurrency } from './formatters';

export const printThermalReceipt = (
  order: Order,
  settings: StoreSettings,
  overridePaperWidth?: '80mm' | '58mm',
  overrideIncludeLogo?: boolean
) => {
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]!));
  const escapeData = (value: any): any => typeof value === 'string' ? escapeHtml(value) : Array.isArray(value) ? value.map(escapeData) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key,item]) => [key,escapeData(item)])) : value;
  const originalLogo = settings.printer_logo_url || settings.logo_url || '';
  order = escapeData(order);
  settings = escapeData(settings);
  const validLogo = /^(https?:\/\/|\/(?!\/)|data:image\/(png|jpeg|webp);base64,)/i.test(originalLogo) ? escapeHtml(originalLogo) : '';
  settings.printer_logo_url = validLogo;
  settings.logo_url = validLogo;
  const paperWidth = overridePaperWidth || settings.printer_paper_width || '80mm';
  const includeLogo = overrideIncludeLogo ?? settings.printer_include_logo ?? true;
  const logoUrl = settings.printer_logo_url || settings.logo_url;

  const widthCss = paperWidth === '58mm' ? '48mm' : '72mm';
  const pageSize = paperWidth === '58mm' ? '58mm' : '80mm';
  const fontSize = paperWidth === '58mm' ? '11px' : '12px';
  const formattedDate = new Date(order.created_at || Date.now()).toLocaleString('pt-BR');

  // Format payment method text
  let paymentText = 'PIX';
  if (order.payment_method === 'cash') {
    paymentText = order.needs_change
      ? `DINHEIRO (Troco p/ ${formatCurrency(order.change_amount || 0)})`
      : 'DINHEIRO (Não precisa de troco)';
  } else if (order.payment_method === 'credit') {
    paymentText = 'CARTÃO DE CRÉDITO';
  } else if (order.payment_method === 'debit') {
    paymentText = 'CARTÃO DE DÉBITO';
  }

  // Header options
  const showName = settings.printer_header_show_name !== false;
  const showAddress = settings.printer_header_show_address !== false;
  const showPhone = settings.printer_header_show_phone !== false;
  const showCnpj = settings.printer_header_show_cnpj !== false;
  const showSlogan = settings.printer_header_show_slogan !== false;
  const headerCustomText = showSlogan ? (settings.printer_header_custom_text || '') : '';

  // Items formatting options
  const isItemsBold = settings.printer_items_bold !== false;
  const highlightFlavors = settings.printer_items_highlight_flavors !== false;
  const highlightNotes = settings.printer_items_highlight_notes !== false;
  const showItemSeparator = settings.printer_items_separator !== false;

  // Footer options
  const showFooterText = settings.printer_footer_show_text !== false;
  const footerCustomText = showFooterText
    ? (settings.printer_footer_custom_text !== undefined
        ? settings.printer_footer_custom_text
        : 'Alfa Salgados • Os melhores sabores se faz com carinho!')
    : '';
  const showWebsite = settings.printer_footer_show_website !== false;
  const showSignature = Boolean(settings.printer_footer_show_signature);

  // Build items HTML
  const itemsCount = (order.items || []).length;
  const itemsHtml = (order.items || []).map((item, idx) => {
    let selectionsHtml = '';
    if (item.selections && item.selections.length > 0) {
      selectionsHtml = `
        <div style="padding-left: ${highlightFlavors ? '8px' : '6px'}; font-size: ${paperWidth === '58mm' ? '10px' : '11px'}; color: #000; margin-top: 2px;">
          ${item.selections.map(s => `
            <div style="${highlightFlavors ? 'font-weight: 600;' : ''}">
              ${highlightFlavors ? '▶ ' : '+ '}${s.optionName}
            </div>
          `).join('')}
        </div>
      `;
    }

    let notesHtml = '';
    if (item.notes) {
      notesHtml = highlightNotes ? `
        <div style="margin-top: 3px; padding: 2px 4px; border: 1px solid #000; border-radius: 2px; font-size: 10px; font-weight: bold; background: #eee;">
          OBS: ${item.notes}
        </div>
      ` : `
        <div style="padding-left: 6px; font-size: 10px; font-style: italic;">
          Obs: ${item.notes}
        </div>
      `;
    }

    const itemSepHtml = (showItemSeparator && idx < itemsCount - 1) ? `
      <div style="border-top: 1px dotted #888; margin: 4px 0;"></div>
    ` : '';

    return `
      <div style="margin-bottom: ${showItemSeparator ? '4px' : '6px'};">
        <div style="display: flex; justify-content: space-between; ${isItemsBold ? 'font-weight: 800; font-size: ' + (paperWidth === '58mm' ? '12px' : '13px') + ';' : 'font-weight: 600;'}">
          <span>${item.quantity}x ${item.product_name}</span>
          <span>${formatCurrency(item.subtotal)}</span>
        </div>
        ${selectionsHtml}
        ${notesHtml}
        ${itemSepHtml}
      </div>
    `;
  }).join('');

  // Delivery details HTML
  let deliveryDetailsHtml = '';
  if (order.delivery_type === 'delivery') {
    deliveryDetailsHtml = `
      <div><strong>Endereço:</strong> ${order.address || ''}, Nº ${order.address_number || 'S/N'}</div>
      ${order.complement ? `<div><strong>Compl:</strong> ${order.complement}</div>` : ''}
      <div><strong>Bairro:</strong> ${order.neighborhood_name || settings.store_neighborhood}</div>
      ${order.reference_point ? `<div><strong>Ref:</strong> ${order.reference_point}</div>` : ''}
    `;
  }

  // Logo HTML
  const logoHtml = (includeLogo && logoUrl) ? `
    <div style="text-align: center; margin-bottom: 8px;">
      <img
        src="${logoUrl}"
        alt="${settings.business_name}"
        style="max-width: ${paperWidth === '58mm' ? '38mm' : '52mm'}; max-height: 24mm; object-fit: contain; filter: grayscale(100%) contrast(160%);"
      />
    </div>
  ` : '';

  // Header content HTML
  const headerDetailsHtml = `
    <div class="text-center">
      ${showName ? `<div style="font-size: 15px; font-weight: bold; letter-spacing: 0.5px;">${settings.business_name}</div>` : ''}
      ${showAddress ? `
        <div style="font-size: 10px;">${settings.store_address}, ${settings.store_address_number}</div>
        <div style="font-size: 10px;">${settings.store_neighborhood} - Vitória da Conquista</div>
      ` : ''}
      ${showPhone ? `<div style="font-size: 10px;">WhatsApp: ${settings.whatsapp}</div>` : ''}
      ${showCnpj && settings.cnpj ? `<div style="font-size: 10px;">CNPJ: ${settings.cnpj}</div>` : ''}
      ${headerCustomText ? `<div style="font-size: 10px; font-weight: bold; margin-top: 3px; border: 1px solid #000; padding: 2px;">${headerCustomText}</div>` : ''}
    </div>
  `;

  // Full receipt HTML
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Comanda Pedido #${order.order_number}</title>
        <style>
          @page {
            size: auto;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: ${widthCss};
            margin: 0 auto;
            padding: 3mm 1mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: ${fontSize};
            line-height: 1.25;
            color: #000000;
            background: #ffffff;
          }
          .divider {
            border-top: 1px dashed #000000;
            margin: 6px 0;
          }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .row {
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        ${logoHtml}
        ${headerDetailsHtml}

        <div class="divider"></div>

        <div class="text-center" style="font-size: 16px; font-weight: bold;">
          PEDIDO #${order.order_number}
        </div>
        <div class="text-center" style="font-size: 10px; margin-top: 2px;">
          ${formattedDate}
        </div>
        <div class="text-center bold" style="font-size: 11px; margin-top: 4px;">
          ${order.delivery_type === 'delivery' ? '*** ENTREGA EM DOMICÍLIO ***' : '*** RETIRADA NO BALCÃO ***'}
        </div>

        <div class="divider"></div>

        <div><strong>Cliente:</strong> ${order.customer_name}</div>
        <div><strong>WhatsApp:</strong> ${order.customer_phone}</div>
        ${deliveryDetailsHtml}

        <div class="divider"></div>

        <div class="bold" style="font-size: 13px; margin-bottom: 6px; letter-spacing: 0.5px;">
          ITENS DO PEDIDO:
        </div>
        ${itemsHtml}

        <div class="divider"></div>

        <div class="row">
          <span>Subtotal:</span>
          <span>${formatCurrency(order.subtotal)}</span>
        </div>
        ${order.delivery_fee > 0 ? `
          <div class="row">
            <span>Taxa de Entrega:</span>
            <span>${formatCurrency(order.delivery_fee)}</span>
          </div>
        ` : ''}
        ${order.discount_value > 0 ? `
          <div class="row" style="color: #b91c1c;">
            <span>Desconto:</span>
            <span>-${formatCurrency(order.discount_value)}</span>
          </div>
        ` : ''}
        <div class="row bold" style="font-size: 15px; margin-top: 4px;">
          <span>TOTAL:</span>
          <span>${formatCurrency(order.total)}</span>
        </div>

        <div class="divider"></div>

        <div><strong>Pagamento:</strong> ${paymentText}</div>

        ${order.notes ? `
          <div style="margin-top: 4px; padding: 4px; border: 1px dashed #000; font-size: 11px;">
            <strong>OBS GERAL:</strong> ${order.notes}
          </div>
        ` : ''}

        ${showSignature ? `
          <div style="margin-top: 18px; text-align: center;">
            <div style="border-top: 1px solid #000; width: 85%; margin: 0 auto 3px auto;"></div>
            <div style="font-size: 9px;">Assinatura do Cliente</div>
          </div>
        ` : ''}

        <div class="divider" style="margin-top: 8px;"></div>
        ${footerCustomText ? `
          <div class="text-center" style="font-size: 10px; margin-top: 4px;">
            ${footerCustomText}
          </div>
        ` : ''}
        ${showWebsite ? `
          <div class="text-center" style="font-size: 9px; margin-top: 2px; color: #444;">
            www.alfasalgados.com.br
          </div>
        ` : ''}
      </body>
    </html>
  `;

  // Create or reuse hidden printing iframe
  let iframe = document.getElementById('thermal-print-frame') as HTMLIFrameElement | null;
  if (!iframe) {
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

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Wait for images and fonts; never guess whether assets are ready after 250ms.
  const images = Array.from(doc.images).map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => {
    img.onload = () => resolve(); img.onerror = () => resolve(); setTimeout(resolve, 4000);
  }));
  void Promise.all([...images, doc.fonts?.ready ?? Promise.resolve()]).then(() => {
    try { iframe?.contentWindow?.focus(); iframe?.contentWindow?.print(); }
    catch { window.dispatchEvent(new CustomEvent('alfa-save', { detail: { status:'error', message:'Não foi possível abrir a impressão. Tente novamente.' } })); }
  });
};
