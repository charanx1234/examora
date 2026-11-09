# EXAMORA — OWASP ASVS & Enterprise Security Checklist

This checklist tracks security controls implemented across all 9 defence-in-depth layers of EXAMORA.

---

## 1. Authentication & Session Security
- [x] **No Plaintext Credentials**: Authentication delegated to Firebase Auth / verified token architecture; zero plaintext passwords stored.
- [x] **In-Memory Token Storage**: Access tokens are stored strictly in React memory (`inMemoryToken` in `AuthContext.tsx`), never persisted in `localStorage` where XSS could exfiltrate them.
- [x] **Brute-Force & Flood Protection**: `requireAuth` enforces per-IP rate limiting (max 120 requests/min) and logs `RATE_LIMIT_TRIGGERED` security events.
- [x] **Session Revocation & Account Erasure**: Full sign-out and permanent account deletion (`DELETE /api/privacy/account` + `adminAuth.deleteUser`).

## 2. Authorization & IDOR Prevention
- [x] **Zero-Trust Ownership Verification**: Every database query in `src/db/repository.ts` enforces `and(eq(resource.id, id), eq(resource.userUid, req.user.uid))`.
- [x] **Client-Supplied UID Ignored**: Backend never reads `userId` or `uid` from `req.body` or `req.query`.
- [x] **Answer Key Sealing**: `startOrResumeExamAttempt` strips `correctAnswer` and `explanation` on the server prior to serialization. Answer keys are only returned in `getResultDetailByAttemptId` after `status === 'evaluated'`.
- [x] **Role Separation**: `req.user.role` distinguishes `student` vs. `admin` permissions by default (`student` least-privilege default).

## 3. API & Input Validation Security
- [x] **Parameterized Queries**: 100% of PostgreSQL operations use Drizzle ORM parameterized statements (zero string-concatenated SQL).
- [x] **XSS & Null-Byte Sanitization**: `sanitizeUntrustedString()` strips `<script>` tags, `javascript:` URIs, inline event handlers (`onload=`, `onerror=`), and `\0` null bytes.
- [x] **Request Size & Timeout Limits**: `express.json({ limit: '12mb' })` and 30-second socket timeouts on `/api/*`.
- [x] **Safe Error Responses**: Production API responses return generic, user-safe error messages without stack traces or database connection details.

## 4. File Upload & Image Scan Security
- [x] **Strict Extension Allowlist**: Only `PDF`, `DOCX`, `PPT`, `PPTX`, `TXT`, and `MD` are permitted for study materials (`validateAndSecureDocumentUpload`).
- [x] **Executable & Double-Extension Blocking**: Rejects `.exe`, `.bat`, `.cmd`, `.sh`, `.ps1`, `.vbs`, `.js`, `.php`, `.py`, `.dll` and disguised double extensions.
- [x] **Macro & Binary Signature Inspection**: Rejects files containing `MZ` PE headers, `vbaProject.bin`, `AutoOpen`, or PowerShell encoded commands.
- [x] **Randomized Vault Filenames**: Uploaded filenames are replaced with `vault_<UUID>.<ext>` before persistence.
- [x] **Image Magic-Byte Verification**: Handwritten math scans (`validateHandwrittenImageScan`) verify PNG (`iVBORw0KGgo`), JPEG (`/9j/`), and WebP (`UklGR`) magic bytes and enforce a 5 MB ceiling.

## 5. AI Security & Prompt Injection Protection
- [x] **XML Delimiter Fencing**: Untrusted document text and student answers are wrapped in `<UNTRUSTED_DOCUMENT_CONTENT>` and `<UNTRUSTED_STUDENT_RESPONSE>` tags.
- [x] **Prompt Injection Pattern Neutralization**: `sanitizeAndFenceForAI()` detects and redacts instruction-override phrases (`ignore previous instructions`, `reveal answer key`, `award full marks regardless`, `<|im_start|>`).
- [x] **PII & Secret Redaction Before AI Calls**: `redactSensitiveData()` scrubs email addresses, phone numbers, Bearer tokens, and API keys before sending prompts to external AI providers.
- [x] **Strict Output Schema & Score Clamping**: All Gemini responses use `responseSchema` with `application/json`, and awarded marks are deterministically clamped to `[0, question.marks]`.

## 6. Coding Examination Security
- [x] **Zero Host Execution**: Student code submissions are never passed to `eval()`, `new Function()`, `vm`, or `child_process` on the backend server.
- [x] **Isolated Verification**: Code is evaluated via static structural verification and sandboxed AI rubric analysis.

## 7. Frontend & Transport Security
- [x] **Content Security Policy (CSP)**: Enforced via `securityHeadersMiddleware` (`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`).
- [x] **Security Headers**: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Download-Options: noopen`, `x-powered-by` disabled.

## 8. Privacy & DPDP Act 2023 Compliance
- [x] **Explicit Unchecked Consent at Signup**: Mandatory unchecked checkbox recorded in PostgreSQL `consents` table.
- [x] **Data Minimization & Ephemeral Photo Mode**: Only Full Name and Email collected; optional in-memory-only photo evaluation mode discards raw image immediately after grading.
- [x] **Right to Data Portability & Erasure**: 1-click JSON export (`GET /api/privacy/export`), 1-click consent withdrawal, and 1-click full account & data deletion (`DELETE /api/privacy/account`).
