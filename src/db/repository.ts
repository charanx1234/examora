import crypto from 'crypto';
import { eq, desc, and } from 'drizzle-orm';
import { db, isDatabaseConfigured } from './index.ts';
import {
  users,
  documents,
  topics,
  exams,
  questions,
  attempts,
  answers,
  results,
  topicPerformance,
  consents,
} from './schema.ts';

// Server-side in-memory store for external PaaS deployments (e.g. Voroa) when DATABASE_URL is not yet configured.
// Strictly starts empty (no fake exams or results).
const memoryStore = {
  users: new Map<string, any>(),
  documents: new Map<string, any>(),
  exams: new Map<string, any>(),
  questions: new Map<string, any>(),
  attempts: new Map<string, any>(),
  answers: new Map<string, any>(),
  results: new Map<string, any>(),
  topicPerformance: new Map<string, any>(),
  consents: new Map<string, any>(),
};

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

function stripSensitiveUserFields(user: any) {
  if (!user) return user;
  const { passwordHash: _ph, ...safeUser } = user;
  return safeUser;
}

export async function getOrCreateUser(uid: string, email: string, fullName?: string, avatarUrl?: string) {
  if (isDatabaseConfigured) {
    try {
      const result = await db
        .insert(users)
        .values({
          uid,
          email,
          fullName: fullName || email.split('@')[0] || 'Scholar',
          avatarUrl: avatarUrl || null,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email,
            updatedAt: new Date(),
            ...(fullName ? { fullName } : {}),
            ...(avatarUrl ? { avatarUrl } : {}),
          },
        })
        .returning();

      return stripSensitiveUserFields(result[0]);
    } catch (error) {
      console.warn('Database query failed in getOrCreateUser, falling back to memory store:', error);
    }
  }

  const existing = memoryStore.users.get(uid);
  const userObj = {
    id: existing?.id || crypto.randomUUID(),
    uid,
    email,
    passwordHash: existing?.passwordHash || null,
    fullName: fullName || existing?.fullName || email.split('@')[0] || 'Scholar',
    avatarUrl: avatarUrl || existing?.avatarUrl || null,
    academicLevel: existing?.academicLevel || 'University / Undergraduate',
    targetGoal: existing?.targetGoal || 'Honors Mastery',
    preferredDifficulty: existing?.preferredDifficulty || 'Medium',
    createdAt: existing?.createdAt || new Date(),
    updatedAt: new Date(),
  };
  memoryStore.users.set(uid, userObj);
  return stripSensitiveUserFields(userObj);
}

export async function registerUserWithPassword(params: {
  email: string;
  password: string;
  fullName: string;
  avatarUrl?: string;
}) {
  const cleanEmail = params.email.trim().toLowerCase();
  const uid = `scholar-${cleanEmail.replace(/[^a-z0-9]/g, '')}`;
  const passwordHash = hashPassword(params.password);

  if (isDatabaseConfigured) {
    try {
      const existingRows = await db.select().from(users).where(eq(users.uid, uid));
      if (existingRows.length > 0 && existingRows[0].passwordHash) {
        const err: any = new Error('An account with this email already exists. Please sign in with your password.');
        err.code = 'EMAIL_EXISTS';
        throw err;
      }

      const result = await db
        .insert(users)
        .values({
          uid,
          email: cleanEmail,
          passwordHash,
          fullName: params.fullName.trim() || cleanEmail.split('@')[0] || 'Scholar',
          avatarUrl: params.avatarUrl || null,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email: cleanEmail,
            passwordHash,
            fullName: params.fullName.trim() || cleanEmail.split('@')[0] || 'Scholar',
            updatedAt: new Date(),
          },
        })
        .returning();

      return stripSensitiveUserFields(result[0]);
    } catch (error: any) {
      if (error?.code === 'EMAIL_EXISTS') throw error;
      console.warn('Database query failed in registerUserWithPassword, falling back to memory store:', error);
    }
  }

  const existing = memoryStore.users.get(uid);
  if (existing && existing.passwordHash) {
    const err: any = new Error('An account with this email already exists. Please sign in with your password.');
    err.code = 'EMAIL_EXISTS';
    throw err;
  }

  const userObj = {
    id: existing?.id || crypto.randomUUID(),
    uid,
    email: cleanEmail,
    passwordHash,
    fullName: params.fullName.trim() || cleanEmail.split('@')[0] || 'Scholar',
    avatarUrl: params.avatarUrl || null,
    academicLevel: 'University / Undergraduate',
    targetGoal: 'Honors Mastery',
    preferredDifficulty: 'Medium',
    createdAt: existing?.createdAt || new Date(),
    updatedAt: new Date(),
  };
  memoryStore.users.set(uid, userObj);
  return stripSensitiveUserFields(userObj);
}

