import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { ButtonLoader } from '../components/feedback/LoadingSystem.tsx';
import { mapErrorToUserMessage } from '../utils/errorHandler.ts';

interface LoginPageProps {
  initialMode?: 'login' | 'signup';
  onBackToOverview?: () => void;
  onOpenPrivacyPolicy: () => void;
}

interface IntegrationNode {
  id: string;
  title: string;
  role: string;
  description: string;
  variant: 'light' | 'dark' | 'center';
}

const INTEGRATION_NODES: IntegrationNode[] = [
  {
    id: 'curriculum',
    title: 'Curriculum & Notes Parser',
    role: 'Ingestion Layer',
    description:
      'Extracts chapters, syllabus hierarchies, and testable concepts from PDF, DOCX, PPT, and study notes.',
    variant: 'light',
  },
  {
    id: 'rubric',
    title: 'Rubric Calibration Engine',
    role: 'Grading Standard',
    description:
      'Builds multi-step university marking schemes with deterministic partial-credit allocation.',
    variant: 'dark',
  },
  {
    id: 'timed-studio',
    title: 'ExamLab Timed Studio',
    role: 'Assessment Player',
    description:
      'Distraction-free countdown examination player with question palette and auto-save persistence.',
    variant: 'light',
  },
  {
    id: 'adaptive',
    title: 'Adaptive Mastery Engine',
    role: 'Longitudinal Tracking',
    description:
      'Tracks accuracy across every subtopic and synthesizes targeted revision question papers.',
    variant: 'dark',
  },
  {
    id: 'examora-hub',
    title: 'EXAMORA Core Platform',
    role: 'Central Intelligence Hub',
    description:
      'Unifies AI question synthesis, timed examination delivery, PostgreSQL credential vault, and rubric evaluation.',
    variant: 'center',
  },
  {
    id: 'sandbox',
    title: 'Code & Math Sandbox',
    role: 'Multi-Modal Input',
    description:
      'Supports coding test-case verification, LaTeX mathematical derivations, and handwritten scan grading.',
    variant: 'dark',
  },
  {
    id: 'gemini',
    title: 'Gemini Structured AI',
    role: 'AI Examiner Provider',
    description:
      'Generates schema-validated MCQ distractors, descriptive prompts, and rubric-guided evaluations.',
    variant: 'light',
  },
  {
    id: 'database',
    title: 'PostgreSQL & Supabase Vault',
    role: 'Persistent Relational DB',
    description:
      'Stores user profiles, scrypt-salted password hashes, DPDP consent ledgers, exams, and transcripts.',
    variant: 'dark',
  },
  {
    id: 'privacy',
    title: 'DPDP 2023 Privacy Shield',
    role: 'Data Governance',
    description:
      'Enforces explicit signup consent, one-click JSON data portability, and complete account erasure.',
    variant: 'light',
  },
];

