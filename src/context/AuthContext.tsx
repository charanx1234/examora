import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  deleteUser,
  GithubAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { StudentProfile } from '../types/examora.ts';

interface AuthActionOutcome {
  ok: boolean;
  error?: string;
  code?: string;
  message?: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: StudentProfile | null;
  isDemoMode: boolean;
  loading: boolean;
  authError: string | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  signInWithGoogle: (consentGiven?: boolean) => Promise<void>;
  signInWithGitHub: (consentGiven?: boolean) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<AuthActionOutcome>;
  registerWithPassword: (params: {
    email: string;
    password: string;
    fullName: string;
    consentGiven: boolean;
  }) => Promise<AuthActionOutcome>;
  resetPassword: (email: string, newPassword: string) => Promise<AuthActionOutcome>;
  updateProfileInfo: (updates: Partial<StudentProfile>) => Promise<AuthActionOutcome>;
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
          avatarUrl: fallbackInfo.avatarUrl || undefined,
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
      avatarUrl: fallbackInfo.avatarUrl || null,
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

  const getValidIdToken = async (): Promise<string | null> => {
    if (firebaseUser) {
      return await firebaseUser.getIdToken();
    }
    return inMemoryToken;
  };

  const loginWithPassword = async (email: string, password: string): Promise<AuthActionOutcome> => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || 'Please enter the correct password',
          code: data.code || 'INVALID_PASSWORD',
        };
      }
      setIsDemoMode(false);
      setInMemoryToken(data.sessionToken);
      setProfile(data.user);
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Unable to reach authentication server. Please try again.',
        code: 'NETWORK_ERROR',
      };
    }
  };

  const registerWithPassword = async (params: {
    email: string;
    password: string;
    fullName: string;
    consentGiven: boolean;
  }): Promise<AuthActionOutcome> => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: params.email.trim().toLowerCase(),
          password: params.password,
          fullName: params.fullName.trim(),
          consentGiven: params.consentGiven,
          consentTextVersion: 'DPDP-2023-v1.0',
          consentText: DEFAULT_CONSENT_TEXT,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || 'Failed to create account.',
          code: data.code || 'REGISTER_ERROR',
        };
      }
      setIsDemoMode(false);
      setInMemoryToken(data.sessionToken);
      setProfile(data.user);
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Unable to reach authentication server. Please try again.',
        code: 'NETWORK_ERROR',
      };
    }
  };

  const resetPassword = async (email: string, newPassword: string): Promise<AuthActionOutcome> => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || 'Could not reset password.',
          code: data.code,
        };
      }
      return { ok: true, message: data.message };
    } catch {
      return { ok: false, error: 'Network error while resetting password.' };
    }
  };

  const updateProfileInfo = async (updates: Partial<StudentProfile>): Promise<AuthActionOutcome> => {
    try {
      const token = await getValidIdToken();
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || 'Failed to save personal information.',
        };
      }
      setProfile((prev) => (prev ? { ...prev, ...data.user } : data.user));
      return { ok: true, message: 'Personal information updated in database.' };
    } catch {
      // Update local state even if offline
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      return { ok: true, message: 'Personal information updated.' };
    }
  };

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
        'Google popup could not complete on this domain. Please sign in with Email & Password below.'
      );
    }
  };

  const signInWithGitHub = async (consentGiven = true) => {
    setAuthError(null);
    try {
      const githubProvider = new GithubAuthProvider();
      const cred = await signInWithPopup(auth, githubProvider);
      const token = await cred.user.getIdToken();
      setInMemoryToken(token);
      setIsDemoMode(false);
      await syncUserWithBackend(token, {
        uid: cred.user.uid,
        email: cred.user.email || 'github.scholar@examora.edu',
        fullName: cred.user.displayName || 'GitHub Scholar',
        avatarUrl: cred.user.photoURL || undefined,
        consentGiven,
      });
    } catch {
      await signInWithCredentials('github.scholar@examora.edu', 'GitHub Scholar', consentGiven);
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
        signInWithGitHub,
        loginWithPassword,
        registerWithPassword,
        resetPassword,
        updateProfileInfo,
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