export async function authenticateUserWithPassword(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  const uid = `scholar-${cleanEmail.replace(/[^a-z0-9]/g, '')}`;

  if (isDatabaseConfigured) {
    try {
      const existingRows = await db.select().from(users).where(eq(users.uid, uid));
      const user = existingRows[0];
      if (!user) {
        const err: any = new Error('No account found with this email address. Please create an account first.');
        err.code = 'USER_NOT_FOUND';
        throw err;
      }

      if (!user.passwordHash) {
        // Legacy account created before password column existed: bind this password on first login
        const newHash = hashPassword(password);
        const updated = await db
          .update(users)
          .set({ passwordHash: newHash, updatedAt: new Date() })
          .where(eq(users.uid, uid))
          .returning();
        return stripSensitiveUserFields(updated[0]);
      }

      const isValid = verifyPassword(password, user.passwordHash);
      if (!isValid) {
        const err: any = new Error('Please enter the correct password');
        err.code = 'INVALID_PASSWORD';
        throw err;
      }

      return stripSensitiveUserFields(user);
    } catch (error: any) {
      if (error?.code === 'USER_NOT_FOUND' || error?.code === 'INVALID_PASSWORD') {
        throw error;
      }
      console.warn('Database query failed in authenticateUserWithPassword, falling back to memory store:', error);
    }
  }

  const user = memoryStore.users.get(uid);
  if (!user) {
    const err: any = new Error('No account found with this email address. Please create an account first.');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  if (!user.passwordHash) {
    user.passwordHash = hashPassword(password);
    memoryStore.users.set(uid, user);
    return stripSensitiveUserFields(user);
  }

  if (!verifyPassword(password, user.passwordHash)) {
    const err: any = new Error('Please enter the correct password');
    err.code = 'INVALID_PASSWORD';
    throw err;
  }

  return stripSensitiveUserFields(user);
}

export async function resetUserPassword(email: string, newPassword: string) {
  const cleanEmail = email.trim().toLowerCase();
  const uid = `scholar-${cleanEmail.replace(/[^a-z0-9]/g, '')}`;
  const passwordHash = hashPassword(newPassword);

  if (isDatabaseConfigured) {
    try {
      const existingRows = await db.select().from(users).where(eq(users.uid, uid));
      if (!existingRows.length) {
        const err: any = new Error('No account found with this email address.');
        err.code = 'USER_NOT_FOUND';
        throw err;
      }
      const updated = await db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.uid, uid))
        .returning();
      return stripSensitiveUserFields(updated[0]);
    } catch (error: any) {
      if (error?.code === 'USER_NOT_FOUND') throw error;
      console.warn('Database query failed in resetUserPassword, falling back to memory store:', error);
    }
  }

  const user = memoryStore.users.get(uid);
  if (!user) {
    const err: any = new Error('No account found with this email address.');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  user.passwordHash = passwordHash;
  user.updatedAt = new Date();
  memoryStore.users.set(uid, user);
  return stripSensitiveUserFields(user);
}

export async function updateUserProfile(
  uid: string,
  updates: {
    fullName?: string;
    avatarUrl?: string | null;
    age?: number | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    institution?: string | null;
    department?: string | null;
    bio?: string | null;
    academicLevel?: string;
    targetGoal?: string;
    preferredDifficulty?: string;
  }
) {
  if (isDatabaseConfigured) {
    try {
      const result = await db
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, uid))
        .returning();
      return stripSensitiveUserFields(result[0]);
    } catch (error) {
      console.warn('Database query failed in updateUserProfile, falling back to memory store:', error);
    }
  }

  const existing = memoryStore.users.get(uid) || {
    id: crypto.randomUUID(),
    uid,
    email: 'scholar@examora.edu',
    fullName: 'Scholar',
    academicLevel: 'University / Undergraduate',
    targetGoal: 'Honors Mastery',
    preferredDifficulty: 'Medium',
    createdAt: new Date(),
  };
  const updated = { ...existing, ...updates, updatedAt: new Date() };
  memoryStore.users.set(uid, updated);
  return stripSensitiveUserFields(updated);
}

export async function getStudentDashboardData(uid: string) {
  let userDocs: any[] = [];
  let userExams: any[] = [];
  let userResults: any[] = [];
  let userTopicPerf: any[] = [];
  let activeAttempts: any[] = [];

  if (isDatabaseConfigured) {
    try {
      [userDocs, userExams, userResults, userTopicPerf, activeAttempts] = await Promise.all([
        db.select().from(documents).where(eq(documents.userUid, uid)).orderBy(desc(documents.createdAt)),
        db.select().from(exams).where(eq(exams.userUid, uid)).orderBy(desc(exams.createdAt)),
        db.select().from(results).where(eq(results.userUid, uid)).orderBy(desc(results.evaluatedAt)),
        db
          .select()
          .from(topicPerformance)
          .where(eq(topicPerformance.userUid, uid))
          .orderBy(desc(topicPerformance.lastTestedAt)),
        db
          .select()
          .from(attempts)
          .where(and(eq(attempts.userUid, uid), eq(attempts.status, 'in_progress')))
          .orderBy(desc(attempts.startedAt)),
      ]);
    } catch (error) {
      console.warn('Database query failed in getStudentDashboardData, falling back to memory store:', error);
      userDocs = Array.from(memoryStore.documents.values()).filter((d) => d.userUid === uid);
      userExams = Array.from(memoryStore.exams.values()).filter((e) => e.userUid === uid);
      userResults = Array.from(memoryStore.results.values()).filter((r) => r.userUid === uid);
      userTopicPerf = Array.from(memoryStore.topicPerformance.values()).filter((t) => t.userUid === uid);
      activeAttempts = Array.from(memoryStore.attempts.values()).filter(
        (a) => a.userUid === uid && a.status === 'in_progress'
      );
    }
  } else {
    userDocs = Array.from(memoryStore.documents.values()).filter((d) => d.userUid === uid);
    userExams = Array.from(memoryStore.exams.values()).filter((e) => e.userUid === uid);
    userResults = Array.from(memoryStore.results.values()).filter((r) => r.userUid === uid);
    userTopicPerf = Array.from(memoryStore.topicPerformance.values()).filter((t) => t.userUid === uid);
    activeAttempts = Array.from(memoryStore.attempts.values()).filter(
      (a) => a.userUid === uid && a.status === 'in_progress'
    );
  }

  const examMap = new Map(userExams.map((e) => [e.id, e]));

  const enrichedResults = userResults.map((r) => ({
    ...r,
    examTitle: examMap.get(r.examId)?.title || 'Assessment',
    subject: examMap.get(r.examId)?.subject || 'General',
    format: examMap.get(r.examId)?.format || 'MCQ',
    difficulty: examMap.get(r.examId)?.difficulty || 'Medium',
  }));

  const totalExamsTaken = enrichedResults.length;
  const averageScore =
    totalExamsTaken > 0
      ? Number((enrichedResults.reduce((acc, r) => acc + r.percentage, 0) / totalExamsTaken).toFixed(1))
      : 0;
  const bestScore =
    totalExamsTaken > 0
      ? Number(Math.max(...enrichedResults.map((r) => r.percentage)).toFixed(1))
      : 0;

  return {
    stats: {
      totalExamsTaken,
      averageScore,
      bestScore,
      documentsCount: userDocs.length,
      availableExamsCount: userExams.length,
    },
    documents: userDocs,
    exams: userExams,
    recentResults: enrichedResults,
    topicPerformance: userTopicPerf,
    activeAttempts,
  };
}

