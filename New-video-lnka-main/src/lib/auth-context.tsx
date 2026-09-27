'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged, User,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserData, UserKPIs, ADMIN_EMAILS } from '@/types';

interface AuthContextType {
  user:            User | null;
  userData:        UserData | null;
  loading:         boolean;
  isAdmin:         boolean;
  firestoreReady:  boolean;
  login:           (email: string, password: string) => Promise<void>;
  register:        (email: string, password: string) => Promise<void>;
  logout:          () => Promise<void>;
  refreshUserData: () => Promise<void>;
  updateKPIs:      (updates: Partial<UserKPIs>) => Promise<void>;
  updateProfile:   (data: Partial<UserData>) => Promise<void>;
  changeEmail:     (newEmail: string, currentPassword: string) => Promise<void>;
  changePassword:  (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getDefaultUserData(email: string, uid: string): UserData {
  return {
    email,
    referralLink: `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${uid}`,
    kpis:         { views: 0, likes: 0, comments: 0, refs: 0, balance: 0 },
    createdAt:    null,
    displayName:  '',
    photoURL:     '',
    birthday:     '',
    city:         '',
    gender:       '',
    bio:          '',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,           setUser]           = useState<User | null>(null);
  const [userData,       setUserData]       = useState<UserData | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [firestoreReady, setFirestoreReady] = useState(true);

  const fetchUserData = useCallback(async (uid: string, email: string): Promise<UserData | null> => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
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
        if (!data) {
          const newData = getDefaultUserData(firebaseUser.email || '', firebaseUser.uid);
          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), { ...newData, createdAt: serverTimestamp() });
            setFirestoreReady(true);

            // Credit referrer
            const refFrom = localStorage.getItem('ref_from');
            if (refFrom && refFrom !== firebaseUser.uid) {
              try {
                await updateDoc(doc(db, 'users', refFrom), {
                  'kpis.refs':    increment(1),
                  'kpis.balance': increment(100),
                });
                localStorage.removeItem('ref_from');
              } catch (e) {
                console.warn('Referral credit error:', e);
              }
            }
            setUserData(newData);
          } catch (e) {
            console.warn('Create user doc error:', e);
            setUserData(newData);
          }
        } else {
          setUserData(data);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchUserData]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateKPIs = async (updates: Partial<UserKPIs>) => {
    if (!user) return;
    const mapped: Record<string, number> = {};
    for (const [k, v] of Object.entries(updates)) {
      mapped[`kpis.${k}`] = v;
    }
    await updateDoc(doc(db, 'users', user.uid), mapped);
    await refreshUserData();
  };

  // Update profile fields in Firestore
  const updateProfile = async (data: Partial<UserData>) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), data as Record<string, unknown>);
    setUserData((prev) => prev ? { ...prev, ...data } : null);
  };

  // Change email (requires reauthentication)
  const changeEmail = async (newEmail: string, currentPassword: string) => {
    if (!user || !user.email) throw new Error('Not logged in');
    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
    await updateEmail(user, newEmail);
    await updateDoc(doc(db, 'users', user.uid), { email: newEmail });
    await refreshUserData();
  };

  // Change password (requires reauthentication)
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error('Not logged in');
    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, newPassword);
  };

  const isAdmin = ADMIN_EMAILS.includes(user?.email || '');

  return (
    <AuthContext.Provider value={{
      user, userData, loading, isAdmin, firestoreReady,
      login, register, logout,
      refreshUserData, updateKPIs,
      updateProfile, changeEmail, changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
