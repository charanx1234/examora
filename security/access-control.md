# EXAMORA — Access Control & Zero-Trust Ownership Specification

## 1. Access Control Principles

1. **Deny by Default**: Every `/api/*` endpoint (except static public assets) requires a valid, cryptographically verified `Authorization: Bearer <token>` header validated by `requireAuth` (`src/middleware/auth.ts`).
2. **Zero-Trust Ownership Binding**: The backend **never** accepts `userId` or `userUid` from client request bodies, query parameters, or URL paths. The canonical identity is extracted exclusively from `req.user.uid`.
3. **Horizontal Isolation (IDOR Prevention)**: Every database read, update, and delete operation in `src/db/repository.ts` scopes the query by `eq(table.userUid, req.user.uid)`.
4. **Temporal Access Control (Sealed Answer Keys)**: Even the legitimate owner of an examination is **denied read access** to `questions.correct_answer` and `questions.explanation` while the examination attempt is in progress (`status = 'in_progress'`).

---

## 2. Role-Based & Resource Ownership Matrix

| Resource / Endpoint | Anonymous | Authenticated Student (Owner) | Authenticated Student (Non-Owner) | System / Evaluator |
| :--- | :---: | :---: | :---: | :---: |
| `POST /api/auth/sync` | Deny (`401`) | Allow (Own Profile) | Deny | Allow |
| `GET /api/dashboard` | Deny (`401`) | Allow (Own Rows Only) | Deny (`0` rows returned) | Allow |
| `POST /api/documents` | Deny (`401`) | Allow (Max 10 MB, Validated) | Deny | Allow |
| `DELETE /api/documents/:id` | Deny (`401`) | Allow (`WHERE id = :id AND user_uid = :uid`) | Deny (No-op / Isolated) | Allow |
| `POST /api/exams/generate` | Deny (`401`) | Allow (Rate-limited 10/min) | Deny | Allow |
| `POST /api/attempts/start` | Deny (`401`) | Allow (**Answer Keys Stripped**) | Deny (`Examination not found`) | Allow |
| `PUT /api/attempts/:id/save` | Deny (`401`) | Allow (`WHERE id = :id AND user_uid = :uid`) | Deny | Allow |
| `POST /api/attempts/:id/submit` | Deny (`401`) | Allow (`WHERE id = :id AND user_uid = :uid`) | Deny | Reveal Answer Key After Grading |
| `GET /api/results/:attemptId` | Deny (`401`) | Allow (Evaluated Attempts Only) | Deny (`Result record not found`) | Allow |
| `GET /api/privacy/export` | Deny (`401`) | Allow (Own Data Bundle Only) | Deny | Allow |
| `DELETE /api/privacy/account` | Deny (`401`) | Allow (Erases Own Account & Data) | Deny | Allow |

---

## 3. PostgreSQL Least-Privilege & Row-Level Isolation

- **Foreign Key Cascade Integrity**: All child tables (`documents`, `topics`, `exams`, `attempts`, `answers`, `results`, `topic_performance`, `consents`) reference `users(uid)` with `ON DELETE CASCADE`, guaranteeing zero orphaned PII records when an account is deleted.
- **Runtime vs. Migration Account Separation**:
  - Runtime queries use `SQL_USER` (`app_user`) with DML privileges (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
  - Schema DDL migrations use `SQL_ADMIN_USER` (`postgres`) strictly during controlled `drizzle-kit push` updates.