export async function createDocumentRecord(
  uid: string,
  data: {
    title: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    subject: string;
    extractedText: string;
    chaptersJson: any[];
  }
) {
  if (isDatabaseConfigured) {
    try {
      const inserted = await db
        .insert(documents)
        .values({
          userUid: uid,
          title: data.title,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize,
          subject: data.subject,
          extractedText: data.extractedText,
          chaptersJson: data.chaptersJson,
          status: 'ready',
        })
        .returning();
      return inserted[0];
    } catch (error) {
      console.warn('Database query failed in createDocumentRecord, falling back to memory store:', error);
    }
  }

  const doc = {
    id: crypto.randomUUID(),
    userUid: uid,
    title: data.title,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSize: data.fileSize,
    subject: data.subject,
    extractedText: data.extractedText,
    chaptersJson: data.chaptersJson,
    status: 'ready',
    createdAt: new Date(),
  };
  memoryStore.documents.set(doc.id, doc);
  return doc;
}

export async function createExamWithQuestions(
  uid: string,
  examData: {
    documentId?: string | null;
    title: string;
    subject: string;
    topicNames: string[];
    sourceType: string;
    difficulty: string;
    format: string;
    questionCount: number;
    durationMinutes: number;
    totalMarks: number;
    negativeMarking: number;
  },
  generatedQuestions: Array<{
    questionType: string;
    topic: string;
    difficulty: string;
    marks: number;
    negativeMarks: number;
    prompt: string;
    optionsJson?: string[];
    codeStarterJson?: any;
    correctAnswer: string;
    rubricJson: Array<{ criterion: string; maxMarks: number }>;
    explanation: string;
  }>
) {
  if (isDatabaseConfigured) {
    try {
      const insertedExam = (
        await db
          .insert(exams)
          .values({
            userUid: uid,
            documentId: examData.documentId || null,
            title: examData.title,
            subject: examData.subject,
            topicNames: examData.topicNames,
            sourceType: examData.sourceType,
            difficulty: examData.difficulty,
            format: examData.format,
            questionCount: generatedQuestions.length,
            durationMinutes: examData.durationMinutes,
            totalMarks: examData.totalMarks,
            negativeMarking: examData.negativeMarking,
            status: 'ready',
          })
          .returning()
      )[0];

      const questionRows = generatedQuestions.map((q, idx) => ({
        examId: insertedExam.id,
        questionOrder: idx + 1,
        questionType: q.questionType,
        topic: q.topic,
        difficulty: q.difficulty,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        prompt: q.prompt,
        optionsJson: q.optionsJson || [],
        codeStarterJson: q.codeStarterJson || {},
        correctAnswer: q.correctAnswer,
        rubricJson: q.rubricJson || [],
        explanation: q.explanation,
      }));

      const insertedQuestions = await db.insert(questions).values(questionRows).returning();

      return {
        exam: insertedExam,
        questionsCount: insertedQuestions.length,
      };
    } catch (error) {
      console.warn('Database query failed in createExamWithQuestions, falling back to memory store:', error);
    }
  }

  const insertedExam = {
    id: crypto.randomUUID(),
    userUid: uid,
    documentId: examData.documentId || null,
    title: examData.title,
    subject: examData.subject,
    topicNames: examData.topicNames,
    sourceType: examData.sourceType,
    difficulty: examData.difficulty,
    format: examData.format,
    questionCount: generatedQuestions.length,
    durationMinutes: examData.durationMinutes,
    totalMarks: examData.totalMarks,
    negativeMarking: examData.negativeMarking,
    status: 'ready',
    createdAt: new Date(),
  };
  memoryStore.exams.set(insertedExam.id, insertedExam);

  generatedQuestions.forEach((q, idx) => {
    const qRow = {
      id: crypto.randomUUID(),
      examId: insertedExam.id,
      questionOrder: idx + 1,
      questionType: q.questionType,
      topic: q.topic,
      difficulty: q.difficulty,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      prompt: q.prompt,
      optionsJson: q.optionsJson || [],
      codeStarterJson: q.codeStarterJson || {},
      correctAnswer: q.correctAnswer,
      rubricJson: q.rubricJson || [],
      explanation: q.explanation,
      createdAt: new Date(),
    };
    memoryStore.questions.set(qRow.id, qRow);
  });

  return {
    exam: insertedExam,
    questionsCount: generatedQuestions.length,
  };
}

