import React from 'react';
import { BookOpen, ArrowLeft, Home } from 'lucide-react';

interface NotFoundPageProps {
  onBackToDashboard: () => void;
  onGoHome: () => void;
  isAuthenticated?: boolean;
}

/**
 * Custom 404 — Page Not Found screen for EXAMORA.
 * Displays clean 404 typography, EXAMORA branding, syllabus message,
 * and navigation back to the Dashboard or Home.
 */
export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onBackToDashboard,
  onGoHome,
  isAuthenticated = false,
}) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] flex flex-col items-center justify-center p-6 text-slate-900 dark:text-slate-100">
      <div className="max-w-lg w-full bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
        {/* EXAMORA Brand Header */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-bold tracking-wider uppercase mb-6">
          <BookOpen className="w-3.5 h-3.5 text-[#0F172A] dark:text-amber-400" />
          <span>EXAMORA</span>
        </div>

        {/* Clean 404 Typography */}
        <div className="font-serif text-6xl sm:text-7xl font-bold tracking-tight text-[#0F172A] dark:text-white leading-none mb-4">
          404
        </div>

        {/* Main Message */}
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
          Looks like this page is missing from the syllabus.
        </h1>

        {/* Supporting Text */}
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto mb-8">
          The page may have moved, or the link may be incorrect.
        </p>

        {/* Primary & Secondary Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F172A] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isAuthenticated ? 'Back to Dashboard' : 'Back to Dashboard'}</span>
          </button>

          <button
            type="button"
            onClick={onGoHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
