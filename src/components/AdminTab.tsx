'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Shield, Save, Link, Users, DollarSign, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [vastUrl, setVastUrl] = useState('');
  const [currentVastUrl, setCurrentVastUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequestData[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Load current VAST URL from API
  const loadVastUrl = useCallback(async () => {
    try {
      const res = await fetch('/api/vast');
      const data = await res.json();
      const url = data.vastUrl || '';
      setCurrentVastUrl(url);
      setVastUrl(url);
    } catch (err) {
      console.error('Load VAST URL error:', err);
    }
  }, []);

  // Load withdraw requests from Firestore
  const loadWithdrawRequests = useCallback(async () => {
    try {
      const q = query(collection(db, 'withdraw_requests'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const items: WithdrawRequestData[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as WithdrawRequestData);
      });
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

  // Save VAST URL via API (Prisma)
  const handleSaveVastUrl = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vastUrl,
          email: user.email,
        }),
      });

      if (res.ok) {
        setCurrentVastUrl(vastUrl);
        toast.success('VAST URL saved globally!');
      } else {
        toast.error('Failed to save VAST URL');
      }
    } catch (err) {
      console.error('Save VAST URL error:', err);
      toast.error('Failed to save VAST URL');
    } finally {
      setSaving(false);
    }
  };

  // Approve/reject withdraw request
  const handleWithdrawAction = async (requestId: string, action: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'withdraw_requests', requestId), {
        status: action,
      });
      toast.success(`Request ${action}`);
      await loadWithdrawRequests();
    } catch (err) {
      console.error('Update withdraw request error:', err);
      toast.error('Failed to update request');
    }
  };

  return (
    <div className="space-y-4">
      {/* VAST URL Management */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#2563eb]" />
            Admin Panel — VAST Ad Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[#64748b]">
            Configure the global VAST tag URL for HilltopAds. This will be used for pre-roll/mid-roll ads on all videos.
          </p>

          <div>
            <label className="text-sm font-medium mb-1 block">Current VAST URL</label>
            <div className="flex items-center gap-2 p-2 bg-[#f3f7ff] rounded-lg text-sm">
              <Link className="h-4 w-4 text-[#64748b] shrink-0" />
              <span className="truncate">{currentVastUrl || 'Not configured'}</span>
            </div>
          </div>

          <Separator />

          <div>
            <label className="text-sm font-medium mb-1 block">Update VAST URL</label>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.hilltopads.com/vast/..."
                value={vastUrl}
                onChange={(e) => setVastUrl(e.target.value)}
                className="border-[#e5eefc]"
              />
              <Button
                onClick={handleSaveVastUrl}
                disabled={saving}
                className="bg-[#2563eb] hover:bg-[#1e40af] text-white whitespace-nowrap"
              >
                {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <><Save className="h-4 w-4 mr-1" /> Save</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdraw Requests */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Withdrawal Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2563eb]" />
            </div>
          ) : withdrawRequests.length === 0 ? (
            <p className="text-sm text-[#64748b] text-center py-4">No withdrawal requests yet.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto vl-feed-scroll">
              {withdrawRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 border border-[#e5eefc] rounded-xl p-3 bg-white"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Rs. {req.amount.toFixed(2)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        req.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : req.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748b] truncate">
                      {req.type}: {req.account}
                    </p>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() => handleWithdrawAction(req.id, 'approved')}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => handleWithdrawAction(req.id, 'rejected')}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Stats */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Platform Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#64748b]">
            Admin: <span className="font-semibold">{user?.email}</span>
          </p>
          <p className="text-xs text-[#64748b] mt-1">
            Manage users, videos, and platform settings from this panel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
