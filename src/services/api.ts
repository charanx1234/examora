import {
  ConsentRecord,
  DashboardPayload,
  ExamAttempt,
  ExamConfig,
  ExamQuestion,
  ExamResultSummary,
  StudyDocument,
  TopicPerformanceMetric,
} from '../types/examora.ts';

// Clean, empty initial state (no fake results before taking an exam)
let demoDocuments: StudyDocument[] = [];
let demoExams: ExamConfig[] = [];
const demoQuestionsByExam: Record<string, ExamQuestion[]> = {};
let demoResults: ExamResultSummary[] = [];
let demoTopicPerf: TopicPerformanceMetric[] = [];

const demoAttemptsStore: Record<
  string,
  {
    attempt: ExamAttempt;
    exam: ExamConfig;
    questions: ExamQuestion[];
    answers: Record<string, any>;
    result?: ExamResultSummary;
  }
> = {};

export async function fetchDashboardData(token: string | null): Promise<DashboardPayload> {
  if (token) {
    const res = await fetch('/api/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error('Failed to load dashboard data from server');
    }
    return await res.json();
  }

  const totalExamsTaken = demoResults.length;
  const averageScore =
    totalExamsTaken > 0
      ? Number((demoResults.reduce((s, r) => s + r.percentage, 0) / totalExamsTaken).toFixed(1))
      : 0;
  const bestScore =
    totalExamsTaken > 0
      ? Number(Math.max(...demoResults.map((r) => r.percentage)).toFixed(1))
      : 0;

  return {
    stats: {
      totalExamsTaken,
      averageScore,
      bestScore,
      documentsCount: demoDocuments.length,
      availableExamsCount: demoExams.length,
    },
    documents: [...demoDocuments],
    exams: [...demoExams],
    recentResults: [...demoResults],
    topicPerformance: [...demoTopicPerf],
    activeAttempts: [],
  };
}

export async function uploadAndAnalyzeDocument(
  token: string | null,
  payload: {
    title: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    rawText: string;
  }
): Promise<{ document: StudyDocument }> {
  if (token) {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Document analysis failed');
    }
    return data;
  }

  const lines = payload.rawText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const detectedSubject =
    /calculus|integral|matrix|theorem|derivative/i.test(payload.rawText)
      ? 'Mathematics'
      : /process|kernel|thread|memory|algorithm|code/i.test(payload.rawText)
      ? 'Computer Science'
      : /quantum|thermodynamics|velocity|field/i.test(payload.rawText)
      ? 'Physics'
      : 'General Sciences';

  const newDoc: StudyDocument = {
    id: `doc-${Date.now()}`,
    title: payload.title,
    fileName: payload.fileName,
    fileType: payload.fileType,
    fileSize: payload.fileSize,
    subject: detectedSubject,
    extractedText: payload.rawText,
    chaptersJson: [
      {
        title: 'Chapter 1: Core Principles & Definitions',
        subtopics: [lines[0]?.slice(0, 42) || payload.title, 'Fundamental Postulates', 'Boundary Conditions'],
      },
      {
        title: 'Chapter 2: Analytical Applications & Proofs',
        subtopics: ['Quantitative Problem Solving', 'Edge-Case Analysis', 'Applied Modeling'],
      },
    ],
    status: 'ready',
    createdAt: new Date().toISOString(),
  };

  demoDocuments = [newDoc, ...demoDocuments];
  return { document: newDoc };
}

