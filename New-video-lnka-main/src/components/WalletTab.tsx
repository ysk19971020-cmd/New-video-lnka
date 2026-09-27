'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EARNING_RATES, MIN_WITHDRAWAL } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Wallet, ArrowUpRight, Loader2, Coins, CreditCard, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletTab() {
  const { user, userData, refreshUserData } = useAuth();
  const [wdType, setWdType] = useState<string>('paypal');
  const [wdAccount, setWdAccount] = useState('');
  const [wdAmount, setWdAmount] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);

  const kpis = userData?.kpis || { views: 0, likes: 0, comments: 0, refs: 0, balance: 0 };

  // Withdraw request
  const handleWithdraw = async () => {
    if (!user || !wdAccount.trim()) {
      toast.error('Enter account/email/ID');
      return;
    }

    const amount = wdAmount ? parseFloat(wdAmount) : kpis.balance;
    if (isNaN(amount) || amount < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is Rs.${MIN_WITHDRAWAL}`);
      return;
    }
    if (amount > kpis.balance) {
      toast.error('Insufficient balance');
      return;
    }

    setWithdrawing(true);
    try {
      await addDoc(collection(db, 'withdraw_requests'), {
        uid: user.uid,
        type: wdType,
        account: wdAccount.trim(),
        amount,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Withdrawal request sent!');
      setWdAccount('');
      setWdAmount('');
      await refreshUserData();
    } catch (err) {
      console.error('Withdraw error:', err);
      toast.error('Withdrawal request failed');
    } finally {
      setWithdrawing(false);
    }
  };

  // Oxapay top-up
  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setTopUpLoading(true);
    try {
      const res = await fetch('/api/oxapay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'LKR',
          email: user?.email,
          uid: user?.uid,
        }),
      });

      const data = await res.json();
      if (data.paymentLink) {
        window.open(data.paymentLink, '_blank');
        toast.success('Payment page opened! Complete the payment to top up.');
      } else {
        toast.error(data.error || 'Failed to create payment');
      }
    } catch (err) {
      console.error('Top-up error:', err);
      toast.error('Top-up request failed');
    } finally {
      setTopUpLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Balance Overview */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-[#2563eb] to-[#1e40af] rounded-xl p-4 text-white">
            <p className="text-sm opacity-80">Current Balance</p>
            <p className="text-3xl font-bold mt-1">Rs. {kpis.balance.toFixed(2)}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="text-center p-2 bg-[#f3f7ff] rounded-lg">
              <p className="text-xs text-[#64748b]">Views Earned</p>
              <p className="font-semibold">Rs. {(kpis.views * EARNING_RATES.VIEW).toFixed(2)}</p>
            </div>
            <div className="text-center p-2 bg-[#f3f7ff] rounded-lg">
              <p className="text-xs text-[#64748b]">Likes Earned</p>
              <p className="font-semibold">Rs. {(kpis.likes * EARNING_RATES.LIKE).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Oxapay Top-up */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Top Up via Crypto (Oxapay)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[#64748b]">
            Add funds to your wallet using cryptocurrency via Oxapay.
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Amount (LKR)"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              className="border-[#e5eefc]"
              min="1"
            />
            <Button
              onClick={handleTopUp}
              disabled={topUpLoading}
              className="bg-[#2563eb] hover:bg-[#1e40af] text-white whitespace-nowrap"
            >
              {topUpLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Top Up'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Withdraw */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" />
            Withdraw
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[#64748b]">
            Rates: View Rs.{EARNING_RATES.VIEW} • Like Rs.{EARNING_RATES.LIKE} • Comment Rs.{EARNING_RATES.COMMENT} • Referral Rs.{EARNING_RATES.REFERRAL}
          </p>
          <Separator />
          <div className="grid gap-3">
            <Select value={wdType} onValueChange={setWdType}>
              <SelectTrigger className="border-[#e5eefc]">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paypal">
                  <span className="flex items-center gap-2"><CreditCard className="h-3 w-3" /> PayPal</span>
                </SelectItem>
                <SelectItem value="bank">
                  <span className="flex items-center gap-2"><Building2 className="h-3 w-3" /> Bank Transfer</span>
                </SelectItem>
                <SelectItem value="binance">
                  <span className="flex items-center gap-2"><Coins className="h-3 w-3" /> Binance Pay</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="PayPal email / Bank acc / Binance ID"
              value={wdAccount}
              onChange={(e) => setWdAccount(e.target.value)}
              className="border-[#e5eefc]"
            />
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={`Amount (min Rs.${MIN_WITHDRAWAL})`}
                value={wdAmount}
                onChange={(e) => setWdAmount(e.target.value)}
                className="border-[#e5eefc]"
              />
              <Button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="bg-[#2563eb] hover:bg-[#1e40af] text-white whitespace-nowrap"
              >
                {withdrawing ? <Loader2 className="animate-spin h-4 w-4" /> : 'Request'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
