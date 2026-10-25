import { cache, saveRemote, onApiChange, createRemoteOrder, changeOrderStatus, catalogVersions, saveProductBundle } from './api';
import {
  INITIAL_SETTINGS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_NEIGHBORHOODS,
  INITIAL_COUPONS,
  INITIAL_OPTION_GROUPS,
  INITIAL_PRODUCT_OPTIONS,
  INITIAL_FLAVORS
} from '../data/initialData';
import type {
  StoreSettings,
  Category,
  Product,
  Neighborhood,
  DiscountCoupon,
  ProductOptionGroup,
  ProductOption,
  ComboItem,
  Order,
  OrderStatus,
  Flavor,
  PromoBanner,
  Customer
} from '../types';


const STORAGE_KEYS = {
  SETTINGS: 'alfa_settings',
  CATEGORIES: 'alfa_categories',
  PRODUCTS: 'alfa_products',
  NEIGHBORHOODS: 'alfa_neighborhoods',
  COUPONS: 'alfa_coupons',
  OPTION_GROUPS: 'alfa_option_groups',
  PRODUCT_OPTIONS: 'alfa_product_options',
  COMBO_ITEMS: 'alfa_combo_items',
  ORDERS: 'alfa_orders',
  FLAVORS: 'alfa_flavors',
  BANNERS: 'alfa_banners',
  CUSTOMERS: 'alfa_customers',
  SALES: 'alfa_sales',
  CUSTOMER_PROFILES: 'alfa_customer_profiles'
};

type Listener = () => void;
export const subscribeToStorage = (listener: Listener) => onApiChange(listener);

function getFromStorage<T>(key: string, fallback: T): T {
  return structuredClone(cache[key] ?? fallback);
}
function saveToStorage<T>(key: string, data: T): Promise<void> { return saveRemote(key, data); }

