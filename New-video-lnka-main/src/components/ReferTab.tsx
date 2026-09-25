'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Copy, Gift } from 'lucide-react';
import { toast } from 'sonner';

export default function ReferTab() {
  const { userData } = useAuth();

  const copyLink = () => {
    if (userData?.referralLink) {
      navigator.clipboard.writeText(userData.referralLink);
      toast.success('Referral link copied!');
    }
  };

  return (
    <Card className="border-[#e5eefc]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Refer & Earn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Earn Rs.100 per referral!</p>
              <p className="text-sm text-green-600">Share your link. Each successful registration gives Rs.100.</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm text-[#64748b] mb-1">Your Referral Link</p>
          <div className="flex gap-2">
            <Input
              value={userData?.referralLink || ''}
              readOnly
              className="flex-1 bg-white border-[#e5eefc] text-sm"
            />
            <Button variant="outline" onClick={copyLink} className="border-[#e5eefc]">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </div>

        <div className="bg-[#f3f7ff] border border-[#e5eefc] rounded-xl p-4">
          <p className="text-sm text-[#64748b]">
            <strong>How it works:</strong>
          </p>
          <ol className="text-sm text-[#64748b] list-decimal list-inside mt-2 space-y-1">
            <li>Copy your unique referral link above</li>
            <li>Share it with friends and family</li>
            <li>When they register using your link, you earn Rs.100</li>
            <li>Earnings are added to your wallet instantly</li>
            <li>Withdraw your earnings anytime (min Rs.500)</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
