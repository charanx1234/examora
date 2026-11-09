import React from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  ExamConfig,
  ExamQuestion,
  ExamResultSummary,
} from '../types/examora.ts';
import { Button } from '../components/ui/Button.tsx';
import { Card, CardContent, CardHeader } from '../components/ui/Card.tsx';

interface ExamResultPageProps {
  report: {
    result: ExamResultSummary;
    exam: ExamConfig;
    questions: ExamQuestion[];
    answers: Array<{
      questionId: string;
      answerText: string;
      codeLanguage?: string | null;
      handwrittenImageData?: string | null;
      isCorrect?: boolean | null;
      awardedMarks?: number | null;
      aiFeedback?: string | null;
      conceptualMistake?: string | null;
      requiresManualReview?: boolean;
    }>;
  } | null;
  loading: boolean;
  onBackToDashboard: () => void;
  onRetakeExam: (examId: string) => void;
  onGenerateAdaptiveFromMistakes: (subject: string, weakTopics: string[]) => void;
}

export function ExamResultPage({
  report,
  loading,
  onBackToDashboard,
  onRetakeExam,
  onGenerateAdaptiveFromMistakes,
}: ExamResultPageProps) {
  if (loading || !report) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-xl bg-slate-200/70 dark:bg-slate-800/50 animate-pulse" />
        <div className="h-64 rounded-xl bg-slate-200/70 dark:bg-slate-800/50 animate-pulse" />
      </div>
    );
  }

  const { result, exam, questions, answers } = report;
  const answerByQ = new Map(answers.map((a) => [a.questionId, a]));

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-8">
      {/* Header Navigation & Summary Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Student Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {exam.title} — Official AI Evaluation Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {exam.subject} · Format: {exam.format} · Difficulty: {exam.difficulty} · Evaluated{' '}
            {new Date(result.evaluatedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onRetakeExam(exam.id)}>
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Examination</span>
          </Button>
          {result.weakTopicsJson && result.weakTopicsJson.length > 0 && (
            <Button
              size="sm"
              onClick={() =>
                onGenerateAdaptiveFromMistakes(exam.subject, result.weakTopicsJson)
              }
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Practice Weak Topics</span>
            </Button>
          )}
        </div>
      </div>

      {/* 4-Column Score Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Obtained Marks
            </div>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {result.obtainedMarks} / {result.totalMarks}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Percentage: {result.percentage}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Examination Grade
            </div>
            <div className="text-3xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {result.grade}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Rubric-calibrated standing
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Accuracy Breakdown
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white pt-1">
              {result.correctCount} Correct · {result.partialCount} Partial · {result.incorrectCount} Wrong
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {result.unansweredCount} Unanswered
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Time Taken
            </div>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatDuration(result.timeTakenSeconds)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Allocated: {exam.durationMinutes}m 00s
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Teacher Synthesis & Personalized Recommendations */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Examiner’s Executive Synthesis & Study Recommendations
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {result.overallFeedback}
          </p>

          {Array.isArray(result.recommendationsJson) && result.recommendationsJson.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Recommended Next Steps:
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {result.recommendationsJson.map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question-Wise Rubric Evaluation Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Question-by-Question Rubric Breakdown ({questions.length} Questions)
        </h2>

        {questions.map((q, idx) => {
          const ans = answerByQ.get(q.id);
          const awarded = ans?.awardedMarks ?? 0;
          const isFull = awarded >= q.marks * 0.85;
          const isPartial = !isFull && awarded > 0;

          return (
            <Card key={q.id}>
              <CardHeader className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-xs">
                  {isFull ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : isPartial ? (
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  )}
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    Question {idx + 1}
                  </span>
                  <span aria-hidden="true" className="text-slate-400">
                    ·
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {q.questionType} · {q.topic}
                  </span>
                </div>

                <div className="font-mono tabular-nums text-xs font-bold">
                  <span
                    className={
                      isFull
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isPartial
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                    }
                  >
                    Awarded: {awarded} / {q.marks} Marks
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                  {q.prompt}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-1.5">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Your Submitted Answer:
                    </div>
                    <div className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-line">
                      {ans?.answerText || '(No text answer submitted)'}
                    </div>
                    {ans?.handwrittenImageData && (
                      <img
                        src={ans.handwrittenImageData}
                        alt="Submitted handwritten derivation"
                        className="mt-2 max-h-40 rounded border border-slate-200 dark:border-slate-800"
                      />
                    )}
                  </div>

                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-1.5">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Official Answer Key & Derivation:
                    </div>
                    <div className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-line">
                      {q.correctAnswer}
                    </div>
                  </div>
                </div>

                {/* Examiner Feedback & Conceptual Mistake */}
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-xs">
                  <div>
                    <strong className="text-slate-900 dark:text-white">Examiner Feedback: </strong>
                    <span className="text-slate-600 dark:text-slate-300">
                      {ans?.aiFeedback || q.explanation}
                    </span>
                  </div>
                  {ans?.conceptualMistake && (
                    <div className="text-amber-700 dark:text-amber-400">
                      <strong>Identified Conceptual Gap: </strong>
                      <span>{ans.conceptualMistake}</span>
                    </div>
                  )}
                  {ans?.requiresManualReview && (
                    <div className="text-sky-600 dark:text-sky-400 font-medium">
                      Flagged for Manual Review: Portions of the handwritten scan contained ambiguous notation.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