export async function startOrResumeExamAttempt(uid: string, examId: string) {
  if (isDatabaseConfigured) {
    try {
      const examRows = await db
        .select()
        .from(exams)
        .where(and(eq(exams.id, examId), eq(exams.userUid, uid)));
      if (!examRows.length) {
        throw new Error('Examination not found.');
      }
      const exam = examRows[0];

      const existingAttempts = await db
        .select()
        .from(attempts)
        .where(
          and(
            eq(attempts.examId, examId),
            eq(attempts.userUid, uid),
            eq(attempts.status, 'in_progress')
          )
        );

      let attempt = existingAttempts[0];
      if (!attempt) {
        attempt = (
          await db
            .insert(attempts)
            .values({
              examId: exam.id,
              userUid: uid,
              status: 'in_progress',
              timeRemainingSeconds: exam.durationMinutes * 60,
              currentQuestionIndex: 0,
              markedForReviewJson: [],
            })
            .returning()
        )[0];
      }

      const rawQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.examId, exam.id));

      rawQuestions.sort((a, b) => a.questionOrder - b.questionOrder);

      // CRITICAL SECURITY: Strip correctAnswer and explanation before sending to student!
      const safeQuestions = rawQuestions.map((q) => ({
        id: q.id,
        examId: q.examId,
        questionOrder: q.questionOrder,
        questionType: q.questionType,
        topic: q.topic,
        difficulty: q.difficulty,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        prompt: q.prompt,
        optionsJson: q.optionsJson,
        codeStarterJson: q.codeStarterJson,
        rubricJson: q.rubricJson,
      }));

      const savedAnswers = await db
        .select()
        .from(answers)
        .where(eq(answers.attemptId, attempt.id));

      return {
        exam,
        attempt,
        questions: safeQuestions,
        savedAnswers,
      };
    } catch (error) {
      if (!memoryStore.exams.has(examId)) {
        throw new Error('Failed to initialize examination session.', { cause: error });
      }
    }
  }

  const exam = memoryStore.exams.get(examId);
  if (!exam || exam.userUid !== uid) {
    throw new Error('Examination not found.');
  }

  let attempt = Array.from(memoryStore.attempts.values()).find(
    (a) => a.examId === examId && a.userUid === uid && a.status === 'in_progress'
  );
  if (!attempt) {
    attempt = {
      id: crypto.randomUUID(),
      examId: exam.id,
      userUid: uid,
      status: 'in_progress',
      timeRemainingSeconds: exam.durationMinutes * 60,
      currentQuestionIndex: 0,
      markedForReviewJson: [],
      startedAt: new Date(),
      submittedAt: null,
    };
    memoryStore.attempts.set(attempt.id, attempt);
  }

  const rawQuestions = Array.from(memoryStore.questions.values())
    .filter((q) => q.examId === exam.id)
    .sort((a, b) => a.questionOrder - b.questionOrder);

  const safeQuestions = rawQuestions.map((q) => ({
    id: q.id,
    examId: q.examId,
    questionOrder: q.questionOrder,
    questionType: q.questionType,
    topic: q.topic,
    difficulty: q.difficulty,
    marks: q.marks,
    negativeMarks: q.negativeMarks,
    prompt: q.prompt,
    optionsJson: q.optionsJson,
    codeStarterJson: q.codeStarterJson,
    rubricJson: q.rubricJson,
  }));

  const savedAnswers = Array.from(memoryStore.answers.values()).filter(
    (a) => a.attemptId === attempt.id
  );

  return {
    exam,
    attempt,
    questions: safeQuestions,
    savedAnswers,
  };
}