export async function generateExamPaper(
  token: string | null,
  payload: {
    documentId?: string | null;
    title: string;
    subject: string;
    topicNames: string[];
    sourceType: 'document' | 'topic';
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
    format: 'MCQ' | 'Descriptive' | 'Coding' | 'Mathematics' | 'Mixed';
    questionCount: number;
    durationMinutes: number;
    totalMarks: number;
    negativeMarking: number;
    sourceContext?: string;
  }
): Promise<{ exam: ExamConfig; questionsCount: number }> {
  if (token) {
    const res = await fetch('/api/exams/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to generate AI examination');
    }
    return data;
  }

  const examId = `exam-${Date.now()}`;
  const count = Math.max(1, Math.min(10, payload.questionCount));
  const marksEach = Number((payload.totalMarks / count).toFixed(1));

  const newExam: ExamConfig = {
    id: examId,
    documentId: payload.documentId || null,
    title: payload.title || `${payload.subject}: ${payload.topicNames.slice(0, 2).join(' & ')}`,
    subject: payload.subject,
    topicNames: payload.topicNames,
    sourceType: payload.sourceType,
    difficulty: payload.difficulty,
    format: payload.format,
    questionCount: count,
    durationMinutes: payload.durationMinutes,
    totalMarks: payload.totalMarks,
    negativeMarking: payload.negativeMarking,
    status: 'ready',
    createdAt: new Date().toISOString(),
  };

  const generated: ExamQuestion[] = Array.from({ length: count }).map((_, idx) => {
    const topic = payload.topicNames[idx % payload.topicNames.length] || payload.subject;
    const types: Array<'MCQ' | 'Descriptive' | 'Coding' | 'Mathematics'> =
      payload.format === 'Mixed'
        ? ['MCQ', 'Mathematics', 'Descriptive', 'Coding']
        : [payload.format];
    const qType = types[idx % types.length];

    if (qType === 'MCQ') {
      const correctOpt = `Primary invariant of ${topic} holds under closed boundary conditions`;
      return {
        id: `${examId}-q-${idx + 1}`,
        examId,
        questionOrder: idx + 1,
        questionType: 'MCQ',
        topic,
        difficulty: payload.difficulty,
        marks: marksEach,
        negativeMarks: payload.negativeMarking,
        prompt: `[${payload.difficulty}] In the context of ${payload.subject} (${topic}), which statement rigorously characterizes the system behavior under standard constraints?`,
        optionsJson: [
          correctOpt,
          `The rate of convergence scales inversely with the cube of the step parameter`,
          `Equilibrium only exists when the Jacobian determinant vanishes identically`,
          `The operator commutes only for non-Hermitian perturbations`,
        ],
        correctAnswer: correctOpt,
        rubricJson: [{ criterion: `Verify ${topic} conservation law`, maxMarks: marksEach }],
        explanation: `Under standard ${topic} axioms, boundary invariance guarantees the primary conservation property.`,
      };
    }

    if (qType === 'Coding') {
      return {
        id: `${examId}-q-${idx + 1}`,
        examId,
        questionOrder: idx + 1,
        questionType: 'Coding',
        topic,
        difficulty: payload.difficulty,
        marks: marksEach,
        negativeMarks: 0,
        prompt: `Write a function \`evaluateMetric(values)\` that computes the normalized mean rate of change across the input array for ${topic}, rounded to 2 decimal places.`,
        codeStarterJson: {
          language: 'javascript',
          starterCode: `function evaluateMetric(values) {\n  if (!values || values.length < 2) return 0;\n  const delta = values[values.length - 1] - values[0];\n  return Number((delta / (values.length - 1)).toFixed(2));\n}`,
          testCases: [
            { input: '[10, 14, 18, 22]', expectedOutput: '4' },
            { input: '[5, 8, 14]', expectedOutput: '4.5' },
          ],
        },
        correctAnswer: 'Compute (last - first) / (n - 1) with boundary guard.',
        rubricJson: [
          { criterion: 'Handle edge cases for arrays with fewer than 2 elements', maxMarks: marksEach * 0.4 },
          { criterion: 'Accurate rate calculation and 2-decimal precision', maxMarks: marksEach * 0.6 },
        ],
        explanation: 'By telescoping sum, the mean step difference equals (a_n - a_1) / (n - 1).',
      };
    }

    if (qType === 'Mathematics') {
      return {
        id: `${examId}-q-${idx + 1}`,
        examId,
        questionOrder: idx + 1,
        questionType: 'Mathematics',
        topic,
        difficulty: payload.difficulty,
        marks: marksEach,
        negativeMarks: 0,
        prompt: `Derive the closed-form solution for the ${topic} differential operator on the interval [0, π] and verify orthogonality of the resulting eigenfunctions. You may type your derivation or attach a handwritten scan.`,
        optionsJson: [],
        correctAnswer: 'Eigenvalues λ_n = n², eigenfunctions sin(nx) orthogonal on [0, π] with weight 1.',
        rubricJson: [
          { criterion: 'Formulate characteristic equation and apply boundary conditions at x = 0, π', maxMarks: marksEach * 0.6 },
          { criterion: 'Demonstrate orthogonality integral ∫_0^π sin(nx)sin(mx) dx = (π/2)δ_nm', maxMarks: marksEach * 0.4 },
        ],
        explanation: 'Standard Sturm-Liouville boundary value problem on [0, π] yields eigenvalues n².',
      };
    }

    return {
      id: `${examId}-q-${idx + 1}`,
      examId,
      questionOrder: idx + 1,
      questionType: 'Descriptive',
      topic,
      difficulty: payload.difficulty,
      marks: marksEach,
      negativeMarks: 0,
      prompt: `Critically analyze the core mechanism of ${topic} in ${payload.subject}, contrasting its theoretical assumptions with real-world boundary limitations.`,
      optionsJson: [],
      correctAnswer: `Comprehensive synthesis of ${topic} assumptions, stability conditions, and asymptotic trade-offs.`,
      rubricJson: [
        { criterion: `Define formal theoretical invariants of ${topic}`, maxMarks: marksEach * 0.5 },
        { criterion: 'Evaluate practical failure modes and mitigation strategies', maxMarks: marksEach * 0.5 },
      ],
      explanation: `A complete answer links formal ${topic} definitions to empirical scaling constraints.`,
    };
  });

  demoExams = [newExam, ...demoExams];
  demoQuestionsByExam[examId] = generated;
  return { exam: newExam, questionsCount: generated.length };
}

