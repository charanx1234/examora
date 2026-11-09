import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
  index,
} from 'drizzle-orm/pg-core';

// 1. users table (linked to Firebase Auth UID)
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    uid: text('uid').notNull().unique(), // Firebase Auth UID
    email: text('email').notNull(),
    fullName: text('full_name').notNull().default('Scholar'),
    avatarUrl: text('avatar_url'),
    academicLevel: text('academic_level').notNull().default('University / Undergraduate'),
    targetGoal: text('target_goal').notNull().default('Honors Mastery'),
    preferredDifficulty: text('preferred_difficulty').notNull().default('Medium'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('users_uid_idx').on(table.uid)]
);

// 2. documents table (study materials uploaded by students)
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    fileName: text('file_name').notNull(),
    fileType: text('file_type').notNull(), // PDF, DOCX, PPT, TXT, MD
    fileSize: integer('file_size').notNull(), // in bytes
    subject: text('subject').notNull(),
    extractedText: text('extracted_text').notNull(),
    chaptersJson: jsonb('chapters_json').notNull().default([]), // Array of extracted chapters/subtopics
    status: text('status').notNull().default('ready'), // processing, ready, failed
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('documents_user_uid_idx').on(table.userUid)]
);

// 3. topics table (extracted or manually defined subject topics)
export const topics = pgTable(
  'topics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
    subject: text('subject').notNull(),
    name: text('name').notNull(),
    subtopicsJson: jsonb('subtopics_json').notNull().default([]),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('topics_user_uid_idx').on(table.userUid),
    index('topics_subject_idx').on(table.subject),
  ]
);

// 4. exams table (configured examination papers)
export const exams = pgTable(
  'exams',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    subject: text('subject').notNull(),
    topicNames: jsonb('topic_names').notNull().default([]), // Array of selected topic strings
    sourceType: text('source_type').notNull().default('topic'), // 'document' | 'topic'
    difficulty: text('difficulty').notNull().default('Medium'), // 'Easy' | 'Medium' | 'Hard' | 'Expert'
    format: text('format').notNull().default('MCQ'), // 'MCQ' | 'Descriptive' | 'Coding' | 'Mathematics' | 'Mixed'
    questionCount: integer('question_count').notNull().default(5),
    durationMinutes: integer('duration_minutes').notNull().default(30),
    totalMarks: doublePrecision('total_marks').notNull().default(50),
    negativeMarking: doublePrecision('negative_marking').notNull().default(0), // e.g., 0.25
    status: text('status').notNull().default('ready'), // 'generating' | 'ready' | 'archived'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('exams_user_uid_idx').on(table.userUid)]
);

// 5. questions table (generated questions with secure answer keys & rubrics)
export const questions = pgTable(
  'questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    questionOrder: integer('question_order').notNull(),
    questionType: text('question_type').notNull(), // 'MCQ' | 'Descriptive' | 'Coding' | 'Mathematics'
    topic: text('topic').notNull(),
    difficulty: text('difficulty').notNull(),
    marks: doublePrecision('marks').notNull().default(10),
    negativeMarks: doublePrecision('negative_marks').notNull().default(0),
    prompt: text('prompt').notNull(),
    optionsJson: jsonb('options_json').default([]), // For MCQ: array of 4 strings
    codeStarterJson: jsonb('code_starter_json').default({}), // For Coding: starter code + test cases
    correctAnswer: text('correct_answer').notNull(), // Protected: never sent to student before submission
    rubricJson: jsonb('rubric_json').notNull().default([]), // Grading rubric criteria & points
    explanation: text('explanation').notNull(), // Detailed conceptual explanation
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('questions_exam_id_idx').on(table.examId)]
);

// 6. attempts table (active and completed student exam sessions)
export const attempts = pgTable(
  'attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    userUid: text('user_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    status: text('status').notNull().default('in_progress'), // 'in_progress' | 'submitted' | 'evaluated'
    startedAt: timestamp('started_at').defaultNow().notNull(),
    submittedAt: timestamp('submitted_at'),
    timeRemainingSeconds: integer('time_remaining_seconds').notNull(),
    currentQuestionIndex: integer('current_question_index').notNull().default(0),
    markedForReviewJson: jsonb('marked_for_review_json').notNull().default([]), // Array of question IDs
  },
  (table) => [
    index('attempts_user_uid_idx').on(table.userUid),
    index('attempts_exam_id_idx').on(table.examId),
  ]
);

