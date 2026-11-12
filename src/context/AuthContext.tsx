import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  deleteUser,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  auth,
  githubAuthProvider,
  googleAuthProvider,
  isFirebaseAuthorizedHost,
  popupRedirectResolver,
} from '../lib/firebase.ts';
import { StudentProfile } from '../types/examora.ts';
import { submitUserConsent } from '../services/api.ts';

interface AuthActionOutcome {
  ok: boolean;
  error?: string;
  code?: string;
  message?: string;
}

interface StoredVaultUser {
  profile: StudentProfile;
  passwordHash: string;
}

const VAULT_STORAGE_KEY = 'examora_users_vault_v1';
const ACTIVE_SESSION_KEY = 'examora_active_user_v1';
const EXPLICIT_SIGNOUT_KEY = 'examora_signed_out_v1';

export const DEFAULT_CONSENT_TEXT =
  'I agree to the Privacy Policy and consent to my data (name, email, uploaded photos) being used to provide plant diagnosis.';

function hashPasswordClient(password: string, email: string): string {
  const seed = `${email.toLowerCase().trim()}::${password}::examora-salt-v1`;
  let h1 = 0xdeadbeef ^ seed.length;
  let h2 = 0x41c6ce57 ^ seed.length;
  for (let i = 0, ch; i < seed.length; i++) {
    ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `v1:${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

function sanitizeProfileAvatar(profile: StudentProfile): StudentProfile {
  const rawAvatar = profile.avatarUrl;
  const validCustomAvatar =
    typeof rawAvatar === 'string' &&
    rawAvatar.startsWith('data:image/jpeg;base64,') &&
    !rawAvatar.includes('avatar_student_scholar')
      ? rawAvatar
      : null;
  return {
    ...profile,
    avatarUrl: validCustomAvatar,
  };
}

function loadUsersVault(): Record<string, StoredVaultUser> {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return {};
    const parsed: Record<string, StoredVaultUser> = JSON.parse(raw);
    const cleaned: Record<string, StoredVaultUser> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v && v.profile) {
        cleaned[k] = {
          ...v,
          profile: sanitizeProfileAvatar(v.profile),
        };
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

function saveUsersVault(vault: Record<string, StoredVaultUser>) {
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch {
    // Ignore storage quota errors
  }
}

function saveActiveSession(profile: StudentProfile | null, token: string | null) {
  try {
    if (!profile) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      localStorage.setItem(EXPLICIT_SIGNOUT_KEY, '1');
    } else {
      localStorage.removeItem(EXPLICIT_SIGNOUT_KEY);
      localStorage.setItem(
        ACTIVE_SESSION_KEY,
        JSON.stringify({ profile: sanitizeProfileAvatar(profile), token })
      );
    }
  } catch {
    // Ignore storage errors
  }
}

function loadActiveSession(): { profile: StudentProfile; token: string } | null {
  try {
    if (localStorage.getItem(EXPLICIT_SIGNOUT_KEY) === '1') {
      return null;
    }
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.profile && parsed.profile.uid) {
      return {
        profile: sanitizeProfileAvatar(parsed.profile),
        token: parsed.token,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export interface OAuthSignInOutcome {
  ok: boolean;
  needsAccountPrompt?: 'google' | 'github';
  verifiedEmail?: string;
  verifiedName?: string;
  firebaseToken?: string;
  firebaseUid?: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: StudentProfile | null;
  isDemoMode: boolean;
  loading: boolean;
  signingOut: boolean;
  authError: string | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  getSavedOAuthAccounts: () => Array<{ email: string; fullName: string }>;
  signInWithGoogle: () => Promise<OAuthSignInOutcome>;
  signInWithGitHub: () => Promise<OAuthSignInOutcome>;
  completeOAuthSignIn: (params: {
    provider: 'google' | 'github';
    email: string;
    fullName?: string;
    consentGiven: boolean;
    firebaseToken?: string;
    firebaseUid?: string;
  }) => Promise<AuthActionOutcome>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialSession = loadActiveSession();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(initialSession?.profile || null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(!initialSession);
  const [signingOut, setSigningOut] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [inMemoryToken, setInMemoryToken] = useState<string | null>(initialSession?.token || null);

  // Refs to prevent stale async auth callbacks from re-authenticating after signOut or before consent
  const sessionEpochRef = useRef<number>(0);
  const signingOutRef = useRef<boolean>(false);
  const oauthFlowPendingRef = useRef<boolean>(false);
  const inMemoryTokenRef = useRef<string | null>(initialSession?.token || null);

  useEffect(() => {
    inMemoryTokenRef.current = inMemoryToken;
  }, [inMemoryToken]);

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

  const applyAuthenticatedProfile = (userProfile: StudentProfile, token: string, epoch?: number) => {
    if (signingOutRef.current) return;
    if (epoch !== undefined && epoch !== sessionEpochRef.current) return;
    const cleaned = sanitizeProfileAvatar(userProfile);
    setProfile(cleaned);
    setInMemoryToken(token);
    inMemoryTokenRef.current = token;
    saveActiveSession(cleaned, token);
  };

  const getSavedOAuthAccounts = (): Array<{ email: string; fullName: string }> => {
    const vault = loadUsersVault();
    return Object.values(vault)
      .filter((entry) => entry?.profile?.email && entry.profile.email !== 'scholar@examora.edu')
      .map((entry) => ({
        email: entry.profile.email,
        fullName: entry.profile.fullName || entry.profile.email.split('@')[0],
      }));
  };

  const syncUserWithBackend = async (
    token: string,
    fallbackInfo: {
      uid: string;
      email: string;
      fullName: string;
      avatarUrl?: string;
      consentGiven?: boolean;
    },
    epoch = sessionEpochRef.current
  ) => {
    const cleanEmail = fallbackInfo.email.trim().toLowerCase();
    try {
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: fallbackInfo.fullName,
          consentGiven: fallbackInfo.consentGiven ?? true,
          consentTextVersion: 'DPDP-2023-v1.0',
          consentText: DEFAULT_CONSENT_TEXT,
        }),
      });

      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const data = await res.json();
        const syncedUser = sanitizeProfileAvatar(data.user);
        const vault = loadUsersVault();
        vault[cleanEmail] = {
          profile: syncedUser,
          passwordHash:
            vault[cleanEmail]?.passwordHash || hashPasswordClient('oauth-account', cleanEmail),
        };
        saveUsersVault(vault);
        applyAuthenticatedProfile(syncedUser, token, epoch);
        return;
      }
    } catch {
      // Fall back to local vault if deployed on static hosting (e.g. Vercel)
    }

    const vault = loadUsersVault();
    const existing = vault[cleanEmail];
    const resolvedProfile: StudentProfile = sanitizeProfileAvatar(
      existing?.profile
        ? {
            ...existing.profile,
            fullName: fallbackInfo.fullName || existing.profile.fullName,
          }
        : {
            id: fallbackInfo.uid,
            uid: fallbackInfo.uid,
            email: cleanEmail,
            fullName: fallbackInfo.fullName,
            avatarUrl: null,
            academicLevel: 'University / Undergraduate',
            targetGoal: 'Honors Mastery',
            preferredDifficulty: 'Medium',
          }
    );
    vault[cleanEmail] = {
      profile: resolvedProfile,
      passwordHash: existing?.passwordHash || hashPasswordClient('oauth-account', cleanEmail),
    };
    saveUsersVault(vault);
    if (fallbackInfo.consentGiven) {
      await submitUserConsent(token, true, 'DPDP-2023-v1.0', DEFAULT_CONSENT_TEXT).catch(() => {});
    }
    applyAuthenticatedProfile(resolvedProfile, token, epoch);
  };

  useEffect(() => {
    let mounted = true;
    const mountEpoch = sessionEpochRef.current;

    // Handle any pending OAuth redirect flow cleanly without blank page or navigation errors
    if (isFirebaseAuthorizedHost()) {
      getRedirectResult(auth)
        .then(async (result) => {
          if (!mounted || !result?.user || signingOutRef.current) return;
          setFirebaseUser(result.user);
          const token = await result.user.getIdToken();
          await syncUserWithBackend(
            token,
            {
              uid: result.user.uid,
              email: result.user.email || 'scholar@examora.edu',
              fullName:
                result.user.displayName || result.user.email?.split('@')[0] || 'Scholar',
              consentGiven: true,
            },
            mountEpoch
          );
        })
        .catch(() => {
          // Ignore redirect errors if no redirect was initiated
        });
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted || signingOutRef.current || oauthFlowPendingRef.current) {
        if (mounted) setLoading(false);
        return;
      }

      // If user explicitly signed out, ensure stale cached Firebase session is cleared
      if (localStorage.getItem(EXPLICIT_SIGNOUT_KEY) === '1') {
        if (user) {
          await firebaseSignOut(auth).catch(() => {});
        }
        if (mounted) setLoading(false);
        return;
      }

      if (user) {
        const currentEpoch = sessionEpochRef.current;
        setIsDemoMode(false);
        setFirebaseUser(user);
        const token = await user.getIdToken();
        await syncUserWithBackend(
          token,
          {
            uid: user.uid,
            email: user.email || 'scholar@examora.edu',
            fullName: user.displayName || user.email?.split('@')[0] || 'Scholar',
            consentGiven: true,
          },
          currentEpoch
        );
      } else if (!inMemoryTokenRef.current) {
        setFirebaseUser(null);
        setProfile(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const getValidIdToken = async (): Promise<string | null> => {
    if (firebaseUser) {
      return await firebaseUser.getIdToken();
    }
    return inMemoryToken;
  };

  const loginWithPassword = async (email: string, password: string): Promise<AuthActionOutcome> => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();
    const myEpoch = ++sessionEpochRef.current;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (isJson) {
        const data = await res.json();
        if (!res.ok) {
          return {
            ok: false,
            error: data.error || 'Please enter the correct password',
            code: data.code || 'INVALID_PASSWORD',
          };
        }
        setIsDemoMode(false);
        const vault = loadUsersVault();
        vault[cleanEmail] = {
          profile: data.user,
          passwordHash: hashPasswordClient(password, cleanEmail),
        };
        saveUsersVault(vault);
        applyAuthenticatedProfile(data.user, data.sessionToken, myEpoch);
        return { ok: true };
      }
    } catch {
      // Static host (e.g. Vercel) fallback below
    }

    const vault = loadUsersVault();
    const record = vault[cleanEmail];
    if (!record) {
      const uid = `scholar-${cleanEmail.replace(/[^a-z0-9]/g, '')}`;
      const derivedName =
        cleanEmail
          .split('@')[0]
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()) || 'Scholar';
      const newProfile: StudentProfile = {
        id: uid,
        uid,
        email: cleanEmail,
        fullName: derivedName,
        avatarUrl: null,
        academicLevel: 'University / Undergraduate',
        targetGoal: 'Honors Mastery',
        preferredDifficulty: 'Medium',
      };
      vault[cleanEmail] = {
        profile: newProfile,
        passwordHash: hashPasswordClient(password, cleanEmail),
      };
      saveUsersVault(vault);
      const sessionToken = `scholar-session:${uid}:${cleanEmail}:${encodeURIComponent(derivedName)}`;
      setIsDemoMode(false);
      await submitUserConsent(sessionToken, true, 'DPDP-2023-v1.0', DEFAULT_CONSENT_TEXT).catch(
        () => {}
      );
      applyAuthenticatedProfile(newProfile, sessionToken, myEpoch);
      return { ok: true };
    }

    const expectedHash = hashPasswordClient(password, cleanEmail);
    if (record.passwordHash !== expectedHash) {
      return {
        ok: false,
        error: 'Please enter the correct password',
        code: 'INVALID_PASSWORD',
      };
    }

    const sessionToken = `scholar-session:${record.profile.uid}:${record.profile.email}:${encodeURIComponent(
      record.profile.fullName
    )}`;
    setIsDemoMode(false);
    applyAuthenticatedProfile(record.profile, sessionToken, myEpoch);
    return { ok: true };
  };

  const registerWithPassword = async (params: {
    email: string;
    password: string;
    fullName: string;
    consentGiven: boolean;
  }): Promise<AuthActionOutcome> => {
    setAuthError(null);
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.fullName.trim() || cleanEmail.split('@')[0] || 'Scholar';
    const uid = `scholar-${cleanEmail.replace(/[^a-z0-9]/g, '')}`;
    const myEpoch = ++sessionEpochRef.current;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: params.password,
          fullName: cleanName,
          consentGiven: params.consentGiven,
          consentTextVersion: 'DPDP-2023-v1.0',
          consentText: DEFAULT_CONSENT_TEXT,
        }),
      });

      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (isJson) {
        const data = await res.json();
        if (!res.ok) {
          return {
            ok: false,
            error: data.error || 'Failed to create account.',
            code: data.code || 'REGISTER_ERROR',
          };
        }
        const vault = loadUsersVault();
        vault[cleanEmail] = {
          profile: data.user,
          passwordHash: hashPasswordClient(params.password, cleanEmail),
        };
        saveUsersVault(vault);
        setIsDemoMode(false);
        applyAuthenticatedProfile(data.user, data.sessionToken, myEpoch);
        return { ok: true };
      }
    } catch {
      // Static host (e.g. Vercel) fallback below
    }

    const vault = loadUsersVault();
    if (vault[cleanEmail]) {
      return {
        ok: false,
        error:
          'An account with this email already exists. Please switch to "Sign In" and enter your password.',
        code: 'EMAIL_EXISTS',
      };
    }

    const newProfile: StudentProfile = {
      id: uid,
      uid,
      email: cleanEmail,
      fullName: cleanName,
      avatarUrl: null,
      academicLevel: 'University / Undergraduate',
      targetGoal: 'Honors Mastery',
      preferredDifficulty: 'Medium',
    };

    vault[cleanEmail] = {
      profile: newProfile,
      passwordHash: hashPasswordClient(params.password, cleanEmail),
    };
    saveUsersVault(vault);

    const sessionToken = `scholar-session:${uid}:${cleanEmail}:${encodeURIComponent(cleanName)}`;
    setIsDemoMode(false);
    await submitUserConsent(
      sessionToken,
      params.consentGiven,
      'DPDP-2023-v1.0',
      DEFAULT_CONSENT_TEXT
    ).catch(() => {});
    applyAuthenticatedProfile(newProfile, sessionToken, myEpoch);
    return { ok: true };
  };

  const resetPassword = async (email: string, newPassword: string): Promise<AuthActionOutcome> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, newPassword }),
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (isJson) {
        const data = await res.json();
        if (!res.ok) {
          return {
            ok: false,
            error: data.error || 'Could not reset password.',
            code: data.code,
          };
        }
        const vault = loadUsersVault();
        if (vault[cleanEmail]) {
          vault[cleanEmail].passwordHash = hashPasswordClient(newPassword, cleanEmail);
          saveUsersVault(vault);
        }
        return { ok: true, message: data.message };
      }
    } catch {
      // Fallback to local vault
    }

    const vault = loadUsersVault();
    if (!vault[cleanEmail]) {
      return { ok: false, error: 'No account found with this email address.' };
    }
    vault[cleanEmail].passwordHash = hashPasswordClient(newPassword, cleanEmail);
    saveUsersVault(vault);
    return { ok: true, message: 'Your password has been updated. You may now sign in.' };
  };

  const updateProfileInfo = async (updates: Partial<StudentProfile>): Promise<AuthActionOutcome> => {
    const updatedLocal: StudentProfile | null = profile
      ? {
          ...profile,
          ...updates,
        }
      : null;

    if (updatedLocal) {
      const vault = loadUsersVault();
      const emailKey = updatedLocal.email.toLowerCase();
      if (vault[emailKey]) {
        vault[emailKey].profile = updatedLocal;
        saveUsersVault(vault);
      }
      saveActiveSession(updatedLocal, inMemoryToken);
      setProfile(updatedLocal);
    }

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
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const data = await res.json();
        const merged = { ...(updatedLocal || {}), ...data.user } as StudentProfile;
        saveActiveSession(merged, inMemoryToken);
        setProfile(merged);
      }
    } catch {
      // Local vault already updated above
    }

    return { ok: true, message: 'Personal information updated.' };
  };

  const signInWithCredentials = async (
    email: string,
    fullName?: string,
    consentGiven = true
  ) => {
    setAuthError(null);
    const myEpoch = ++sessionEpochRef.current;
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
      await syncUserWithBackend(
        sessionToken,
        {
          uid,
          email: cleanEmail,
          fullName: cleanName,
          consentGiven,
        },
        myEpoch
      );
    } finally {
      setLoading(false);
    }
  };

  const completeOAuthSignIn = async (params: {
    provider: 'google' | 'github';
    email: string;
    fullName?: string;
    consentGiven: boolean;
    firebaseToken?: string;
    firebaseUid?: string;
  }): Promise<AuthActionOutcome> => {
    if (!params.consentGiven) {
      return {
        ok: false,
        error:
          'Consent Required: Please agree to the Privacy Policy (DPDP Act 2023) to continue.',
      };
    }

    const cleanEmail = params.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return {
        ok: false,
        error: 'Please enter a valid email address.',
      };
    }

    const cleanName =
      (params.fullName && params.fullName.trim()) ||
      cleanEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase()) ||
      'Scholar';

    const myEpoch = ++sessionEpochRef.current;
    oauthFlowPendingRef.current = false;
    setIsDemoMode(false);

    if (params.firebaseToken && params.firebaseUid) {
      await syncUserWithBackend(
        params.firebaseToken,
        {
          uid: params.firebaseUid,
          email: cleanEmail,
          fullName: cleanName,
          consentGiven: true,
        },
        myEpoch
      );
      return { ok: true };
    }

    const uid = `scholar-${cleanEmail.replace(/[^a-z0-9]/g, '')}`;
    const sessionToken = `scholar-session:${uid}:${cleanEmail}:${encodeURIComponent(cleanName)}`;
    await syncUserWithBackend(
      sessionToken,
      {
        uid,
        email: cleanEmail,
        fullName: cleanName,
        consentGiven: true,
      },
      myEpoch
    );
    return { ok: true };
  };

  const signInWithGoogle = async (): Promise<OAuthSignInOutcome> => {
    setAuthError(null);
    if (isFirebaseAuthorizedHost()) {
      try {
        oauthFlowPendingRef.current = true;
        const cred = await signInWithPopup(auth, googleAuthProvider, popupRedirectResolver);
        setFirebaseUser(cred.user);
        const token = await cred.user.getIdToken();
        return {
          ok: false,
          needsAccountPrompt: 'google',
          verifiedEmail: cred.user.email || '',
          verifiedName: cred.user.displayName || cred.user.email?.split('@')[0] || '',
          firebaseToken: token,
          firebaseUid: cred.user.uid,
        };
      } catch {
        oauthFlowPendingRef.current = false;
      }
    }
    return { ok: false, needsAccountPrompt: 'google' };
  };

  const signInWithGitHub = async (): Promise<OAuthSignInOutcome> => {
    setAuthError(null);
    if (isFirebaseAuthorizedHost()) {
      try {
        oauthFlowPendingRef.current = true;
        const cred = await signInWithPopup(auth, githubAuthProvider, popupRedirectResolver);
        setFirebaseUser(cred.user);
        const token = await cred.user.getIdToken();
        return {
          ok: false,
          needsAccountPrompt: 'github',
          verifiedEmail: cred.user.email || '',
          verifiedName: cred.user.displayName || cred.user.email?.split('@')[0] || '',
          firebaseToken: token,
          firebaseUid: cred.user.uid,
        };
      } catch {
        oauthFlowPendingRef.current = false;
      }
    }
    return { ok: false, needsAccountPrompt: 'github' };
  };

  const enterDemoScholarMode = (consentGiven = true) => {
    setAuthError(null);
    signInWithCredentials('scholar@examora.edu', 'Guest Scholar', consentGiven);
  };

  const signOut = async () => {
    if (signingOutRef.current) return;
    sessionEpochRef.current += 1;
    signingOutRef.current = true;
    setSigningOut(true);
    oauthFlowPendingRef.current = false;

    // Immediately clear all session state synchronously on the first click
    saveActiveSession(null, null);
    inMemoryTokenRef.current = null;
    setIsDemoMode(false);
    setFirebaseUser(null);
    setProfile(null);
    setInMemoryToken(null);
    setAuthError(null);

    try {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      // Ignore history errors
    }

    try {
      await firebaseSignOut(auth);
    } catch {
      // Ignore Firebase sign-out errors
    } finally {
      signingOutRef.current = false;
      setSigningOut(false);
    }
  };

  const deleteCurrentUserAccount = async () => {
    sessionEpochRef.current += 1;
    signingOutRef.current = true;
    setSigningOut(true);
    oauthFlowPendingRef.current = false;

    if (profile?.email) {
      const vault = loadUsersVault();
      delete vault[profile.email.toLowerCase()];
      saveUsersVault(vault);
    }
    saveActiveSession(null, null);
    inMemoryTokenRef.current = null;
    setIsDemoMode(false);
    setFirebaseUser(null);
    setProfile(null);
    setInMemoryToken(null);
    setAuthError(null);

    try {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      // Ignore history errors
    }

    try {
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
    } catch {
      await firebaseSignOut(auth).catch(() => {});
    } finally {
      signingOutRef.current = false;
      setSigningOut(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        isDemoMode,
        loading,
        signingOut,
        authError,
        theme,
        toggleTheme,
        getSavedOAuthAccounts,
        signInWithGoogle,
        signInWithGitHub,
        completeOAuthSignIn,
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
