'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  UtensilsCrossed,
  Plus,
  Minus,
  ShoppingBag,
  Clock,
  Sparkles,
  Flame,
  Search,
  X,
  ChevronRight,
  BellRing,
  CheckCircle2,
  Receipt,
  QrCode
} from 'lucide-react';
import { DEMO_MENU_CATEGORIES, DEMO_MENU_ITEMS, DEMO_RESTAURANT, fetchApi } from '@/lib/api';
import { syncBus } from '@/lib/sync';
import { restaurantStore } from '@/lib/restaurant-store';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
  selectedModifiers: string[];
  notes?: string;
}

export default function TableOrderPage() {
  const params = useParams();
  const token = (params?.token as string) || 'qr-spice-t1-indiranagar-token-001';

  const [restaurant, setRestaurant] = useState(DEMO_RESTAURANT);
  const [tableInfo, setTableInfo] = useState({
    tableNumber: 'Table 01',
    floor: 'Ground Floor Dining',
    outlet: 'Main Dining Area',
    sessionId: 'session-demo-001',
  });

  const [categories, setCategories] = useState(DEMO_MENU_CATEGORIES);
  const [menuItems, setMenuItems] = useState(DEMO_MENU_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState('cat-all');
  const [dietaryFilter, setDietaryFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Clean state: start from scratch with 0 active orders
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [isOrdersDrawerOpen, setIsOrdersDrawerOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected item modal for modifiers
  const [selectedItemForModal, setSelectedItemForModal] = useState<any | null>(null);
  const [modalModifiers, setModalModifiers] = useState<string[]>([]);
  const [modalQuantity, setModalQuantity] = useState(1);

  useEffect(() => {
    // 1. Resolve from local restaurantStore
    const profile = restaurantStore.getProfile();
    if (profile) {
      setRestaurant({
        id: profile.id,
        name: profile.name,
        slug: profile.slug,
        tagline: profile.tagline || 'Fresh & Modern Dining',
        address: profile.city || 'Dining Lounge',
        currency: profile.currency || 'INR',
        currencySymbol: profile.currencySymbol || '₹',
      });
    }

    const tables = restaurantStore.getTables();
    if (tables && tables.length > 0) {
      const matchedTable = tables.find(
        (t) => t.token === token || t.id.toLowerCase() === token.toLowerCase() || token.includes(t.id.toLowerCase())
      );
      if (matchedTable) {
        setTableInfo({
          tableNumber: matchedTable.number,
          floor: matchedTable.floor || 'Dining Hall',
          outlet: 'Main Dining Area',
          sessionId: `session-${matchedTable.id}`,
        });
      }
    }

    const items = restaurantStore.getMenuItems();
    if (items && items.length > 0) {
      setMenuItems(items as any);
    }

    const cats = restaurantStore.getCategories();
    if (cats && cats.length > 0) {
      setCategories(cats);
    }

    // 2. Also attempt resolving from backend API if available
    async function loadTableData() {
      const res = await fetchApi(`/qr/resolve/${token}`);
      if (res.success && res.data) {
        if (res.data.restaurant) setRestaurant(res.data.restaurant);
        if (res.data.table) {
          setTableInfo({
            tableNumber: res.data.table.name || `Table ${res.data.table.tableNumber || '01'}`,
            floor: res.data.table.floor?.name || 'Ground Floor Dining',
            outlet: res.data.outlet?.name || 'Main Dining Area',
            sessionId: res.data.tableSession?.id || 'session-live',
          });
        }
      }
    }
    loadTableData();
  }, [token]);

  // Subscribe to real-time updates from KDS and POS
  useEffect(() => {
    const unsub = syncBus.subscribe((event) => {
      if (event.type === 'ORDER_STATUS_UPDATED') {
        setActiveOrders((prev) =>
          prev.map((ord) =>
            ord.id === event.payload.orderId
              ? { ...ord, status: event.payload.status === 'NEW' ? 'PENDING' : event.payload.status }
              : ord
          )
        );
        if (event.payload.status === 'READY') {
          showToast('🍽️ Your dishes are ready and being served to your table!');
        }
      }
    });
    return unsub;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCallWaiter = () => {
    syncBus.publish({
      type: 'WAITER_CALLED',
      payload: {
        tableNumber: tableInfo.tableNumber,
        message: 'Guest requested server assistance at table',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    });
    showToast('🔔 Server notified! A waiter is heading to your table.');
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'cat-all' || item.categoryId === selectedCategory;
    const matchesDietary =
      dietaryFilter === 'ALL' ||
      (dietaryFilter === 'VEG' && item.isVeg) ||
      (dietaryFilter === 'NON_VEG' && !item.isVeg);
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesDietary && matchesSearch;
  });

  const getItemCartQuantity = (id: string) => {
    const found = cart.find((c) => c.id === id);
    return found ? found.quantity : 0;
  };

  const handleQuickAdd = (item: any) => {
    if (item.modifiers && item.modifiers.length > 0) {
      setSelectedItemForModal(item);
      setModalModifiers([]);
      setModalQuantity(1);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          isVeg: item.isVeg,
          selectedModifiers: [],
        },
      ];
    });
    showToast(`Added ${item.name} to cart`);
  };

  const handleDecreaseQuantity = (id: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter((c) => c.id !== id);
      }
      return prev.map((c) =>
        c.id === id ? { ...c, quantity: c.quantity - 1 } : c
      );
    });
  };

  const handleAddFromModal = () => {
    if (!selectedItemForModal) return;

    setCart((prev) => {
      const existing = prev.find((c) => c.id === selectedItemForModal.id);
      if (existing) {
        return prev.map((c) =>
          c.id === selectedItemForModal.id
            ? {
                ...c,
                quantity: c.quantity + modalQuantity,
                selectedModifiers: modalModifiers,
              }
            : c
        );
      }
      return [
        ...prev,
        {
          id: selectedItemForModal.id,
          name: selectedItemForModal.name,
          price: selectedItemForModal.price,
          quantity: modalQuantity,
          isVeg: selectedItemForModal.isVeg,
          selectedModifiers: modalModifiers,
        },
      ];
    });
    showToast(`Added ${selectedItemForModal.name} (${modalQuantity}) to cart`);
    setSelectedItemForModal(null);
  };

  const cartSubtotal = cart.reduce(
    (acc, curr) => acc + curr.price * curr.quantity,
    0
  );
  const cgst = Math.round(cartSubtotal * 0.025 * 100) / 100;
  const sgst = Math.round(cartSubtotal * 0.025 * 100) / 100;
  const cartTotal = Math.round((cartSubtotal + cgst + sgst) * 100) / 100;

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;

    const orderNum = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ORD-${orderNum.replace('#', '')}`;

    const newOrder = {
      id: orderId,
      status: 'PENDING',
      placedAt: 'Just now',
      items: cart.map((c) => ({
        name: c.name,
        quantity: c.quantity,
        price: c.price,
        modifiers: c.selectedModifiers,
      })),
      total: cartTotal,
    };

    setActiveOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    setIsCartOpen(false);
    showToast('🚀 Order fired to kitchen! The chefs are getting it ready.');
    setIsOrdersDrawerOpen(true);

    // Broadcast in real time to KDS and Dashboard
    syncBus.publish({
      type: 'ORDER_PLACED',
      payload: {
        id: orderId,
        tableNumber: tableInfo.tableNumber,
        floor: tableInfo.floor,
        orderNumber: orderNum,
        status: 'NEW',
        placedAt: 'Just now',
        total: cartTotal,
        notes: specialInstructions || undefined,
        serverName: 'Vikram',
        items: cart.map((c, idx) => ({
          id: `item-${idx}-${Date.now()}`,
          name: c.name,
          quantity: c.quantity,
          price: c.price,
          modifiers: c.selectedModifiers,
          isVeg: c.isVeg,
          station:
            c.name.toLowerCase().includes('naan') || c.name.toLowerCase().includes('bread')
              ? 'Breads'
              : c.name.toLowerCase().includes('tikka') || c.name.toLowerCase().includes('tandoor')
              ? 'Tandoor'
              : c.name.toLowerCase().includes('lassi') || c.name.toLowerCase().includes('drink')
              ? 'Beverage'
              : 'Curry',
        })),
      },
    });
  };

  const runningBillTotal = activeOrders.reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="min-h-screen pb-28 text-slate-900 bg-slate-50 selection:bg-amber-100 selection:text-amber-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-slate-900 text-white font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 text-sm border border-slate-700">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Table Context */}
      <header className="sticky top-0 z-40 bg-white/95 border-b border-slate-200 px-4 py-3.5 backdrop-blur-xl shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-white shadow-md shadow-orange-500/20">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                {restaurant.name}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                  {tableInfo.tableNumber}
                </span>
                <span className="text-slate-500">• {tableInfo.floor}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCallWaiter}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-amber-700 flex items-center gap-1.5 text-xs font-semibold transition"
              title="Call Waiter"
            >
              <BellRing className="w-4 h-4 animate-bounce text-amber-600" />
              <span className="hidden sm:inline">Call Server</span>
            </button>

            {activeOrders.length > 0 && (
              <button
                onClick={() => setIsOrdersDrawerOpen(true)}
                className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center gap-1.5 text-xs font-semibold transition shadow-sm"
              >
                <Clock className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Active Orders ({activeOrders.length})</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 pulsing-dot"></span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Welcome Banner */}
      <div className="max-w-4xl mx-auto px-4 pt-5 pb-2">
        <div className="rounded-2xl p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-200/80 relative overflow-hidden shadow-sm">
          <div className="relative z-10">
            <span className="badge badge-amber mb-2">Instant Table Ordering</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Fresh Flavors, Delivered to Your Seat 🌿
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
              Pick your favorite dishes below, customize spices and modifiers, and fire directly to the kitchen chefs.
            </p>
          </div>
          <div className="absolute right-[-20px] -bottom-6 w-32 h-32 bg-amber-200/40 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Search Bar & Dietary Filter */}
      <div className="max-w-4xl mx-auto px-4 mt-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search aromatic curries, biryani, starters..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dietary Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
          <button
            onClick={() => setDietaryFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              dietaryFilter === 'ALL'
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setDietaryFilter('VEG')}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition ${
              dietaryFilter === 'VEG'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="veg-indicator"></div>
            Pure Veg Only
          </button>
          <button
            onClick={() => setDietaryFilter('NON_VEG')}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition ${
              dietaryFilter === 'NON_VEG'
                ? 'bg-red-600 text-white border-red-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="non-veg-indicator"></div>
            Non-Veg
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="sticky top-[69px] z-30 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/80 py-2.5 my-2">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Menu Item Grid */}
      <main className="max-w-4xl mx-auto px-4 pt-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
            <p className="text-base font-semibold text-slate-700">No culinary dishes found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search query or dietary filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const qty = getItemCartQuantity(item.id);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3.5 flex gap-3.5 items-start justify-between relative group shadow-sm hover:shadow-md hover:border-amber-400 transition"
                >
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.isVeg ? (
                        <div className="veg-indicator" title="Vegetarian"></div>
                      ) : (
                        <div className="non-veg-indicator" title="Non-Vegetarian"></div>
                      )}
                      {item.badge && (
                        <span className="badge badge-amber text-[10px] py-0 px-2">
                          {item.badge}
                        </span>
                      )}
                      {item.spiceLevel > 0 && (
                        <div className="flex items-center text-red-500" title={`Spice Level: ${item.spiceLevel}`}>
                          {Array.from({ length: item.spiceLevel }).map((_, i) => (
                            <Flame key={i} className="w-3 h-3 fill-red-500 text-red-500" />
                          ))}
                        </div>
                      )}
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-2.5 flex items-baseline gap-2">
                      <span className="text-base font-extrabold text-slate-900 font-heading">
                        ₹{item.price}
                      </span>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Customizable</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Image & Action Button */}
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 relative border border-slate-200">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>

                    {qty === 0 ? (
                      <button
                        onClick={() => handleQuickAdd(item)}
                        className="w-24 py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-105 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        ADD
                      </button>
                    ) : (
                      <div className="w-24 py-1 px-2 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-between text-xs font-bold text-amber-900">
                        <button
                          onClick={() => handleDecreaseQuantity(item.id)}
                          className="text-amber-800 hover:text-amber-950 p-0.5"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span>{qty}</span>
                        <button
                          onClick={() => handleQuickAdd(item)}
                          className="text-amber-800 hover:text-amber-950 p-0.5"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-xl mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-xl shadow-orange-500/30 flex items-center justify-between hover:brightness-105 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black/15 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs text-amber-100 font-normal">
                  {cart.reduce((a, b) => a + b.quantity, 0)} items in cart
                </div>
                <div className="text-base font-extrabold">₹{cartTotal}</div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs uppercase tracking-wider">
              <span>View Order</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Slide-over Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full flex flex-col border-l border-slate-200 p-5 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900">Your Table Cart</h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 py-4 space-y-3 overflow-y-auto">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    {item.isVeg ? (
                      <div className="veg-indicator"></div>
                    ) : (
                      <div className="non-veg-indicator"></div>
                    )}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        {item.name}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">
                        ₹{item.price} each
                      </p>
                      {item.selectedModifiers.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {item.selectedModifiers.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs">
                      <button
                        onClick={() => handleDecreaseQuantity(item.id)}
                        className="text-slate-500 hover:text-slate-800"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-slate-900 px-1">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuickAdd(item)}
                        className="text-amber-600 hover:text-amber-700"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-slate-900 w-14 text-right">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                </div>
              ))}

              {/* Special Cooking Note */}
              <div className="mt-4">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Chef Notes / Cooking Requests:
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Less oil, extra spicy, sauce on the side..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                  rows={2}
                />
              </div>

              {/* Bill Details */}
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Item Subtotal</span>
                  <span className="text-slate-900 font-medium">₹{cartSubtotal}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (2.5%)</span>
                  <span className="text-slate-900 font-medium">₹{cgst}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (2.5%)</span>
                  <span className="text-slate-900 font-medium">₹{sgst}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-amber-600 text-base">₹{cartTotal}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <button
                onClick={handlePlaceOrder}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-sm shadow-md hover:brightness-105 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 fill-white" />
                Fire Order to Kitchen (₹{cartTotal})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Customization Modal */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-5 shadow-2xl">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Customize {selectedItemForModal.name}
                </h3>
                <p className="text-xs text-amber-600 font-bold">
                  ₹{selectedItemForModal.price}
                </p>
              </div>
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modifiers List */}
            <div className="space-y-3 my-4">
              {selectedItemForModal.modifiers.map((mod: any) => (
                <div
                  key={mod.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">
                    {mod.name}
                  </h4>
                  {mod.options ? (
                    <div className="flex flex-wrap gap-2">
                      {mod.options.map((opt: string) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setModalModifiers((prev) =>
                              prev.includes(opt)
                                ? prev.filter((o) => o !== opt)
                                : [...prev, opt]
                            );
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                            modalModifiers.includes(opt)
                              ? 'bg-amber-500 text-white border-amber-600'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modalModifiers.includes(mod.name)}
                        onChange={(e) => {
                          setModalModifiers((prev) =>
                            e.target.checked
                              ? [...prev, mod.name]
                              : prev.filter((o) => o !== mod.name)
                          );
                        }}
                        className="rounded border-slate-300 text-amber-500 focus:ring-0"
                      />
                      <span>Add {mod.name} (+₹{mod.price})</span>
                    </label>
                  )}
                </div>
              ))}

              {/* Quantity Counter */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">
                  Select Quantity
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="font-bold text-slate-900 text-sm">
                    {modalQuantity}
                  </span>
                  <button
                    onClick={() => setModalQuantity((q) => q + 1)}
                    className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddFromModal}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-md hover:brightness-105 transition"
            >
              Add to Order (₹{selectedItemForModal.price * modalQuantity})
            </button>
          </div>
        </div>
      )}

      {/* Active Orders Drawer */}
      {isOrdersDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full flex flex-col border-l border-slate-200 p-5 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900">Active Table Orders</h2>
              </div>
              <button
                onClick={() => setIsOrdersDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 py-4 space-y-4 overflow-y-auto">
              {activeOrders.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-600">No active orders yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Your placed orders will appear here in real time.
                  </p>
                </div>
              ) : (
                activeOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900">{ord.id}</span>
                      <span className="badge badge-emerald flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulsing-dot"></span>
                        {ord.status}
                      </span>
                    </div>

                    {/* Stage Progress Timeline */}
                    <div className="relative pt-2 pb-1">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="w-3/5 h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-medium">
                        <span className="text-emerald-700 font-semibold">Accepted</span>
                        <span className="text-amber-600 font-bold">Cooking 🔥</span>
                        <span>Served</span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="border-t border-slate-200 pt-2 space-y-1">
                      {ord.items.map((it: any, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between text-xs text-slate-700"
                        >
                          <span>
                            {it.quantity}x {it.name}
                          </span>
                          <span className="font-medium text-slate-900">
                            ₹{it.price * it.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-bold text-slate-900">
                      <span>Order Total</span>
                      <span className="text-amber-600">₹{ord.total}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bill Action */}
            {activeOrders.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setIsOrdersDrawerOpen(false);
                    setIsBillModalOpen(true);
                  }}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Receipt className="w-4 h-4 text-amber-400" />
                  View Running Bill & Settle
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bill & Settlement Modal */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl">
            <div className="text-center pb-4 border-b border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">Table Invoice</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {restaurant.name} • {tableInfo.tableNumber}
              </p>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Running Orders)</span>
                <span className="text-slate-900 font-medium">₹{runningBillTotal}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (5% Combined)</span>
                <span className="text-slate-900 font-medium">₹{Math.round(runningBillTotal * 0.05)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-extrabold text-slate-900">
                <span>Total Amount Due</span>
                <span className="text-amber-600">₹{Math.round(runningBillTotal * 1.05)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center my-3">
              <span className="badge badge-emerald text-[10px] mb-2">
                Zero Convenience Fee
              </span>
              <p className="text-xs text-slate-600">
                Pay at table using UPI (GPay, PhonePe, Paytm) or request a card terminal.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  syncBus.publish({
                    type: 'BILL_REQUESTED',
                    payload: {
                      tableNumber: tableInfo.tableNumber,
                      total: Math.round(runningBillTotal * 1.05),
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  });
                  showToast('💳 Bill requested! Server will bring receipt and payment machine.');
                  setIsBillModalOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-105 text-white font-bold text-xs transition shadow-sm"
              >
                Request Printed Bill at Table
              </button>
              <button
                onClick={() => setIsBillModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition"
              >
                Keep Ordering
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