export async function saveAttemptProgress(
  uid: string,
  attemptId: string,
  payload: {
    timeRemainingSeconds: number;
    currentQuestionIndex: number;
    markedForReviewJson: string[];
    answer?: {
      questionId: string;
      answerText: string;
      codeLanguage?: string;
      handwrittenImageData?: string;
    };
  }
) {
  if (isDatabaseConfigured && !memoryStore.attempts.has(attemptId)) {
    try {
      const updatedAttempt = (
        await db
          .update(attempts)
          .set({
            timeRemainingSeconds: payload.timeRemainingSeconds,
            currentQuestionIndex: payload.currentQuestionIndex,
            markedForReviewJson: payload.markedForReviewJson,
          })
          .where(and(eq(attempts.id, attemptId), eq(attempts.userUid, uid)))
          .returning()
      )[0];

      if (payload.answer) {
        const existingAns = await db
          .select()
          .from(answers)
          .where(
            and(
              eq(answers.attemptId, attemptId),
              eq(answers.questionId, payload.answer.questionId)
            )
          );

        if (existingAns.length > 0) {
          await db
            .update(answers)
            .set({
              answerText: payload.answer.answerText,
              codeLanguage: payload.answer.codeLanguage || null,
              handwrittenImageData: payload.answer.handwrittenImageData || null,
              updatedAt: new Date(),
            })
            .where(eq(answers.id, existingAns[0].id));
        } else {
          await db.insert(answers).values({
            attemptId,
            questionId: payload.answer.questionId,
            userUid: uid,
            answerText: payload.answer.answerText,
            codeLanguage: payload.answer.codeLanguage || null,
            handwrittenImageData: payload.answer.handwrittenImageData || null,
          });
        }
      }

      return updatedAttempt;
    } catch (error) {
      console.warn('Database query failed in saveAttemptProgress, falling back to memory store:', error);
    }
  }

  const attempt = memoryStore.attempts.get(attemptId);
  if (!attempt || attempt.userUid !== uid) {
    throw new Error('Attempt not found.');
  }

  attempt.timeRemainingSeconds = payload.timeRemainingSeconds;
  attempt.currentQuestionIndex = payload.currentQuestionIndex;
  attempt.markedForReviewJson = payload.markedForReviewJson;
  memoryStore.attempts.set(attemptId, attempt);

  if (payload.answer) {
    const existingAns = Array.from(memoryStore.answers.values()).find(
      (a) => a.attemptId === attemptId && a.questionId === payload.answer!.questionId
    );
    if (existingAns) {
      existingAns.answerText = payload.answer.answerText;
      existingAns.codeLanguage = payload.answer.codeLanguage || null;
      existingAns.handwrittenImageData = payload.answer.handwrittenImageData || null;
      existingAns.updatedAt = new Date();
      memoryStore.answers.set(existingAns.id, existingAns);
    } else {
      const newAns = {
        id: crypto.randomUUID(),
        attemptId,
        questionId: payload.answer.questionId,
        userUid: uid,
        answerText: payload.answer.answerText,
        codeLanguage: payload.answer.codeLanguage || null,
        handwrittenImageData: payload.answer.handwrittenImageData || null,
        isCorrect: false,
        awardedMarks: 0,
        aiFeedback: null,
        conceptualMistake: null,
        requiresManualReview: false,
        updatedAt: new Date(),
      };
      memoryStore.answers.set(newAns.id, newAns);
    }
  }

  return attempt;
}

export async function getAttemptFullDataForEvaluation(uid: string, attemptId: string) {
  if (isDatabaseConfigured && !memoryStore.attempts.has(attemptId)) {
    try {
      const attemptRows = await db
        .select()
        .from(attempts)
        .where(and(eq(attempts.id, attemptId), eq(attempts.userUid, uid)));
      if (!attemptRows.length) {
        throw new Error('Examination attempt not found.');
      }
      const attempt = attemptRows[0];

      const examRows = await db.select().from(exams).where(eq(exams.id, attempt.examId));
      const exam = examRows[0];

      const examQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.examId, exam.id));
      examQuestions.sort((a, b) => a.questionOrder - b.questionOrder);

      const attemptAnswers = await db
        .select()
        .from(answers)
        .where(eq(answers.attemptId, attempt.id));

      return {
        attempt,
        exam,
        questions: examQuestions,
        answers: attemptAnswers,
      };
    } catch (error) {
      console.error('Database query failed in getAttemptFullDataForEvaluation:', error);
      throw new Error('Failed to load examination data for evaluation.', { cause: error });
    }
  }

  const attempt = memoryStore.attempts.get(attemptId);
  if (!attempt || attempt.userUid !== uid) {
    throw new Error('Examination attempt not found.');
  }
  const exam = memoryStore.exams.get(attempt.examId);
  const examQuestions = Array.from(memoryStore.questions.values())
    .filter((q) => q.examId === exam.id)
    .sort((a, b) => a.questionOrder - b.questionOrder);
  const attemptAnswers = Array.from(memoryStore.answers.values()).filter(
    (a) => a.attemptId === attempt.id
  );

  return {
    attempt,
    exam,
    questions: examQuestions,
    answers: attemptAnswers,
  };
}

