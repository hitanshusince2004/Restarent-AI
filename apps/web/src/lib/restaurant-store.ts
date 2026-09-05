// Restaurant OS — Reactive Store & Clean Slate Manager
import { syncBus, SyncOrderEvent } from './sync';

export interface RestaurantProfile {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  email: string;
  phone?: string;
  tagline?: string;
  address?: string;
  city?: string;
  currency: string;
  currencySymbol: string;
  isCustom: boolean;
  createdAt: string;
}

export interface TableItem {
  id: string;
  number: string;
  floor: string;
  status: 'OPEN' | 'OCCUPIED' | 'BILL_REQUESTED';
  guests: number;
  bill: string;
  time: string;
  token: string;
}

export interface StoredMenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  spiceLevel: number;
  badge?: string;
  inStock: boolean;
  image: string;
  modifiers?: Array<{
    id: string;
    name: string;
    options?: string[];
    price?: number;
  }>;
}

export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
}

const STORAGE_KEYS = {
  PROFILE: 'restaurant_os_active_profile',
  TABLES: 'restaurant_os_tables',
  MENU_ITEMS: 'restaurant_os_menu_items',
  CATEGORIES: 'restaurant_os_menu_categories',
  ORDERS: 'restaurant_os_live_orders',
  AUTH_USER: 'restaurant_os_auth_user',
};

// Default fresh starter categories
export const DEFAULT_CATEGORIES: MenuCategory[] = [
  { id: 'cat-all', name: 'All Dishes', icon: '✨' },
  { id: 'cat-starters', name: 'Appetizers & Starters', icon: '🥟' },
  { id: 'cat-mains', name: 'Main Course', icon: '🥘' },
  { id: 'cat-breads', name: 'Breads & Sides', icon: '🫓' },
  { id: 'cat-desserts', name: 'Desserts & Sweets', icon: '🍨' },
  { id: 'cat-beverages', name: 'Beverages', icon: '🍹' },
];

export class RestaurantStore {
  private static instance: RestaurantStore;

  public static getInstance(): RestaurantStore {
    if (!RestaurantStore.instance) {
      RestaurantStore.instance = new RestaurantStore();
    }
    return RestaurantStore.instance;
  }

  public getProfile(): RestaurantProfile | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public saveProfile(profile: RestaurantProfile): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }

  public getTables(): TableItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TABLES);
      if (data) return JSON.parse(data);
    } catch {}
    return [];
  }

  public saveTables(tables: TableItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
  }

  public getMenuItems(): StoredMenuItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
      if (data) return JSON.parse(data);
    } catch {}
    return [];
  }

  public saveMenuItems(items: StoredMenuItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
  }

  public getCategories(): MenuCategory[] {
    if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (data) return JSON.parse(data);
    } catch {}
    return DEFAULT_CATEGORIES;
  }

  public saveCategories(categories: MenuCategory[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }

  public getOrders(): any[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (data) return JSON.parse(data);
    } catch {}
    return [];
  }

  public saveOrders(orders: any[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }

  /**
   * Initializes a brand new fresh restaurant with 0 pre-existing data.
   */
  public initializeFreshRestaurant(params: {
    restaurantName: string;
    ownerName: string;
    email: string;
    phone?: string;
    city?: string;
    tableCount?: number;
    withStarterMenu?: boolean;
  }): RestaurantProfile {
    const slug = params.restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const profile: RestaurantProfile = {
      id: `rest-${Date.now()}`,
      name: params.restaurantName,
      slug: slug || 'fresh-restaurant',
      ownerName: params.ownerName,
      email: params.email,
      phone: params.phone || '',
      city: params.city || 'Bengaluru',
      currency: 'INR',
      currencySymbol: '₹',
      tagline: 'Fresh & Modern Dining',
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    const count = params.tableCount || 6;
    const tables: TableItem[] = [];
    for (let i = 1; i <= count; i++) {
      const numStr = i < 10 ? `0${i}` : `${i}`;
      tables.push({
        id: `T-${numStr}`,
        number: `Table ${numStr}`,
        floor: 'Ground Dining',
        status: 'OPEN',
        guests: 0,
        bill: '₹0',
        time: '-',
        // Unique, consistent QR token for this table
        token: `qr-${profile.slug}-t${i}-token-${Date.now().toString().slice(-4)}`,
      });
    }

    // Menu dishes: start empty or with clean starter items
    const menuItems: StoredMenuItem[] = params.withStarterMenu
      ? [
          {
            id: `item-${Date.now()}-1`,
            categoryId: 'cat-starters',
            name: 'Crispy Veg Spring Rolls',
            description: 'Golden fried vegetable spring rolls with sweet chili sauce',
            price: 180,
            isVeg: true,
            spiceLevel: 1,
            inStock: true,
            image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
          },
          {
            id: `item-${Date.now()}-2`,
            categoryId: 'cat-mains',
            name: 'Paneer Butter Masala',
            description: 'Fresh cottage cheese simmered in rich creamy tomato cashew gravy',
            price: 290,
            isVeg: true,
            spiceLevel: 1,
            inStock: true,
            image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
          },
          {
            id: `item-${Date.now()}-3`,
            categoryId: 'cat-breads',
            name: 'Butter Garlic Naan',
            description: 'Tandoor-baked flatbread glazed with butter and fresh garlic',
            price: 70,
            isVeg: true,
            spiceLevel: 0,
            inStock: true,
            image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80',
          },
          {
            id: `item-${Date.now()}-4`,
            categoryId: 'cat-beverages',
            name: 'Fresh Mint Lime Soda',
            description: 'Sparkling lime soda infused with hand-crushed mint leaves',
            price: 120,
            isVeg: true,
            spiceLevel: 0,
            inStock: true,
            image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
          },
        ]
      : [];

    this.saveProfile(profile);
    this.saveTables(tables);
    this.saveCategories(DEFAULT_CATEGORIES);
    this.saveMenuItems(menuItems);
    this.saveOrders([]); // 0 orders

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEYS.AUTH_USER,
        JSON.stringify({
          name: params.ownerName,
          email: params.email,
          role: 'OWNER',
          restaurantId: profile.id,
        })
      );
    }

    return profile;
  }

  /**
   * Completely wipes all data and starts fresh.
   */
  public wipeAllData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.TABLES);
    localStorage.removeItem(STORAGE_KEYS.MENU_ITEMS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem('restaurant_os_token');
    localStorage.removeItem('restaurant_os_sync_event');
  }

  public getAuthUser(): { name: string; email: string; role: string; restaurantId: string } | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}

export const restaurantStore = RestaurantStore.getInstance();