// 7. answers table (student responses per question in an attempt)
export const answers = pgTable(
  'answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => attempts.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    userUid: text('user_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    answerText: text('answer_text').notNull().default(''),
    codeLanguage: text('code_language'),
    handwrittenImageData: text('handwritten_image_data'), // Base64 scan for math mode
    isCorrect: boolean('is_correct'),
    awardedMarks: doublePrecision('awarded_marks'),
    aiFeedback: text('ai_feedback'),
    conceptualMistake: text('conceptual_mistake'),
    requiresManualReview: boolean('requires_manual_review').notNull().default(false),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('answers_attempt_id_idx').on(table.attemptId),
    index('answers_question_id_idx').on(table.questionId),
  ]
);

// 8. results table (overall evaluation summary per attempt)
export const results = pgTable(
  'results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    attemptId: uuid('attempt_id')
      .notNull()
      .unique()
      .references(() => attempts.id, { onDelete: 'cascade' }),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    userUid: text('user_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    totalMarks: doublePrecision('total_marks').notNull(),
    obtainedMarks: doublePrecision('obtained_marks').notNull(),
    percentage: doublePrecision('percentage').notNull(),
    grade: text('grade').notNull(),
    timeTakenSeconds: integer('time_taken_seconds').notNull(),
    correctCount: integer('correct_count').notNull().default(0),
    partialCount: integer('partial_count').notNull().default(0),
    incorrectCount: integer('incorrect_count').notNull().default(0),
    unansweredCount: integer('unanswered_count').notNull().default(0),
    overallFeedback: text('overall_feedback').notNull(),
    weakTopicsJson: jsonb('weak_topics_json').notNull().default([]),
    recommendationsJson: jsonb('recommendations_json').notNull().default([]),
    evaluatedAt: timestamp('evaluated_at').defaultNow().notNull(),
  },
  (table) => [
    index('results_user_uid_idx').on(table.userUid),
    index('results_exam_id_idx').on(table.examId),
  ]
);

// 9. topic_performance table (longitudinal subject & topic mastery tracking)
export const topicPerformance = pgTable(
  'topic_performance',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    subject: text('subject').notNull(),
    topic: text('topic').notNull(),
    questionsAttempted: integer('questions_attempted').notNull().default(0),
    questionsCorrect: integer('questions_correct').notNull().default(0),
    accuracyPercentage: doublePrecision('accuracy_percentage').notNull().default(0),
    averageScorePercentage: doublePrecision('average_score_percentage').notNull().default(0),
    masteryLevel: text('mastery_level').notNull().default('Developing'), // 'Needs Focus' | 'Developing' | 'Proficient' | 'Mastered'
    recommendedDifficulty: text('recommended_difficulty').notNull().default('Medium'),
    lastTestedAt: timestamp('last_tested_at').defaultNow().notNull(),
  },
  (table) => [
    index('topic_perf_user_uid_idx').on(table.userUid),
    index('topic_perf_subject_idx').on(table.subject),
  ]
);

// 10. consents table (DPDP Act 2023 consent ledger)
export const consents = pgTable(
  'consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    consentGiven: boolean('consent_given').notNull().default(false),
    consentTextVersion: text('consent_text_version').notNull().default('DPDP-2023-v1.0'),
    consentText: text('consent_text')
      .notNull()
      .default(
        'I agree to the Privacy Policy and consent to my data (name, email, uploaded photos) being used to provide plant diagnosis and AI examination evaluation.'
      ),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (table) => [index('consents_user_id_idx').on(table.userId)]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  topics: many(topics),
  exams: many(exams),
  attempts: many(attempts),
  results: many(results),
  topicPerformances: many(topicPerformance),
  consents: many(consents),
}));