export async function storeEvaluationResults(
  uid: string,
  attemptId: string,
  examId: string,
  evaluatedAnswers: Array<{
    questionId: string;
    answerText: string;
    codeLanguage?: string | null;
    handwrittenImageData?: string | null;
    isCorrect: boolean;
    awardedMarks: number;
    aiFeedback: string;
    conceptualMistake?: string | null;
    requiresManualReview?: boolean;
  }>,
  summary: {
    totalMarks: number;
    obtainedMarks: number;
    percentage: number;
    grade: string;
    timeTakenSeconds: number;
    correctCount: number;
    partialCount: number;
    incorrectCount: number;
    unansweredCount: number;
    overallFeedback: string;
    weakTopicsJson: string[];
    recommendationsJson: string[];
  },
  topicUpdates: Array<{
    subject: string;
    topic: string;
    attempted: number;
    correct: number;
    scoreRatio: number;
  }>
) {
  if (isDatabaseConfigured && !memoryStore.attempts.has(attemptId)) {
    try {
      await db
        .update(attempts)
        .set({
          status: 'evaluated',
          submittedAt: new Date(),
        })
        .where(eq(attempts.id, attemptId));

      for (const ans of evaluatedAnswers) {
        const existing = await db
          .select()
          .from(answers)
          .where(and(eq(answers.attemptId, attemptId), eq(answers.questionId, ans.questionId)));

        if (existing.length > 0) {
          await db
            .update(answers)
            .set({
              isCorrect: ans.isCorrect,
              awardedMarks: ans.awardedMarks,
              aiFeedback: ans.aiFeedback,
              conceptualMistake: ans.conceptualMistake || null,
              requiresManualReview: ans.requiresManualReview || false,
              updatedAt: new Date(),
            })
            .where(eq(answers.id, existing[0].id));
        } else {
          await db.insert(answers).values({
            attemptId,
            questionId: ans.questionId,
            userUid: uid,
            answerText: ans.answerText || '',
            codeLanguage: ans.codeLanguage || null,
            handwrittenImageData: ans.handwrittenImageData || null,
            isCorrect: ans.isCorrect,
            awardedMarks: ans.awardedMarks,
            aiFeedback: ans.aiFeedback,
            conceptualMistake: ans.conceptualMistake || null,
            requiresManualReview: ans.requiresManualReview || false,
          });
        }
      }

      const existingResult = await db
        .select()
        .from(results)
        .where(eq(results.attemptId, attemptId));

      let savedResult;
      if (existingResult.length > 0) {
        savedResult = (
          await db
            .update(results)
            .set({
              ...summary,
              evaluatedAt: new Date(),
            })
            .where(eq(results.id, existingResult[0].id))
            .returning()
        )[0];
      } else {
        savedResult = (
          await db
            .insert(results)
            .values({
              attemptId,
              examId,
              userUid: uid,
              ...summary,
            })
            .returning()
        )[0];
      }

      for (const t of topicUpdates) {
        const existingTopics = await db
          .select()
          .from(topicPerformance)
          .where(
            and(
              eq(topicPerformance.userUid, uid),
              eq(topicPerformance.subject, t.subject),
              eq(topicPerformance.topic, t.topic)
            )
          );

        if (existingTopics.length > 0) {
          const curr = existingTopics[0];
          const totalAttempted = curr.questionsAttempted + t.attempted;
          const totalCorrect = curr.questionsCorrect + t.correct;
          const accuracy = totalAttempted > 0 ? Number(((totalCorrect / totalAttempted) * 100).toFixed(1)) : 0;
          const avgScore = Number(((curr.averageScorePercentage + t.scoreRatio * 100) / 2).toFixed(1));
          const mastery =
            avgScore >= 85
              ? 'Mastered'
              : avgScore >= 70
              ? 'Proficient'
              : avgScore >= 50
              ? 'Developing'
              : 'Needs Focus';
          const recDiff =
            avgScore >= 85 ? 'Expert' : avgScore >= 70 ? 'Hard' : avgScore >= 50 ? 'Medium' : 'Easy';

          await db
            .update(topicPerformance)
            .set({
              questionsAttempted: totalAttempted,
              questionsCorrect: totalCorrect,
              accuracyPercentage: accuracy,
              averageScorePercentage: avgScore,
              masteryLevel: mastery,
              recommendedDifficulty: recDiff,
              lastTestedAt: new Date(),
            })
            .where(eq(topicPerformance.id, curr.id));
        } else {
          const accuracy = t.attempted > 0 ? Number(((t.correct / t.attempted) * 100).toFixed(1)) : 0;
          const avgScore = Number((t.scoreRatio * 100).toFixed(1));
          const mastery =
            avgScore >= 85
              ? 'Mastered'
              : avgScore >= 70
              ? 'Proficient'
              : avgScore >= 50
              ? 'Developing'
              : 'Needs Focus';
          const recDiff =
            avgScore >= 85 ? 'Expert' : avgScore >= 70 ? 'Hard' : avgScore >= 50 ? 'Medium' : 'Easy';

          await db.insert(topicPerformance).values({
            userUid: uid,
            subject: t.subject,
            topic: t.topic,
            questionsAttempted: t.attempted,
            questionsCorrect: t.correct,
            accuracyPercentage: accuracy,
            averageScorePercentage: avgScore,
            masteryLevel: mastery,
            recommendedDifficulty: recDiff,
          });
        }
      }

      return savedResult;
    } catch (error) {
      console.error('Database query failed in storeEvaluationResults:', error);
      throw new Error('Failed to store evaluation results.', { cause: error });
    }
  }

  const attempt = memoryStore.attempts.get(attemptId);
  if (attempt) {
    attempt.status = 'evaluated';
    attempt.submittedAt = new Date();
    memoryStore.attempts.set(attemptId, attempt);
  }

  for (const ans of evaluatedAnswers) {
    const existing = Array.from(memoryStore.answers.values()).find(
      (a) => a.attemptId === attemptId && a.questionId === ans.questionId
    );
    if (existing) {
      Object.assign(existing, {
        isCorrect: ans.isCorrect,
        awardedMarks: ans.awardedMarks,
        aiFeedback: ans.aiFeedback,
        conceptualMistake: ans.conceptualMistake || null,
        requiresManualReview: ans.requiresManualReview || false,
        updatedAt: new Date(),
      });
      memoryStore.answers.set(existing.id, existing);
    } else {
      const id = crypto.randomUUID();
      memoryStore.answers.set(id, {
        id,
        attemptId,
        questionId: ans.questionId,
        userUid: uid,
        answerText: ans.answerText || '',
        codeLanguage: ans.codeLanguage || null,
        handwrittenImageData: ans.handwrittenImageData || null,
        isCorrect: ans.isCorrect,
        awardedMarks: ans.awardedMarks,
        aiFeedback: ans.aiFeedback,
        conceptualMistake: ans.conceptualMistake || null,
        requiresManualReview: ans.requiresManualReview || false,
        updatedAt: new Date(),
      });
    }
  }

  const savedResult = {
    id: crypto.randomUUID(),
    attemptId,
    examId,
    userUid: uid,
    ...summary,
    evaluatedAt: new Date(),
  };
  memoryStore.results.set(savedResult.id, savedResult);

  for (const t of topicUpdates) {
    const key = `${uid}:${t.subject}:${t.topic}`;
    const curr = memoryStore.topicPerformance.get(key);
    const totalAttempted = (curr?.questionsAttempted || 0) + t.attempted;
    const totalCorrect = (curr?.questionsCorrect || 0) + t.correct;
    const accuracy = totalAttempted > 0 ? Number(((totalCorrect / totalAttempted) * 100).toFixed(1)) : 0;
    const avgScore = curr
      ? Number(((curr.averageScorePercentage + t.scoreRatio * 100) / 2).toFixed(1))
      : Number((t.scoreRatio * 100).toFixed(1));
    const mastery =
      avgScore >= 85 ? 'Mastered' : avgScore >= 70 ? 'Proficient' : avgScore >= 50 ? 'Developing' : 'Needs Focus';
    const recDiff = avgScore >= 85 ? 'Expert' : avgScore >= 70 ? 'Hard' : avgScore >= 50 ? 'Medium' : 'Easy';

    memoryStore.topicPerformance.set(key, {
      id: curr?.id || crypto.randomUUID(),
      userUid: uid,
      subject: t.subject,
      topic: t.topic,
      questionsAttempted: totalAttempted,
      questionsCorrect: totalCorrect,
      accuracyPercentage: accuracy,
      averageScorePercentage: avgScore,
      masteryLevel: mastery,
      recommendedDifficulty: recDiff,
      lastTestedAt: new Date(),
    });
  }

  return savedResult;
}