export const StorageService = {
  // Settings
  getSettings(): StoreSettings {
    const stored = getFromStorage<StoreSettings>(STORAGE_KEYS.SETTINGS, ({} as StoreSettings));
    return {
      ...INITIAL_SETTINGS,
      ...stored,
      cnpj: stored.cnpj || '',
      printer_paper_width: stored.printer_paper_width || '80mm',
      printer_include_logo: stored.printer_include_logo ?? true,
      printer_logo_url: stored.printer_logo_url || stored.logo_url || '',
      printer_header_show_name: stored.printer_header_show_name ?? true,
      printer_header_show_address: stored.printer_header_show_address ?? true,
      printer_header_show_phone: stored.printer_header_show_phone ?? true,
      printer_header_show_cnpj: stored.printer_header_show_cnpj ?? true,
      printer_header_show_slogan: stored.printer_header_show_slogan ?? true,
      printer_header_custom_text: stored.printer_header_custom_text !== undefined ? stored.printer_header_custom_text : 'QUEM NÃO GOSTA? • MELHOR SALGADO',
      printer_items_bold: stored.printer_items_bold ?? true,
      printer_items_highlight_flavors: stored.printer_items_highlight_flavors ?? true,
      printer_items_highlight_notes: stored.printer_items_highlight_notes ?? true,
      printer_items_separator: stored.printer_items_separator ?? true,
      printer_footer_show_text: stored.printer_footer_show_text ?? true,
      printer_footer_custom_text: stored.printer_footer_custom_text !== undefined ? stored.printer_footer_custom_text : 'Alfa Salgados • Os melhores sabores se faz com carinho!',
      printer_footer_show_website: stored.printer_footer_show_website ?? true,
      printer_footer_show_signature: stored.printer_footer_show_signature ?? false,
      is_paused: stored.is_paused ?? false,
      pause_message: stored.pause_message || 'Estamos temporariamente sem receber pedidos.',
      banner_auto_rotate: stored.banner_auto_rotate ?? true,
      banner_rotate_interval: stored.banner_rotate_interval ?? 4,
      banner_transition_effect: stored.banner_transition_effect || 'slide',
      footer_enabled: stored.footer_enabled ?? true,
      footer_show_business_name: stored.footer_show_business_name ?? true,
      footer_show_slogan: stored.footer_show_slogan ?? true,
      footer_show_cnpj: stored.footer_show_cnpj ?? true,
      footer_show_address_title: stored.footer_show_address_title ?? true,
      footer_show_address: stored.footer_show_address ?? true,
      footer_show_delivery_estimate: stored.footer_show_delivery_estimate ?? true,
      footer_show_contact_title: stored.footer_show_contact_title ?? true,
      footer_show_whatsapp: stored.footer_show_whatsapp ?? true,
      footer_show_instagram: stored.footer_show_instagram ?? true,
      footer_show_admin_link: stored.footer_show_admin_link ?? true,
      footer_show_copyright: stored.footer_show_copyright ?? true,
      footer_copyright_text: stored.footer_copyright_text || ''
    };
  },
  async updateSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    await saveToStorage(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  // Categories
  getCategories(): Category[] {
    return getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  },
  saveCategories(categories: Category[]) {
    return saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
  },
  toggleCategory(id: string) {
    const list = this.getCategories();
    const updated = list.map(c => c.id === id ? { ...c, is_available: !c.is_available } : c);
    return this.saveCategories(updated);
  },
  upsertCategory(category: Category) {
    const list = this.getCategories();
    const idx = list.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      list[idx] = category;
    } else {
      list.push(category);
    }
    return this.saveCategories([...list]);
  },
  deleteCategory(id: string) {
    const list = this.getCategories().filter(c => c.id !== id);
    return this.saveCategories(list);
  },

  // Products
  getProducts(): Product[] {
    return getFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  },
  saveProducts(products: Product[]) {
    return saveToStorage(STORAGE_KEYS.PRODUCTS, products);
  },
  toggleProductAvailability(id: string) {
    const list = this.getProducts();
    const updated = list.map(p => p.id === id ? { ...p, available: !p.available } : p);
    return this.saveProducts(updated);
  },
  upsertProduct(product: Product) {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...product, updated_at: new Date().toISOString() };
    } else {
      list.unshift({ ...product, created_at: new Date().toISOString() });
    }
    return this.saveProducts([...list]);
  },
  async duplicateProduct(id: string): Promise<Product | null> {
    const found=this.getProducts().find(p=>p.id===id);if(!found)return null;
    const duplicated:Product={...found,id:crypto.randomUUID(),name:`${found.name} (Cópia)`,available:false,stock_quantity:0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    const allOptions=this.getProductOptions();
    const groups=this.getOptionGroups().filter(g=>g.product_id===id).map(g=>{
      const group={...g,id:crypto.randomUUID(),product_id:duplicated.id};
      return {group,options:allOptions.filter(o=>o.group_id===g.id).map(o=>({...o,id:crypto.randomUUID(),group_id:group.id}))};
    });
    await saveProductBundle({product:duplicated,groups},catalogVersions());return duplicated;
  },
  deleteProduct(id: string) {
    // Soft delete preferencial
    const list = this.getProducts().map(p => p.id === id ? { ...p, is_archived: true, available: false } : p);
    return this.saveProducts(list);
  },

  // Flavors CRUD (Section 19)
  getFlavors(): Flavor[] {
    return getFromStorage<Flavor[]>(STORAGE_KEYS.FLAVORS, INITIAL_FLAVORS);
  },
  saveFlavors(flavors: Flavor[]) {
    return saveToStorage(STORAGE_KEYS.FLAVORS, flavors);
  },
  upsertFlavor(flavor: Flavor) {
    const list = this.getFlavors();
    const idx = list.findIndex(f => f.id === flavor.id);
    if (idx >= 0) {
      list[idx] = { ...flavor, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...flavor, created_at: new Date().toISOString() });
    }
    return this.saveFlavors([...list]);
  },
  toggleFlavor(id: string) {
    const list = this.getFlavors();
    const updated = list.map(f => f.id === id ? { ...f, is_active: !f.is_active } : f);
    return this.saveFlavors(updated);
  },
  deleteFlavor(id: string) {
    const list = this.getFlavors().filter(f => f.id !== id);
    return this.saveFlavors(list);
  },

  // Promo Banners CRUD (Section 21)
  getBanners(): PromoBanner[] {
    return getFromStorage<PromoBanner[]>(STORAGE_KEYS.BANNERS, []);
  },
  saveBanners(banners: PromoBanner[]) {
    return saveToStorage(STORAGE_KEYS.BANNERS, banners);
  },
  upsertBanner(banner: PromoBanner) {
    const list = this.getBanners();
    const idx = list.findIndex(b => b.id === banner.id);
    if (idx >= 0) {
      list[idx] = { ...banner, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...banner, created_at: new Date().toISOString() });
    }
    return this.saveBanners([...list]);
  },
  toggleBanner(id: string) {
    const list = this.getBanners();
    const updated = list.map(b => b.id === id ? { ...b, is_active: !b.is_active } : b);
    return this.saveBanners(updated);
  },
  deleteBanner(id: string) {
    const list = this.getBanners().filter(b => b.id !== id);
    return this.saveBanners(list);
  },

  // Option Groups & Options
  getOptionGroups(): ProductOptionGroup[] {
    return getFromStorage<ProductOptionGroup[]>(STORAGE_KEYS.OPTION_GROUPS, INITIAL_OPTION_GROUPS);
  },
  saveOptionGroups(groups: ProductOptionGroup[]) {
    return saveToStorage(STORAGE_KEYS.OPTION_GROUPS, groups);
  },
  getProductOptions(): ProductOption[] {
    return getFromStorage<ProductOption[]>(STORAGE_KEYS.PRODUCT_OPTIONS, INITIAL_PRODUCT_OPTIONS);
  },
  saveProductOptions(options: ProductOption[]) {
    return saveToStorage(STORAGE_KEYS.PRODUCT_OPTIONS, options);
  },
  getProductOptionGroups(productId: string): ProductOptionGroup[] {
    return this.getOptionGroups().filter(g => g.product_id === productId && g.is_active !== false);
  },
  getOptionsByGroupId(groupId: string): ProductOption[] {
    return this.getProductOptions().filter(o => o.group_id === groupId && (o.is_available ?? true) && (o.is_active ?? true));
  },
  togglePauseIngredient(ingredientName: string, pause: boolean) {
    const options = this.getProductOptions();
    const targetName = ingredientName.trim().toLowerCase();
    const updated = options.map(o => {
      if ((o.name || '').trim().toLowerCase() === targetName) {
        return {
          ...o,
          is_paused: pause,
          is_available: !pause
        };
      }
      return o;
    });
    return this.saveProductOptions(updated);
  },
    saveProductAdditionals(productId: string, groupsWithItems: { group: ProductOptionGroup; options: ProductOption[] }[]) {
    // Remove existing groups for this product and their options
    const currentGroups = this.getOptionGroups();
    const existingGroupIds = currentGroups.filter(g => g.product_id === productId).map(g => g.id);
    const updatedGroups = currentGroups.filter(g => g.product_id !== productId);

    const currentOptions = this.getProductOptions();
    const updatedOptions = currentOptions.filter(o => !existingGroupIds.includes(o.group_id));

    // Append new groups and options
    const newGroupsToAdd: ProductOptionGroup[] = [];
    const newOptionsToAdd: ProductOption[] = [];

    groupsWithItems.forEach(({ group, options }) => {
      newGroupsToAdd.push({ ...group, product_id: productId });
      options.forEach(opt => {
        newOptionsToAdd.push({ ...opt, group_id: group.id });
      });
    });

    return Promise.all([this.saveOptionGroups([...updatedGroups, ...newGroupsToAdd]), this.saveProductOptions([...updatedOptions, ...newOptionsToAdd])]);
  },
  getComboItems(): ComboItem[] {
    return getFromStorage<ComboItem[]>(STORAGE_KEYS.COMBO_ITEMS, []);
  },

  // Neighborhoods
  getNeighborhoods(): Neighborhood[] {
    return getFromStorage<Neighborhood[]>(STORAGE_KEYS.NEIGHBORHOODS, []);
  },
  saveNeighborhoods(list: Neighborhood[]) {
    return saveToStorage(STORAGE_KEYS.NEIGHBORHOODS, list);
  },
  upsertNeighborhood(item: Neighborhood) {
    const list = this.getNeighborhoods();
    const idx = list.findIndex(n => n.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    return this.saveNeighborhoods([...list]);
  },
  deleteNeighborhood(id: string) {
    const list = this.getNeighborhoods().filter(n => n.id !== id);
    return this.saveNeighborhoods(list);
  },

  // Coupons
  getCoupons(): DiscountCoupon[] {
    return getFromStorage<DiscountCoupon[]>(STORAGE_KEYS.COUPONS, []);
  },
  saveCoupons(list: DiscountCoupon[]) {
    return saveToStorage(STORAGE_KEYS.COUPONS, list);
  },
  upsertCoupon(coupon: DiscountCoupon) {
    const list = this.getCoupons();
    const idx = list.findIndex(c => c.id === coupon.id);
    if (idx >= 0) {
      list[idx] = coupon;
    } else {
      list.push(coupon);
    }
    return this.saveCoupons([...list]);
  },
  deleteCoupon(id: string) {
    const list = this.getCoupons().filter(c => c.id !== id);
    return this.saveCoupons(list);
  },
  getCouponUsageStats(couponCode: string) {
    const orders = this.getOrders();
    const cleanCode = couponCode.trim().toUpperCase();
    const matchingOrders = orders.filter(
      o => o.coupon_code && o.coupon_code.trim().toUpperCase() === cleanCode
    );

    const ordersCount = matchingOrders.length;
    const totalDiscount = matchingOrders.reduce((sum, o) => sum + (o.discount_value || 0), 0);
    const totalRevenue = matchingOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const uniquePhones = new Set(matchingOrders.map(o => o.customer_phone?.replace(/\D/g, '')).filter(Boolean));
    const averageTicket = ordersCount > 0 ? totalRevenue / ordersCount : 0;

    return {
      ordersCount,
      totalDiscount,
      totalRevenue,
      uniqueCustomersCount: uniquePhones.size,
      averageTicket,
      orders: matchingOrders
    };
  },

  // Customers (Section 25 - LGPD Compliant)
  getCustomers(): Customer[] {
    return getFromStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  },
  saveCustomers(customers: Customer[]) {
    return saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
  },
  recordCustomerOrder(customerData: {
    name: string;
    whatsapp: string;
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      reference?: string;
    };
    orderTotal: number;
  }) {
    const customers = this.getCustomers();
    const cleanPhone = customerData.whatsapp.replace(/\D/g, '');
    const idx = customers.findIndex(c => c.whatsapp.replace(/\D/g, '') === cleanPhone);

    const now = new Date().toISOString();
    if (idx >= 0) {
      const existing = customers[idx];
      const newCount = (existing.orders_count || 1) + 1;
      const newTotal = (existing.total_spent || 0) + customerData.orderTotal;

      const addressList = existing.addresses || [];
      if (customerData.address && !addressList.some(a => a.street === customerData.address?.street && a.number === customerData.address?.number)) {
        addressList.push(customerData.address);
      }

      customers[idx] = {
        ...existing,
        name: customerData.name || existing.name,
        orders_count: newCount,
        total_spent: newTotal,
        average_ticket: newTotal / newCount,
        last_order_at: now,
        updated_at: now,
        addresses: addressList
      };
    } else {
      customers.push({
        id: 'cust_' + Math.random().toString(36).substring(2, 9),
        name: customerData.name,
        whatsapp: customerData.whatsapp,
        addresses: customerData.address ? [customerData.address] : [],
        orders_count: 1,
        total_spent: customerData.orderTotal,
        average_ticket: customerData.orderTotal,
        last_order_at: now,
        created_at: now
      });
    }

    return this.saveCustomers(customers);
  },

  // Vendas avulsas e contas a receber (separadas dos pedidos do cardápio)
  getSales(): any[] { return getFromStorage<any[]>(STORAGE_KEYS.SALES, []); },
  saveSales(sales: any[]) { return saveToStorage(STORAGE_KEYS.SALES, sales); },
  getCustomerProfiles(): any[] { return getFromStorage<any[]>(STORAGE_KEYS.CUSTOMER_PROFILES, []); },
  saveCustomerProfiles(customers: any[]) { return saveToStorage(STORAGE_KEYS.CUSTOMER_PROFILES, customers); },

  // Orders
  getOrders(): Order[] {
    return getFromStorage<Order[]>(STORAGE_KEYS.ORDERS, []);
  },
  saveOrders(list: Order[]) {
    return saveToStorage(STORAGE_KEYS.ORDERS, list);
  },
  createOrder(order: any, idempotencyKey: string): Promise<Order> {
    return createRemoteOrder(order, idempotencyKey);
  },
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    return changeOrderStatus(orderId, status);
  },

  // Reset to original factory database
  resetToFactoryData() {
    throw new Error('A restauração automática foi desativada para proteger os dados. Utilize um backup validado.');
  }
};
