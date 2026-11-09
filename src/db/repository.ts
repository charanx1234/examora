import { eq, desc, and } from 'drizzle-orm';
import { db } from './index.ts';
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

export async function getOrCreateUser(uid: string, email: string, fullName?: string, avatarUrl?: string) {
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

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize student profile.', { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  updates: { academicLevel?: string; targetGoal?: string; preferredDifficulty?: string; fullName?: string }
) {
  try {
    const result = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in updateUserProfile:', error);
    throw new Error('Failed to update student profile settings.', { cause: error });
  }
}

export async function getStudentDashboardData(uid: string) {
  try {
    const [userDocs, userExams, userResults, userTopicPerf, activeAttempts] = await Promise.all([
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
  } catch (error) {
    console.error('Database query failed in getStudentDashboardData:', error);
    throw new Error('Failed to load dashboard analytics from database.', { cause: error });
  }
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
    console.error('Database query failed in createDocumentRecord:', error);
    throw new Error('Failed to save study material in database.', { cause: error });
  }
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
    console.error('Database query failed in createExamWithQuestions:', error);
    throw new Error('Failed to store generated examination paper.', { cause: error });
  }
}

export async function startOrResumeExamAttempt(uid: string, examId: string) {
  try {
    const examRows = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), eq(exams.userUid, uid)));
    if (!examRows.length) {
      throw new Error('Examination not found.');
    }
    const exam = examRows[0];

    // Check if there is an existing in_progress attempt
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
    console.error('Database query failed in startOrResumeExamAttempt:', error);
    throw new Error('Failed to initialize examination session.', { cause: error });
  }
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
    console.error('Database query failed in saveAttemptProgress:', error);
    throw new Error('Failed to auto-save examination progress.', { cause: error });
  }
}

export async function getAttemptFullDataForEvaluation(uid: string, attemptId: string) {
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
  try {
    // Update attempt status
    await db
      .update(attempts)
      .set({
        status: 'evaluated',
        submittedAt: new Date(),
      })
      .where(eq(attempts.id, attemptId));

    // Upsert each answer evaluation
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

    // Insert or update results row
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

    // Update topicPerformance records
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

export async function getResultDetailByAttemptId(uid: string, attemptId: string) {
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
      questions: examQuestions, // Includes correctAnswer, rubricJson, and explanation since attempt is evaluated
      answers: attemptAnswers,
    };
  } catch (error) {
    console.error('Database query failed in getResultDetailByAttemptId:', error);
    throw new Error('Failed to retrieve detailed examination report.', { cause: error });
  }
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
    console.error('Database query failed in recordUserConsent:', error);
    throw new Error('Failed to store DPDP consent record.', { cause: error });
  }
}

export async function getUserConsentsHistory(uid: string) {
  try {
    return await db
      .select()
      .from(consents)
      .where(eq(consents.userId, uid))
      .orderBy(desc(consents.timestamp));
  } catch (error) {
    console.error('Database query failed in getUserConsentsHistory:', error);
    return [];
  }
}

export async function deleteDocumentById(uid: string, documentId: string) {
  try {
    await db
      .delete(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userUid, uid)));
    return { deleted: true };
  } catch (error) {
    console.error('Database query failed in deleteDocumentById:', error);
    throw new Error('Failed to delete saved study material.', { cause: error });
  }
}

export async function exportUserDataBundle(uid: string) {
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
    console.error('Database query failed in exportUserDataBundle:', error);
    throw new Error('Failed to export personal data bundle.', { cause: error });
  }
}

export async function deleteAllUserAccountData(uid: string) {
  try {
    // Explicitly delete all associated records (including uploaded scans/photos, documents/plants, consents, and user profile)
    await db.delete(answers).where(eq(answers.userUid, uid));
    await db.delete(results).where(eq(results.userUid, uid));
    await db.delete(attempts).where(eq(attempts.userUid, uid));
    await db.delete(topicPerformance).where(eq(topicPerformance.userUid, uid));
    await db.delete(exams).where(eq(exams.userUid, uid));
    await db.delete(topics).where(eq(topics.userUid, uid));
    await db.delete(documents).where(eq(documents.userUid, uid));
    await db.delete(consents).where(eq(consents.userId, uid));
    await db.delete(users).where(eq(users.uid, uid));

    return { deleted: true, uid, deletedAt: new Date().toISOString() };
  } catch (error) {
    console.error('Database query failed in deleteAllUserAccountData:', error);
    throw new Error('Failed to erase personal data from database.', { cause: error });
  }
}