export async function startExamSession(
  token: string | null,
  examId: string
): Promise<{
  exam: ExamConfig;
  attempt: ExamAttempt;
  questions: ExamQuestion[];
  savedAnswers: any[];
}> {
  if (token) {
    const res = await fetch('/api/attempts/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ examId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to start examination');
    }
    return data;
  }

  const exam = demoExams.find((e) => e.id === examId);
  if (!exam) {
    throw new Error('Examination paper not found. Please generate an examination first.');
  }
  const fullQuestions = demoQuestionsByExam[exam.id] || [];
  const safeQuestions = fullQuestions.map(({ correctAnswer, explanation, ...rest }) => rest);

  const attemptId = `att-${exam.id}-${Date.now()}`;
  demoAttemptsStore[attemptId] = {
    attempt: {
      id: attemptId,
      examId: exam.id,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      timeRemainingSeconds: exam.durationMinutes * 60,
      currentQuestionIndex: 0,
      markedForReviewJson: [],
    },
    exam,
    questions: fullQuestions,
    answers: {},
  };

  const stored = demoAttemptsStore[attemptId];
  return {
    exam,
    attempt: stored.attempt,
    questions: safeQuestions,
    savedAnswers: [],
  };
}

export async function autoSaveAttempt(
  token: string | null,
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
): Promise<void> {
  if (token) {
    await fetch(`/api/attempts/${attemptId}/save`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return;
  }

  const stored = demoAttemptsStore[attemptId];
  if (stored) {
    stored.attempt.timeRemainingSeconds = payload.timeRemainingSeconds;
    stored.attempt.currentQuestionIndex = payload.currentQuestionIndex;
    stored.attempt.markedForReviewJson = payload.markedForReviewJson;
    if (payload.answer) {
      stored.answers[payload.answer.questionId] = {
        questionId: payload.answer.questionId,
        answerText: payload.answer.answerText,
        codeLanguage: payload.answer.codeLanguage,
        handwrittenImageData: payload.answer.handwrittenImageData,
      };
    }
  }
}

export async function submitExamAttempt(
  token: string | null,
  attemptId: string,
  payload: {
    answersPayload: Array<{
      questionId: string;
      answerText: string;
      codeLanguage?: string | null;
      handwrittenImageData?: string | null;
    }>;
    timeTakenSeconds: number;
    ephemeralPhotoMode?: boolean;
  }
): Promise<{ result: ExamResultSummary; attemptId: string }> {
  if (token) {
    const res = await fetch(`/api/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to evaluate examination');
    }
    return data;
  }

  const stored = demoAttemptsStore[attemptId];
  if (!stored) {
    throw new Error('Examination session not found');
  }

  const { exam, questions } = stored;
  let obtainedMarks = 0;
  let correctCount = 0;
  let partialCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  const weakTopics: string[] = [];

  for (const q of questions) {
    const sub = payload.answersPayload.find((a) => a.questionId === q.id);
    const ansText = (sub?.answerText || '').trim();
    const hasImg = Boolean(sub?.handwrittenImageData);

    if (!ansText && !hasImg) {
      unansweredCount++;
      weakTopics.push(q.topic);
      stored.answers[q.id] = {
        questionId: q.id,
        answerText: '',
        isCorrect: false,
        awardedMarks: 0,
        aiFeedback: 'No response submitted for this question.',
        conceptualMistake: 'Unanswered question.',
      };
      continue;
    }

    if (q.questionType === 'MCQ') {
      const isRight = ansText.toLowerCase() === (q.correctAnswer || '').toLowerCase();
      const awarded = isRight ? q.marks : -Math.abs(q.negativeMarks || 0);
      obtainedMarks += awarded;
      if (isRight) correctCount++;
      else {
        incorrectCount++;
        weakTopics.push(q.topic);
      }
      stored.answers[q.id] = {
        questionId: q.id,
        answerText: ansText,
        isCorrect: isRight,
        awardedMarks: awarded,
        aiFeedback: isRight
          ? `Correct! ${q.explanation}`
          : `Incorrect. Expected "${q.correctAnswer}". ${q.explanation}`,
        conceptualMistake: isRight ? null : `Confused ${q.topic} invariant condition.`,
      };
    } else {
      const ratio = hasImg ? 0.9 : ansText.length > 80 ? 0.9 : ansText.length > 25 ? 0.7 : 0.4;
      const awarded = Number((q.marks * ratio).toFixed(1));
      obtainedMarks += awarded;
      if (ratio >= 0.85) correctCount++;
      else {
        partialCount++;
        if (ratio < 0.6) weakTopics.push(q.topic);
      }
      stored.answers[q.id] = {
        questionId: q.id,
        answerText: ansText,
        codeLanguage: sub?.codeLanguage,
        handwrittenImageData: sub?.handwrittenImageData,
        isCorrect: ratio >= 0.85,
        awardedMarks: awarded,
        aiFeedback:
          ratio >= 0.85
            ? `Strong analytical derivation satisfying rubric criteria. ${q.explanation}`
            : `Partial credit awarded (${awarded}/${q.marks} marks). ${q.explanation}`,
        conceptualMistake:
          ratio >= 0.85 ? null : `Explicitly state domain regularity assumptions in ${q.topic}.`,
      };
    }
  }

  const clampedObtained = Math.max(0, Number(obtainedMarks.toFixed(1)));
  const percentage = Number(((clampedObtained / Math.max(1, exam.totalMarks)) * 100).toFixed(1));
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

  const uniqueWeak = Array.from(new Set(weakTopics));
  const summary: ExamResultSummary = {
    id: `res-${Date.now()}`,
    attemptId,
    examId: exam.id,
    examTitle: exam.title,
    subject: exam.subject,
    format: exam.format,
    difficulty: exam.difficulty,
    totalMarks: exam.totalMarks,
    obtainedMarks: clampedObtained,
    percentage,
    grade,
    timeTakenSeconds: payload.timeTakenSeconds,
    correctCount,
    partialCount,
    incorrectCount,
    unansweredCount,
    overallFeedback:
      percentage >= 80
        ? `High proficiency demonstrated across ${exam.subject}. Analytical derivations and rubric steps were well-structured.`
        : `Completed assessment with ${percentage}%. Focus your next adaptive revision session on ${
            uniqueWeak.join(', ') || exam.topicNames[0]
          } to convert partial marks into full credit.`,
    weakTopicsJson: uniqueWeak,
    recommendationsJson: [
      `Review marking rubric step breakdowns for ${uniqueWeak[0] || exam.topicNames[0]}.`,
      `Generate a targeted 4-question Adaptive Drill at ${exam.difficulty} difficulty.`,
    ],
    evaluatedAt: new Date().toISOString(),
  };

  stored.attempt.status = 'evaluated';
  stored.result = summary;
  demoResults = [summary, ...demoResults];
  return { result: summary, attemptId };
}

export async function fetchResultReport(
  token: string | null,
  attemptId: string
): Promise<{
  result: ExamResultSummary;
  exam: ExamConfig;
  questions: ExamQuestion[];
  answers: any[];
}> {
  if (token) {
    const res = await fetch(`/api/results/${attemptId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch evaluation report');
    }
    return data;
  }

  const stored = demoAttemptsStore[attemptId];
  if (!stored || !stored.result) {
    throw new Error('Evaluation report not found. Complete an examination first.');
  }

  return {
    result: stored.result,
    exam: stored.exam,
    questions: stored.questions,
    answers: Object.values(stored.answers),
  };
}

let demoConsents: ConsentRecord[] = [];

export async function fetchUserConsents(token: string | null): Promise<ConsentRecord[]> {
  if (token) {
    const res = await fetch('/api/privacy/consents', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return data.consents || [];
    }
  }
  return demoConsents;
}

export async function submitUserConsent(
  token: string | null,
  consentGiven: boolean,
  consentTextVersion = 'DPDP-2023-v1.0',
  consentText = 'I agree to the Privacy Policy and consent to my data (name, email, uploaded photos) being used to provide plant diagnosis and AI examination evaluation.'
): Promise<ConsentRecord> {
  if (token) {
    const res = await fetch('/api/privacy/consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ consentGiven, consentTextVersion, consentText }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.consent;
    }
  }
  const fallbackRecord: ConsentRecord = {
    id: `consent-${Date.now()}`,
    userId: 'scholar-user',
    consentGiven,
    consentTextVersion,
    consentText,
    timestamp: new Date().toISOString(),
  };
  demoConsents = [fallbackRecord, ...demoConsents];
  return fallbackRecord;
}

export async function deleteStudyDocument(token: string | null, documentId: string): Promise<void> {
  if (token) {
    const res = await fetch(`/api/documents/${documentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error('Failed to delete study material');
    }
    return;
  }
  demoDocuments = demoDocuments.filter((d) => d.id !== documentId);
}

export async function downloadPersonalDataExport(token: string | null): Promise<any> {
  if (token) {
    const res = await fetch('/api/privacy/export', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      return await res.json();
    }
  }
  return {
    exportMetadata: {
      standard: 'Digital Personal Data Protection (DPDP) Act 2023 — Right to Access & Data Portability',
      exportedAt: new Date().toISOString(),
    },
    consents: demoConsents,
    plants: demoDocuments,
    documents: demoDocuments,
    examinations: demoExams,
    evaluationResults: demoResults,
  };
}

export async function deleteAccountAndData(token: string | null): Promise<void> {
  if (token) {
    const res = await fetch('/api/privacy/account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error('Failed to delete account data');
    }
  }
  demoDocuments = [];
  demoExams = [];
  demoResults = [];
  demoTopicPerf = [];
  demoConsents = [];
}

