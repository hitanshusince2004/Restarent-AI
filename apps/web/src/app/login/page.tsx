'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UtensilsCrossed,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  User,
  Mail,
  Lock,
  MapPin,
  LayoutGrid,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { restaurantStore } from '@/lib/restaurant-store';
import { fetchApi, setAuthToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');

  // Sign Up / Fresh Setup State
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [tableCount, setTableCount] = useState(6);
  const [withStarterMenu, setWithStarterMenu] = useState(false);

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle Fresh Restaurant Registration
  const handleRegisterFresh = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!restaurantName.trim()) {
      setErrorMessage('Please enter your restaurant name.');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      // 1. Attempt registering with backend API
      const apiRes = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: ownerName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      // 2. Initialize fresh restaurant in store with 0 pre-data
      restaurantStore.initializeFreshRestaurant({
        restaurantName: restaurantName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim().toLowerCase(),
        city: city.trim() || 'Local Dining',
        tableCount: Number(tableCount) || 6,
        withStarterMenu,
      });

      setSuccessMessage('Fresh restaurant created! Redirecting to your dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: any) {
      // Even if offline API, create local fresh clean slate store
      restaurantStore.initializeFreshRestaurant({
        restaurantName: restaurantName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim().toLowerCase(),
        city: city.trim() || 'Local Dining',
        tableCount: Number(tableCount) || 6,
        withStarterMenu,
      });
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });

      if (res.success && res.data?.accessToken) {
        setAuthToken(res.data.accessToken);
      }

      // Check if there is an existing restaurant or create default
      let profile = restaurantStore.getProfile();
      if (!profile) {
        profile = restaurantStore.initializeFreshRestaurant({
          restaurantName: 'My Fresh Restaurant',
          ownerName: res.data?.user?.name || loginEmail.split('@')[0],
          email: loginEmail.trim(),
          tableCount: 6,
          withStarterMenu: false,
        });
      }

      router.push('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // One-click clean slate wipe
  const handleWipeAndStartFresh = () => {
    if (confirm('Are you sure you want to remove all pre-existing data and start 100% clean?')) {
      restaurantStore.wipeAllData();
      setRestaurantName('');
      setOwnerName('');
      setEmail('');
      setPassword('');
      setSuccessMessage('All previous pre-data removed! You can now create your fresh restaurant.');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-amber-500 selection:text-white">
      {/* Top Bar */}
      <header className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-slate-900 tracking-tight text-base">
              Restaurant OS
            </span>
            <span className="text-[11px] text-amber-600 font-semibold block -mt-0.5">
              Clean Slate Portal
            </span>
          </div>
        </div>

        <button
          onClick={handleWipeAndStartFresh}
          className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition"
          title="Clear all stored mock data and local storage"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Wipe Pre-Data</span>
        </button>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl"></div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold mb-2 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Zero Pre-Data • Fresh Restaurant Setup</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              {activeTab === 'signup' ? 'Create Fresh Restaurant' : 'Owner Sign In'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {activeTab === 'signup'
                ? 'Start fresh with your own custom restaurant name, brand new tables, and clean menu.'
                : 'Access your restaurant management console, KDS board, and live tables.'}
            </p>

            {/* Tab Selector */}
            <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 max-w-xs mx-auto mt-5 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  activeTab === 'signup'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Fresh
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  activeTab === 'login'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Existing Sign In
              </button>
            </div>
          </div>

          {/* Form Container */}
          <div className="p-6 sm:p-8">
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {activeTab === 'signup' ? (
              /* Fresh Restaurant Registration Form */
              <form onSubmit={handleRegisterFresh} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Restaurant Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="e.g., The Urban Bistro & Lounge"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 placeholder-slate-400 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Owner Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g., Hitanshu"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 placeholder-slate-400 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>City / Area</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g., Bengaluru"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 placeholder-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>Work Email *</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@mybistro.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 placeholder-slate-400 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Create Password *</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 placeholder-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                    <span>Number of Dining Tables to Generate</span>
                  </label>
                  <select
                    value={tableCount}
                    onChange={(e) => setTableCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 bg-white font-medium"
                  >
                    <option value={4}>4 Tables (Table 01 - Table 04)</option>
                    <option value={6}>6 Tables (Table 01 - Table 06)</option>
                    <option value={8}>8 Tables (Table 01 - Table 08)</option>
                    <option value={12}>12 Tables (Table 01 - Table 12)</option>
                    <option value={16}>16 Tables (Table 01 - Table 16)</option>
                  </select>
                </div>

                {/* Clean Slate Toggle */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="starterMenuToggle"
                      checked={withStarterMenu}
                      onChange={(e) => setWithStarterMenu(e.target.checked)}
                      className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <label htmlFor="starterMenuToggle" className="cursor-pointer">
                      <span className="font-bold text-slate-800 block">Include 4 starter sample dishes</span>
                      <span className="text-[11px] text-slate-500 block leading-normal">
                        Uncheck to start with a 100% completely blank menu catalog (you can add your dishes or import your paper menu via AI).
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition disabled:opacity-50"
                >
                  {loading ? (
                    <span>Initializing Fresh Restaurant...</span>
                  ) : (
                    <>
                      <span>Launch Brand New Restaurant</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Existing Sign In Form */
              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="owner@mybistro.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 placeholder-slate-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Password</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 placeholder-slate-400 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
                >
                  {loading ? (
                    <span>Signing In...</span>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="py-4 px-6 text-center text-xs text-slate-400">
        <span>Restaurant OS • Clean Slate & Fresh Onboarding System</span>
      </footer>
    </div>
  );
}
