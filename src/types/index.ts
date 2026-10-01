// Definições de Tipos para o Sistema Alfa Salgados Delivery & Admin

export interface StoreSettings {
  business_name: string;
  business_description: string;
  logo_url: string;
  hero_image?: string;
  whatsapp: string;
  phone?: string;
  cnpj?: string;
  instagram?: string;
  facebook?: string;
  google_maps_url?: string;
  store_address: string;
  store_address_number: string;
  store_address_complement: string;
  store_neighborhood: string;
  delivery_time_estimate: string;
  pickup_time_estimate: string;
  min_order_value?: number;
  pix_key: string;
  pix_recipient_name: string;
  pix_recipient_city: string;
  printer_paper_width: '80mm' | '58mm';
  printer_include_logo?: boolean;
  printer_logo_url?: string;
  // Cabeçalho do cupom
  printer_header_show_name?: boolean;
  printer_header_show_address?: boolean;
  printer_header_show_phone?: boolean;
  printer_header_show_cnpj?: boolean;
  printer_header_show_slogan?: boolean;
  printer_header_custom_text?: string;
  // Destaque de itens
  printer_items_bold?: boolean;
  printer_items_highlight_flavors?: boolean;
  printer_items_highlight_notes?: boolean;
  printer_items_separator?: boolean;
  // Rodapé do cupom
  printer_footer_show_text?: boolean;
  printer_footer_custom_text?: string;
  printer_footer_show_website?: boolean;
  printer_footer_show_signature?: boolean;
  theme_mode: string;
  primary_color?: string;
  secondary_color?: string;
  bg_color?: string;
  text_color?: string;
  palette_id?: string;
  is_open_override: boolean | null;
  is_paused?: boolean;
  pause_message?: string;
  payment_pix: boolean;
  payment_cash: boolean;
  payment_credit: boolean;
  payment_debit: boolean;
  weekly_schedule: Record<string, { isOpen: boolean; open: string; close: string }>;
  order_sound_enabled?: boolean;
  order_sound_type?: 'bell' | 'alarm' | 'digital' | 'marimba' | 'cash' | 'siren' | string;
  order_sound_duration?: number; // duration in seconds (ex: 2, 5, 10, 15, 30)
  order_sound_volume?: number; // 0 to 100
  [key: string]: any;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  image_url?: string;
  sort_order: number;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Flavor {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface PromoBanner {
  id: string;
  title: string;
  subtitle?: string;
  image_desktop: string;
  image_mobile?: string;
  link_type?: 'category' | 'product' | 'external';
  link_value?: string;
  sort_order: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  // Configurações do Botão de Isca / Destaque Flutuante
  show_floating_button?: boolean;
  button_title?: string;
  button_subtitle?: string;
  button_price_text?: string;
  button_icon?: 'package' | 'flame' | 'tag' | 'sparkles' | 'percent';
  button_target_type?: 'category' | 'product' | 'promos' | 'external';
  button_target_value?: string;
  [key: string]: any;
}

export interface CustomerAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  reference?: string;
  city?: string;
  cep?: string;
}

export interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  addresses: CustomerAddress[];
  orders_count: number;
  total_spent: number;
  average_ticket: number;
  last_order_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  price: number;
  promo_price?: number | null;
  image_url: string | null;
  available: boolean;
  is_highlight?: boolean;
  is_best_seller?: boolean;
  is_preorder?: boolean;
  preorder_days?: number;
  sort_order: number;
  has_options: boolean;
  product_mode?: 'normal' | 'combo' | 'flavors';
  combo_price_mode?: 'fixed' | 'items';
  combo_min_qty?: number | null;
  combo_max_qty?: number | null;
  flavor_count?: number | null;
  flavor_price_rule?: 'most_expensive' | 'average';
  pizza_has_stuffed_crust?: boolean;
  has_stock_control: boolean;
  stock_quantity: number;
  price_display_mode?: 'fixed' | 'starting_at';
  has_variations?: boolean;
  is_archived?: boolean;
  available_flavor_ids?: string[];
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ProductOptionGroup {
  id: string;
  product_id: string;
  name: string;
  description?: string;
  min_options?: number;
  max_options?: number;
  min_select?: number; // Qtd mínima que o cliente deve escolher
  max_select?: number; // Qtd máxima que o cliente pode escolher
  step?: number; // Incremento (ex: 10 ou 1)
  is_required?: boolean;
  required?: boolean;
  sort_order: number;
  options?: ProductOption[];
  [key: string]: any;
}

export interface ProductOption {
  id: string;
  group_id: string;
  name: string;
  price: number;
  step?: number;
  is_available?: boolean;
  is_active?: boolean;
  sort_order?: number;
  [key: string]: any;
}

export interface ComboItem {
  id: string;
  product_id: string;
  name: string;
  price_adjustment?: number;
  price?: number;
  is_available?: boolean;
  is_active?: boolean;
  sort_order?: number;
  [key: string]: any;
}

export interface Neighborhood {
  id: string;
  name: string;
  delivery_fee: number;
  is_available?: boolean;
  estimated_time?: string;
  [key: string]: any;
}

export interface DiscountCoupon {
  id: string;
  code: string;
  discount_type?: 'percentage' | 'fixed';
  type?: string;
  discount_value?: number;
  value?: number;
  min_order_value: number;
  max_uses?: number | null;
  current_uses?: number;
  is_single_use?: boolean;
  single_use_per_client?: boolean;
  is_active: boolean;
  expires_at?: string | null;
  free_shipping?: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}


export interface CartItemOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
  quantity?: number;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedOptions: CartItemOption[];
  notes?: string;
  unitPrice: number;
  totalPrice: number;
}

export type OrderStatus =
  | 'new'
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'pix' | 'cash' | 'credit' | 'debit';
export type DeliveryType = 'delivery' | 'pickup';

export interface OrderAuditLog {
  id: string;
  order_id: string;
  previous_status: OrderStatus;
  new_status: OrderStatus;
  changed_at: string;
  user_responsible: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
  notes?: string | null;
  selections?: CartItemOption[];
  [key: string]: any;
}

export interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  delivery_type?: DeliveryType;
  address?: string | null;
  address_number?: string | null;
  complement?: string | null;
  reference_point?: string | null;
  neighborhood_id?: string | null;
  neighborhood_name?: string | null;
  delivery_fee: number;
  subtotal: number;
  discount_value: number;
  coupon_code?: string | null;
  total: number;
  payment_method: PaymentMethod;
  needs_change: boolean;
  change_amount?: number | null;
  status: OrderStatus;
  notes?: string | null;
  preorder_date?: string | null;
  preorder_time?: string | null;
  opened_at?: string | null;
  payment_status?: string | null;
  items?: OrderItem[];
  audit_logs?: OrderAuditLog[];
  created_at: string;
  updated_at?: string;
  [key: string]: any;
}

