'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { TabName } from '@/types';
import LoginScreen from '@/components/LoginScreen';
import HomeTab    from '@/components/HomeTab';
import UploadTab  from '@/components/UploadTab';
import WalletTab  from '@/components/WalletTab';
import ProfileTab from '@/components/ProfileTab';
import AdminTab   from '@/components/AdminTab';
import { Home, Upload, Wallet, User, Shield } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

// Capture referral code from URL on first load
function useRefCapture() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ref = new URL(window.location.href).searchParams.get('ref');
      if (ref) localStorage.setItem('ref_from', ref);
    }
  }, []);
}

async function fetchVastUrl(): Promise<string> {
  try {
    const res  = await fetch('/api/vast');
    const data = await res.json() as { vastUrl?: string };
    return data.vastUrl ?? '';
  } catch {
    return '';
  }
}

function Dashboard() {
  const { user, userData, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('home');

  const { data: vastUrl = '' } = useQuery({ queryKey: ['vastUrl'], queryFn: fetchVastUrl });

  useRefCapture();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7fbff]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#2563eb] grid place-items-center mx-auto mb-4">
            <span className="text-white font-extrabold text-2xl">VL</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb] mx-auto" />
          <p className="text-[#64748b] mt-3 text-sm">Loading VideoLanka…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const allTabs: { id: TabName; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'home',    label: 'Home',    icon: <Home   className="h-5 w-5" /> },
    { id: 'upload',  label: 'Upload',  icon: <Upload className="h-5 w-5" /> },
    { id: 'wallet',  label: 'Wallet',  icon: <Wallet className="h-5 w-5" /> },
    { id: 'profile', label: 'Profile', icon: <User   className="h-5 w-5" /> },
    { id: 'admin',   label: 'Admin',   icon: <Shield className="h-5 w-5" />, adminOnly: true },
  ];
  const tabs = allTabs.filter(t => !t.adminOnly || isAdmin);

  const renderTab = () => {
    switch (activeTab) {
      case 'home':    return <HomeTab vastUrl={vastUrl} />;
      case 'upload':  return <UploadTab vastUrl={vastUrl} />;
      case 'wallet':  return <WalletTab />;
      case 'profile': return <ProfileTab />;
      case 'admin':   return isAdmin ? <AdminTab /> : null;
      default:        return <HomeTab vastUrl={vastUrl} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7fbff]">

      {/* ── Top Header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e5eefc]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2563eb] grid place-items-center text-white font-extrabold text-sm shrink-0">
              VL
            </div>
            <div>
              <p className="font-extrabold text-[#2563eb] text-sm leading-tight">VideoLanka</p>
              <p className="text-[10px] text-[#94a3b8] leading-tight">Watch • Upload • Earn</p>
            </div>
          </div>
          {/* Balance chip */}
          <div className="bg-[#f3f7ff] border border-[#e5eefc] rounded-full px-3 py-1 text-xs font-semibold text-[#2563eb]">
            Rs.{(userData?.kpis.balance ?? 0).toFixed(2)}
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24">
        {renderTab()}
      </main>

      {/* ── Bottom Navigation ────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e5eefc] safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                  active
                    ? 'text-[#2563eb]'
                    : 'text-[#94a3b8] hover:text-[#64748b]'
                }`}
              >
                <span className={`transition-transform ${active ? 'scale-110' : ''}`}>
                  {tab.icon}
                </span>
                <span className={`text-[10px] font-medium ${active ? 'text-[#2563eb]' : ''}`}>
                  {tab.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-[#2563eb] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <Dashboard />
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