export function LoginPage({
  initialMode = 'login',
  onBackToOverview,
  onOpenPrivacyPolicy,
}: LoginPageProps) {
  const {
    loginWithPassword,
    registerWithPassword,
    resetPassword,
    getSavedOAuthAccounts,
    signInWithGoogle,
    signInWithGitHub,
    completeOAuthSignIn,
    authError,
    theme,
    toggleTheme,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Mandatory unchecked DPDP Act 2023 consent checkbox for new signups
  const [consentChecked, setConsentChecked] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [showTroubleHelper, setShowTroubleHelper] = useState(false);

  // Google / GitHub OAuth Verification & DPDP Act 2023 Privacy Policy Consent Popup State
  const [oauthPromptProvider, setOauthPromptProvider] = useState<'google' | 'github' | null>(null);
  const [oauthStep, setOauthStep] = useState<'account' | 'consent'>('account');
  const [oauthUseCustomAccount, setOauthUseCustomAccount] = useState(false);
  const [oauthEmail, setOauthEmail] = useState('');
  const [oauthName, setOauthName] = useState('');
  const [oauthConsentChecked, setOauthConsentChecked] = useState(false);
  const [oauthFirebaseToken, setOauthFirebaseToken] = useState<string | undefined>(undefined);
  const [oauthFirebaseUid, setOauthFirebaseUid] = useState<string | undefined>(undefined);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string>('examora-hub');
  const activeNode =
    INTEGRATION_NODES.find((n) => n.id === selectedNodeId) || INTEGRATION_NODES[4];

  const clearErrors = () => {
    setPasswordError(null);
    setFormError(null);
    setResetSuccessMsg(null);
  };

  const handleOAuthButtonClick = async (provider: 'google' | 'github') => {
    clearErrors();
    setOauthError(null);
    setOauthConsentChecked(false);

    const outcome =
      provider === 'google' ? await signInWithGoogle() : await signInWithGitHub();

    if (outcome.ok) {
      return;
    }

    const savedAccounts = getSavedOAuthAccounts();
    setOauthPromptProvider(outcome.needsAccountPrompt || provider);

    if (outcome.verifiedEmail) {
      // Firebase popup returned a verified Google/GitHub user -> show Step 2 (DPDP Privacy Policy Consent Verification)
      setOauthEmail(outcome.verifiedEmail);
      setOauthName(outcome.verifiedName || outcome.verifiedEmail.split('@')[0]);
      setOauthFirebaseToken(outcome.firebaseToken);
      setOauthFirebaseUid(outcome.firebaseUid);
      setOauthStep('consent');
      setOauthUseCustomAccount(false);
    } else {
      // Open Step 1 (Account Chooser / Email Verification) -> then Step 2 (DPDP Privacy Policy Consent Verification)
      setOauthFirebaseToken(undefined);
      setOauthFirebaseUid(undefined);
      setOauthEmail(email.trim() || '');
      setOauthName(fullName.trim() || '');
      setOauthUseCustomAccount(savedAccounts.length === 0);
      setOauthStep('account');
    }
  };

  const handleSelectSavedOAuthAccount = (acct: { email: string; fullName: string }) => {
    setOauthEmail(acct.email);
    setOauthName(acct.fullName);
    setOauthError(null);
    setOauthConsentChecked(false);
    setOauthStep('consent');
  };

  const handleOAuthAccountNext = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = oauthEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setOauthError(
        `Please enter a valid ${oauthPromptProvider === 'google' ? 'Google' : 'GitHub'} email address.`
      );
      return;
    }
    const resolvedName =
      oauthName.trim() ||
      cleanEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase()) ||
      'Scholar';
    setOauthEmail(cleanEmail);
    setOauthName(resolvedName);
    setOauthError(null);
    setOauthConsentChecked(false);
    setOauthStep('consent');
  };

  const handleOAuthConsentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauthConsentChecked) {
      setOauthError(
        'Consent Required: Please check the Privacy Policy & DPDP Act 2023 consent box to continue.'
      );
      return;
    }
    if (!oauthPromptProvider) return;

    setOauthError(null);
    setSubmitting(true);
    const res = await completeOAuthSignIn({
      provider: oauthPromptProvider,
      email: oauthEmail,
      fullName: oauthName,
      consentGiven: true,
      firebaseToken: oauthFirebaseToken,
      firebaseUid: oauthFirebaseUid,
    });
    setSubmitting(false);

    if (!res.ok) {
      setOauthError(res.error || 'Authentication failed.');
      return;
    }
    setOauthPromptProvider(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (mode === 'reset') {
      if (password.length < 6) {
        setPasswordError('New password must be at least 6 characters.');
        return;
      }
      setSubmitting(true);
      const outcome = await resetPassword(cleanEmail, password);
      setSubmitting(false);
      if (!outcome.ok) {
        setFormError(outcome.error || 'Could not reset password for this email.');
        return;
      }
      setResetSuccessMsg(outcome.message || 'Password updated. Please sign in.');
      setMode('login');
      setPassword('');
      return;
    }

    if (mode === 'login') {
      if (!password) {
        setPasswordError("We couldn't sign you in. Your email or password may be incorrect.");
        return;
      }
      setSubmitting(true);
      const outcome = await loginWithPassword(cleanEmail, password);
      setSubmitting(false);
      if (!outcome.ok) {
        if (outcome.code === 'INVALID_PASSWORD') {
          setPasswordError("We couldn't sign you in. Your email or password may be incorrect.");
        } else if (outcome.code === 'USER_NOT_FOUND') {
          setFormError(
            outcome.error || 'No account found with this email. Click "Create account" below.'
          );
        } else {
          const mapped = mapErrorToUserMessage(outcome.error || outcome.code, 'auth');
          setPasswordError(mapped.message);
        }
      }
      return;
    }

    // Signup mode
    if (!fullName.trim()) {
      setFormError('Please enter your Full Name.');
      return;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (!consentChecked) {
      setFormError(
        'Consent Required: Please check the mandatory Privacy Policy consent box before creating an account.'
      );
      return;
    }

    setSubmitting(true);
    const outcome = await registerWithPassword({
      email: cleanEmail,
      password,
      fullName: fullName.trim(),
      consentGiven: true,
    });
    setSubmitting(false);

    if (!outcome.ok) {
      if (outcome.code === 'EMAIL_EXISTS') {
        setFormError(outcome.error || 'An account with this email already exists.');
      } else {
        const mapped = mapErrorToUserMessage(outcome.error || outcome.code, 'auth');
        setFormError(mapped.message);
      }
    }
  };

  const activeErrorMsg = formError || authError;
  const savedOAuthAccounts = oauthPromptProvider ? getSavedOAuthAccounts() : [];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:grid lg:grid-cols-12 p-4 sm:p-6 gap-6">
      {/* Google / GitHub OAuth Verification & DPDP Act 2023 Privacy Policy Consent Popup */}
      {oauthPromptProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4">
          <div className="w-full max-w-[430px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            {/* Top Provider Header Bar (Authentic Google / GitHub OAuth Header) */}
            <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {oauthPromptProvider === 'google' ? (
                  <span className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-blue-600">
                    G
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-md bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      />
                    </svg>
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {oauthPromptProvider === 'google'
                    ? 'Sign in with Google'
                    : 'Sign in with GitHub'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOauthPromptProvider(null)}
                className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
                aria-label="Close OAuth popup"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* STEP 1: Choose an Account or Verify Email */}
              {oauthStep === 'account' && (
                <>
                  <div className="space-y-1 text-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Choose an account
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      to continue to <strong className="text-slate-900 dark:text-white">EXAMORA</strong>
                    </p>
                  </div>

                  {savedOAuthAccounts.length > 0 && !oauthUseCustomAccount ? (
                    <div className="space-y-2">
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        {savedOAuthAccounts.map((acct) => (
                          <button
                            key={acct.email}
                            type="button"
                            onClick={() => handleSelectSavedOAuthAccount(acct)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {acct.fullName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {acct.email}
                              </div>
                            </div>
                            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 shrink-0 ml-2">
                              Select →
                            </span>
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setOauthEmail('');
                          setOauthName('');
                          setOauthUseCustomAccount(true);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        + Use another {oauthPromptProvider === 'google' ? 'Google' : 'GitHub'} account
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleOAuthAccountNext} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {oauthPromptProvider === 'google' ? 'Google Email' : 'GitHub Email'} *
                        </label>
                        <input
                          type="email"
                          required
                          autoFocus
                          value={oauthEmail}
                          onChange={(e) => {
                            setOauthEmail(e.target.value);
                            setOauthError(null);
                          }}
                          placeholder={
                            oauthPromptProvider === 'google'
                              ? 'you@gmail.com'
                              : 'you@users.noreply.github.com'
                          }
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Full Name (Data Minimization: Only Name &amp; Email Collected)
                        </label>
                        <input
                          type="text"
                          value={oauthName}
                          onChange={(e) => setOauthName(e.target.value)}
                          placeholder="Ram Charan"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                        />
                      </div>

                      {oauthError && (
                        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-[11px] font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{oauthError}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        {savedOAuthAccounts.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setOauthUseCustomAccount(false)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            ← Back to saved accounts
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setOauthPromptProvider(null)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}

                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-semibold hover:opacity-90 cursor-pointer"
                        >
                          Next: Verify &amp; Privacy Policy →
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              {/* STEP 2: OAuth Verification & DPDP Act 2023 Privacy Policy Consent Screen */}
              {oauthStep === 'consent' && (
                <form onSubmit={handleOAuthConsentSubmit} className="space-y-4">
                  <div className="space-y-1.5 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Account Verified · Privacy &amp; Consent Notice</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Sign in to EXAMORA
                    </h3>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">{oauthName}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-[11px]">{oauthEmail}</span>
                      <button
                        type="button"
                        onClick={() => setOauthStep('account')}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline ml-1 cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Embedded Plain-Language Privacy Policy Summary (DPDP Act 2023) */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 space-y-2 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>DPDP Act 2023 Data Protection Summary</span>
                      </span>
                      <button
                        type="button"
                        onClick={onOpenPrivacyPolicy}
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        <span>Full Policy (/privacy-policy)</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>
                        <strong>What is collected:</strong> Only your Full Name, Email, uploaded
                        photos/scans, and diagnosis/evaluation history.
                      </li>
                      <li>
                        <strong>Why:</strong> To provide plant diagnosis, AI rubric evaluation, and
                        save your garden/study history.
                      </li>
                      <li>
                        <strong>Retention &amp; Zero Selling:</strong> Never sold to third parties.
                        Kept only while you keep your saved items or account. You can export JSON or
                        delete your account anytime in <em>Privacy &amp; Settings</em>.
                      </li>
                    </ul>
                  </div>

                  {/* Mandatory Unchecked Consent Checkbox */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={oauthConsentChecked}
                        onChange={(e) => {
                          setOauthConsentChecked(e.target.checked);
                          setOauthError(null);
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                      />
                      <span className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={onOpenPrivacyPolicy}
                          className="font-semibold underline text-slate-900 dark:text-white cursor-pointer"
                        >
                          Privacy Policy
                        </button>{' '}
                        and consent to my data (name, email, uploaded photos) being used to provide
                        plant diagnosis.
                      </span>
                    </label>
                  </div>

                  {oauthError && (
                    <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-[11px] font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{oauthError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setOauthPromptProvider(null)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-semibold hover:opacity-90 disabled:opacity-60 cursor-pointer"
                    >
                      {submitting ? (
                        <ButtonLoader label="Signing in..." size="sm" />
                      ) : (
                        'Allow & Continue'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Left Column: Clean Centered Auth Studio (Inspired by AI Labs Login Layout) */}
      <div className="lg:col-span-5 flex flex-col justify-between px-4 sm:px-8 py-4">
        {/* Top Minimal Utility Bar */}
        <div className="flex items-center justify-between">
          {onBackToOverview ? (
            <button
              type="button"
              onClick={onBackToOverview}
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </button>
          ) : (
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              EXAMORA
            </span>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
            title="Toggle Light / Dark Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>

        {/* Center Authentication Form Box */}
        <div className="w-full max-w-[350px] mx-auto my-8 space-y-6">
          {/* Brand Emblem & Welcome Header */}
          <div className="text-center space-y-2.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 dark:from-slate-100 dark:to-slate-300 text-white dark:text-slate-950 shadow-md flex items-center justify-center mx-auto border border-slate-700/40">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <rect
                  x="4"
                  y="4"
                  width="16"
                  height="16"
                  rx="4"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
                <circle cx="9.5" cy="10" r="1.2" fill="currentColor" />
                <circle cx="14.5" cy="10" r="1.2" fill="currentColor" />
                <path
                  d="M9 14.5C9.8 15.5 11 16 12 16C13 16 14.2 15.5 15 14.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                <path
                  d="M12 8.5V12.5H10.8"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {mode === 'login'
                  ? 'Welcome to EXAMORA'
                  : mode === 'signup'
                  ? 'Create EXAMORA Account'
                  : 'Reset Your Password'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mode === 'login'
                  ? 'Please sign in or sign up with your Google or email account.'
                  : mode === 'signup'
                  ? 'Data Minimization: Only Full Name and Email are required.'
                  : 'Enter your registered email and choose a new password.'}
              </p>
            </div>
          </div>

          {/* OAuth Provider Buttons (Google & GitHub) */}
          {mode !== 'reset' && (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleOAuthButtonClick('google')}
                className="w-full relative flex items-center justify-center py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
              >
                <span className="absolute left-2.5 w-7 h-7 rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-bold text-xs">
                  G
                </span>
                <span>Sign in with Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuthButtonClick('github')}
                className="w-full relative flex items-center justify-center py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
              >
                <span className="absolute left-2.5 w-7 h-7 rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                </span>
                <span>Sign in with GitHub</span>
              </button>
            </div>
          )}

          {/* OR Divider */}
          {mode !== 'reset' && (
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              <span className="px-3 bg-white dark:bg-slate-950 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                OR
              </span>
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
          )}

          {/* Mode Segmented Switcher (Sign In vs Create Account) */}
          {mode !== 'reset' && (
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  clearErrors();
                  setMode('login');
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  clearErrors();
                  setMode('signup');
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {resetSuccessMsg && (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{resetSuccessMsg}</span>
            </div>
          )}

          {/* Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="login-fullname"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Full Name
                </label>
                <input
                  id="login-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    clearErrors();
                  }}
                  placeholder="Ram Charan"
                  autoComplete="name"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearErrors();
                }}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                {mode === 'reset' ? 'New Password' : 'Password'}
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="••••••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={`w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border transition-all focus:outline-none ${
                    passwordError
                      ? 'border-red-300 dark:border-red-500/70 bg-red-50/40 dark:bg-red-950/20 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/40'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              {passwordError && (
                <div className="flex items-center gap-1.5 pt-1 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 fill-red-600 text-white dark:fill-red-500 dark:text-slate-950" />
                  <span className="text-[11px] font-medium">{passwordError}</span>
                </div>
              )}
            </div>

            {activeErrorMsg && (
              <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="text-[11px] font-medium leading-relaxed">{activeErrorMsg}</span>
              </div>
            )}

            {/* Remember Me & Forgot Password Row */}
            {mode === 'login' && (
              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={rememberMe}
                    onClick={() => setRememberMe((prev) => !prev)}
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-colors cursor-pointer ${
                      rememberMe
                        ? 'bg-slate-950 border-slate-950 text-white dark:bg-white dark:border-white dark:text-slate-950'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    clearErrors();
                    setMode('reset');
                  }}
                  className="text-xs font-semibold text-slate-900 dark:text-slate-200 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Mandatory Unchecked DPDP Act 2023 Consent Checkbox in Sign Up Mode */}
            {mode === 'signup' && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => {
                      setConsentChecked(e.target.checked);
                      clearErrors();
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={onOpenPrivacyPolicy}
                      className="font-semibold underline text-slate-900 dark:text-white cursor-pointer"
                    >
                      Privacy Policy
                    </button>{' '}
                    and consent to my data (name, email, uploaded photos) being used to provide plant
                    diagnosis.
                  </span>
                </label>
              </div>
            )}

            {/* Primary Continue Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-60 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-950 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              {submitting ? (
                <ButtonLoader
                  label={
                    mode === 'login'
                      ? 'Signing in...'
                      : mode === 'signup'
                      ? 'Creating account...'
                      : 'Updating password...'
                  }
                  size="sm"
                />
              ) : mode === 'login' ? (
                'Continue'
              ) : mode === 'signup' ? (
                'Create Account & Continue'
              ) : (
                'Update Password'
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="space-y-3 text-center pt-1">
            {mode === 'reset' ? (
              <button
                type="button"
                onClick={() => {
                  clearErrors();
                  setMode('login');
                }}
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => {
                    clearErrors();
                    setMode(mode === 'login' ? 'signup' : 'login');
                  }}
                  className="font-semibold text-slate-900 dark:text-white hover:underline cursor-pointer"
                >
                  {mode === 'login' ? 'Create account' : 'Sign in'}
                </button>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={() => setShowTroubleHelper((prev) => !prev)}
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                Have trouble signing in?
              </button>
            </div>

            {showTroubleHelper && (
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-left space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                  <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Account &amp; Password Help</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Click <strong>Sign in with Google</strong> or <strong>Sign in with GitHub</strong>{' '}
                  above to open the OAuth verification &amp; Privacy Policy consent window, or click{' '}
                  <strong>Create Account</strong> to register with your Full Name, Email, and
                  Password.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Copyright & Privacy Link */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>© 2026 EXAMORA</span>
          <button
            type="button"
            onClick={onOpenPrivacyPolicy}
            className="hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
          >
            Privacy Policy (DPDP 2023)
          </button>
        </div>
      </div>

      {/* Right Column: Framed Architectural Grid Canvas ("Select & Combine & Integrate.") */}
      <div className="lg:col-span-7 flex">
        <div
          className="w-full rounded-[28px] bg-[#F8FAFC] dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 relative overflow-hidden flex flex-col items-center justify-between p-8 sm:p-12 min-h-[540px]"
          style={{
            backgroundImage:
              theme === 'light'
                ? 'radial-gradient(rgba(15, 23, 42, 0.06) 1px, transparent 1px), linear-gradient(to right, rgba(15, 23, 42, 0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.025) 1px, transparent 1px)'
                : 'radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px), linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
            backgroundSize: '24px 24px, 48px 48px, 48px 48px',
          }}
        >
          {/* Top Header */}
          <div className="text-center space-y-2 max-w-md z-10 pt-2">
            <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">
              Select &amp; Combine &amp; Integrate.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Develop and refine personalized AI examinations using our intuitive academic interface.
            </p>
          </div>

          {/* Center 3x3 Interactive Node Network Diagram */}
          <div className="relative w-full max-w-[380px] aspect-square my-auto flex items-center justify-center">
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none text-slate-300 dark:text-slate-700"
              viewBox="0 0 360 360"
              fill="none"
            >
              <rect
                x="48"
                y="48"
                width="264"
                height="264"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <line
                x1="48"
                y1="180"
                x2="312"
                y2="180"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <line
                x1="180"
                y1="48"
                x2="180"
                y2="312"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <line
                x1="48"
                y1="48"
                x2="312"
                y2="312"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <line
                x1="48"
                y1="312"
                x2="312"
                y2="48"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            </svg>

            {/* 3x3 Node Matrix */}
            <div className="relative z-10 w-full h-full grid grid-cols-3 grid-rows-3 place-items-center">
              <button
                type="button"
                onClick={() => setSelectedNodeId('curriculum')}
                title="Curriculum & Notes Parser"
                className={`w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border transition-transform hover:scale-105 flex items-center justify-center shadow-sm cursor-pointer ${
                  selectedNodeId === 'curriculum'
                    ? 'ring-2 ring-blue-600 border-blue-500'
                    : 'border-slate-200/90 dark:border-slate-700'
                }`}
              >
                <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18.178 8C19.726 8 21 9.29 21 11.25C21 13.21 19.726 14.5 18.178 14.5C16.53 14.5 15.134 12.956 13.75 11.25C12.366 9.544 10.97 8 9.322 8C7.274 8 6 9.612 6 11.25C6 12.888 7.274 14.5 9.322 14.5C11.15 14.5 12.45 12.8 13.75 11.25"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNodeId('rubric')}
                title="Rubric Calibration Engine"
                className={`w-14 h-14 rounded-2xl bg-slate-950 text-white border transition-transform hover:scale-105 flex items-center justify-center shadow-md cursor-pointer ${
                  selectedNodeId === 'rubric'
                    ? 'ring-2 ring-slate-900 dark:ring-white border-white'
                    : 'border-slate-800'
                }`}
              >
                <span className="font-mono text-lg font-bold tracking-tighter border-l-2 border-white pl-1">
                  R
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNodeId('timed-studio')}
                title="ExamLab Timed Studio"
                className={`w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border transition-transform hover:scale-105 flex items-center justify-center shadow-sm cursor-pointer ${
                  selectedNodeId === 'timed-studio'
                    ? 'ring-2 ring-slate-900 dark:ring-white border-slate-900'
                    : 'border-slate-200/90 dark:border-slate-700'
                }`}
              >
                <span className="text-[10px] font-bold tracking-tight text-slate-900 dark:text-white leading-none text-center">
                  IIExam
                  <br />
                  Lab
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNodeId('adaptive')}
                title="Adaptive Mastery Engine"
                className={`w-14 h-14 rounded-2xl bg-slate-950 text-white border transition-transform hover:scale-105 flex items-center justify-center shadow-md cursor-pointer ${
                  selectedNodeId === 'adaptive'
                    ? 'ring-2 ring-slate-900 dark:ring-white border-white'
                    : 'border-slate-800'
                }`}
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 12C12 10.343 13.343 9 15 9C16.657 9 18 10.343 18 12C18 15.314 15.314 18 12 18C7.582 18 4 14.418 4 10C4 5.582 7.582 2 12 2C17.523 2 22 6.477 22 12"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNodeId('examora-hub')}
                title="EXAMORA Core Platform"
                className={`w-20 h-20 rounded-[22px] bg-gradient-to-b from-slate-800 to-slate-950 text-white shadow-xl border transition-transform hover:scale-105 flex items-center justify-center cursor-pointer ${
                  selectedNodeId === 'examora-hub'
                    ? 'ring-4 ring-slate-900/15 dark:ring-white/20 border-slate-600'
                    : 'border-slate-700/80'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-white text-slate-950 flex items-center justify-center shadow-inner">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                    <circle cx="9" cy="9.5" r="1.4" fill="currentColor" />
                    <circle cx="15" cy="9.5" r="1.4" fill="currentColor" />
                    <path
                      d="M12 7.5V12.5H10.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.5 15C9.5 16.3 10.7 16.8 12 16.8C13.3 16.8 14.5 16.3 15.5 15"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNodeId('sandbox')}
                title="Code & Math Sandbox"
                className={`w-14 h-14 rounded-2xl bg-slate-950 text-white border transition-transform hover:scale-105 flex items-center justify-center shadow-md cursor-pointer ${
                  selectedNodeId === 'sandbox'
                    ? 'ring-2 ring-slate-900 dark:ring-white border-white'
                    : 'border-slate-800'
                }`}
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 18V6H17M11 18V10H17M15 18V14H17"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNodeId('gemini')}
                title="Gemini Structured AI"
                className={`w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border transition-transform hover:scale-105 flex items-center justify-center shadow-sm cursor-pointer ${
                  selectedNodeId === 'gemini'
                    ? 'ring-2 ring-emerald-600 border-emerald-500'
                    : 'border-slate-200/90 dark:border-slate-700'
                }`}
              >
                <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M12 3V8M12 16V21M3 12H8M16 12H21M5.6 5.6L9.2 9.2M14.8 14.8L18.4 18.4M18.4 5.6L14.8 9.2M9.2 14.8L5.6 18.4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNodeId('database')}
                title="PostgreSQL & Supabase Vault"
                className={`w-14 h-14 rounded-2xl bg-slate-950 text-white border transition-transform hover:scale-105 flex items-center justify-center shadow-md cursor-pointer ${
                  selectedNodeId === 'database'
                    ? 'ring-2 ring-slate-900 dark:ring-white border-white'
                    : 'border-slate-800'
                }`}
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 12L20 7.5M12 12L4 7.5M12 12V21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNodeId('privacy')}
                title="DPDP 2023 Privacy Shield"
                className={`w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border transition-transform hover:scale-105 flex items-center justify-center shadow-sm cursor-pointer ${
                  selectedNodeId === 'privacy'
                    ? 'ring-2 ring-slate-900 dark:ring-white border-slate-900'
                    : 'border-slate-200/90 dark:border-slate-700'
                }`}
              >
                <svg
                  className="w-6 h-6 text-slate-900 dark:text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M8 16V8C8 6.343 9.343 5 11 5C12.657 5 14 6.343 14 8V16C14 17.657 15.343 19 17 19C18.657 19 20 17.657 20 16V10"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4 14V8"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Interactive Selected Module Caption Footer */}
          <div className="w-full max-w-md rounded-2xl bg-white/90 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 px-4 py-3 text-center space-y-1 z-10">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
              <span>{activeNode.title}</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                ·
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-normal">
                {activeNode.role}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {activeNode.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
