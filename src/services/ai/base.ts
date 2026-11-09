export interface ExtractedChapter {
  title: string;
  subtopics: string[];
}

export interface DocumentAnalysisResult {
  subject: string;
  summary: string;
  chapters: ExtractedChapter[];
}

export interface RubricCriterion {
  criterion: string;
  maxMarks: number;
}

export interface GeneratedQuestion {
  questionType: 'MCQ' | 'Descriptive' | 'Coding' | 'Mathematics';
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  marks: number;
  negativeMarks: number;
  prompt: string;
  optionsJson?: string[];
  codeStarterJson?: {
    language: string;
    starterCode: string;
    testCases: Array<{ input: string; expectedOutput: string }>;
  };
  correctAnswer: string;
  rubricJson: RubricCriterion[];
  explanation: string;
}

export interface QuestionGenerationParams {
  subject: string;
  topics: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  format: 'MCQ' | 'Descriptive' | 'Coding' | 'Mathematics' | 'Mixed';
  questionCount: number;
  totalMarks: number;
  negativeMarking: number;
  sourceContext?: string;
}

export interface AnswerEvaluationInput {
  questionId: string;
  questionType: string;
  topic: string;
  prompt: string;
  maxMarks: number;
  negativeMarks: number;
  correctAnswer: string;
  rubric: RubricCriterion[];
  studentAnswerText: string;
  codeLanguage?: string | null;
  handwrittenImageData?: string | null;
}

export interface AnswerEvaluationResult {
  questionId: string;
  isCorrect: boolean;
  awardedMarks: number;
  aiFeedback: string;
  conceptualMistake?: string | null;
  requiresManualReview: boolean;
}

export interface PerformanceSynthesisResult {
  overallFeedback: string;
  weakTopics: string[];
  recommendations: string[];
}

/**
 * Provider-independent AI Teacher interface so Gemini, OpenAI, Claude, or local models
 * can be swapped without modifying routes or business logic.
 */
export interface AITeacherProvider {
  readonly providerName: string;
  analyzeDocument(title: string, rawText: string): Promise<DocumentAnalysisResult>;
  generateQuestions(params: QuestionGenerationParams): Promise<GeneratedQuestion[]>;
  evaluateSubjectiveAnswer(input: AnswerEvaluationInput): Promise<AnswerEvaluationResult>;
  synthesizePerformance(
    subject: string,
    percentage: number,
    evaluations: Array<{ topic: string; awardedMarks: number; maxMarks: number; mistake?: string | null }>
  ): Promise<PerformanceSynthesisResult>;
}
