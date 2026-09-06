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
  createdAt: unknown; // Firestore timestamp
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

export interface VASTSettings {
  vastUrl: string;
  updatedBy: string;
  updatedAt: unknown;
}

export type TabName = 'dashboard' | 'upload' | 'refer' | 'wallet' | 'admin';

// Earning rates
export const EARNING_RATES = {
  VIEW: 0.5,
  LIKE: 2,
  COMMENT: 5,
  REFERRAL: 100,
} as const;

// Minimum withdrawal amount
export const MIN_WITHDRAWAL = 500;

// Admin email(s) - comma separated in env
export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@videolanka.com').split(',');
