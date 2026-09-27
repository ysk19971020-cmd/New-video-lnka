'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Users, Copy, Gift, TrendingUp, Share2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { EARNING_RATES } from '@/types';

export default function ReferTab() {
  const { userData } = useAuth();

  const kpis    = userData?.kpis || { views: 0, likes: 0, comments: 0, refs: 0, balance: 0 };
  const refEarned = kpis.refs * EARNING_RATES.REFERRAL;

  const copyLink = () => {
    if (userData?.referralLink) {
      navigator.clipboard.writeText(userData.referralLink);
      toast.success('Referral link copied!');
    }
  };

  const shareLink = async () => {
    if (!userData?.referralLink) return;
    if (navigator.share) {
      await navigator.share({
        title: 'Join VideoLanka',
        text:  'Join VideoLanka and earn money watching & uploading videos!',
        url:   userData.referralLink,
      });
    } else {
      copyLink();
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Referral Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-[#e5eefc]">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-extrabold text-[#2563eb]">{kpis.refs}</p>
            <p className="text-xs text-[#64748b] mt-1">Total Referrals</p>
          </CardContent>
        </Card>
        <Card className="border-[#e5eefc]">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-extrabold text-green-600">Rs.{refEarned}</p>
            <p className="text-xs text-[#64748b] mt-1">Earned from Refs</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Earn Banner ── */}
      <Card className="border-0 bg-gradient-to-br from-[#2563eb] to-[#1e40af] text-white">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 grid place-items-center shrink-0">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">Earn Rs.{EARNING_RATES.REFERRAL} per referral!</p>
              <p className="text-sm text-blue-100">Share your link. They register → you earn instantly.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Your Referral Link ── */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#2563eb]" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={userData?.referralLink || 'Loading...'}
              readOnly
              className="flex-1 bg-[#f3f7ff] border-[#e5eefc] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={copyLink}
              className="border-[#e5eefc] text-sm"
            >
              <Copy className="h-4 w-4 mr-2" /> Copy Link
            </Button>
            <Button
              onClick={shareLink}
              className="bg-[#2563eb] hover:bg-[#1e40af] text-white text-sm"
            >
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── How It Works ── */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-[#2563eb]" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {[
            'Copy your unique referral link above',
            'Share it on WhatsApp, Facebook, TikTok, etc.',
            'When they register using your link, you earn Rs.100',
            'Balance added to your wallet instantly',
            'Withdraw anytime (minimum Rs.500)',
          ].map((step, i) => (
            <React.Fragment key={i}>
              <div className="flex items-start gap-3 py-2.5">
                <div className="w-6 h-6 rounded-full bg-[#e8f0fd] grid place-items-center shrink-0 mt-0.5">
                  <span className="text-[#2563eb] text-xs font-bold">{i + 1}</span>
                </div>
                <p className="text-sm text-[#374151]">{step}</p>
              </div>
              {i < 4 && <Separator className="opacity-50" />}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>

      {/* ── Earning Tips ── */}
      <Card className="border-[#e5eefc] bg-[#f3f7ff]">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm font-semibold text-[#2563eb] mb-2">💡 Pro Tips to Earn More</p>
          {[
            'Post your referral link in WhatsApp groups',
            'Share on Facebook, Instagram Stories & TikTok',
            'Tell friends VideoLanka pays for views & likes',
            'The more they upload/watch, the more you both earn',
          ].map((tip, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <p className="text-xs text-[#374151]">{tip}</p>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}
