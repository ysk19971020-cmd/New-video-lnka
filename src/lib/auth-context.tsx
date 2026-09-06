'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserData, UserKPIs, ADMIN_EMAILS } from '@/types';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAdmin: boolean;
  firestoreReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  updateKPIs: (updates: Partial<UserKPIs>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default user data when Firestore is unavailable
function getDefaultUserData(email: string, uid: string): UserData {
  return {
    email,
    referralLink: `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${uid}`,
    kpis: { views: 0, likes: 0, comments: 0, refs: 0, balance: 0 },
    createdAt: null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firestoreReady, setFirestoreReady] = useState(true);

  const fetchUserData = useCallback(async (uid: string, email: string) => {
    try {
      const uRef = doc(db, 'users', uid);
      const snap = await getDoc(uRef);
      if (snap.exists()) {
        setFirestoreReady(true);
        return snap.data() as UserData;
      }
      return null;
    } catch (err) {
      console.warn('Firestore fetch error, using defaults:', err);
      setFirestoreReady(false);
      return getDefaultUserData(email, uid);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (!user) return;
    const data = await fetchUserData(user.uid, user.email || '');
    setUserData(data);
  }, [user, fetchUserData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const data = await fetchUserData(firebaseUser.uid, firebaseUser.email || '');
        if (!data || !data.kpis) {
          // Create user profile if it doesn't exist
          const newUserData = getDefaultUserData(firebaseUser.email || '', firebaseUser.uid);
          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              ...newUserData,
              createdAt: serverTimestamp(),
            });
            setFirestoreReady(true);

            // Credit referrer if applicable
            const refFrom = localStorage.getItem('ref_from');
            if (refFrom && refFrom !== firebaseUser.uid) {
              try {
                await updateDoc(doc(db, 'users', refFrom), {
                  'kpis.refs': increment(1),
                  'kpis.balance': increment(100),
                });
              } catch (refErr) {
                console.warn('Referrer credit failed:', refErr);
              }
            }
          } catch (err) {
            console.warn('Firestore write error:', err);
            setFirestoreReady(false);
          }
          setUserData(newUserData);
        } else {
          setUserData(data);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserData]);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUserData(null);
  }, []);

  const updateKPIs = useCallback(async (updates: Partial<UserKPIs>) => {
    if (!user) return;
    try {
      const uRef = doc(db, 'users', user.uid);
      const updateObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        updateObj[`kpis.${key}`] = increment(value);
      }
      await updateDoc(uRef, updateObj);
      await refreshUserData();
    } catch (err) {
      console.warn('KPI update failed:', err);
      // Update locally even if Firestore fails
      setUserData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          kpis: {
            ...prev.kpis,
            ...Object.fromEntries(
              Object.entries(updates).map(([k, v]) => [k, (prev.kpis[k as keyof UserKPIs] || 0) + v])
            ),
          },
        };
      });
    }
  }, [user, refreshUserData]);

  const isAdmin = user ? ADMIN_EMAILS.includes(user.email || '') : false;

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAdmin, firestoreReady, login, register, logout, refreshUserData, updateKPIs }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
