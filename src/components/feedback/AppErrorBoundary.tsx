import React, { Component, ErrorInfo } from 'react';
import { BookOpen, RefreshCw, Home } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * Global React Error Boundary for EXAMORA.
 * Catches unexpected rendering errors, logs sanitized information for developers,
 * never exposes stack traces to users, and renders a friendly recovery screen.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[EXAMORA ErrorBoundary] Caught unexpected rendering error:', {
      name: error?.name,
      message: error?.message,
      componentStackSummary: errorInfo?.componentStack?.split('\n').slice(0, 4).join(' | '),
    });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  handleReturnDashboard = (): void => {
    this.setState({ hasError: false });
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-[#0F172A] dark:text-amber-400" />
            </div>

            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500 mb-1">
              EXAMORA
            </div>

            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
              Something unexpected happened.
            </h1>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              We encountered an unexpected display issue while rendering this page. Your saved progress and account data remain safe.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F172A] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-amber-400 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleReturnDashboard}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
