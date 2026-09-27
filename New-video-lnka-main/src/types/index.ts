// ===== VideoLanka Type Definitions =====

export interface UserKPIs {
  views: number;
  likes: number;
  comments: number;
  refs: number;
  balance: number;
}

export interface UserData {
  email: string;
  referralLink: string;
  kpis: UserKPIs;
  createdAt: unknown;
  // Profile fields
  displayName?: string;
  photoURL?: string;
  birthday?: string;
  city?: string;
  gender?: 'male' | 'female' | 'other' | '';
  bio?: string;
}

export interface VideoData {
  id: string;
  uid: string;
  title: string;
  url: string;
  type: string;
  likes: number;
  comments: number;
  views: number;
  createdAt: unknown;
}

export interface WithdrawRequest {
  uid: string;
  type: 'paypal' | 'bank' | 'binance' | 'oxapay';
  account: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: unknown;
}

export type TabName = 'home' | 'upload' | 'wallet' | 'profile' | 'admin';

export const EARNING_RATES = {
  VIEW:     0.5,
  LIKE:     2,
  COMMENT:  5,
  REFERRAL: 100,
} as const;

export const MIN_WITHDRAWAL = 500;
export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
