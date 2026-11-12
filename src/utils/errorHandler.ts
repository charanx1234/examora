export type ErrorContext =
  | 'auth'
  | 'document_upload'
  | 'document_process'
  | 'exam_generate'
  | 'exam_start'
  | 'exam_submit'
  | 'result_load'
  | 'dashboard'
  | 'settings'
  | 'general';

export interface UserFriendlyError {
  code: string;
  title: string;
  message: string;
  actionLabel?: string;
  isSessionExpired?: boolean;
  isNetworkError?: boolean;
}

/**
 * Translates raw technical errors (API, SQL, Firebase, network, validation)
 * into clean, understandable user-facing explanations without leaking stack traces,
 * database query names, or internal identifiers.
 */
export function mapErrorToUserMessage(
  error: unknown,
  context: ErrorContext = 'general'
): UserFriendlyError {
  const rawMessage =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : (error as { message?: string; error?: string })?.message ||
          (error as { error?: string })?.error ||
          '';

  const rawCode =
    (error as { code?: string; status?: number })?.code ||
    String((error as { status?: number })?.status || '');

  const lower = `${rawCode} ${rawMessage}`.toLowerCase();

  // Log sanitized error for developer diagnostics without exposing in UI
  if (typeof console !== 'undefined') {
    console.warn(`[EXAMORA ErrorHandler][${context}]`, {
      code: rawCode || 'UNSPECIFIED',
      summary: rawMessage.slice(0, 180).replace(/select\s+.*from/gi, '[REDACTED_QUERY]'),
    });
  }

  // 1. Expired Session / 401 Unauthorized (non-login)
  if (
    context !== 'auth' &&
    (lower.includes('401') ||
      lower.includes('expired') ||
      lower.includes('token') ||
      lower.includes('unauthenticated') ||
      lower.includes('session'))
  ) {
    return {
      code: 'SESSION_EXPIRED',
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again.',
      actionLabel: 'Sign In Again',
      isSessionExpired: true,
    };
  }

  // 2. Permission / 403 Forbidden
  if (
    lower.includes('403') ||
    lower.includes('forbidden') ||
    lower.includes('permission') ||
    lower.includes('not authorized') ||
    lower.includes('access denied')
  ) {
    return {
      code: 'PERMISSION_DENIED',
      title: 'Access Restricted',
      message: "You don't have permission to access this information.",
      actionLabel: 'Back to Dashboard',
    };
  }

  // 3. Network / Offline / Fetch Errors
  const isNetwork =
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network-request-failed') ||
    lower.includes('network error') ||
    lower.includes('load failed') ||
    lower.includes('offline') ||
    lower.includes('connection refused') ||
    lower.includes('econnreset');

  if (isNetwork) {
    if (context === 'auth') {
      return {
        code: 'AUTH_NETWORK_ERROR',
        title: 'Connection Error',
        message: 'Unable to connect. Please check your internet connection and try again.',
        actionLabel: 'Try Again',
        isNetworkError: true,
      };
    }
    if (context === 'document_upload') {
      return {
        code: 'DOCUMENT_UPLOAD_NETWORK',
        title: 'Upload Interrupted',
        message: "We couldn't upload your document. Please check your connection and try again.",
        actionLabel: 'Retry Upload',
        isNetworkError: true,
      };
    }
    if (context === 'exam_submit') {
      return {
        code: 'EXAM_SUBMIT_NETWORK',
        title: 'Submission Interrupted',
        message: "Your answers couldn't be submitted. Please check your connection and try again.",
        actionLabel: 'Retry Submission',
        isNetworkError: true,
      };
    }
    return {
      code: 'NETWORK_ERROR',
      title: 'Connection Lost',
      message: "We couldn't connect to EXAMORA. Check your internet connection.",
      actionLabel: 'Retry Connection',
      isNetworkError: true,
    };
  }

  // 4. Context-specific mappings
  if (context === 'auth') {
    if (
      lower.includes('invalid') ||
      lower.includes('password') ||
      lower.includes('credential') ||
      lower.includes('user-not-found') ||
      lower.includes('wrong-password') ||
      lower.includes('401')
    ) {
      return {
        code: 'AUTH_INVALID_CREDENTIALS',
        title: 'Sign-In Failed',
        message: "We couldn't sign you in. Your email or password may be incorrect.",
        actionLabel: 'Try Again',
      };
    }
    if (lower.includes('consent') || lower.includes('privacy policy')) {
      return {
        code: 'AUTH_CONSENT_REQUIRED',
        title: 'Privacy Consent Required',
        message: 'Please agree to the Privacy Policy before creating your account.',
      };
    }
    if (lower.includes('rate') || lower.includes('too-many-requests') || lower.includes('429')) {
      return {
        code: 'AUTH_RATE_LIMITED',
        title: 'Too Many Attempts',
        message: 'Too many sign-in attempts. Please wait a moment and try again.',
      };
    }
    return {
      code: 'AUTH_ERROR',
      title: 'Authentication Issue',
      message: "We couldn't sign you in. Your email or password may be incorrect.",
      actionLabel: 'Try Again',
    };
  }

  if (context === 'document_upload') {
    if (
      lower.includes('unsupported') ||
      lower.includes('format') ||
      lower.includes('mime') ||
      lower.includes('extension') ||
      lower.includes('type')
    ) {
      return {
        code: 'UNSUPPORTED_FILE',
        title: 'Unsupported File Format',
        message: "This file format isn't supported. Please upload a supported document.",
      };
    }
    if (
      lower.includes('size') ||
      lower.includes('large') ||
      lower.includes('413') ||
      lower.includes('limit') ||
      lower.includes('exceed')
    ) {
      return {
        code: 'FILE_TOO_LARGE',
        title: 'File Too Large',
        message: 'Your file exceeds the allowed upload size.',
      };
    }
    return {
      code: 'DOCUMENT_UPLOAD_FAILED',
      title: 'Document Upload Failed',
      message: "We couldn't upload your document. Please check your connection and try again.",
      actionLabel: 'Retry Upload',
    };
  }

  if (context === 'document_process') {
    return {
      code: 'DOCUMENT_PROCESSING_FAILED',
      title: 'Document Processing Issue',
      message:
        "We couldn't read this document. It may be corrupted, password-protected or contain unsupported content.",
      actionLabel: 'Try Another Document',
    };
  }

  if (context === 'exam_generate' || context === 'exam_start') {
    return {
      code: 'EXAM_GENERATION_FAILED',
      title: 'Examination Generation Unavailable',
      message:
        "We couldn't generate your examination. Your study material may be insufficient or the service may be temporarily unavailable.",
      actionLabel: 'Retry Generation',
    };
  }

  if (context === 'exam_submit') {
    return {
      code: 'EXAM_SUBMISSION_FAILED',
      title: 'Submission Incomplete',
      message: "Your answers couldn't be submitted. Please check your connection and try again.",
      actionLabel: 'Retry Submission',
    };
  }

  if (context === 'result_load') {
    return {
      code: 'RESULT_LOAD_FAILED',
      title: 'Results Unavailable',
      message: "We couldn't retrieve your examination results right now.",
      actionLabel: 'Retry Loading Results',
    };
  }

  if (context === 'dashboard') {
    return {
      code: 'DASHBOARD_LOAD_FAILED',
      title: 'Unable to Load Workspace',
      message: 'Something went wrong on our end. Please try again later.',
      actionLabel: 'Retry Connection',
    };
  }

  // 5. Server / Database / 500 errors (never leak SQL or Drizzle details)
  if (
    lower.includes('500') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('drizzle') ||
    lower.includes('sql') ||
    lower.includes('database') ||
    lower.includes('timeout') ||
    lower.includes('server')
  ) {
    return {
      code: 'SERVER_ERROR',
      title: 'Service Temporarily Unavailable',
      message: 'Something went wrong on our end. Please try again later.',
      actionLabel: 'Try Again',
    };
  }

  // 6. Default fallback
  return {
    code: 'UNKNOWN_ERROR',
    title: 'Unexpected Issue',
    message: 'Something unexpected happened. Please try again.',
    actionLabel: 'Try Again',
  };
}
