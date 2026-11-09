import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export type SecurityEventType =
  | 'AUTH_FAILURE'
  | 'AUTHZ_DENIED'
  | 'RATE_LIMIT_TRIGGERED'
  | 'PROMPT_INJECTION_DETECTED'
  | 'MALICIOUS_FILE_REJECTED'
  | 'SUSPICIOUS_INPUT_SANITIZED'
  | 'ACCOUNT_ERASURE'
  | 'CONSENT_UPDATED'
  | 'ADMIN_ACTION';

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  eventType: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actorUid: string;
  ipHash: string;
  endpoint: string;
  details: string;
}

const securityAuditBuffer: SecurityAuditEntry[] = [];
const MAX_AUDIT_BUFFER = 250;

/**
 * Redacts secrets, Bearer tokens, API keys, and sensitive PII from logs or AI payloads.
 */
export function redactSensitiveData(text: string): string {
  if (!text) return '';
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/sk-[A-Za-z0-9]{20,}/g, '[REDACTED_SECRET_KEY]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');
}

/**
 * Structured Security Audit Logger (Never logs passwords, raw tokens, or private keys).
 */
export function logSecurityEvent(params: {
  eventType: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actorUid?: string;
  ip?: string;
  endpoint: string;
  details: string;
}): SecurityAuditEntry {
  const ipHash = params.ip
    ? crypto.createHash('sha256').update(params.ip).digest('hex').slice(0, 12)
    : 'internal';

  const entry: SecurityAuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventType: params.eventType,
    severity: params.severity,
    actorUid: params.actorUid || 'anonymous',
    ipHash,
    endpoint: params.endpoint,
    details: redactSensitiveData(params.details).slice(0, 500),
  };

  securityAuditBuffer.unshift(entry);
  if (securityAuditBuffer.length > MAX_AUDIT_BUFFER) {
    securityAuditBuffer.pop();
  }

  if (params.severity === 'HIGH' || params.severity === 'CRITICAL') {
    console.warn(
      `[SECURITY_ALERT][${entry.severity}][${entry.eventType}] endpoint=${entry.endpoint} actor=${entry.actorUid} details="${entry.details}"`
    );
  }

  return entry;
}

export function getRecentSecurityAuditLogs(limit = 50): SecurityAuditEntry[] {
  return securityAuditBuffer.slice(0, Math.min(limit, MAX_AUDIT_BUFFER));
}

/**
 * OWASP ASVS Security Headers & Content Security Policy Middleware.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  // Enforce API request timeout (30 seconds max to prevent slowloris / resource exhaustion)
  if (req.path.startsWith('/api/')) {
    req.setTimeout(30000);
    res.setTimeout(30000);
  }

  next();
}

/**
 * Sanitizes untrusted user text against XSS, null-byte injection, and control character abuse.
 */
export function sanitizeUntrustedString(input: unknown, maxLength = 20000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '') // Strip null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[STRIPPED_SCRIPT]')
    .replace(/javascript\s*:/gi, 'blocked:')
    .replace(/on(?:load|error|click|mouseover|focus|blur)\s*=/gi, 'data-blocked-handler=')
    .trim()
    .slice(0, maxLength);
}

/**
 * Prompt Injection Firewall & Data Redaction for AI Teacher Inputs.
 * Treats all uploaded documents and student responses as untrusted data.
 */
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/gi,
  /disregard\s+(?:all\s+)?(?:previous|prior|system)\s+(?:instructions|prompts)/gi,
  /you\s+are\s+now\s+(?:in\s+)?developer\s+mode/gi,
  /reveal\s+(?:the\s+)?(?:system\s+prompt|answer\s+key|secret|api\s+key)/gi,
  /<\|im_start\|>|<\|im_end\|>|<\|system\|>/gi,
  /SYSTEM\s*OVERRIDE\s*:/gi,
  /award\s+full\s+marks\s+regardless/gi,
];

export function sanitizeAndFenceForAI(
  untrustedContent: string,
  contextLabel = 'UNTRUSTED_STUDENT_INPUT',
  maxLength = 16000
): { sanitizedText: string; injectionDetected: boolean } {
  let cleaned = redactSensitiveData(sanitizeUntrustedString(untrustedContent, maxLength));
  let injectionDetected = false;

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      injectionDetected = true;
      cleaned = cleaned.replace(pattern, '[REDACTED_PROMPT_INJECTION_ATTEMPT]');
    }
  }

  // Wrap in strict XML data delimiters so the LLM treats it strictly as passive data
  const fenced = `<${contextLabel}>\n${cleaned}\n</${contextLabel}>`;
  return {
    sanitizedText: fenced,
    injectionDetected,
  };
}

