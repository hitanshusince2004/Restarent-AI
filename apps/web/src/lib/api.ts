const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('restaurant_os_token');
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('restaurant_os_token', token);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('restaurant_os_token');
}

export async function fetchApi<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error connecting to API',
    };
  }
}

// Fallback high-fidelity sample data if needed
export const DEMO_RESTAURANT = {
  id: 'rest-spice-symphony',
  name: 'The Spice Symphony',
  slug: 'the-spice-symphony',
  tagline: 'Authentic Royal Indian & Pan-Asian Gastronomy',
  address: '100 Feet Road, Indiranagar, Bengaluru',
  currency: 'INR',
  currencySymbol: '₹',
};

export interface MenuItem {
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

export const DEMO_MENU_CATEGORIES = [
  { id: 'cat-all', name: 'All Dishes', icon: '✨' },
  { id: 'cat-starters', name: 'Appetizers & Starters', icon: '🥟' },
  { id: 'cat-tandoor', name: 'Tandoor & Grills', icon: '🍢' },
  { id: 'cat-mains', name: 'Curries & Mains', icon: '🥘' },
  { id: 'cat-biryani', name: 'Royal Biryani & Rice', icon: '🍚' },
  { id: 'cat-breads', name: 'Fresh Clay Oven Breads', icon: '🫓' },
  { id: 'cat-desserts', name: 'Desserts & Sweets', icon: '🍨' },
  { id: 'cat-drinks', name: 'Beverages & Mocktails', icon: '🍹' },
];

export const DEMO_MENU_ITEMS = [
  {
    id: 'item-paneer-tikka',
    categoryId: 'cat-starters',
    name: 'Zafrani Paneer Tikka',
    description: 'Fresh cottage cheese cubes marinated in saffron, hung yogurt and ground spices, charred in clay oven.',
    price: 340,
    isVeg: true,
    spiceLevel: 2,
    badge: 'Chef Favorite',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80',
    modifiers: [
      { id: 'mod-spice', name: 'Spice Level', options: ['Mild', 'Medium', 'Fiery Hot'] },
      { id: 'mod-dip', name: 'Extra Mint Chutney', price: 30 },
    ],
  },
  {
    id: 'item-butter-chicken',
    categoryId: 'cat-mains',
    name: 'Old Delhi Butter Chicken',
    description: 'Tender tandoori chicken cooked in a velvety tomato cream gravy scented with sun-dried fenugreek.',
    price: 460,
    isVeg: false,
    spiceLevel: 1,
    badge: 'Bestseller',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80',
    modifiers: [
      { id: 'mod-bone', name: 'Portion', options: ['Boneless (+₹50)', 'Regular'] },
      { id: 'mod-gravy', name: 'Extra Makhani Gravy', price: 60 },
    ],
  },
  {
    id: 'item-dum-biryani',
    categoryId: 'cat-biryani',
    name: 'Hyderabadi Gosht Dum Biryani',
    description: 'Slow-cooked fragrant aged basmati rice layered with succulent lamb cuts, caramelized onions and saffron milk.',
    price: 520,
    isVeg: false,
    spiceLevel: 3,
    badge: 'Signature',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    modifiers: [
      { id: 'mod-raita', name: 'Extra Burani Raita', price: 40 },
      { id: 'mod-salan', name: 'Mirchi Ka Salan', price: 50 },
    ],
  },
  {
    id: 'item-dal-makhani',
    categoryId: 'cat-mains',
    name: 'Slow Simmered Dal Bukhara',
    description: 'Black lentils slow cooked overnight over glowing charcoal with churned butter and San Marzano tomatoes.',
    price: 360,
    isVeg: true,
    spiceLevel: 1,
    badge: 'Iconic',
    inStock: true,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
    modifiers: [
      { id: 'mod-butter', name: 'Extra White Butter Dollop', price: 30 },
    ],
  },
  {
    id: 'item-garlic-naan',
    categoryId: 'cat-breads',
    name: 'Garlic & Coriander Butter Naan',
    description: 'Refined flour leavened flatbread brushed with crushed roasted garlic and homemade churned butter.',
    price: 90,
    isVeg: true,
    spiceLevel: 0,
    inStock: true,
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'item-gulab-jamun',
    categoryId: 'cat-desserts',
    name: 'Warm Gulab Jamun Flambé',
    description: 'Golden fried reduced milk dumplings soaked in cardamom saffron syrup, served with pistachio rabri.',
    price: 210,
    isVeg: true,
    spiceLevel: 0,
    inStock: true,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'item-mango-lassi',
    categoryId: 'cat-drinks',
    name: 'Alphonso Saffron Lassi',
    description: 'Thick churned sweet yogurt blended with Ratnagiri Alphonso mango pulp and Kashmiri saffron strands.',
    price: 180,
    isVeg: true,
    spiceLevel: 0,
    inStock: true,
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80',
  },
];
