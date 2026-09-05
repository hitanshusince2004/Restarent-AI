'use client';

import React from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  QrCode,
  ChefHat,
  LayoutDashboard,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Layers,
  Database,
  ExternalLink,
  CheckCircle2,
  Smartphone
} from 'lucide-react';
import { DEMO_RESTAURANT } from '@/lib/api';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-amber-100 selection:text-amber-900 overflow-x-hidden">
      {/* Top Navigation Banner */}
      <header className="border-b border-slate-200 px-6 py-4 backdrop-blur-md sticky top-0 z-50 bg-white/90 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base text-slate-900 tracking-tight font-heading">
                Restaurant OS
              </span>
              <span className="text-xs text-amber-600 font-semibold block -mt-0.5">
                AI-Powered Dining Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 pulsing-dot"></span>
              <span>API Ready (Port 3001)</span>
            </div>

            <Link
              href="/login"
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
            >
              Start Fresh / Login
            </Link>

            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white transition shadow-sm"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-6 overflow-hidden">
        {/* Soft Background Accents */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-amber-200/40 via-orange-100/30 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/80 border border-amber-300 text-amber-800 text-xs font-bold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Modern Restaurant Operating System • Clean Slate Ready</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight font-heading">
            Smarter Dining. <br />
            <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
              Frictionless Kitchen. Total Control.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            From QR-based contactless table dining to 4-stage kitchen kanban displays and
            AI-driven paper menu extraction — built for modern dining experiences.
          </p>
        </div>

        {/* 3 Core Experience Portals */}
        <div className="max-w-6xl mx-auto mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {/* Card 1: Customer Dining */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 flex flex-col justify-between group hover:border-amber-400 border border-slate-200 transition duration-300 shadow-sm hover:shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-amber-100/60 rounded-full blur-xl group-hover:bg-amber-200/60 transition"></div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5 border border-amber-200 shadow-sm">
                <QrCode className="w-6 h-6" />
              </div>
              <span className="badge badge-amber text-[10px] mb-2">Guest Mobile Experience</span>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition">
                Digital QR Dining
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Scan-to-order table web app. Full categorized menu, spice filters, customizable modifiers, live order tracking timeline, and waiter call.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Table 01 • Instant Scan-to-Order</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ready for Mobile Phone Browser</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4">
              <Link
                href="/t/qr-spice-t1-indiranagar-token-001"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition"
              >
                <span>Launch QR Dining Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Kitchen Display System (KDS) */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 flex flex-col justify-between group hover:border-orange-400 border border-slate-200 transition duration-300 shadow-sm hover:shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-orange-100/60 rounded-full blur-xl group-hover:bg-orange-200/60 transition"></div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-5 border border-orange-200 shadow-sm">
                <ChefHat className="w-6 h-6" />
              </div>
              <span className="badge badge-rose text-[10px] mb-2">Back of House</span>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-orange-600 transition">
                Kitchen Display (KDS)
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                4-Stage live order kanban board with color-coded elapsed timers, station filtering (Tandoor, Curry, Breads), and sound notifications.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />
                  <span>Real-time cross-tab sync with phone</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />
                  <span>Audio chimes on incoming orders</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4">
              <Link
                href="/kds"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition"
              >
                <span>Open Live Kitchen Board</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Restaurant Management Dashboard */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 flex flex-col justify-between group hover:border-emerald-400 border border-slate-200 transition duration-300 shadow-sm hover:shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-emerald-100/60 rounded-full blur-xl group-hover:bg-emerald-200/60 transition"></div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5 border border-emerald-200 shadow-sm">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <span className="badge badge-emerald text-[10px] mb-2">Management & Admin</span>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition">
                Management Console
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Complete restaurant operations: Live metrics, floor tables layout, menu catalog with 86 stock toggle, AI menu photo importer, and bills.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Floor plan & QR code generator</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Custom Restaurant & Clean Slate Setup</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4">
              <Link
                href="/dashboard"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition"
              >
                <span>Launch Restaurant Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Specifications Footer */}
      <footer className="border-t border-slate-200 py-8 px-6 bg-white text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <UtensilsCrossed className="w-4 h-4 text-amber-500" />
            <span>Restaurant OS • Production Architecture</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <span>PostgreSQL</span>
            <span>•</span>
            <span>NestJS API</span>
            <span>•</span>
            <span>Next.js Web</span>
            <span>•</span>
            <span>QR Dining Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
