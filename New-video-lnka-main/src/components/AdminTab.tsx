'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Shield, Save, Link as LinkIcon, DollarSign,
  CheckCircle2, XCircle, Loader2, Tv, Trash2,
  Users, BarChart3, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/use-local-storage';

interface WithdrawRequestData {
  id: string;
  uid: string;
  type: string;
  account: string;
  amount: number;
  status: string;
  createdAt: unknown;
}

export default function AdminTab() {
  const { user } = useAuth();

  // ── VAST URL ──────────────────────────────────────────────────────────────
  const [vastUrl, setVastUrl]               = useState('');
  const [currentVastUrl, setCurrentVastUrl] = useState('');
  const [savingVast, setSavingVast]         = useState(false);

  // ── Ad Code (script banner) ────────────────────────────────────────────────
  const [adCode, setAdCode]   = useLocalStorage('VL_AD_CODE', '');
  const [adSaved, setAdSaved] = useState(false);

  // ── Withdraw requests ──────────────────────────────────────────────────────
  const [withdrawRequests, setWithdrawRequests]   = useState<WithdrawRequestData[]>([]);
  const [loadingRequests, setLoadingRequests]     = useState(true);

  // ── Load VAST URL ─────────────────────────────────────────────────────────
  const loadVastUrl = useCallback(async () => {
    try {
      const res  = await fetch('/api/vast');
      const data = await res.json() as { vastUrl?: string };
      const url  = data.vastUrl ?? '';
      setCurrentVastUrl(url);
      setVastUrl(url);
    } catch (err) {
      console.error('Load VAST URL error:', err);
    }
  }, []);

  // ── Load withdraw requests ────────────────────────────────────────────────
  const loadWithdrawRequests = useCallback(async () => {
    try {
      const q    = query(collection(db, 'withdraw_requests'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const items: WithdrawRequestData[] = [];
      snap.forEach((d) => { items.push({ id: d.id, ...d.data() } as WithdrawRequestData); });
      setWithdrawRequests(items);
    } catch (err) {
      console.error('Load withdraw requests error:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadVastUrl();
    loadWithdrawRequests();
  }, [loadVastUrl, loadWithdrawRequests]);

  // ── Save VAST URL ─────────────────────────────────────────────────────────
  const handleSaveVastUrl = async () => {
    if (!user) return;
    setSavingVast(true);
    try {
      const token = await user.getIdToken(true);
      const res   = await fetch('/api/vast', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ vastUrl }),
      });
      if (res.ok) {
        setCurrentVastUrl(vastUrl);
        toast.success('VAST URL saved!');
      } else {
        const body = await res.json() as { error?: string };
        toast.error(body.error ?? 'Failed to save VAST URL');
      }
    } catch {
      toast.error('Failed to save VAST URL');
    } finally {
      setSavingVast(false);
    }
  };

  // ── Save Ad Code ──────────────────────────────────────────────────────────
  const handleSaveAdCode = () => {
    setAdCode(adCode.trim());
    setAdSaved(true);
    toast.success('Ad code saved!');
    setTimeout(() => setAdSaved(false), 2000);
  };

  // ── Withdraw action ───────────────────────────────────────────────────────
  const handleWithdrawAction = async (id: string, action: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'withdraw_requests', id), { status: action });
      toast.success(`Request ${action}`);
      await loadWithdrawRequests();
    } catch {
      toast.error('Failed to update request');
    }
  };

  const pending  = withdrawRequests.filter(r => r.status === 'pending');
  const resolved = withdrawRequests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-4">

      {/* ══ Section 1: VAST Ad Configuration ══════════════════════════════════ */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#2563eb]" />
            VAST Ad Configuration
          </CardTitle>
          <p className="text-xs text-[#64748b]">
            HilltopAds / Monetag VAST tag — plays as pre-roll ad on every video
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current status badge */}
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
            currentVastUrl
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${currentVastUrl ? 'bg-green-500' : 'bg-yellow-500'}`} />
            {currentVastUrl ? 'VAST URL active — ads running' : 'No VAST URL configured — no ads running'}
          </div>

          {currentVastUrl && (
            <div className="flex items-center gap-2 p-2 bg-[#f3f7ff] rounded-lg text-xs">
              <LinkIcon className="h-3.5 w-3.5 text-[#64748b] shrink-0" />
              <span className="truncate text-[#64748b]">{currentVastUrl}</span>
            </div>
          )}

          <Separator />

          <div>
            <label className="text-xs font-medium text-[#374151] mb-1.5 block">Update VAST URL</label>
            <div className="flex gap-2">
              <Input
                placeholder="https://your-hilltopads-vast-url.com/tag/..."
                value={vastUrl}
                onChange={(e) => setVastUrl(e.target.value)}
                className="border-[#e5eefc] text-sm"
              />
              <Button
                onClick={handleSaveVastUrl}
                disabled={savingVast || !vastUrl.trim()}
                className="bg-[#2563eb] hover:bg-[#1e40af] text-white whitespace-nowrap shrink-0"
              >
                {savingVast ? <Loader2 className="animate-spin h-4 w-4" /> : <><Save className="h-4 w-4 mr-1" />Save</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ Section 2: Ad Banner Script (Kadam / Adsterra) ══════════════════ */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Tv className="h-4 w-4 text-[#2563eb]" />
            Ad Banner Script
          </CardTitle>
          <p className="text-xs text-[#64748b]">
            Kadam / Monetag / Adsterra JS script — shows as overlay when a video starts
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={adCode}
            onChange={(e) => setAdCode(e.target.value)}
            rows={4}
            placeholder={"<script src='https://your-ad-network.com/ad.js'></script>"}
            className="border-[#e5eefc] text-xs font-mono bg-[#f3f7ff]"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSaveAdCode}
              size="sm"
              className={`text-xs ${adSaved ? 'bg-green-600' : 'bg-[#2563eb] hover:bg-[#1e40af]'} text-white`}
            >
              {adSaved ? <><CheckCircle2 className="h-3 w-3 mr-1" />Saved!</> : <><Save className="h-3 w-3 mr-1" />Save Script</>}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setAdCode(''); toast.success('Ad code cleared'); }}
              className="border-[#e5eefc] text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ══ Section 3: Pending Withdrawals ═══════════════════════════════════ */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-[#2563eb]" />
            Withdrawal Requests
            {pending.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin h-5 w-5 text-[#2563eb]" />
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-[#64748b]">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((req) => (
                <div
                  key={req.id}
                  className="border border-yellow-200 bg-yellow-50 rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">Rs. {req.amount.toFixed(2)}</span>
                      <span className="text-xs bg-white text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-full">
                        {req.type}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748b] truncate mt-0.5">{req.account}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleWithdrawAction(req.id, 'approved')}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />Pay
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => handleWithdrawAction(req.id, 'rejected')}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent resolved */}
          {resolved.length > 0 && (
            <>
              <Separator className="my-3" />
              <p className="text-xs font-medium text-[#64748b] flex items-center gap-1 mb-2">
                <Clock className="h-3 w-3" /> Recent History
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {resolved.slice(0, 5).map((req) => (
                  <div key={req.id} className="flex items-center justify-between text-xs text-[#64748b] py-1 border-b border-[#f3f7ff]">
                    <span className="truncate">{req.account}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium">Rs.{req.amount}</span>
                      <span className={`px-1.5 py-0.5 rounded-full ${
                        req.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ══ Section 4: Admin Info ═════════════════════════════════════════════ */}
      <Card className="border-[#e5eefc] bg-[#f3f7ff]">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-[#2563eb]" />
            <p className="text-sm font-semibold text-[#2563eb]">Admin Account</p>
          </div>
          <p className="text-xs text-[#64748b]">{user?.email}</p>
          <Separator className="my-2" />
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-[#64748b]" />
            <p className="text-xs text-[#64748b]">
              Total withdrawal requests: <span className="font-semibold">{withdrawRequests.length}</span>
              {' '}({pending.length} pending)
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
