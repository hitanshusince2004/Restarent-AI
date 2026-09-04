'use client';

import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
  Maximize2,
  ArrowRight,
  Filter,
  Sparkles,
  RefreshCw,
  Search,
  Check
} from 'lucide-react';

import { syncBus } from '@/lib/sync';

interface TicketItem {
  id: string;
  name: string;
  quantity: number;
  modifiers?: string[];
  isVeg: boolean;
  station: 'Tandoor' | 'Curry' | 'Breads' | 'Beverage';
  completed?: boolean;
}

interface KDSTicket {
  id: string;
  tableNumber: string;
  floor: string;
  orderNumber: string;
  status: 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';
  minutesAgo: number;
  serverName: string;
  notes?: string;
  items: TicketItem[];
}

function playKitchenChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {}
}

// Clean state: start from scratch with empty tickets list
const INITIAL_TICKETS: KDSTicket[] = [];

export default function KDSPage() {
  const [tickets, setTickets] = useState<KDSTicket[]>(INITIAL_TICKETS);
  const [activeStation, setActiveStation] = useState<string>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to real-time events across tabs & devices
  useEffect(() => {
    const unsub = syncBus.subscribe((event) => {
      if (event.type === 'ORDER_PLACED') {
        const payload = event.payload;
        const newTicket: KDSTicket = {
          id: payload.id || `tkt-${Date.now()}`,
          tableNumber: payload.tableNumber || 'Table 01',
          floor: payload.floor || 'Ground Floor Dining',
          orderNumber: payload.orderNumber || `#${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'NEW',
          minutesAgo: 0,
          serverName: payload.serverName || 'Guest Mobile',
          notes: payload.notes,
          items: (payload.items || []).map((it: any) => ({
            id: it.id || `item-${Math.random()}`,
            name: it.name,
            quantity: it.quantity,
            modifiers: it.modifiers,
            isVeg: it.isVeg ?? true,
            station: it.station || 'Curry',
            completed: false,
          })),
        };

        setTickets((prev) => [newTicket, ...prev]);

        if (soundEnabled) {
          playKitchenChime();
        }

        setNotificationMsg(`🔥 NEW ORDER RECEIVED: ${newTicket.tableNumber} (${newTicket.orderNumber})`);
        setTimeout(() => setNotificationMsg(null), 5000);
      } else if (event.type === 'WAITER_CALLED') {
        if (soundEnabled) playKitchenChime();
        setNotificationMsg(`🔔 WAITER CALLED AT: ${event.payload.tableNumber}!`);
        setTimeout(() => setNotificationMsg(null), 5000);
      } else if (event.type === 'BILL_REQUESTED') {
        if (soundEnabled) playKitchenChime();
        setNotificationMsg(`💳 BILL REQUESTED: ${event.payload.tableNumber} (₹${event.payload.total})`);
        setTimeout(() => setNotificationMsg(null), 5000);
      }
    });

    return unsub;
  }, [soundEnabled]);

  // Advance ticket status through the 4 stages
  const advanceStatus = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          let nextStatus: KDSTicket['status'] = t.status;
          if (t.status === 'NEW') nextStatus = 'PREPARING';
          else if (t.status === 'PREPARING') nextStatus = 'READY';
          else if (t.status === 'READY') nextStatus = 'COMPLETED';

          syncBus.publish({
            type: 'ORDER_STATUS_UPDATED',
            payload: { orderId: t.id, status: nextStatus },
          });

          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  // Toggle item completion check
  const handleToggleItem = (ticketId: string, itemId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            items: t.items.map((it) =>
              it.id === itemId ? { ...it, completed: !it.completed } : it
            ),
          };
        }
        return t;
      })
    );
  };

  // Color-coded elapsed time thresholds
  const getUrgencyClass = (minutes: number) => {
    if (minutes > 15) return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
    if (minutes > 10) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const columns: {
    key: KDSTicket['status'];
    label: string;
    borderClass: string;
    badgeClass: string;
    actionLabel: string;
  }[] = [
    {
      key: 'NEW',
      label: 'NEW ORDERS',
      borderClass: 'border-t-4 border-rose-500',
      badgeClass: 'badge-rose',
      actionLabel: 'Accept & Cook',
    },
    {
      key: 'PREPARING',
      label: 'PREPARING',
      borderClass: 'border-t-4 border-amber-500',
      badgeClass: 'badge-amber',
      actionLabel: 'Mark Ready',
    },
    {
      key: 'READY',
      label: 'READY FOR DISPATCH',
      borderClass: 'border-t-4 border-emerald-500',
      badgeClass: 'badge-emerald',
      actionLabel: 'Dispatched / Served',
    },
    {
      key: 'COMPLETED',
      label: 'COMPLETED',
      borderClass: 'border-t-4 border-slate-400',
      badgeClass: 'badge-slate',
      actionLabel: 'Archive',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* Top KDS Control Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 tracking-wide font-heading">
                  KITCHEN DISPLAY SYSTEM
                </h1>
                <span className="badge badge-emerald text-[10px]">LIVE CONNECTED</span>
              </div>
              <p className="text-xs text-slate-500">Live Kitchen Kanban • Indiranagar Outlet</p>
            </div>
          </div>

          {/* Station Filters */}
          <div className="hidden lg:flex items-center gap-1.5 ml-6 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['ALL', 'Tandoor', 'Curry', 'Breads', 'Beverage'].map((st) => (
              <button
                key={st}
                onClick={() => setActiveStation(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  activeStation === st
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Stations' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Right Status & Clock */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-500 font-medium">Clock Time</div>
            <div className="text-sm font-mono font-bold text-amber-600">{currentTime || 'Live'}</div>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition ${
              soundEnabled
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title="Toggle Sound Alerts"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <a
            href="/dashboard"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5"
          >
            Dashboard
          </a>
        </div>
      </header>

      {/* Real-time Order Alert Banner */}
      {notificationMsg && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white font-bold px-6 py-2.5 text-center text-sm shadow-md flex items-center justify-center gap-2 border-b border-amber-400 animate-pulse">
          <Sparkles className="w-5 h-5 animate-spin" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Kanban Board Container */}
      <main className="flex-1 p-6 overflow-x-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 min-w-[1100px] h-full">
          {columns.map((col) => {
            const colTickets = tickets.filter((t) => t.status === col.key);

            return (
              <div
                key={col.key}
                className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
              >
                {/* Column Header */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      col.key === 'NEW' ? 'bg-rose-500 pulsing-dot' :
                      col.key === 'PREPARING' ? 'bg-amber-500' :
                      col.key === 'READY' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}></span>
                    <h2 className="font-bold text-sm text-slate-900">{col.label}</h2>
                  </div>
                  <span className={`badge ${col.badgeClass} text-xs px-2.5 py-0.5`}>
                    {colTickets.length}
                  </span>
                </div>

                {/* Tickets List */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {colTickets.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                      <ChefHat className="w-8 h-8 opacity-20 mb-2" />
                      <span>No orders in this stage</span>
                    </div>
                  ) : (
                    colTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={`p-4 rounded-xl bg-white border border-slate-200 shadow-sm ${col.borderClass} flex flex-col justify-between transition hover:shadow-md`}
                      >
                        {/* Ticket Meta */}
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-lg text-slate-900">
                                  {ticket.tableNumber}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">
                                  {ticket.orderNumber}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500">
                                Server: {ticket.serverName} • {ticket.floor}
                              </span>
                            </div>

                            {/* Timer Badge */}
                            <div
                              className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 ${getUrgencyClass(
                                ticket.minutesAgo
                              )}`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>{ticket.minutesAgo}m</span>
                            </div>
                          </div>

                          {/* Notes */}
                          {ticket.notes && (
                            <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                              <span className="font-medium">{ticket.notes}</span>
                            </div>
                          )}

                          {/* Line Items */}
                          <div className="mt-3.5 space-y-2 border-t border-slate-100 pt-3">
                            {ticket.items.map((it) => (
                              <div
                                key={it.id}
                                onClick={() => handleToggleItem(ticket.id, it.id)}
                                className={`p-2 rounded-lg cursor-pointer transition flex items-start gap-2.5 ${
                                  it.completed
                                    ? 'bg-emerald-50 border border-emerald-200 opacity-60'
                                    : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border text-[10px] ${
                                    it.completed
                                      ? 'bg-emerald-600 border-emerald-700 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {it.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-sm font-bold ${
                                        it.completed
                                          ? 'line-through text-slate-400'
                                          : 'text-slate-900'
                                      }`}
                                    >
                                      {it.quantity}x {it.name}
                                    </span>
                                    {it.isVeg ? (
                                      <div className="veg-indicator" />
                                    ) : (
                                      <div className="non-veg-indicator" />
                                    )}
                                  </div>
                                  {it.modifiers && it.modifiers.length > 0 && (
                                    <p className="text-[11px] text-amber-700 mt-0.5">
                                      {it.modifiers.join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Card Action Button */}
                        {col.key !== 'COMPLETED' && (
                          <button
                            onClick={() => advanceStatus(ticket.id)}
                            className="mt-4 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
                          >
                            <span>{col.actionLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
