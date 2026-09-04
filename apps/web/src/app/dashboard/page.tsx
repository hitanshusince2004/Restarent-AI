'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Layers,
  ChefHat,
  Receipt,
  Users,
  Sparkles,
  QrCode,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Download,
  Printer,
  FileUp,
  Flame,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Eye,
  Check,
  Copy,
  Smartphone,
  Home
} from 'lucide-react';
import { DEMO_MENU_ITEMS, DEMO_MENU_CATEGORIES, DEMO_RESTAURANT, MenuItem } from '@/lib/api';
import { syncBus } from '@/lib/sync';

type TabKey = 'overview' | 'orders' | 'floors' | 'menu' | 'ai-import' | 'bills' | 'staff';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Start from scratch: 0 revenue, 0 active orders
  const stats = [
    { label: "Today's Gross Sales", value: '₹0', sub: 'Ready for first order', trend: 'neutral' },
    { label: 'Active Orders Now', value: '0', sub: 'Kitchen idle & ready', trend: 'neutral' },
    { label: 'Occupied Tables', value: '0 / 8', sub: 'All tables available', trend: 'up' },
    { label: 'Avg Kitchen Ticket Time', value: '-', sub: 'Real-time timer active', trend: 'good' },
  ];

  // Live Orders: Start from scratch with empty array
  const [liveOrders, setLiveOrders] = useState<any[]>([]);

  // Tables & Floors: All tables start OPEN and available
  const [tables, setTables] = useState([
    { id: 'T-01', number: 'Table 01', status: 'OPEN', guests: 0, bill: '₹0', time: '-' },
    { id: 'T-02', number: 'Table 02', status: 'OPEN', guests: 0, bill: '₹0', time: '-' },
    { id: 'T-03', number: 'Table 03', status: 'OPEN', guests: 0, bill: '₹0', time: '-' },
    { id: 'T-04', number: 'Table 04', status: 'OPEN', guests: 0, bill: '₹0', time: '-' },
    { id: 'T-05', number: 'Table 05', status: 'OPEN', guests: 0, bill: '₹0', time: '-' },
    { id: 'T-06', number: 'Table 06', status: 'OPEN', guests: 0, bill: '₹0', time: '-' },
    { id: 'T-07', number: 'Table 07', status: 'OPEN', guests: 0, bill: '₹0', time: '-' },
    { id: 'T-08', number: 'Table 08', status: 'OPEN', guests: 0, bill: '₹0', time: '-' },
  ]);

  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Selected Table for QR Code Modal
  const [selectedTableForQr, setSelectedTableForQr] = useState<any | null>(null);
  const [phoneServerIp, setPhoneServerIp] = useState('192.168.1.204');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Menu items state
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEMO_MENU_ITEMS);
  const [menuSearch, setMenuSearch] = useState('');
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    price: '',
    categoryId: 'cat-mains',
    isVeg: true,
    description: '',
  });

  // AI Menu Importer state
  const [aiStep, setAiStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [aiScanProgress, setAiScanProgress] = useState(0);
  const [extractedAiDishes, setExtractedAiDishes] = useState([
    { id: 'ocr-1', name: 'Malai Kofta Mughlai', category: 'Curries & Mains', price: 380, isVeg: true, confidence: 98 },
    { id: 'ocr-2', name: 'Amritsari Kulcha with Chole', category: 'Appetizers & Starters', price: 290, isVeg: true, confidence: 96 },
    { id: 'ocr-3', name: 'Mutton Rogan Josh Kashmiri', category: 'Curries & Mains', price: 540, isVeg: false, confidence: 94 },
    { id: 'ocr-4', name: 'Kesar Badam Kulfi Falooda', category: 'Desserts & Sweets', price: 220, isVeg: true, confidence: 99 },
  ]);

  // Bills & Settlements: Start from scratch
  const [bills, setBills] = useState<any[]>([]);

  // Staff members
  const staffMembers = [
    { id: 'st-1', name: 'Restaurant Owner', email: 'owner@spicesymphony.in', role: 'OWNER', status: 'ACTIVE' },
    { id: 'st-2', name: 'Duty Manager', email: 'manager@spicesymphony.in', role: 'MANAGER', status: 'ACTIVE' },
    { id: 'st-3', name: 'Head Chef', email: 'kitchen@spicesymphony.in', role: 'KITCHEN', status: 'ACTIVE' },
    { id: 'st-4', name: 'Table Server', email: 'server@spicesymphony.in', role: 'STAFF', status: 'ACTIVE' },
  ];

  // Subscribe to real-time events across tabs/devices
  useEffect(() => {
    const unsub = syncBus.subscribe((event) => {
      if (event.type === 'ORDER_PLACED') {
        const ord = event.payload;
        setLiveOrders((prev) => [
          {
            id: ord.id,
            table: ord.tableNumber,
            floor: ord.floor,
            time: 'Just now',
            status: 'PREPARING',
            server: ord.serverName || 'Guest Mobile',
            items: ord.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', '),
            total: `₹${ord.total}`,
          },
          ...prev,
        ]);
        setTables((prev) =>
          prev.map((t) =>
            t.number.toLowerCase() === ord.tableNumber.toLowerCase() ||
            t.number.replace(/\s+/g, '').toLowerCase() === ord.tableNumber.replace(/\s+/g, '').toLowerCase()
              ? { ...t, status: 'ACTIVE', bill: `₹${ord.total}`, time: 'Just now' }
              : t
          )
        );
        setToastNotification(`🚀 New order received from ${ord.tableNumber}: ${ord.orderNumber} (₹${ord.total})`);
        setTimeout(() => setToastNotification(null), 6000);
      } else if (event.type === 'ORDER_STATUS_UPDATED') {
        setLiveOrders((prev) =>
          prev.map((o) => (o.id === event.payload.orderId ? { ...o, status: event.payload.status } : o))
        );
      } else if (event.type === 'WAITER_CALLED') {
        setToastNotification(`🔔 Table Assistance: ${event.payload.tableNumber} called a waiter!`);
        setTimeout(() => setToastNotification(null), 6000);
      } else if (event.type === 'BILL_REQUESTED') {
        setTables((prev) =>
          prev.map((t) =>
            t.number.toLowerCase() === event.payload.tableNumber.toLowerCase() ||
            t.number.replace(/\s+/g, '').toLowerCase() === event.payload.tableNumber.replace(/\s+/g, '').toLowerCase()
              ? { ...t, status: 'BILLING' }
              : t
          )
        );
        setToastNotification(`💳 Bill Requested: ${event.payload.tableNumber} requested invoice settlement!`);
        setTimeout(() => setToastNotification(null), 6000);
      }
    });
    return unsub;
  }, []);

  const handleToggleStock = (id: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, inStock: !item.inStock } : item
      )
    );
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name || !newItemForm.price) return;
    const newItem = {
      id: `item-${Date.now()}`,
      categoryId: newItemForm.categoryId,
      name: newItemForm.name,
      description: newItemForm.description || 'Freshly prepared signature dish.',
      price: parseFloat(newItemForm.price),
      isVeg: newItemForm.isVeg,
      spiceLevel: 1,
      inStock: true,
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
    };
    setMenuItems([newItem, ...menuItems]);
    setIsAddItemModalOpen(false);
    setNewItemForm({ name: '', price: '', categoryId: 'cat-mains', isVeg: true, description: '' });
  };

  const startAiScanSimulation = () => {
    setAiStep('scanning');
    setAiScanProgress(10);
    const interval = setInterval(() => {
      setAiScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setAiStep('review');
          return 100;
        }
        return prev + 18;
      });
    }, 300);
  };

  const handleImportExtractedAiDishes = () => {
    const newlyImported = extractedAiDishes.map((dish) => ({
      id: `item-ai-${dish.id}`,
      categoryId: 'cat-mains',
      name: dish.name,
      description: 'Extracted with AI OCR from paper menu.',
      price: dish.price,
      isVeg: dish.isVeg,
      spiceLevel: 2,
      badge: 'AI Imported',
      inStock: true,
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    }));
    setMenuItems((prev) => [...newlyImported, ...prev]);
    setActiveTab('menu');
    setAiStep('upload');
  };

  const phoneUrl = `http://${phoneServerIp}:3000/t/qr-spice-t1-indiranagar-token-001`;

  const handleCopyPhoneUrl = () => {
    navigator.clipboard.writeText(phoneUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row selection:bg-amber-100 selection:text-amber-900">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between flex-shrink-0 shadow-sm">
        <div>
          {/* Logo & Brand */}
          <div className="p-5 border-b border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-white shadow-sm">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-900 tracking-tight font-heading">
                Restaurant OS
              </h2>
              <span className="badge badge-amber text-[9px] py-0 px-1.5">
                EXECUTIVE CONSOLE
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1 text-xs font-semibold">
            {[
              { key: 'overview', label: 'Overview & Stats', icon: LayoutDashboard },
              { key: 'orders', label: 'Live Orders Stream', icon: Clock, badge: liveOrders.length > 0 ? `${liveOrders.length}` : undefined },
              { key: 'floors', label: 'Floor & Table QR Codes', icon: Layers },
              { key: 'menu', label: 'Menu Catalog', icon: UtensilsCrossed },
              { key: 'ai-import', label: 'AI Menu OCR Importer', icon: Sparkles, glow: true },
              { key: 'bills', label: 'Bills & Settlement', icon: Receipt },
              { key: 'staff', label: 'Staff Roles (RBAC)', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition ${
                    isActive
                      ? 'bg-amber-500 text-white font-bold shadow-sm'
                      : tab.glow
                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        isActive
                          ? 'bg-white text-slate-900 font-bold'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Links & Portals */}
        <div className="p-4 border-t border-slate-200 space-y-2.5">
          <a
            href="/kds"
            target="_blank"
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-orange-500" />
              <span>Open Live KDS</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <a
            href="/t/qr-spice-t1-indiranagar-token-001"
            target="_blank"
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Customer QR Order</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <a
              href="/"
              className="text-xs text-slate-600 hover:text-amber-600 font-medium flex items-center gap-1.5 transition"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home Portal</span>
            </a>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Direct Access
            </span>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl bg-slate-50">
        {/* Real-time Alert Notification Banner */}
        {toastNotification && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-md flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 animate-spin" />
              <span className="text-sm">{toastNotification}</span>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="text-white hover:text-amber-100 text-xs px-2.5 py-1 rounded bg-black/15 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight font-heading">
                  Executive Dining Dashboard
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live operating metrics for Restaurant OS (Indiranagar Outlet) • Clean Slate Ready
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('ai-import')}
                  className="btn-primary text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Menu Import
                </button>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((st, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 shadow-sm">
                  <span className="text-xs font-medium text-slate-500">{st.label}</span>
                  <div className="text-2xl font-extrabold text-slate-900 font-heading">
                    {st.value}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    <span>{st.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Floor Status & Live Orders Quick Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tables Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-500" />
                    <h2 className="font-bold text-sm text-slate-900">Floor Tables Status</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('floors')}
                    className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
                  >
                    View QR Codes & Plan →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {tables.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTableForQr(t);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition text-center ${
                        t.status === 'ACTIVE'
                          ? 'bg-emerald-50 border-emerald-300'
                          : t.status === 'BILLING'
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-black text-sm text-slate-900 block">{t.number}</span>
                      <span className={`badge text-[9px] mt-1 ${
                        t.status === 'ACTIVE' ? 'badge-emerald' :
                        t.status === 'BILLING' ? 'badge-amber' : 'badge-slate'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Live Orders */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    <h2 className="font-bold text-sm text-slate-900">Incoming Live Orders</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
                  >
                    View All ({liveOrders.length}) →
                  </button>
                </div>

                {liveOrders.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
                    <p className="text-xs font-semibold text-slate-600">No active orders right now</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Scan Table 01 QR from your phone to place the first order!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {liveOrders.slice(0, 4).map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 mr-2">{ord.table}</span>
                          <span className="text-slate-500 text-[11px]">({ord.id})</span>
                          <p className="text-slate-600 text-[11px] mt-0.5">{ord.items}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-amber-600 block">{ord.total}</span>
                          <span className="badge badge-amber text-[9px]">{ord.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE ORDERS STREAM */}
        {activeTab === 'orders' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 font-heading">Live Kitchen & Table Orders</h2>
                <p className="text-xs text-slate-500">Real-time order synchronization with KDS and phone terminals</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Table</th>
                    <th className="p-4">Items Summary</th>
                    <th className="p-4">Time</th>
                    <th className="p-4">Server</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {liveOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No orders recorded yet. Place an order from phone or table QR.
                      </td>
                    </tr>
                  ) : (
                    liveOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="p-4 font-mono font-bold text-slate-900">{o.id}</td>
                        <td className="p-4 font-bold text-slate-900">{o.table}</td>
                        <td className="p-4 text-slate-600 max-w-xs truncate">{o.items}</td>
                        <td className="p-4 text-slate-500">{o.time}</td>
                        <td className="p-4 text-slate-500">{o.server}</td>
                        <td className="p-4 font-extrabold text-amber-600">{o.total}</td>
                        <td className="p-4">
                          <span className="badge badge-amber">{o.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: FLOORS & TABLE QR CODES */}
        {activeTab === 'floors' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 font-heading">Floor Plan & Table QR Codes</h2>
                <p className="text-xs text-slate-500">Scan QR codes with your smartphone to test live customer ordering</p>
              </div>
            </div>

            {/* Mobile Wi-Fi Scan Banner */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Scan from your Phone</h4>
                  <p className="text-xs text-slate-600">
                    Connect your phone to the same Wi-Fi network and scan any table QR below.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPhoneUrl}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied URL!' : 'Copy Phone URL'}</span>
                </button>
              </div>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {tables.map((tbl) => (
                <div
                  key={tbl.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm hover:border-amber-400 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900">{tbl.number}</h3>
                        <p className="text-xs text-slate-500">Ground Dining</p>
                      </div>
                      <span className={`badge ${
                        tbl.status === 'ACTIVE' ? 'badge-emerald' :
                        tbl.status === 'BILLING' ? 'badge-amber' : 'badge-slate'
                      }`}>
                        {tbl.status}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                      <span>Guests: {tbl.guests}</span>
                      <span className="font-bold text-slate-900">{tbl.bill}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedTableForQr(tbl)}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <QrCode className="w-4 h-4 text-amber-600" />
                    <span>View & Scan QR Code</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: MENU CATALOG */}
        {activeTab === 'menu' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 font-heading">Menu Catalog & Stock Control</h2>
                <p className="text-xs text-slate-500">Toggle 86 out-of-stock items, adjust prices, or add new dishes</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddItemModalOpen(true)}
                  className="btn-primary text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Dish
                </button>
              </div>
            </div>

            {/* Menu Items Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Dish</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Stock Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">{item.name}</span>
                            <span className="text-[11px] text-slate-400 line-clamp-1">{item.description}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">{item.categoryId}</td>
                      <td className="p-4">
                        {item.isVeg ? (
                          <div className="veg-indicator" title="Vegetarian" />
                        ) : (
                          <div className="non-veg-indicator" title="Non-Vegetarian" />
                        )}
                      </td>
                      <td className="p-4 font-extrabold text-slate-900">₹{item.price}</td>
                      <td className="p-4">
                        <span className={`badge ${item.inStock ? 'badge-emerald' : 'badge-rose'}`}>
                          {item.inStock ? 'In Stock' : '86 Out of Stock'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleToggleStock(item.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                            item.inStock
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {item.inStock ? 'Mark 86 (Out)' : 'Restock'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AI MENU IMPORTER */}
        {activeTab === 'ai-import' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 font-heading">AI Menu OCR Importer</h2>
              <p className="text-xs text-slate-500">
                Snap or upload a photo of a printed paper menu. The OCR engine automatically categorizes and converts it into digital dishes.
              </p>
            </div>

            {aiStep === 'upload' && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                  <FileUp className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Upload Physical Paper Menu Photo</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Supports JPG, PNG, WEBP, and PDF menus. Multi-column menus with Indian & Western currency formats are auto-detected.
                  </p>
                </div>
                <button
                  onClick={startAiScanSimulation}
                  className="btn-primary text-xs inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Scan Demonstration Menu (OCR)</span>
                </button>
              </div>
            )}

            {aiStep === 'scanning' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto animate-spin">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Neural OCR Processing...</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Detecting bounding boxes, extracting prices in INR (₹), and classifying veg/non-veg.
                  </p>
                </div>
                <div className="w-64 h-2 bg-slate-200 rounded-full mx-auto overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                    style={{ width: `${aiScanProgress}%` }}
                  />
                </div>
              </div>
            )}

            {aiStep === 'review' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Extracted Dishes Ready for Import</h3>
                    <p className="text-xs text-slate-500">Review OCR confidence and prices before adding to live menu</p>
                  </div>
                  <button
                    onClick={handleImportExtractedAiDishes}
                    className="btn-primary text-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Import All ({extractedAiDishes.length}) to Catalog</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Detected Dish Name</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">Dietary</th>
                        <th className="p-3.5">Price</th>
                        <th className="p-3.5">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {extractedAiDishes.map((dish) => (
                        <tr key={dish.id}>
                          <td className="p-3.5 font-bold text-slate-900">{dish.name}</td>
                          <td className="p-3.5 text-slate-600">{dish.category}</td>
                          <td className="p-3.5">
                            {dish.isVeg ? (
                              <span className="badge badge-emerald">Veg</span>
                            ) : (
                              <span className="badge badge-rose">Non-Veg</span>
                            )}
                          </td>
                          <td className="p-3.5 font-extrabold text-amber-600">₹{dish.price}</td>
                          <td className="p-3.5">
                            <span className="badge badge-amber">{dish.confidence}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: BILLS & SETTLEMENTS */}
        {activeTab === 'bills' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 font-heading">Bills & Financial Settlements</h2>
                <p className="text-xs text-slate-500">Deterministic decimal financial engine with 5% GST calculation</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Invoice #</th>
                    <th className="p-4">Table</th>
                    <th className="p-4">Subtotal</th>
                    <th className="p-4">GST (5%)</th>
                    <th className="p-4">Grand Total</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No settled invoices yet. Request bills from active tables to generate invoices.
                      </td>
                    </tr>
                  ) : (
                    bills.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-4 font-mono font-bold text-slate-900">{b.id}</td>
                        <td className="p-4 font-semibold text-slate-900">{b.table}</td>
                        <td className="p-4 text-slate-600">{b.subtotal}</td>
                        <td className="p-4 text-slate-500">{b.gst}</td>
                        <td className="p-4 font-extrabold text-amber-600">{b.total}</td>
                        <td className="p-4">
                          <span className="badge badge-emerald">{b.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: STAFF & ROLES */}
        {activeTab === 'staff' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 font-heading">Staff & Granular RBAC Permissions</h2>
                <p className="text-xs text-slate-500">Role-based access matrix</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Employee Name</th>
                    <th className="p-4">Login Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Access Permissions</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffMembers.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-900">{staff.name}</td>
                      <td className="p-4 font-mono text-slate-600">{staff.email}</td>
                      <td className="p-4">
                        <span className="badge badge-amber">{staff.role}</span>
                      </td>
                      <td className="p-4 text-slate-500">Full Access</td>
                      <td className="p-4">
                        <span className="badge badge-emerald">{staff.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* QR Code Modal for Selected Table */}
      {selectedTableForQr && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="font-extrabold text-lg text-slate-900">{selectedTableForQr.number} QR Code</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Scan with your phone camera to open digital dining
            </p>

            {/* QR Code Visual Image */}
            <div className="my-4 p-3 bg-white border border-slate-200 rounded-xl inline-block shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=http://${phoneServerIp}:3000/t/qr-spice-t1-indiranagar-token-001`}
                alt="Table QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>

            {/* Direct URL Box with Copy */}
            <div className="mb-4 text-left p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-500 font-semibold">Phone Network URL:</span>
                <button
                  onClick={handleCopyPhoneUrl}
                  className="text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
                >
                  {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="font-mono text-slate-800 break-all select-all font-medium">
                http://{phoneServerIp}:3000/t/qr-spice-t1-indiranagar-token-001
              </div>

              {/* IP Input Helper */}
              <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Wi-Fi IP:</span>
                <input
                  type="text"
                  value={phoneServerIp}
                  onChange={(e) => setPhoneServerIp(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 bg-white font-mono"
                  placeholder="192.168.1.204"
                />
              </div>
            </div>

            <div className="space-y-2">
              <a
                href="/t/qr-spice-t1-indiranagar-token-001"
                target="_blank"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-105 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <span>Open in this Browser</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setSelectedTableForQr(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Dish Modal */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl">
            <h3 className="font-bold text-lg text-slate-900 mb-4">Add New Menu Dish</h3>
            <form onSubmit={handleAddNewItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                  placeholder="e.g. Kashmiri Rogan Josh"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    required
                    value={newItemForm.price}
                    onChange={(e) => setNewItemForm({ ...newItemForm, price: e.target.value })}
                    placeholder="450"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Dietary</label>
                  <select
                    value={newItemForm.isVeg ? 'veg' : 'non-veg'}
                    onChange={(e) => setNewItemForm({ ...newItemForm, isVeg: e.target.value === 'veg' })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  >
                    <option value="veg">Pure Veg 🟢</option>
                    <option value="non-veg">Non-Veg 🔴</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category</label>
                <select
                  value={newItemForm.categoryId}
                  onChange={(e) => setNewItemForm({ ...newItemForm, categoryId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                >
                  {DEMO_MENU_CATEGORIES.filter(c => c.id !== 'cat-all').map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  value={newItemForm.description}
                  onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                  placeholder="Short appetizing description..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-105 text-white font-bold text-xs shadow-sm"
                >
                  Save & Publish to Menu
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
