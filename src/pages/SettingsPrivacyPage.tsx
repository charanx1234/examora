import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { AppView, ConsentRecord, StudyDocument } from '../types/examora.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  deleteAccountAndData,
  deleteStudyDocument,
  downloadPersonalDataExport,
  fetchUserConsents,
  submitUserConsent,
} from '../services/api.ts';
import { Button } from '../components/ui/Button.tsx';
import { Card, CardContent, CardHeader } from '../components/ui/Card.tsx';

interface SettingsPrivacyPageProps {
  documents: StudyDocument[];
  onNavigate: (view: AppView) => void;
  onRefreshDashboard: () => Promise<void>;
}

export const DPDP_CONSENT_TEXT =
  'I agree to the Privacy Policy and consent to my data (name, email, uploaded photos) being used to provide plant diagnosis.';
export const DPDP_CONSENT_VERSION = 'DPDP-2023-v1.0';

export function SettingsPrivacyPage({
  documents,
  onNavigate,
  onRefreshDashboard,
}: SettingsPrivacyPageProps) {
  const { profile, getValidIdToken, deleteCurrentUserAccount } = useAuth();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loadingConsents, setLoadingConsents] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadConsents = async () => {
    setLoadingConsents(true);
    try {
      const token = await getValidIdToken();
      const rows = await fetchUserConsents(token);
      setConsents(rows);
    } finally {
      setLoadingConsents(false);
    }
  };

  useEffect(() => {
    loadConsents();
  }, []);

  const latestConsent = consents[0];
  const isConsentActive = latestConsent ? latestConsent.consentGiven : true;

  const handleDownloadMyData = async () => {
    setExporting(true);
    setStatusMessage(null);
    try {
      const token = await getValidIdToken();
      const dataBundle = await downloadPersonalDataExport(token);
      const blob = new Blob([JSON.stringify(dataBundle, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `examora-data-export-${profile?.uid || 'user'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage('Your personal data, saved items, and consent ledger have been exported as JSON.');
    } finally {
      setExporting(false);
    }
  };

  const handleToggleConsent = async (giveConsent: boolean) => {
    setWithdrawing(true);
    setStatusMessage(null);
    try {
      const token = await getValidIdToken();
      await submitUserConsent(token, giveConsent, DPDP_CONSENT_VERSION, DPDP_CONSENT_TEXT);
      await loadConsents();
      setStatusMessage(
        giveConsent
          ? 'Your DPDP Act 2023 consent has been granted and logged.'
          : 'Your consent has been withdrawn. A timestamped withdrawal record has been stored in the consents table.'
      );
    } finally {
      setWithdrawing(false);
    }
  };

  const handleDeleteSavedDocument = async (docId: string) => {
    const token = await getValidIdToken();
    await deleteStudyDocument(token, docId);
    await onRefreshDashboard();
    setStatusMessage('Saved entry and associated uploaded content permanently deleted.');
  };

  const handleConfirmAccountDeletion = async () => {
    setDeletingAccount(true);
    try {
      const token = await getValidIdToken();
      await deleteAccountAndData(token);
      await deleteCurrentUserAccount();
    } finally {
      setDeletingAccount(false);
      setConfirmDeleteOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            DPDP Act 2023 Rights · Data Portability, Consent Control & Account Erasure
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Privacy, Consent & Account Settings
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Download a machine-readable JSON copy of your data, manage or withdraw consent, or permanently delete your account—with zero dark patterns.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.history.pushState({}, '', '/privacy-policy');
            onNavigate('privacy-policy');
          }}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Read Full Privacy Policy (/privacy-policy)</span>
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/30 text-xs font-medium text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top-Level Action Cards (No Dark Patterns: Export, Withdraw Consent, Delete Account equally accessible) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Download My Data */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>DPDP Right to Access</span>
              <Download className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Export Personal Data
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Export your account profile (Full Name, Email), saved items (`plants` / `documents`), consent history (`consents`), and evaluation records as a structured JSON file.
            </p>
            <Button
              onClick={handleDownloadMyData}
              disabled={exporting}
              className="w-full"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing JSON Export...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download my data</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 2. Withdraw / Manage Consent */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>DPDP Section 6(4)</span>
              {isConsentActive ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Consent Management
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Current status:{' '}
              <strong className={isConsentActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                {isConsentActive ? 'Consent Granted' : 'Consent Withdrawn'}
              </strong>
              . Withdrawing consent is as easy as granting it and is logged immediately in the `consents` table.
            </p>
            {isConsentActive ? (
              <Button
                variant="outline"
                disabled={withdrawing}
                onClick={() => handleToggleConsent(false)}
                className="w-full"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Withdraw consent</span>
              </Button>
            ) : (
              <Button
                disabled={withdrawing}
                onClick={() => handleToggleConsent(true)}
                className="w-full"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Re-grant consent</span>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 3. Delete My Account */}
        <Card className="flex flex-col justify-between border-red-200 dark:border-red-900/60">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400">
              <span>DPDP Right to Erasure</span>
              <Trash2 className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Permanent Account Erasure
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Permanently delete all your saved rows, uploaded photos/scans, evaluation history, consent records, and authentication account.
            </p>
            <Button
              variant="danger"
              onClick={() => setConfirmDeleteOpen(true)}
              className="w-full"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete my account</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Minimized Account Profile & Saved Items Retention Control */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Account & Personal Information
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click below to edit your profile photo, name, age, DOB, and academic details
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Full Name</span>
              <span className="font-semibold text-slate-900 dark:text-white">{profile?.fullName}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Email Address</span>
              <span className="font-mono text-slate-900 dark:text-white">{profile?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Age / Date of Birth</span>
              <span className="font-mono text-slate-900 dark:text-white">
                {profile?.age ? `${profile.age} yrs` : 'Not set'}{' '}
                {profile?.dateOfBirth ? `· ${profile.dateOfBirth}` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Institution / Dept</span>
              <span className="text-slate-900 dark:text-white truncate max-w-[180px]">
                {profile?.institution || profile?.department || 'Not set'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500">User ID (`user_id`)</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">{profile?.uid}</span>
            </div>
            <div className="pt-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => onNavigate('profile')}
              >
                <span>Edit Personal Information & Profile Photo</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Consent Audit Trail Table (`consents` table) */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Database Consent Ledger (`consents` Table)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifiable audit log of `user_id`, `consent_given`, `consent_text_version`, and `timestamp`
            </p>
          </CardHeader>
          {loadingConsents ? (
            <CardContent className="py-8 text-center text-xs text-slate-500">
              Loading consent records...
            </CardContent>
          ) : consents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-4">user_id</th>
                    <th className="py-2.5 px-4">consent_given</th>
                    <th className="py-2.5 px-4">consent_text_version</th>
                    <th className="py-2.5 px-4 text-right">timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {consents.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 px-4 truncate max-w-[140px]">{c.userId}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={
                            c.consentGiven
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-amber-600 dark:text-amber-400 font-semibold'
                          }
                        >
                          {String(c.consentGiven)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">{c.consentTextVersion}</td>
                      <td className="py-2.5 px-4 text-right text-slate-500">
                        {new Date(c.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <CardContent className="py-8 text-center text-xs text-slate-500">
              No consent events recorded in this session yet.
            </CardContent>
          )}
        </Card>
      </div>

      {/* Saved Items Retention Management */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Saved Items & Uploaded Content Retention ({documents.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Data Minimization: Saved entries are retained only while you keep them. Delete any item below to immediately purge its content.
          </p>
        </CardHeader>
        {documents.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="px-6 py-3.5 flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{doc.title}</div>
                  <div className="text-slate-500">
                    {doc.subject} · {doc.fileName} · Saved {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteSavedDocument(doc.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>Delete Saved Item</span>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <CardContent className="py-8 text-center text-xs text-slate-500">
            No saved study materials or uploaded files are currently stored in your account.
          </CardContent>
        )}
      </Card>

      {/* Delete My Account Confirmation Modal */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-red-300 dark:border-red-900">
            <CardHeader className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Permanently Delete Your Account & All Data?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  DPDP Act 2023 Right to Erasure Confirmation
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3.5 rounded-lg bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-900 dark:text-red-200 space-y-1.5">
                <p className="font-semibold">Confirming will immediately and irreversibly delete:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>All saved rows (`plants` / `documents`, `exams`, `attempts`, `results`) for your `user_id`</li>
                  <li>All uploaded photos and handwritten solution scans</li>
                  <li>Your `consents` table records</li>
                  <li>Your user profile and authentication account</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deletingAccount}
                  onClick={() => setConfirmDeleteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={deletingAccount}
                  onClick={handleConfirmAccountDeletion}
                >
                  {deletingAccount ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Erasing Account & Data...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirm & Delete My Account</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
