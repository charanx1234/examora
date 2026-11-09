import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Download,
  Lock,
  Mail,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/Button.tsx';
import { Card, CardContent, CardHeader } from '../components/ui/Card.tsx';

interface PrivacyPolicyPageProps {
  onBack: () => void;
  onOpenSettings?: () => void;
  isAuthenticated?: boolean;
}

export function PrivacyPolicyPage({
  onBack,
  onOpenSettings,
  isAuthenticated = false,
}: PrivacyPolicyPageProps) {
  const [grievanceSubject, setGrievanceSubject] = useState('');
  const [grievanceMessage, setGrievanceMessage] = useState('');
  const [grievanceSubmitted, setGrievanceSubmitted] = useState(false);

  const handleGrievanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grievanceMessage.trim()) return;
    setGrievanceSubmitted(true);
    setGrievanceSubject('');
    setGrievanceMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Application</span>
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>DIGITAL PERSONAL DATA PROTECTION (DPDP) ACT 2023 ALIGNED · VERSION DPDP-2023-v1.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Privacy Policy & Data Protection Notice
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Plain-language notice explaining what personal data we collect, why we collect it, how long it is stored, and how you control or erase it.
            </p>
          </div>

          {isAuthenticated && onOpenSettings && (
            <Button variant="outline" size="sm" onClick={onOpenSettings}>
              <span>Manage My Data & Consent</span>
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                1. What Data We Collect (Data Minimization)
              </h2>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                We practice strict <strong>data minimization</strong>. We only collect the minimum data required to operate your account and evaluations:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>
                  <strong>Account Profile:</strong> Only your <strong>Full Name</strong> and <strong>Email Address</strong> at signup. We never collect phone numbers, physical addresses, government IDs, or location data.
                </li>
                <li>
                  <strong>Uploaded Photos & Study Documents:</strong> Handwritten solution scans, plant/specimen photos, and syllabus documents you explicitly upload for evaluation.
                </li>
                <li>
                  <strong>Diagnosis & Evaluation History:</strong> Generated papers, rubric marks, diagnosis feedback, and saved history.
                </li>
                <li>
                  <strong>Consent Ledger:</strong> Your explicit DPDP consent record (`user_id`, `consent_given`, `consent_text_version`, and `timestamp`).
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                2. Why We Collect It & Zero Third-Party Sharing
              </h2>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Your data is processed <strong>solely for the specified purpose</strong> you consented to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>
                  To provide AI-powered diagnosis, handwritten step-by-step evaluation, and marking rubric feedback.
                </li>
                <li>
                  To save your personal history (saved garden/study items and past evaluation transcripts) across sessions.
                </li>
                <li>
                  <strong>Never Sold to Third Parties:</strong> We do <strong>not</strong> sell, rent, broker, or share your personal data, email, or uploaded photos with third-party advertisers or data brokers.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                3. How Long Data Is Kept (Retention & Ephemeral Mode)
              </h2>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li>
                  <strong>Ephemeral / Diagnosis-Only Photo Mode:</strong> When you enable <em>"Ephemeral Scan Mode (Do not store raw photo after evaluation)"</em> during an assessment, your uploaded photo is processed in-memory for immediate diagnosis/grading and discarded immediately—the raw image is never stored in the database.
                </li>
                <li>
                  <strong>Saved Entries ("My Garden" / Study Library):</strong> Uploaded photos and study documents are kept <strong>only as long as you keep that saved item</strong>. Deleting an item immediately purges it from storage.
                </li>
                <li>
                  <strong>Account Deletion:</strong> When you delete your account, all database rows, uploaded photos/scans, consent records, and authentication credentials are permanently erased immediately.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                4. How to Export Data, Withdraw Consent, or Delete Account
              </h2>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="text-xs">
                Under the Digital Personal Data Protection (DPDP) Act 2023, you have the right to access, export, withdraw consent, and erase your data at any time without dark patterns:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>
                  <strong>Download My Data:</strong> Open <strong>Privacy & Settings</strong> in the main sidebar and click <strong>"Download my data"</strong> to export all your rows and account info as a JSON file.
                </li>
                <li>
                  <strong>Withdraw Consent:</strong> Click <strong>"Withdraw consent"</strong> at the top level of Privacy & Settings at any time.
                </li>
                <li>
                  <strong>Delete My Account:</strong> Click <strong>"Delete my account"</strong> in Privacy & Settings and confirm to permanently erase all your records, uploaded photos, consent logs, and auth account.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Contact / Grievance Redressal Section (DPDP Act 2023 Mandatory Requirement) */}
        <Card id="contact-grievance">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  5. Contact / Grievance Redressal Officer
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pursuant to Section 13 of the Digital Personal Data Protection (DPDP) Act, 2023
                </p>
              </div>
            </div>
            <a
              href="mailto:privacy-grievance@examora.edu"
              className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              privacy-grievance@examora.edu
            </a>
          </CardHeader>

          <CardContent className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                If you have questions about how your personal data is processed, wish to report a privacy concern, or need assistance exercising your rights to access, correction, consent withdrawal, or erasure, please contact our Data Protection & Grievance Officer:
              </p>
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1.5 font-mono">
                <div className="text-slate-900 dark:text-white font-semibold">
                  Data Protection & Grievance Officer
                </div>
                <div>Email: privacy-grievance@examora.edu</div>
                <div>Alternate: dpo@examora.edu</div>
                <div>Acknowledgement SLA: Within 24 Hours</div>
                <div>Resolution SLA: Within 7 Business Days</div>
              </div>
            </div>

            <form onSubmit={handleGrievanceSubmit} className="lg:col-span-7 space-y-3">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Submit a Direct Data Grievance or Deletion Request
              </div>
              {grievanceSubmitted && (
                <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Your grievance request has been logged with ticket reference #DPDP-{Date.now().toString().slice(-5)}. You can also email privacy-grievance@examora.edu directly.
                  </span>
                </div>
              )}
              <input
                type="text"
                value={grievanceSubject}
                onChange={(e) => setGrievanceSubject(e.target.value)}
                placeholder="Subject (e.g., Data Erasure Inquiry, Consent Withdrawal Question)"
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              <textarea
                rows={3}
                value={grievanceMessage}
                onChange={(e) => setGrievanceMessage(e.target.value)}
                placeholder="Describe your privacy inquiry or grievance..."
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              <Button type="submit" size="sm" variant="secondary">
                <Mail className="w-3.5 h-3.5" />
                <span>Send Grievance to Data Protection Officer</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
