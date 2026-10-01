import React, { useState } from 'react';
import { Order, StoreSettings } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { printThermalReceipt } from '../../utils/printThermalReceipt';
import { Printer, X, Image as ImageIcon } from 'lucide-react';

interface ThermalReceiptProps {
  order: Order | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ order, settings, onClose }) => {

  // Local state for instant toggle in preview
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(
    settings.printer_paper_width || '80mm'
  );
  const [includeLogo, setIncludeLogo] = useState<boolean>(
    settings.printer_include_logo ?? true
  );

  if (!order) return null;
  const widthPx = paperWidth === '58mm' ? 230 : 310;
  const formattedDate = new Date(order.created_at || Date.now()).toLocaleString('pt-BR');

  const handlePrint = () => {
    printThermalReceipt(order, settings, paperWidth, includeLogo);
  };

  const logoUrl = settings.printer_logo_url || settings.logo_url;

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

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 110,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
          maxWidth: 480,
          backgroundColor: '#ffffff',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
        }}
      >
        {/* Top Control Bar */}
        <div style={{
          padding: '12px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Printer size={18} style={{ color: '#dc2626' }} />
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                Comanda Térmica ({paperWidth})
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Compatível com Epson, Elgin, Bematech e POS 58mm
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
              }}
            >
              <Printer size={15} />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: 6,
                borderRadius: '50%',
                color: '#64748b',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Options Toolbar: 58mm / 80mm & Logo Toggle */}
        <div style={{
          padding: '8px 18px',
          background: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          fontSize: '0.8rem'
        }}>
          {/* Bobina Width selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>Largura:</span>
            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 6, padding: 2 }}>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                style={{
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: paperWidth === '80mm' ? '#dc2626' : 'transparent',
                  color: paperWidth === '80mm' ? '#fff' : '#475569'
                }}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                style={{
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: paperWidth === '58mm' ? '#dc2626' : 'transparent',
                  color: paperWidth === '58mm' ? '#fff' : '#475569'
                }}
              >
                58mm
              </button>
            </div>
          </div>

          {/* Logo Toggle */}
          <button
            type="button"
            onClick={() => setIncludeLogo(!includeLogo)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: includeLogo ? '#dcfce7' : '#e2e8f0',
              color: includeLogo ? '#15803d' : '#64748b',
              border: 'none',
              padding: '4px 10px',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            <ImageIcon size={13} />
            <span>Logo: {includeLogo ? 'Ativo' : 'Desativado'}</span>
          </button>
        </div>

        {/* Printable Thermal Receipt Scrollable Box */}
        <div style={{
          padding: 20,
          overflowY: 'auto',
          backgroundColor: '#94a3b8',
          display: 'flex',
          justifyContent: 'center',
          flexGrow: 1
        }}>
          <div
            id="thermal-receipt-preview"
            style={{
              width: widthPx,
              backgroundColor: '#ffffff',
              padding: '16px 12px',
              boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: paperWidth === '58mm' ? 11 : 12,
              lineHeight: 1.25,
              color: '#000000',
              borderRadius: 4
            }}
          >
            {/* Header with Logo */}
            {includeLogo && logoUrl && (
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{
                    maxWidth: paperWidth === '58mm' ? 110 : 140,
                    maxHeight: 48,
                    objectFit: 'contain',
                    filter: 'grayscale(100%) contrast(150%)',
                    display: 'inline-block'
                  }}
                />
              </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              {showName && <div style={{ fontSize: 15, fontWeight: 'bold' }}>{settings.business_name}</div>}
              {showAddress && (
                <>
                  <div style={{ fontSize: 10 }}>{settings.store_address}, {settings.store_address_number}</div>
                  <div style={{ fontSize: 10 }}>{settings.store_neighborhood} - Vitória da Conquista</div>
                </>
              )}
              {showPhone && <div style={{ fontSize: 10 }}>WhatsApp: {settings.whatsapp}</div>}
              {showCnpj && settings.cnpj && <div style={{ fontSize: 10 }}>CNPJ: {settings.cnpj}</div>}
              {headerCustomText && (
                <div style={{ fontSize: 10, fontWeight: 'bold', marginTop: 3, border: '1px solid #000', padding: 2 }}>
                  {headerCustomText}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* Order Info */}
            <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold' }}>
              PEDIDO #{order.order_number}
            </div>
            <div style={{ textAlign: 'center', fontSize: 10, marginTop: 2 }}>{formattedDate}</div>
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 11, marginTop: 4 }}>
              {order.delivery_type === 'delivery' ? '*** ENTREGA EM DOMICÍLIO ***' : '*** RETIRADA NO BALCÃO ***'}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* Customer & Delivery */}
            <div><strong>Cliente:</strong> {order.customer_name}</div>
            <div><strong>WhatsApp:</strong> {order.customer_phone}</div>
            {order.delivery_type === 'delivery' && (
              <>
                <div><strong>Endereço:</strong> {order.address || ''}, Nº {order.address_number || 'S/N'}</div>
                {order.complement && <div><strong>Compl:</strong> {order.complement}</div>}
                <div><strong>Bairro:</strong> {order.neighborhood_name || settings.store_neighborhood}</div>
                {order.reference_point && <div><strong>Ref:</strong> {order.reference_point}</div>}
              </>
            )}

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* Items */}
            <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>ITENS DO PEDIDO:</div>
            {order.items?.map((item, idx) => (
              <div key={idx} style={{ marginBottom: showItemSeparator ? 4 : 6 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: isItemsBold ? 800 : 600,
                  fontSize: isItemsBold ? (paperWidth === '58mm' ? 12 : 13) : undefined
                }}>
                  <span>{item.quantity}x {item.product_name}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
                {item.selections && item.selections.length > 0 && (
                  <div style={{
                    paddingLeft: highlightFlavors ? 8 : 6,
                    fontSize: paperWidth === '58mm' ? 10 : 11,
                    color: '#000',
                    marginTop: 2
                  }}>
                    {item.selections.map((sel, sidx) => (
                      <div key={sidx} style={{ fontWeight: highlightFlavors ? 600 : 'normal' }}>
                        {highlightFlavors ? '▶ ' : '+ '}{sel.optionName}
                      </div>
                    ))}
                  </div>
                )}
                {item.notes && (
                  highlightNotes ? (
                    <div style={{
                      marginTop: 3,
                      padding: '2px 4px',
                      border: '1px solid #000',
                      borderRadius: 2,
                      fontSize: 10,
                      fontWeight: 'bold',
                      background: '#eee'
                    }}>
                      OBS: {item.notes}
                    </div>
                  ) : (
                    <div style={{ paddingLeft: 6, fontSize: 10, fontStyle: 'italic' }}>
                      Obs: {item.notes}
                    </div>
                  )
                )}
                {showItemSeparator && idx < (order.items?.length || 0) - 1 && (
                  <div style={{ borderTop: '1px dotted #888', margin: '4px 0' }} />
                )}
              </div>
            ))}

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* Values */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Taxa de Entrega:</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
            )}
            {order.discount_value > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                <span>Desconto:</span>
                <span>-{formatCurrency(order.discount_value)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 'bold', marginTop: 4 }}>
              <span>TOTAL:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* Payment info */}
            <div>
              <strong>Pagamento:</strong>{' '}
              {order.payment_method === 'pix' ? 'PIX' :
               order.payment_method === 'cash' ? `DINHEIRO ${order.needs_change ? `(Troco p/ ${formatCurrency(order.change_amount || 0)})` : '(Não precisa de troco)'}` :
               order.payment_method === 'credit' ? 'CARTÃO DE CRÉDITO' : 'CARTÃO DE DÉBITO'}
            </div>

            {order.notes && (
              <div style={{ marginTop: 4, padding: 4, border: '1px dashed #000', fontSize: 11 }}>
                <strong>OBS GERAL:</strong> {order.notes}
              </div>
            )}

            {showSignature && (
              <div style={{ marginTop: 18, textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #000', width: '85%', margin: '0 auto 3px auto' }} />
                <div style={{ fontSize: 9 }}>Assinatura do Cliente</div>
              </div>
            )}

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0 6px' }} />
            {footerCustomText && (
              <div style={{ textAlign: 'center', fontSize: 10, marginTop: 4 }}>
                {footerCustomText}
              </div>
            )}
            {showWebsite && (
              <div style={{ textAlign: 'center', fontSize: 9, marginTop: 2, color: '#555' }}>
                www.alfasalgados.com.br
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
