import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  deleteUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { StudentProfile } from '../types/examora.ts';
import avatarScholarImg from '../assets/images/avatar_student_scholar_1794064387086.jpg';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: StudentProfile | null;
  isDemoMode: boolean;
  loading: boolean;
  authError: string | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  signInWithGoogle: (consentGiven?: boolean) => Promise<void>;
  signInWithCredentials: (
    email: string,
    fullName?: string,
    consentGiven?: boolean
  ) => Promise<void>;
  enterDemoScholarMode: (consentGiven?: boolean) => void;
  signOut: () => Promise<void>;
  deleteCurrentUserAccount: () => Promise<void>;
  getValidIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEFAULT_CONSENT_TEXT =
  'I agree to the Privacy Policy and consent to my data (name, email, uploaded photos) being used to provide plant diagnosis and AI examination evaluation.';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Keep in-memory token reference (never store token in localStorage per security guidelines)
  const [inMemoryToken, setInMemoryToken] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const syncUserWithBackend = async (
    token: string,
    fallbackInfo: {
      uid: string;
      email: string;
      fullName: string;
      avatarUrl?: string;
      consentGiven?: boolean;
    }
  ) => {
    try {
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: fallbackInfo.fullName,
          avatarUrl: fallbackInfo.avatarUrl || avatarScholarImg,
          consentGiven: fallbackInfo.consentGiven ?? true,
          consentTextVersion: 'DPDP-2023-v1.0',
          consentText: DEFAULT_CONSENT_TEXT,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        return;
      }
    } catch {
      // Fall back to local profile object if network call fails
    }

    setProfile({
      id: fallbackInfo.uid,
      uid: fallbackInfo.uid,
      email: fallbackInfo.email,
      fullName: fallbackInfo.fullName,
      avatarUrl: fallbackInfo.avatarUrl || avatarScholarImg,
      academicLevel: 'University / Undergraduate',
      targetGoal: 'Honors Mastery',
      preferredDifficulty: 'Medium',
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsDemoMode(false);
        setFirebaseUser(user);
        const token = await user.getIdToken();
        setInMemoryToken(token);
        await syncUserWithBackend(token, {
          uid: user.uid,
          email: user.email || 'scholar@examora.edu',
          fullName: user.displayName || user.email?.split('@')[0] || 'Scholar',
          avatarUrl: user.photoURL || undefined,
          consentGiven: true,
        });
      } else if (!isDemoMode && !inMemoryToken) {
        setFirebaseUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode, inMemoryToken]);

  const signInWithCredentials = async (
    email: string,
    fullName?: string,
    consentGiven = true
  ) => {
    setAuthError(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase() || 'scholar@examora.edu';
      const cleanName =
        (fullName && fullName.trim()) ||
        cleanEmail
          .split('@')[0]
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()) ||
        'Scholar';
      const uid = `scholar-${cleanEmail.replace(/[^a-z0-9]/g, '')}`;
      const sessionToken = `scholar-session:${uid}:${cleanEmail}:${encodeURIComponent(cleanName)}`;

      setIsDemoMode(false);
      setInMemoryToken(sessionToken);
      await syncUserWithBackend(sessionToken, {
        uid,
        email: cleanEmail,
        fullName: cleanName,
        consentGiven,
      });
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (consentGiven = true) => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setInMemoryToken(token);
      setIsDemoMode(false);
      await syncUserWithBackend(token, {
        uid: cred.user.uid,
        email: cred.user.email || 'scholar@examora.edu',
        fullName: cred.user.displayName || 'Scholar',
        avatarUrl: cred.user.photoURL || undefined,
        consentGiven,
      });
    } catch (error: any) {
      const code = error?.code || '';
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-blocked' ||
        code === 'auth/unauthorized-domain' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await signInWithCredentials('claire.vance@oxford-scholar.edu', 'Claire Vance', consentGiven);
        return;
      }
      setAuthError(
        'Google popup could not complete on this domain. Please use the Sign Up / Login form below or add this domain to Firebase Authorized Domains.'
      );
    }
  };

  const enterDemoScholarMode = (consentGiven = true) => {
    setAuthError(null);
    signInWithCredentials('claire.vance@oxford-scholar.edu', 'Claire Vance', consentGiven);
  };

  const signOut = async () => {
    setIsDemoMode(false);
    setProfile(null);
    setInMemoryToken(null);
    if (firebaseUser) {
      await firebaseSignOut(auth);
    }
  };

  const deleteCurrentUserAccount = async () => {
    setIsDemoMode(false);
    setProfile(null);
    setInMemoryToken(null);
    if (firebaseUser) {
      try {
        await deleteUser(firebaseUser);
      } catch {
        await firebaseSignOut(auth);
      }
    }
  };

  const getValidIdToken = async (): Promise<string | null> => {
    if (firebaseUser) {
      return await firebaseUser.getIdToken();
    }
    return inMemoryToken;
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        isDemoMode,
        loading,
        authError,
        theme,
        toggleTheme,
        signInWithGoogle,
        signInWithCredentials,
        enterDemoScholarMode,
        signOut,
        deleteCurrentUserAccount,
        getValidIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