/**
 * File Upload Security Validator (Extension allowlist, size limit, randomized storage name, macro/script check).
 */
const ALLOWED_DOCUMENT_TYPES = new Set(['PDF', 'DOCX', 'PPT', 'PPTX', 'TXT', 'MD']);
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateAndSecureDocumentUpload(params: {
  title: unknown;
  fileName: unknown;
  fileType: unknown;
  fileSize: unknown;
  rawText: unknown;
}): {
  valid: boolean;
  error?: string;
  sanitized?: {
    title: string;
    originalFileName: string;
    randomizedStorageName: string;
    fileType: string;
    fileSize: number;
    rawText: string;
  };
} {
  const title = sanitizeUntrustedString(params.title, 200);
  const rawFileName = sanitizeUntrustedString(params.fileName || 'study_material.txt', 255);
  const extFromFile = rawFileName.split('.').pop()?.toUpperCase() || 'TXT';
  const requestedType = sanitizeUntrustedString(params.fileType || extFromFile, 12).toUpperCase();
  const fileType = ALLOWED_DOCUMENT_TYPES.has(requestedType)
    ? requestedType
    : ALLOWED_DOCUMENT_TYPES.has(extFromFile)
    ? extFromFile
    : '';

  if (!fileType) {
    return {
      valid: false,
      error: 'Unsupported or disallowed file extension. Allowed formats: PDF, DOCX, PPT, PPTX, TXT, MD.',
    };
  }

  // Reject double extensions that mask executables (e.g., notes.pdf.exe, script.bat)
  if (/\.(exe|bat|cmd|sh|ps1|vbs|js|jar|msi|php|py|dll)(\.|$)/i.test(rawFileName)) {
    return {
      valid: false,
      error: 'Executable or script file names are strictly prohibited.',
    };
  }

  const rawText = typeof params.rawText === 'string' ? params.rawText : '';
  const computedSize = Number(params.fileSize) || Buffer.byteLength(rawText, 'utf8');

  if (computedSize <= 0 || computedSize > MAX_DOCUMENT_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the maximum allowed limit of 10 MB.`,
    };
  }

  // Malware / Macro / Embedded Script Signature Check
  if (
    rawText.startsWith('MZ') ||
    /vbaProject\.bin|AutoOpen|Document_Open|WScript\.Shell|powershell\s+-enc/i.test(rawText)
  ) {
    return {
      valid: false,
      error: 'File rejected: Potentially malicious macro or executable signature detected.',
    };
  }

  const sanitizedText = sanitizeUntrustedString(rawText, 20000);
  if (!title || sanitizedText.length < 20) {
    return {
      valid: false,
      error: 'Document title and at least 20 characters of valid text content are required.',
    };
  }

  const randomizedStorageName = `vault_${crypto.randomUUID()}.${fileType.toLowerCase()}`;

  return {
    valid: true,
    sanitized: {
      title,
      originalFileName: rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_'),
      randomizedStorageName,
      fileType,
      fileSize: computedSize,
      rawText: sanitizedText,
    },
  };
}

/**
 * Validates uploaded handwritten math solution images (MIME type, magic bytes, max size).
 */
export function validateHandwrittenImageScan(dataUrl: unknown): {
  valid: boolean;
  sanitizedDataUrl: string | null;
  error?: string;
} {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { valid: true, sanitizedDataUrl: null };
  }

  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return {
      valid: false,
      sanitizedDataUrl: null,
      error: 'Invalid image format. Only PNG, JPEG, and WebP base64 scans are accepted.',
    };
  }

  const mimeType = match[1];
  const base64Payload = match[2];

  // Max 5MB image scan
  const byteSize = Math.floor((base64Payload.length * 3) / 4);
  if (byteSize > 5 * 1024 * 1024) {
    return {
      valid: false,
      sanitizedDataUrl: null,
      error: 'Handwritten image scan exceeds the 5 MB limit.',
    };
  }

  // Verify file magic byte signatures in base64
  const validPng = mimeType === 'image/png' && base64Payload.startsWith('iVBORw0KGgo');
  const validJpeg =
    (mimeType === 'image/jpeg' || mimeType === 'image/jpg') && base64Payload.startsWith('/9j/');
  const validWebp = mimeType === 'image/webp' && base64Payload.startsWith('UklGR');

  if (!validPng && !validJpeg && !validWebp) {
    return {
      valid: false,
      sanitizedDataUrl: null,
      error: 'Image file signature mismatch (magic bytes do not match declared MIME type).',
    };
  }

  return {
    valid: true,
    sanitizedDataUrl: `data:${mimeType};base64,${base64Payload}`,
  };
}
