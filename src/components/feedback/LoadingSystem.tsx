import React from 'react';
import { BookOpen } from 'lucide-react';

interface GlobalLoaderProps {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
}

/**
 * Reusable EXAMORA Global Loading Component
 * Clean circular rotating spinner, smooth rotation animation, EXAMORA branding,
 * minimal and professional appearance matching existing design tokens.
 */
export const GlobalLoader: React.FC<GlobalLoaderProps> = ({
  message = 'Preparing your academic workspace...',
  submessage,
  fullScreen = true,
}) => {
  const containerClasses = fullScreen
    ? 'min-h-screen w-full bg-[#F8FAFC] dark:bg-[#0B0F17] flex flex-col items-center justify-center p-6 select-none'
    : 'w-full py-20 flex flex-col items-center justify-center p-6 select-none';

  return (
    <div className={containerClasses} role="status" aria-live="polite" aria-busy="true">
      <div className="flex flex-col items-center max-w-sm text-center">
        {/* Spinner + Branding Mark */}
        <div className="relative flex items-center justify-center w-16 h-16 mb-5">
          <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-slate-800" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#0F172A] dark:border-t-amber-500 animate-spin" />
          <div className="w-10 h-10 rounded-full bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shadow-xs">
            <BookOpen className="w-4 h-4 text-[#0F172A] dark:text-amber-400" />
          </div>
        </div>

        {/* EXAMORA Brand Label */}
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500 mb-1.5">
          EXAMORA
        </div>

        {/* Primary Status Message */}
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{message}</p>

        {submessage && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            {submessage}
          </p>
        )}
      </div>
    </div>
  );
};

interface ButtonLoaderProps {
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Inline rotating spinner for buttons during active operations (Sign In, Sign Up, Sign Out, Submit, Generate).
 */
export const ButtonLoader: React.FC<ButtonLoaderProps> = ({
  label,
  size = 'sm',
  className = '',
}) => {
  const spinnerSize = size === 'sm' ? 'w-3.5 h-3.5 border-2' : 'w-4 h-4 border-2';
  return (
    <span className={`inline-flex items-center justify-center gap-2 ${className}`}>
      <span
        className={`${spinnerSize} rounded-full border-current border-t-transparent animate-spin shrink-0`}
        aria-hidden="true"
      />
      {label && <span>{label}</span>}
    </span>
  );
};

interface SectionSkeletonProps {
  lines?: number;
  cards?: number;
  className?: string;
}

/**
 * Reusable section skeleton for partial page data loading without blocking the entire screen.
 */
export const SectionSkeleton: React.FC<SectionSkeletonProps> = ({
  lines = 3,
  cards = 0,
  className = '',
}) => {
  return (
    <div className={`animate-pulse space-y-4 ${className}`} aria-hidden="true">
      {cards > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: cards }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 space-y-3"
            >
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-2.5 w-32 bg-slate-100 dark:bg-slate-800/70 rounded" />
            </div>
          ))}
        </div>
      )}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 space-y-3.5">
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        {Array.from({ length: lines }).map((_, idx) => (
          <div
            key={idx}
            className="h-3 bg-slate-100 dark:bg-slate-800/70 rounded"
            style={{ width: `${Math.max(55, 95 - idx * 12)}%` }}
          />
        ))}
      </div>
    </div>
  );
};

interface PageSkeletonProps {
  variant?: 'dashboard' | 'archive' | 'results' | 'analytics' | 'documents' | 'settings' | 'exam-room';
}

/**
 * Page-level skeleton loader tailored to each EXAMORA workspace section so layout never jumps.
 */
export const PageSkeleton: React.FC<PageSkeletonProps> = ({ variant = 'dashboard' }) => {
  if (variant === 'exam-room') {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse" role="status" aria-label="Loading examination">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-56 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800/70 rounded" />
          </div>
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-9 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-9 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-7 space-y-5">
            <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-6 w-4/5 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="space-y-3 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/70 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'results') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse" role="status" aria-label="Loading examination results">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2.5">
              <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-7 w-72 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="h-16 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800/70 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3"
            >
              <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800/70 rounded" />
              <div className="h-16 w-full bg-slate-100 dark:bg-slate-800/50 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading page content">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-56 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-3.5 w-80 bg-slate-100 dark:bg-slate-800/70 rounded" />
        </div>
        <div className="h-9 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      </div>
      <SectionSkeleton cards={variant === 'dashboard' || variant === 'analytics' ? 4 : 0} lines={4} />
      <SectionSkeleton lines={5} />
    </div>
  );
};
