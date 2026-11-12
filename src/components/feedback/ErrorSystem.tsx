import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, RefreshCw, Home, ArrowLeft, X, WifiOff } from 'lucide-react';
import { ButtonLoader } from './LoadingSystem';

export interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  onDismiss?: () => void;
  variant?: 'error' | 'warning' | 'info';
  className?: string;
}

/**
 * Reusable inline ErrorMessage component for forms, sections, uploads, and exam actions.
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  retrying = false,
  onDismiss,
  variant = 'error',
  className = '',
}) => {
  const styles =
    variant === 'warning'
      ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200'
      : variant === 'info'
        ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
        : 'bg-red-50/90 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200';

  const iconColor =
    variant === 'warning'
      ? 'text-amber-600 dark:text-amber-400'
      : variant === 'info'
        ? 'text-slate-600 dark:text-slate-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <div
      role="alert"
      className={`rounded-xl border p-4 flex items-start gap-3 transition-all ${styles} ${className}`}
    >
      <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && <p className="text-xs font-bold tracking-tight mb-0.5">{title}</p>}
        <p className="text-xs leading-relaxed opacity-95">{message}</p>
        {onRetry && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {retrying ? (
                <ButtonLoader label="Retrying..." size="sm" />
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  <span>{retryLabel}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-current opacity-60 hover:opacity-100 p-1 rounded-md transition-opacity cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export interface FullPageErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  onBackToDashboard?: () => void;
  onGoHome?: () => void;
  isNetworkError?: boolean;
}

/**
 * Reusable FullPageError / Section Error screen with clear icon, title, plain-language explanation,
 * and helpful Retry / Back to Dashboard actions.
 */
export const FullPageError: React.FC<FullPageErrorProps> = ({
  title = 'Unable to Load Content',
  message,
  onRetry,
  retryLabel = 'Try Again',
  retrying = false,
  onBackToDashboard,
  onGoHome,
  isNetworkError = false,
}) => {
  const IconComponent = isNetworkError ? WifiOff : AlertCircle;

  return (
    <div
      role="alert"
      className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto my-6 shadow-xs"
    >
      <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 flex items-center justify-center mx-auto mb-4">
        <IconComponent className="w-6 h-6 text-red-600 dark:text-red-400" />
      </div>

      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
        EXAMORA Notice
      </div>

      <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">
        {title}
      </h2>

      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto mb-6">
        {message}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F172A] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-amber-400 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {retrying ? (
              <ButtonLoader label="Retrying..." size="sm" />
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{retryLabel}</span>
              </>
            )}
          </button>
        )}

        {onBackToDashboard && (
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
        )}

        {onGoHome && (
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Home</span>
          </button>
        )}
      </div>
    </div>
  );
};

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  showErrorToast: (message: string, title?: string) => void;
  showSuccessToast: (message: string, title?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ErrorToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, type }: Omit<ToastItem, 'id'>) => {
      const normalizedKey = `${type}:${title || ''}:${message}`.toLowerCase();
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      setToasts((prev) => {
        // Deduplicate so identical notifications are never stacked
        const alreadyVisible = prev.some(
          (t) => `${t.type}:${t.title || ''}:${t.message}`.toLowerCase() === normalizedKey
        );
        if (alreadyVisible) return prev;
        return [...prev.slice(-2), { id, title, message, type }];
      });

      window.setTimeout(() => {
        dismissToast(id);
      }, 5000);
    },
    [dismissToast]
  );

  const showErrorToast = useCallback(
    (message: string, title = 'Notice') => {
      showToast({ title, message, type: 'error' });
    },
    [showToast]
  );

  const showSuccessToast = useCallback(
    (message: string, title = 'Completed') => {
      showToast({ title, message, type: 'success' });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, showErrorToast, showSuccessToast, dismissToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto rounded-xl border p-3.5 shadow-lg flex items-start gap-3 transition-all ${
                t.type === 'error'
                  ? 'bg-white dark:bg-[#111827] border-red-200 dark:border-red-900/70 text-slate-900 dark:text-slate-100'
                  : t.type === 'success'
                    ? 'bg-white dark:bg-[#111827] border-emerald-200 dark:border-emerald-900/70 text-slate-900 dark:text-slate-100'
                    : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
              }`}
            >
              {t.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              ) : t.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {t.title && <p className="text-xs font-bold mb-0.5">{t.title}</p>}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
      showErrorToast: () => {},
      showSuccessToast: () => {},
      dismissToast: () => {},
    };
  }
  return ctx;
}
