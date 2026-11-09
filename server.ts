import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import * as dotenv from 'dotenv';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  updateUserProfile,
  getStudentDashboardData,
  createDocumentRecord,
  createExamWithQuestions,
  startOrResumeExamAttempt,
  saveAttemptProgress,
  getAttemptFullDataForEvaluation,
  storeEvaluationResults,
  getResultDetailByAttemptId,
  recordUserConsent,
  getUserConsentsHistory,
  deleteDocumentById,
  exportUserDataBundle,
  deleteAllUserAccountData,
} from './src/db/repository.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { getAITeacherProvider } from './src/services/ai/factory.ts';
import {
  securityHeadersMiddleware,
  validateAndSecureDocumentUpload,
  validateHandwrittenImageScan,
  sanitizeUntrustedString,
  logSecurityEvent,
  getRecentSecurityAuditLogs,
} from './src/security/securityEngine.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.disable('x-powered-by');
  app.use(securityHeadersMiddleware);

  // Allow up to 12MB JSON payloads for document text & handwritten math solution scans
  app.use(express.json({ limit: '12mb' }));

  // Simple in-memory rate limiter for AI generation endpoints per user UID
  const aiRateLimitMap = new Map<string, number[]>();
  const checkAiRateLimit = (uid: string, maxPerMinute = 10): boolean => {
    const now = Date.now();
    const timestamps = (aiRateLimitMap.get(uid) || []).filter((t) => now - t < 60000);
    if (timestamps.length >= maxPerMinute) {
      return false;
    }
    timestamps.push(now);
    aiRateLimitMap.set(uid, timestamps);
    return true;
  };

  // 1. Synchronize Authenticated Student Profile
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'scholar@examora.edu';
      const fullName = req.body.fullName || req.user!.name || email.split('@')[0];
      const avatarUrl = req.body.avatarUrl || req.user!.picture || undefined;

      const user = await getOrCreateUser(uid, email, fullName, avatarUrl);
      if (typeof req.body.consentGiven === 'boolean') {
        await recordUserConsent(
          uid,
          req.body.consentGiven,
          req.body.consentTextVersion || 'DPDP-2023-v1.0',
          req.body.consentText
        );
      }
      const consentsHistory = await getUserConsentsHistory(uid);
      res.json({ user, latestConsent: consentsHistory[0] || null });
    } catch (error: any) {
      console.error('Error in /api/auth/sync:', error);
      res.status(500).json({ error: error.message || 'Failed to synchronize student account' });
    }
  });

  // 2. Update Student Profile Preferences
  app.patch('/api/auth/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { fullName, academicLevel, targetGoal, preferredDifficulty } = req.body;
      const updated = await updateUserProfile(uid, {
        fullName,
        academicLevel,
        targetGoal,
        preferredDifficulty,
      });
      res.json({ user: updated });
    } catch (error: any) {
      console.error('Error in /api/auth/profile:', error);
      res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
  });

  // 3. Get Student Dashboard & Performance Analytics
  app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'scholar@examora.edu';
      await getOrCreateUser(uid, email, req.user!.name, req.user!.picture);
      const dashboardData = await getStudentDashboardData(uid);
      res.json(dashboardData);
    } catch (error: any) {
      console.error('Error in /api/dashboard:', error);
      res.status(500).json({ error: error.message || 'Failed to load dashboard data' });
    }
  });

  // 4. Upload & Analyze Study Document via AI Teacher
  app.post('/api/documents', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      if (!checkAiRateLimit(uid)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment before analyzing another document.' });
      }

      const uploadCheck = validateAndSecureDocumentUpload(req.body);
      if (!uploadCheck.valid || !uploadCheck.sanitized) {
        logSecurityEvent({
          eventType: 'MALICIOUS_FILE_REJECTED',
          severity: 'MEDIUM',
          actorUid: uid,
          endpoint: '/api/documents',
          details: uploadCheck.error || 'Invalid document upload rejected',
        });
        return res.status(400).json({ error: uploadCheck.error || 'Invalid document upload.' });
      }

      const { title, randomizedStorageName, fileType, fileSize, rawText } = uploadCheck.sanitized;

      const aiProvider = getAITeacherProvider();
      const analysis = await aiProvider.analyzeDocument(title, rawText);

      const savedDoc = await createDocumentRecord(uid, {
        title,
        fileName: randomizedStorageName,
        fileType,
        fileSize,
        subject: analysis.subject,
        extractedText: rawText,
        chaptersJson: analysis.chapters,
      });

      res.status(201).json({
        document: savedDoc,
        analysis,
      });
    } catch (error: any) {
      console.error('Error in POST /api/documents:', error);
      res.status(500).json({ error: 'Failed to analyze and store document' });
    }
  });

  // 5. Generate Personalized AI Examination Paper
  app.post('/api/exams/generate', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      if (!checkAiRateLimit(uid)) {
        return res.status(429).json({ error: 'AI generation rate limit reached. Please wait 60 seconds.' });
      }

      const {
        documentId,
        title,
        subject,
        topicNames,
        sourceType,
        difficulty,
        format,
        questionCount,
        durationMinutes,
        totalMarks,
        negativeMarking,
        sourceContext,
      } = req.body;

      if (!subject || !Array.isArray(topicNames) || topicNames.length === 0) {
        return res.status(400).json({ error: 'Subject and at least one topic are required.' });
      }

      const count = Math.max(1, Math.min(15, Number(questionCount) || 5));
      const marks = Math.max(10, Number(totalMarks) || count * 10);
      const duration = Math.max(5, Number(durationMinutes) || 30);
      const neg = Math.max(0, Number(negativeMarking) || 0);

      const aiProvider = getAITeacherProvider();
      const generatedQuestions = await aiProvider.generateQuestions({
        subject,
        topics: topicNames,
        difficulty: difficulty || 'Medium',
        format: format || 'MCQ',
        questionCount: count,
        totalMarks: marks,
        negativeMarking: neg,
        sourceContext,
      });

      const created = await createExamWithQuestions(
        uid,
        {
          documentId: documentId || null,
          title: title || `${subject}: ${topicNames.slice(0, 2).join(' & ')} Exam`,
          subject,
          topicNames,
          sourceType: sourceType || 'topic',
          difficulty: difficulty || 'Medium',
          format: format || 'MCQ',
          questionCount: generatedQuestions.length,
          durationMinutes: duration,
          totalMarks: marks,
          negativeMarking: neg,
        },
        generatedQuestions
      );

      res.status(201).json(created);
    } catch (error: any) {
      console.error('Error in POST /api/exams/generate:', error);
      res.status(500).json({ error: error.message || 'Failed to generate AI examination paper' });
    }
  });

  // 6. Start or Resume an Examination Attempt (Answer Keys Stripped)
  app.post('/api/attempts/start', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { examId } = req.body;
      if (!examId) {
        return res.status(400).json({ error: 'examId is required' });
      }
      const sessionData = await startOrResumeExamAttempt(uid, examId);
      res.json(sessionData);
    } catch (error: any) {
      console.error('Error in POST /api/attempts/start:', error);
      res.status(500).json({ error: error.message || 'Failed to start examination session' });
    }
  });

  // 7. Auto-Save Examination Progress & Answer
  app.put('/api/attempts/:attemptId/save', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { attemptId } = req.params;
      const { timeRemainingSeconds, currentQuestionIndex, markedForReviewJson, answer } = req.body;

      let sanitizedAnswer = answer;
      if (answer) {
        const imgCheck = validateHandwrittenImageScan(answer.handwrittenImageData);
        if (!imgCheck.valid) {
          logSecurityEvent({
            eventType: 'MALICIOUS_FILE_REJECTED',
            severity: 'MEDIUM',
            actorUid: uid,
            endpoint: `/api/attempts/${attemptId}/save`,
            details: imgCheck.error || 'Rejected invalid handwritten image scan',
          });
          return res.status(400).json({ error: imgCheck.error });
        }
        sanitizedAnswer = {
          questionId: sanitizeUntrustedString(answer.questionId, 128),
          answerText: sanitizeUntrustedString(answer.answerText, 16000),
          codeLanguage: answer.codeLanguage ? sanitizeUntrustedString(answer.codeLanguage, 32) : undefined,
          handwrittenImageData: imgCheck.sanitizedDataUrl || undefined,
        };
      }

      const updated = await saveAttemptProgress(uid, attemptId, {
        timeRemainingSeconds: Number(timeRemainingSeconds) || 0,
        currentQuestionIndex: Number(currentQuestionIndex) || 0,
        markedForReviewJson: Array.isArray(markedForReviewJson) ? markedForReviewJson : [],
        answer: sanitizedAnswer,
      });

      res.json({ attempt: updated });
    } catch (error: any) {
      console.error('Error in PUT /api/attempts/:attemptId/save:', error);
      res.status(500).json({ error: error.message || 'Failed to save progress' });
    }
  });

  // 8. Submit Examination & Run Deterministic + AI Rubric Evaluation
  app.post('/api/attempts/:attemptId/submit', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { attemptId } = req.params;
      const { answersPayload, timeTakenSeconds, ephemeralPhotoMode } = req.body;

      const fullData = await getAttemptFullDataForEvaluation(uid, attemptId);
      const { exam, questions: examQuestions, answers: existingAnswers } = fullData;

      const answerMap = new Map<string, any>();
      for (const a of existingAnswers) {
        answerMap.set(a.questionId, {
          answerText: a.answerText,
          codeLanguage: a.codeLanguage,
          handwrittenImageData: a.handwrittenImageData,
        });
      }
      if (Array.isArray(answersPayload)) {
        for (const item of answersPayload) {
          answerMap.set(item.questionId, {
            answerText: item.answerText ?? '',
            codeLanguage: item.codeLanguage ?? null,
            handwrittenImageData: item.handwrittenImageData ?? null,
          });
        }
      }

      const aiProvider = getAITeacherProvider();
      const evaluatedAnswers: Array<{
        questionId: string;
        answerText: string;
        codeLanguage?: string | null;
        handwrittenImageData?: string | null;
        isCorrect: boolean;
        awardedMarks: number;
        aiFeedback: string;
        conceptualMistake?: string | null;
        requiresManualReview?: boolean;
      }> = [];

      let obtainedMarks = 0;
      let correctCount = 0;
      let partialCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;

      const topicStatsMap = new Map<
        string,
        { attempted: number; correct: number; earnedMarks: number; maxMarks: number }
      >();

      for (const q of examQuestions) {
        const sub = answerMap.get(q.id) || { answerText: '', codeLanguage: null, handwrittenImageData: null };
        const trimmedAns = (sub.answerText || '').trim();
        const hasImage = Boolean(sub.handwrittenImageData);

        if (!trimmedAns && !hasImage) {
          unansweredCount++;
          evaluatedAnswers.push({
            questionId: q.id,
            answerText: '',
            codeLanguage: sub.codeLanguage,
            handwrittenImageData: null,
            isCorrect: false,
            awardedMarks: 0,
            aiFeedback: 'Question was not answered.',
            conceptualMistake: 'Unanswered question.',
            requiresManualReview: false,
          });

          const tStat = topicStatsMap.get(q.topic) || { attempted: 0, correct: 0, earnedMarks: 0, maxMarks: 0 };
          tStat.maxMarks += q.marks;
          topicStatsMap.set(q.topic, tStat);
          continue;
        }

        // Deterministic evaluation for MCQs
        if (q.questionType === 'MCQ') {
          const isExactMatch =
            trimmedAns.toLowerCase() === q.correctAnswer.trim().toLowerCase();
          const marksAwarded = isExactMatch ? q.marks : -Math.abs(q.negativeMarks || 0);
          obtainedMarks += marksAwarded;
          if (isExactMatch) {
            correctCount++;
          } else {
            incorrectCount++;
          }

          evaluatedAnswers.push({
            questionId: q.id,
            answerText: trimmedAns,
            codeLanguage: null,
            handwrittenImageData: null,
            isCorrect: isExactMatch,
            awardedMarks: marksAwarded,
            aiFeedback: isExactMatch
              ? `Correct! ${q.explanation}`
              : `Incorrect. The correct answer is "${q.correctAnswer}". ${q.explanation}`,
            conceptualMistake: isExactMatch
              ? null
              : `Selected "${trimmedAns}" instead of "${q.correctAnswer}".`,
            requiresManualReview: false,
          });

          const tStat = topicStatsMap.get(q.topic) || { attempted: 0, correct: 0, earnedMarks: 0, maxMarks: 0 };
          tStat.attempted += 1;
          if (isExactMatch) tStat.correct += 1;
          tStat.earnedMarks += Math.max(0, marksAwarded);
          tStat.maxMarks += q.marks;
          topicStatsMap.set(q.topic, tStat);
        } else {
          // AI-assisted rubric evaluation for Descriptive, Coding, and Mathematics (including handwritten scans)
          const evalResult = await aiProvider.evaluateSubjectiveAnswer({
            questionId: q.id,
            questionType: q.questionType,
            topic: q.topic,
            prompt: q.prompt,
            maxMarks: q.marks,
            negativeMarks: q.negativeMarks,
            correctAnswer: q.correctAnswer,
            rubric: Array.isArray(q.rubricJson) ? (q.rubricJson as any) : [],
            studentAnswerText: trimmedAns,
            codeLanguage: sub.codeLanguage,
            handwrittenImageData: sub.handwrittenImageData,
          });

          obtainedMarks += evalResult.awardedMarks;
          if (evalResult.awardedMarks >= q.marks * 0.85) {
            correctCount++;
          } else if (evalResult.awardedMarks > 0) {
            partialCount++;
          } else {
            incorrectCount++;
          }

          evaluatedAnswers.push({
            questionId: q.id,
            answerText: trimmedAns,
            codeLanguage: sub.codeLanguage,
            // Data minimization: if ephemeral / diagnosis-only mode is enabled, discard raw uploaded photo after evaluation
            handwrittenImageData: ephemeralPhotoMode ? null : sub.handwrittenImageData,
            isCorrect: evalResult.isCorrect,
            awardedMarks: evalResult.awardedMarks,
            aiFeedback: evalResult.aiFeedback,
            conceptualMistake: evalResult.conceptualMistake,
            requiresManualReview: evalResult.requiresManualReview,
          });

          const tStat = topicStatsMap.get(q.topic) || { attempted: 0, correct: 0, earnedMarks: 0, maxMarks: 0 };
          tStat.attempted += 1;
          if (evalResult.isCorrect) tStat.correct += 1;
          tStat.earnedMarks += Math.max(0, evalResult.awardedMarks);
          tStat.maxMarks += q.marks;
          topicStatsMap.set(q.topic, tStat);
        }
      }

      const clampedObtained = Number(Math.max(0, obtainedMarks).toFixed(2));
      const percentage = Number(
        Math.min(100, Math.max(0, (clampedObtained / Math.max(1, exam.totalMarks)) * 100)).toFixed(1)
      );
      const grade =
        percentage >= 90
          ? 'A+'
          : percentage >= 80
          ? 'A'
          : percentage >= 70
          ? 'B+'
          : percentage >= 60
          ? 'B'
          : percentage >= 50
          ? 'C'
          : 'D';

      const synthesis = await aiProvider.synthesizePerformance(
        exam.subject,
        percentage,
        evaluatedAnswers.map((ea) => {
          const qObj = examQuestions.find((q) => q.id === ea.questionId);
          return {
            topic: qObj?.topic || exam.subject,
            awardedMarks: ea.awardedMarks,
            maxMarks: qObj?.marks || 10,
            mistake: ea.conceptualMistake,
          };
        })
      );

      const topicUpdates = Array.from(topicStatsMap.entries()).map(([topic, stat]) => ({
        subject: exam.subject,
        topic,
        attempted: Math.max(1, stat.attempted),
        correct: stat.correct,
        scoreRatio: stat.maxMarks > 0 ? stat.earnedMarks / stat.maxMarks : 0,
      }));

      const savedResult = await storeEvaluationResults(
        uid,
        attemptId,
        exam.id,
        evaluatedAnswers,
        {
          totalMarks: exam.totalMarks,
          obtainedMarks: clampedObtained,
          percentage,
          grade,
          timeTakenSeconds: Number(timeTakenSeconds) || exam.durationMinutes * 60,
          correctCount,
          partialCount,
          incorrectCount,
          unansweredCount,
          overallFeedback: synthesis.overallFeedback,
          weakTopicsJson: synthesis.weakTopics,
          recommendationsJson: synthesis.recommendations,
        },
        topicUpdates
      );

      res.json({ result: savedResult, attemptId });
    } catch (error: any) {
      console.error('Error in POST /api/attempts/:attemptId/submit:', error);
      res.status(500).json({ error: error.message || 'Failed to evaluate examination' });
    }
  });

  // 9. Get Detailed Evaluation Report for an Attempt
  app.get('/api/results/:attemptId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { attemptId } = req.params;
      const report = await getResultDetailByAttemptId(uid, attemptId);
      res.json(report);
    } catch (error: any) {
      console.error('Error in GET /api/results/:attemptId:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch result report' });
    }
  });

  // 10. Delete a Saved Study Document / Plant Entry (Data Minimization)
  app.delete('/api/documents/:documentId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { documentId } = req.params;
      await deleteDocumentById(uid, documentId);
      res.json({ deleted: true });
    } catch (error: any) {
      console.error('Error in DELETE /api/documents/:documentId:', error);
      res.status(500).json({ error: error.message || 'Failed to delete document' });
    }
  });

  // 11. DPDP Act 2023: Get User Consent Ledger
  app.get('/api/privacy/consents', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const consents = await getUserConsentsHistory(uid);
      res.json({ consents });
    } catch (error: any) {
      console.error('Error in GET /api/privacy/consents:', error);
      res.status(500).json({ error: error.message || 'Failed to load consent records' });
    }
  });

  // 12. DPDP Act 2023: Record or Withdraw Consent
  app.post('/api/privacy/consent', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'scholar@examora.edu';
      await getOrCreateUser(uid, email, req.user!.name, req.user!.picture);
      const { consentGiven, consentTextVersion, consentText } = req.body;
      const record = await recordUserConsent(
        uid,
        Boolean(consentGiven),
        consentTextVersion || 'DPDP-2023-v1.0',
        consentText ||
          'I agree to the Privacy Policy and consent to my data (name, email, uploaded photos) being used to provide plant diagnosis and AI examination evaluation.'
      );
      res.status(201).json({ consent: record });
    } catch (error: any) {
      console.error('Error in POST /api/privacy/consent:', error);
      res.status(500).json({ error: error.message || 'Failed to record consent' });
    }
  });

  // 13. DPDP Act 2023: Export All User Data & Saved Rows as JSON
  app.get('/api/privacy/export', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const exportPayload = await exportUserDataBundle(uid);
      res.json(exportPayload);
    } catch (error: any) {
      console.error('Error in GET /api/privacy/export:', error);
      res.status(500).json({ error: error.message || 'Failed to export personal data' });
    }
  });

  // 14. DPDP Act 2023: Delete All User Rows, Uploaded Photos/Scans, Consent Records & Auth Account
  app.delete('/api/privacy/account', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const result = await deleteAllUserAccountData(uid);
      try {
        if (!uid.startsWith('scholar-') && !uid.startsWith('demo-')) {
          await adminAuth.deleteUser(uid);
        }
      } catch {
        // Ignore if Firebase admin lacks service account key in local preview; client also deletes auth user
      }
      logSecurityEvent({
        eventType: 'ACCOUNT_ERASURE',
        severity: 'MEDIUM',
        actorUid: uid,
        endpoint: '/api/privacy/account',
        details: 'User initiated permanent DPDP Act 2023 account and data erasure.',
      });
      res.json(result);
    } catch (error: any) {
      console.error('Error in DELETE /api/privacy/account:', error);
      res.status(500).json({ error: 'Failed to delete user account and data' });
    }
  });

  // 15. Security Posture & Audit Status Endpoint (Authenticated)
  app.get('/api/security/status', requireAuth, async (req: AuthRequest, res) => {
    res.json({
      posture: 'ENFORCED',
      standard: 'OWASP ASVS v4.0 + DPDP Act 2023',
      controls: {
        authentication: 'Firebase ID Token + Session Verification + Per-IP Brute-Force Protection',
        authorization: 'Strict Server-Side Ownership Isolation (Zero-Trust IDOR Prevention)',
        answerKeyProtection: 'Server-Sealed Until Final Attempt Evaluation',
        fileUploadSecurity: 'Extension Allowlist + Magic-Byte Verification + Randomized Vault Filenames + 10MB Cap',
        aiPromptFirewall: 'XML Data Fencing + Prompt Injection Neutralization + PII/Secret Redaction',
        codeSandbox: 'Isolated Test-Case Verification (Zero Host Execution)',
      },
      recentAuditEvents: getRecentSecurityAuditLogs(15),
    });
  });

  // Vite middleware for development or static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EXAMORA server running on http://localhost:${PORT}`);
  });
}

startServer();
