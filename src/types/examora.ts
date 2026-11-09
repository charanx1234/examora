export type AppView =
  | 'landing'
  | 'dashboard'
  | 'documents'
  | 'create-exam'
  | 'exam-player'
  | 'exam-result'
  | 'analytics'
  | 'adaptive'
  | 'settings'
  | 'privacy-policy';

export interface ConsentRecord {
  id: string;
  userId: string;
  consentGiven: boolean;
  consentTextVersion: string;
  consentText: string;
  timestamp: string;
}

export interface StudentProfile {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  academicLevel: string;
  targetGoal: string;
  preferredDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
}

export interface ChapterItem {
  title: string;
  subtopics: string[];
}

export interface StudyDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  subject: string;
  extractedText: string;
  chaptersJson: ChapterItem[];
  status: string;
  createdAt: string;
}

export interface ExamConfig {
  id: string;
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
  status: string;
  createdAt: string;
}

export interface RubricItem {
  criterion: string;
  maxMarks: number;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  questionOrder: number;
  questionType: 'MCQ' | 'Descriptive' | 'Coding' | 'Mathematics';
  topic: string;
  difficulty: string;
  marks: number;
  negativeMarks: number;
  prompt: string;
  optionsJson?: string[];
  codeStarterJson?: {
    language?: string;
    starterCode?: string;
    testCases?: Array<{ input: string; expectedOutput: string }>;
  };
  rubricJson: RubricItem[];
  correctAnswer?: string; // Only present in post-submission result report
  explanation?: string;   // Only present in post-submission result report
}

export interface ExamAttempt {
  id: string;
  examId: string;
  status: 'in_progress' | 'submitted' | 'evaluated';
  startedAt: string;
  submittedAt?: string | null;
  timeRemainingSeconds: number;
  currentQuestionIndex: number;
  markedForReviewJson: string[];
}

export interface StudentAnswer {
  id?: string;
  attemptId?: string;
  questionId: string;
  answerText: string;
  codeLanguage?: string | null;
  handwrittenImageData?: string | null;
  isCorrect?: boolean | null;
  awardedMarks?: number | null;
  aiFeedback?: string | null;
  conceptualMistake?: string | null;
  requiresManualReview?: boolean;
}

export interface ExamResultSummary {
  id: string;
  attemptId: string;
  examId: string;
  examTitle?: string;
  subject?: string;
  format?: string;
  difficulty?: string;
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
  evaluatedAt: string;
}

export interface TopicPerformanceMetric {
  id: string;
  subject: string;
  topic: string;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracyPercentage: number;
  averageScorePercentage: number;
  masteryLevel: 'Needs Focus' | 'Developing' | 'Proficient' | 'Mastered';
  recommendedDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  lastTestedAt: string;
}

export interface DashboardPayload {
  stats: {
    totalExamsTaken: number;
    averageScore: number;
    bestScore: number;
    documentsCount: number;
    availableExamsCount: number;
  };
  documents: StudyDocument[];
  exams: ExamConfig[];
  recentResults: ExamResultSummary[];
  topicPerformance: TopicPerformanceMetric[];
  activeAttempts: ExamAttempt[];
}