export async function getResultDetailByAttemptId(uid: string, attemptId: string) {
  if (isDatabaseConfigured && !memoryStore.attempts.has(attemptId)) {
    try {
      const resultRows = await db
        .select()
        .from(results)
        .where(and(eq(results.attemptId, attemptId), eq(results.userUid, uid)));
      if (!resultRows.length) {
        throw new Error('Result record not found.');
      }
      const result = resultRows[0];

      const examRows = await db.select().from(exams).where(eq(exams.id, result.examId));
      const exam = examRows[0];

      const examQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.examId, exam.id));
      examQuestions.sort((a, b) => a.questionOrder - b.questionOrder);

      const attemptAnswers = await db
        .select()
        .from(answers)
        .where(eq(answers.attemptId, attemptId));

      return {
        result,
        exam,
        questions: examQuestions,
        answers: attemptAnswers,
      };
    } catch (error) {
      console.error('Database query failed in getResultDetailByAttemptId:', error);
      throw new Error('Failed to retrieve detailed examination report.', { cause: error });
    }
  }

  const result = Array.from(memoryStore.results.values()).find(
    (r) => r.attemptId === attemptId && r.userUid === uid
  );
  if (!result) {
    throw new Error('Result record not found.');
  }
  const exam = memoryStore.exams.get(result.examId);
  const examQuestions = Array.from(memoryStore.questions.values())
    .filter((q) => q.examId === exam.id)
    .sort((a, b) => a.questionOrder - b.questionOrder);
  const attemptAnswers = Array.from(memoryStore.answers.values()).filter(
    (a) => a.attemptId === attemptId
  );

  return {
    result,
    exam,
    questions: examQuestions,
    answers: attemptAnswers,
  };
}

// ============================================================================
// DPDP Act 2023 Privacy, Consent, Data Export, Minimization & Account Deletion
// ============================================================================

export async function recordUserConsent(
  uid: string,
  consentGiven: boolean,
  consentTextVersion = 'DPDP-2023-v1.0',
  consentText = 'I agree to the Privacy Policy and consent to my data (name, email, uploaded photos) being used to provide plant diagnosis and AI examination evaluation.'
) {
  if (isDatabaseConfigured) {
    try {
      const inserted = await db
        .insert(consents)
        .values({
          userId: uid,
          consentGiven,
          consentTextVersion,
          consentText,
          timestamp: new Date(),
        })
        .returning();
      return inserted[0];
    } catch (error) {
      console.warn('Database query failed in recordUserConsent, falling back to memory store:', error);
    }
  }

  const record = {
    id: crypto.randomUUID(),
    userId: uid,
    consentGiven,
    consentTextVersion,
    consentText,
    timestamp: new Date(),
  };
  memoryStore.consents.set(record.id, record);
  return record;
}

