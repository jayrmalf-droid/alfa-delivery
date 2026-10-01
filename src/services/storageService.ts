import { cache, saveRemote, onApiChange, createRemoteOrder, changeOrderStatus, catalogVersions, saveProductBundle } from './api';
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
  CUSTOMERS: 'alfa_customers'
};

type Listener = () => void;
export const subscribeToStorage = (listener: Listener) => onApiChange(listener);

function getFromStorage<T>(key: string, fallback: T): T {
  return structuredClone(cache[key] ?? fallback);
}
function saveToStorage<T>(key: string, data: T): void { saveRemote(key, data); }

export const StorageService = {
  // Settings
  getSettings(): StoreSettings {
    const stored = getFromStorage<StoreSettings>(STORAGE_KEYS.SETTINGS, ({} as StoreSettings));
    return {
      ...({} as StoreSettings),
      ...stored,
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
      pause_message: stored.pause_message || 'Estamos temporariamente sem receber pedidos.'
    };
  },
  updateSettings(settings: Partial<StoreSettings>): StoreSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    saveToStorage(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  // Categories
  getCategories(): Category[] {
    return getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  },
  saveCategories(categories: Category[]) {
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
  },
  toggleCategory(id: string) {
    const list = this.getCategories();
    const updated = list.map(c => c.id === id ? { ...c, is_available: !c.is_available } : c);
    this.saveCategories(updated);
  },
  upsertCategory(category: Category) {
    const list = this.getCategories();
    const idx = list.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      list[idx] = category;
    } else {
      list.push(category);
    }
    this.saveCategories([...list]);
  },
  deleteCategory(id: string) {
    const list = this.getCategories().filter(c => c.id !== id);
    this.saveCategories(list);
  },

  // Products
  getProducts(): Product[] {
    return getFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  },
  saveProducts(products: Product[]) {
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
  },
  toggleProductAvailability(id: string) {
    const list = this.getProducts();
    const updated = list.map(p => p.id === id ? { ...p, available: !p.available } : p);
    this.saveProducts(updated);
  },
  upsertProduct(product: Product) {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...product, updated_at: new Date().toISOString() };
    } else {
      list.unshift({ ...product, created_at: new Date().toISOString() });
    }
    this.saveProducts([...list]);
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
    this.saveProducts(list);
  },

  // Flavors CRUD (Section 19)
  getFlavors(): Flavor[] {
    return getFromStorage<Flavor[]>(STORAGE_KEYS.FLAVORS, []);
  },
  saveFlavors(flavors: Flavor[]) {
    saveToStorage(STORAGE_KEYS.FLAVORS, flavors);
  },
  upsertFlavor(flavor: Flavor) {
    const list = this.getFlavors();
    const idx = list.findIndex(f => f.id === flavor.id);
    if (idx >= 0) {
      list[idx] = { ...flavor, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...flavor, created_at: new Date().toISOString() });
    }
    this.saveFlavors([...list]);
  },
  toggleFlavor(id: string) {
    const list = this.getFlavors();
    const updated = list.map(f => f.id === id ? { ...f, is_active: !f.is_active } : f);
    this.saveFlavors(updated);
  },
  deleteFlavor(id: string) {
    const list = this.getFlavors().filter(f => f.id !== id);
    this.saveFlavors(list);
  },

  // Promo Banners CRUD (Section 21)
  getBanners(): PromoBanner[] {
    return getFromStorage<PromoBanner[]>(STORAGE_KEYS.BANNERS, []);
  },
  saveBanners(banners: PromoBanner[]) {
    saveToStorage(STORAGE_KEYS.BANNERS, banners);
  },
  upsertBanner(banner: PromoBanner) {
    const list = this.getBanners();
    const idx = list.findIndex(b => b.id === banner.id);
    if (idx >= 0) {
      list[idx] = { ...banner, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...banner, created_at: new Date().toISOString() });
    }
    this.saveBanners([...list]);
  },
  toggleBanner(id: string) {
    const list = this.getBanners();
    const updated = list.map(b => b.id === id ? { ...b, is_active: !b.is_active } : b);
    this.saveBanners(updated);
  },
  deleteBanner(id: string) {
    const list = this.getBanners().filter(b => b.id !== id);
    this.saveBanners(list);
  },

  // Option Groups & Options
  getOptionGroups(): ProductOptionGroup[] {
    return getFromStorage<ProductOptionGroup[]>(STORAGE_KEYS.OPTION_GROUPS, []);
  },
  saveOptionGroups(groups: ProductOptionGroup[]) {
    saveToStorage(STORAGE_KEYS.OPTION_GROUPS, groups);
  },
  getProductOptions(): ProductOption[] {
    return getFromStorage<ProductOption[]>(STORAGE_KEYS.PRODUCT_OPTIONS, []);
  },
  saveProductOptions(options: ProductOption[]) {
    saveToStorage(STORAGE_KEYS.PRODUCT_OPTIONS, options);
  },
  getProductOptionGroups(productId: string): ProductOptionGroup[] {
    return this.getOptionGroups().filter(g => g.product_id === productId && g.is_active !== false);
  },
  getOptionsByGroupId(groupId: string): ProductOption[] {
    return this.getProductOptions().filter(o => o.group_id === groupId && (o.is_available ?? true) && (o.is_active ?? true));
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

    this.saveOptionGroups([...updatedGroups, ...newGroupsToAdd]);
    this.saveProductOptions([...updatedOptions, ...newOptionsToAdd]);
  },
  getComboItems(): ComboItem[] {
    return getFromStorage<ComboItem[]>(STORAGE_KEYS.COMBO_ITEMS, []);
  },

  // Neighborhoods
  getNeighborhoods(): Neighborhood[] {
    return getFromStorage<Neighborhood[]>(STORAGE_KEYS.NEIGHBORHOODS, []);
  },
  saveNeighborhoods(list: Neighborhood[]) {
    saveToStorage(STORAGE_KEYS.NEIGHBORHOODS, list);
  },
  upsertNeighborhood(item: Neighborhood) {
    const list = this.getNeighborhoods();
    const idx = list.findIndex(n => n.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    this.saveNeighborhoods([...list]);
  },
  deleteNeighborhood(id: string) {
    const list = this.getNeighborhoods().filter(n => n.id !== id);
    this.saveNeighborhoods(list);
  },

  // Coupons
  getCoupons(): DiscountCoupon[] {
    return getFromStorage<DiscountCoupon[]>(STORAGE_KEYS.COUPONS, []);
  },
  saveCoupons(list: DiscountCoupon[]) {
    saveToStorage(STORAGE_KEYS.COUPONS, list);
  },
  upsertCoupon(coupon: DiscountCoupon) {
    const list = this.getCoupons();
    const idx = list.findIndex(c => c.id === coupon.id);
    if (idx >= 0) {
      list[idx] = coupon;
    } else {
      list.push(coupon);
    }
    this.saveCoupons([...list]);
  },
  deleteCoupon(id: string) {
    const list = this.getCoupons().filter(c => c.id !== id);
    this.saveCoupons(list);
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
    saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
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

    this.saveCustomers(customers);
  },

  // Orders
  getOrders(): Order[] {
    return getFromStorage<Order[]>(STORAGE_KEYS.ORDERS, []);
  },
  saveOrders(list: Order[]) {
    saveToStorage(STORAGE_KEYS.ORDERS, list);
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
