# EXAMORA — Enterprise Threat Model (STRIDE & OWASP ASVS)

## 1. Executive Summary & Trust Boundaries

EXAMORA processes untrusted academic documents (`PDF`, `DOCX`, `PPT`, `TXT`, `MD`), handwritten mathematical derivation image scans, student-written source code, and natural-language essays, and interfaces with external LLM APIs (`@google/genai`) and a relational PostgreSQL database (`Cloud SQL`).

### Primary Trust Boundaries
1. **Browser Client <-> Express API Boundary (`/api/*`)**:
   - All client inputs, headers, query parameters, uploaded files, and user identifiers are treated as **100% untrusted**.
   - Ownership is derived exclusively from the verified server-side authentication token (`req.user.uid`), never from request bodies or query strings.
2. **Express API <-> AI Provider Boundary (`GeminiTeacherProvider`)**:
   - Uploaded document text and student answers are treated as **untrusted data payloads** that may contain indirect or direct prompt injection attacks.
   - All inputs are sanitized, PII-redacted, and wrapped inside explicit `<UNTRUSTED_*>` XML delimiters before leaving the backend.
   - All AI outputs are validated against strict JSON schemas before storage or rendering.
3. **Express API <-> PostgreSQL Database Boundary (`Drizzle ORM`)**:
   - All SQL queries execute through parameterized Drizzle ORM statements with explicit `eq(table.userUid, uid)` ownership predicates.
4. **Student Code Submission <-> Verification Sandbox Boundary**:
   - Student-submitted source code (`JavaScript`, `Python`, `C++`) is **never** executed via `eval()`, `Function()`, or `child_process` on the application host.

---

## 2. STRIDE Threat Analysis Matrix

| Threat Category | Attack Vector in EXAMORA | Impact | Implemented Countermeasure |
| :--- | :--- | :--- | :--- |
| **S — Spoofing** | Forged identity headers or client-supplied `user_id` to impersonate another scholar. | High | Server-side `requireAuth` middleware verifies Bearer tokens (`adminAuth.verifyIdToken`) and binds all operations to `req.user.uid`. Per-IP brute-force rate limiting blocks credential stuffing. |
| **T — Tampering** | Student modifies question marks, negative marking, or timer state, or attempts Mass Assignment on profile/results. | High | Marks, rubrics, and grading calculations execute exclusively on the server (`POST /api/attempts/:attemptId/submit`) using canonical database records from `questions` and `exams`. |
| **R — Repudiation** | Unrecorded consent changes, unauthorized access attempts, or account deletion disputes. | Medium | Structured security audit logging (`src/security/securityEngine.ts`) and immutable timestamped `consents` ledger in PostgreSQL (`DPDP Act 2023`). |
| **I — Information Disclosure** | Premature exposure of `correctAnswer` or `explanation` before exam submission; stack trace leakage; horizontal IDOR across students. | Critical | `startOrResumeExamAttempt` explicitly strips `correctAnswer` and `explanation` on the server before returning questions. Every DB query filters by `and(eq(table.id, resourceId), eq(table.userUid, req.user.uid))`. |
| **D — Denial of Service** | Flooding `/api/exams/generate` or `/api/documents` to exhaust AI quotas or server memory; oversized file uploads. | High | Per-user AI rate limiting (10 req/min), per-IP request throttling (120 req/min), 30s request timeouts, 10 MB document size cap, and 5 MB image scan cap. |
| **E — Elevation of Privilege** | Prompt injection inside uploaded PDFs or essays attempting to force the AI to award 100% marks or reveal system prompts; malicious code execution in Coding mode. | Critical | `sanitizeAndFenceForAI()` strips injection patterns and fences untrusted text inside `<UNTRUSTED_STUDENT_RESPONSE>`. Awarded marks are clamped to `[0, question.marks]`. Student code is never executed on the host. |

---

## 3. Residual Risks & Ongoing Mitigations

1. **LLM Hallucination / Subjective Grading Variance**:
   - *Risk*: AI rubric grading on complex handwritten derivations may occasionally misread ambiguous handwriting.
   - *Mitigation*: Built-in `requiresManualReview` flag automatically triggers when handwriting is ambiguous instead of guessing.
2. **Distributed Multi-IP Rate Limiting**:
   - *Risk*: In-memory rate limit maps reset across horizontal container restarts.
   - *Mitigation*: Cloud Run / Load Balancer edge rate limiting and per-UID token bucket enforcement.