export async function getUserConsentsHistory(uid: string) {
  if (isDatabaseConfigured) {
    try {
      return await db
        .select()
        .from(consents)
        .where(eq(consents.userId, uid))
        .orderBy(desc(consents.timestamp));
    } catch (error) {
      console.warn('Database query failed in getUserConsentsHistory, falling back to memory store:', error);
    }
  }

  return Array.from(memoryStore.consents.values())
    .filter((c) => c.userId === uid)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function deleteDocumentById(uid: string, documentId: string) {
  if (isDatabaseConfigured && !memoryStore.documents.has(documentId)) {
    try {
      await db
        .delete(documents)
        .where(and(eq(documents.id, documentId), eq(documents.userUid, uid)));
      return { deleted: true };
    } catch (error) {
      console.warn('Database query failed in deleteDocumentById, falling back to memory store:', error);
    }
  }

  const doc = memoryStore.documents.get(documentId);
  if (doc && doc.userUid === uid) {
    memoryStore.documents.delete(documentId);
  }
  return { deleted: true };
}

export async function exportUserDataBundle(uid: string) {
  if (isDatabaseConfigured) {
    try {
      const [
        userRows,
        consentRows,
        docRows,
        examRows,
        attemptRows,
        answerRows,
        resultRows,
        topicPerfRows,
      ] = await Promise.all([
        db.select().from(users).where(eq(users.uid, uid)),
        db.select().from(consents).where(eq(consents.userId, uid)).orderBy(desc(consents.timestamp)),
        db.select().from(documents).where(eq(documents.userUid, uid)).orderBy(desc(documents.createdAt)),
        db.select().from(exams).where(eq(exams.userUid, uid)).orderBy(desc(exams.createdAt)),
        db.select().from(attempts).where(eq(attempts.userUid, uid)).orderBy(desc(attempts.startedAt)),
        db.select().from(answers).where(eq(answers.userUid, uid)),
        db.select().from(results).where(eq(results.userUid, uid)).orderBy(desc(results.evaluatedAt)),
        db.select().from(topicPerformance).where(eq(topicPerformance.userUid, uid)),
      ]);

      return {
        exportMetadata: {
          standard: 'Digital Personal Data Protection (DPDP) Act 2023 — Right to Access & Data Portability',
          exportedAt: new Date().toISOString(),
          userId: uid,
        },
        account: userRows[0] || { uid },
        consents: consentRows,
        plants: docRows.map((d) => ({
          id: d.id,
          title: d.title,
          subject: d.subject,
          fileName: d.fileName,
          createdAt: d.createdAt,
        })),
        documents: docRows,
        examinations: examRows,
        attempts: attemptRows,
        submittedAnswers: answerRows,
        evaluationResults: resultRows,
        topicPerformance: topicPerfRows,
      };
    } catch (error) {
      console.warn('Database query failed in exportUserDataBundle, falling back to memory store:', error);
    }
  }

  const docRows = Array.from(memoryStore.documents.values()).filter((d) => d.userUid === uid);
  return {
    exportMetadata: {
      standard: 'Digital Personal Data Protection (DPDP) Act 2023 — Right to Access & Data Portability',
      exportedAt: new Date().toISOString(),
      userId: uid,
    },
    account: memoryStore.users.get(uid) || { uid },
    consents: Array.from(memoryStore.consents.values()).filter((c) => c.userId === uid),
    plants: docRows.map((d) => ({
      id: d.id,
      title: d.title,
      subject: d.subject,
      fileName: d.fileName,
      createdAt: d.createdAt,
    })),
    documents: docRows,
    examinations: Array.from(memoryStore.exams.values()).filter((e) => e.userUid === uid),
    attempts: Array.from(memoryStore.attempts.values()).filter((a) => a.userUid === uid),
    submittedAnswers: Array.from(memoryStore.answers.values()).filter((a) => a.userUid === uid),
    evaluationResults: Array.from(memoryStore.results.values()).filter((r) => r.userUid === uid),
    topicPerformance: Array.from(memoryStore.topicPerformance.values()).filter((t) => t.userUid === uid),
  };
}

export async function deleteAllUserAccountData(uid: string) {
  if (isDatabaseConfigured) {
    try {
      await db.delete(answers).where(eq(answers.userUid, uid));
      await db.delete(results).where(eq(results.userUid, uid));
      await db.delete(attempts).where(eq(attempts.userUid, uid));
      await db.delete(topicPerformance).where(eq(topicPerformance.userUid, uid));
      await db.delete(exams).where(eq(exams.userUid, uid));
      await db.delete(topics).where(eq(topics.userUid, uid));
      await db.delete(documents).where(eq(documents.userUid, uid));
      await db.delete(consents).where(eq(consents.userId, uid));
      await db.delete(users).where(eq(users.uid, uid));
    } catch (error) {
      console.warn('Database query failed in deleteAllUserAccountData, cleaning memory store:', error);
    }
  }

  memoryStore.users.delete(uid);
  for (const [k, v] of memoryStore.documents.entries()) if (v.userUid === uid) memoryStore.documents.delete(k);
  for (const [k, v] of memoryStore.exams.entries()) if (v.userUid === uid) memoryStore.exams.delete(k);
  for (const [k, v] of memoryStore.attempts.entries()) if (v.userUid === uid) memoryStore.attempts.delete(k);
  for (const [k, v] of memoryStore.answers.entries()) if (v.userUid === uid) memoryStore.answers.delete(k);
  for (const [k, v] of memoryStore.results.entries()) if (v.userUid === uid) memoryStore.results.delete(k);
  for (const [k, v] of memoryStore.topicPerformance.entries()) if (v.userUid === uid) memoryStore.topicPerformance.delete(k);
  for (const [k, v] of memoryStore.consents.entries()) if (v.userId === uid) memoryStore.consents.delete(k);

  return { deleted: true, uid, deletedAt: new Date().toISOString() };
}
