'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { TabName } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import LoginScreen from '@/components/LoginScreen';
import DashboardTab from '@/components/DashboardTab';
import UploadTab from '@/components/UploadTab';
import WalletTab from '@/components/WalletTab';
import ReferTab from '@/components/ReferTab';
import AdminTab from '@/components/AdminTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Upload,
  Users,
  Wallet,
  Shield,
  LogOut,
  Tv,
  Copy,
  Trash2,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

// Capture referral from URL on first load
function useRefCapture() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const refFrom = new URL(window.location.href).searchParams.get('ref');
      if (refFrom) {
        localStorage.setItem('ref_from', refFrom);
      }
    }
  }, []);
}

// Fetch VAST URL via API
async function fetchVastUrl(): Promise<string> {
  try {
    const res = await fetch('/api/vast');
    const data = await res.json();
    return data.vastUrl || '';
  } catch {
    return '';
  }
}

// Inner dashboard component (needs auth context)
function Dashboard() {
  const { user, userData, loading, isAdmin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [statusMessage, setStatusMessage] = useState('Ready.');
  const [adCode, setAdCode] = useLocalStorage('VL_AD_CODE', '');

  // Use React Query for VAST URL - avoids setState-in-effect lint issue
  const { data: vastUrl = '' } = useQuery({
    queryKey: ['vastUrl'],
    queryFn: fetchVastUrl,
  });

  // Capture referral parameter
  useRefCapture();

  // Loading state
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

  // Not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  // Tab definitions
  const tabs: { id: TabName; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'upload', label: 'Upload', icon: <Upload className="h-4 w-4" /> },
    { id: 'refer', label: 'Refer', icon: <Users className="h-4 w-4" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet className="h-4 w-4" /> },
    { id: 'admin', label: 'Admin', icon: <Shield className="h-4 w-4" />, adminOnly: true },
  ].filter((tab) => !tab.adminOnly || isAdmin);

  // Ad Manager handlers
  const saveAdCode = () => {
    setAdCode(adCode.trim());
    setStatusMessage('Ad code saved.');
    toast.success('Ad code saved');
  };

  const clearAdCode = () => {
    setAdCode('');
    setStatusMessage('Ad code cleared.');
    toast.success('Ad code cleared');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab vastUrl={vastUrl} />;
      case 'upload':
        return <UploadTab vastUrl={vastUrl} />;
      case 'refer':
        return <ReferTab />;
      case 'wallet':
        return <WalletTab />;
      case 'admin':
        return isAdmin ? <AdminTab /> : null;
      default:
        return <DashboardTab vastUrl={vastUrl} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7fbff]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e5eefc]">
        <div className="max-w-[1100px] mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-[#2563eb] grid place-items-center text-white font-extrabold text-sm shrink-0">
                VL
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-[#2563eb] text-sm sm:text-base truncate">
                  VideoLanka Dashboard
                </h1>
                <p className="text-xs text-[#64748b] hidden sm:block">
                  Upload • Watch • Earn • Refer • Withdraw
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex gap-1.5 flex-wrap items-center">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs sm:text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#2563eb] text-white border border-[#2563eb]'
                      : 'bg-white text-[#0b1220] border border-[#e5eefc] hover:bg-[#f3f7ff]'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs sm:text-sm font-medium bg-white text-[#0b1220] border border-[#e5eefc] hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.68fr] gap-4">
          {/* Left Column - Tab Content */}
          <div className="space-y-4 min-w-0">
            {renderTabContent()}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4">
            {/* Ad Manager */}
            <Card className="border-[#e5eefc]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tv className="h-5 w-5" />
                  Ad Manager
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-[#64748b]">
                  Paste Kadam/Monetag/Adsterra script. It shows as overlay when a video starts.
                </p>
                <Textarea
                  value={adCode}
                  onChange={(e) => setAdCode(e.target.value)}
                  rows={5}
                  placeholder="<script src='...your-ad.js'></script>"
                  className="border-[#e5eefc] text-sm font-mono"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveAdCode}
                    className="border-[#e5eefc] text-xs"
                  >
                    <Save className="h-3 w-3 mr-1" /> Save Ad Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAdCode}
                    className="border-[#e5eefc] text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* VAST URL Status */}
            <Card className="border-[#e5eefc]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">VAST Ad Status</CardTitle>
              </CardHeader>
              <CardContent>
                {vastUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      VAST ad configured
                    </div>
                    <div className="p-2 bg-[#f3f7ff] rounded-lg text-xs text-[#64748b] break-all">
                      {vastUrl}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-[#e5eefc]"
                      onClick={() => {
                        navigator.clipboard.writeText(vastUrl);
                        toast.success('VAST URL copied');
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy VAST URL
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-yellow-600">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    No VAST URL configured
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status */}
            <Card className="border-[#e5eefc]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#64748b]">{statusMessage}</p>
                <Separator className="my-2" />
                <p className="text-xs text-[#64748b]">
                  User: <span className="font-medium">{user.email}</span>
                </p>
                <p className="text-xs text-[#64748b]">
                  Balance: <span className="font-medium">Rs. {(userData?.kpis?.balance || 0).toFixed(2)}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-[#e5eefc]">
        <div className="max-w-[1100px] mx-auto px-4 py-3 text-center">
          <p className="text-xs text-[#64748b]">
            © {new Date().getFullYear()} VideoLanka — Upload • Watch • Earn • Refer • Withdraw
          </p>
        </div>
      </footer>
    </div>
  );
}

// Main page component with AuthProvider wrapper
export default function Home() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
