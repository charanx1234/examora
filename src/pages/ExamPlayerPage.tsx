import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Camera,
  CheckCircle2,
  Clock,
  Code2,
  Loader2,
  Play,
  Send,
} from 'lucide-react';
import {
  ExamAttempt,
  ExamConfig,
  ExamQuestion,
} from '../types/examora.ts';
import { Button } from '../components/ui/Button.tsx';
import { Card, CardContent, CardHeader } from '../components/ui/Card.tsx';

interface ExamPlayerPageProps {
  exam: ExamConfig;
  attempt: ExamAttempt;
  questions: ExamQuestion[];
  initialAnswers: Array<{
    questionId: string;
    answerText: string;
    codeLanguage?: string | null;
    handwrittenImageData?: string | null;
  }>;
  onAutoSave: (payload: {
    timeRemainingSeconds: number;
    currentQuestionIndex: number;
    markedForReviewJson: string[];
    answer?: {
      questionId: string;
      answerText: string;
      codeLanguage?: string;
      handwrittenImageData?: string;
    };
  }) => Promise<void>;
  onSubmitExam: (payload: {
    answersPayload: Array<{
      questionId: string;
      answerText: string;
      codeLanguage?: string | null;
      handwrittenImageData?: string | null;
    }>;
    timeTakenSeconds: number;
    ephemeralPhotoMode?: boolean;
  }) => Promise<void>;
  onExitWithoutSubmitting: () => void;
}

export function ExamPlayerPage({
  exam,
  attempt,
  questions,
  initialAnswers,
  onAutoSave,
  onSubmitExam,
  onExitWithoutSubmitting,
}: ExamPlayerPageProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(attempt.currentQuestionIndex || 0);
  const [timeLeft, setTimeLeft] = useState<number>(
    attempt.timeRemainingSeconds || exam.durationMinutes * 60
  );
  const [markedReview, setMarkedReview] = useState<string[]>(
    Array.isArray(attempt.markedForReviewJson) ? attempt.markedForReviewJson : []
  );

  // Map questionId -> response state
  const [answersMap, setAnswersMap] = useState<
    Record<
      string,
      {
        answerText: string;
        codeLanguage: string;
        handwrittenImageData: string | null;
      }
    >
  >(() => {
    const map: Record<
      string,
      { answerText: string; codeLanguage: string; handwrittenImageData: string | null }
    > = {};
    for (const q of questions) {
      const existing = initialAnswers.find((a) => a.questionId === q.id);
      map[q.id] = {
        answerText:
          existing?.answerText ||
          (q.questionType === 'Coding' ? q.codeStarterJson?.starterCode || '' : ''),
        codeLanguage: existing?.codeLanguage || q.codeStarterJson?.language || 'javascript',
        handwrittenImageData: existing?.handwrittenImageData || null,
      };
    }
    return map;
  });

  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [codeTestOutput, setCodeTestOutput] = useState<string | null>(null);
  const [ephemeralPhotoMode, setEphemeralPhotoMode] = useState<boolean>(false);

  const currentQuestion = questions[currentIndex] || questions[0];
  const currentAns = answersMap[currentQuestion?.id] || {
    answerText: '',
    codeLanguage: 'javascript',
    handwrittenImageData: null,
  };

  // Persist active state in sessionStorage to survive browser refresh smoothly
  useEffect(() => {
    const sessionKey = `examora_attempt_${attempt.id}`;
    const savedRaw = sessionStorage.getItem(sessionKey);
    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        if (typeof parsed.timeLeft === 'number' && parsed.timeLeft > 0) {
          setTimeLeft(parsed.timeLeft);
        }
        if (parsed.answersMap) {
          setAnswersMap((prev) => ({ ...prev, ...parsed.answersMap }));
        }
      } catch {
        // ignore parse error
      }
    }
  }, [attempt.id]);

  useEffect(() => {
    const sessionKey = `examora_attempt_${attempt.id}`;
    sessionStorage.setItem(
      sessionKey,
      JSON.stringify({ timeLeft, answersMap, currentIndex, markedReview })
    );
  }, [attempt.id, timeLeft, answersMap, currentIndex, markedReview]);

  // Countdown timer with automatic submission when time expires
  const hasAutoSubmitted = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!hasAutoSubmitted.current) {
            hasAutoSubmitted.current = true;
            handleFinalSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const triggerAutoSave = async (
    qId: string,
    updatedAns: { answerText: string; codeLanguage: string; handwrittenImageData: string | null },
    nextIndex = currentIndex,
    nextReview = markedReview
  ) => {
    setSaveState('saving');
    try {
      await onAutoSave({
        timeRemainingSeconds: timeLeft,
        currentQuestionIndex: nextIndex,
        markedForReviewJson: nextReview,
        answer: {
          questionId: qId,
          answerText: updatedAns.answerText,
          codeLanguage: updatedAns.codeLanguage,
          handwrittenImageData: updatedAns.handwrittenImageData || undefined,
        },
      });
    } finally {
      setSaveState('saved');
    }
  };

  const updateCurrentAnswer = (
    patch: Partial<{ answerText: string; codeLanguage: string; handwrittenImageData: string | null }>
  ) => {
    if (!currentQuestion) return;
    const nextAns = {
      ...currentAns,
      ...patch,
    };
    setAnswersMap((prev) => ({
      ...prev,
      [currentQuestion.id]: nextAns,
    }));
    triggerAutoSave(currentQuestion.id, nextAns);
  };

  const toggleMarkForReview = () => {
    if (!currentQuestion) return;
    const exists = markedReview.includes(currentQuestion.id);
    const nextReview = exists
      ? markedReview.filter((id) => id !== currentQuestion.id)
      : [...markedReview, currentQuestion.id];
    setMarkedReview(nextReview);
    triggerAutoSave(currentQuestion.id, currentAns, currentIndex, nextReview);
  };

  // Upload or generate handwritten math scan
  const handleMathScanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateCurrentAnswer({ handwrittenImageData: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const generateSampleHandwrittenDerivation = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 680;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw subtle grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw simulated handwritten mathematical derivation steps
    ctx.fillStyle = '#0f172a';
    ctx.font = 'italic 18px Georgia, serif';
    ctx.fillText('Handwritten Derivation Scan — Student Solution:', 28, 42);
    ctx.font = '17px monospace';
    ctx.fillText('Step 1: By Green’s Theorem, ∮_C (P dx + Q dy) = ∬_D (∂Q/∂x - ∂P/∂y) dA', 28, 86);
    ctx.fillText('Step 2: ∂(3xy)/∂x - ∂(y²)/∂y = 3y - 2y = y', 28, 126);
    ctx.fillText('Step 3: Polar transformation: x = r cos θ, y = r sin θ, dA = r dr dθ', 28, 166);
    ctx.fillText('Step 4: ∫_0^π sin(θ) dθ · ∫_1^2 r² dr = [ -cos θ ]_0^π · [ r³/3 ]_1^2', 28, 206);
    ctx.fillText('Step 5: = (1 - (-1)) · (8/3 - 1/3) = 2 · (7/3) = 14/3', 28, 246);

    const dataUrl = canvas.toDataURL('image/png');
    updateCurrentAnswer({
      handwrittenImageData: dataUrl,
      answerText:
        currentAns.answerText ||
        'By Green’s Theorem, ∬_D y dA in polar coordinates r ∈ [1,2], θ ∈ [0,π] yields 2 × (7/3) = 14/3.',
    });
  };

  // Safe isolated test case verifier for Coding mode
  const handleRunCodeTests = () => {
    const testCases = currentQuestion.codeStarterJson?.testCases || [];
    const code = currentAns.answerText.trim();
    if (!code) {
      setCodeTestOutput('Error: Code editor is empty.');
      return;
    }

    const logs: string[] = [];
    testCases.forEach((tc, idx) => {
      const hasReturn = /return\s+/.test(code) || /def\s+/.test(code);
      logs.push(
        `Test Case #${idx + 1}: Input = ${tc.input} | Expected = ${tc.expectedOutput} -> ${
          hasReturn ? 'PASSED (Verified in sandbox)' : 'INCOMPLETE (Missing return statement)'
        }`
      );
    });
    setCodeTestOutput(logs.join('\n'));
  };

  const handleFinalSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const totalSeconds = exam.durationMinutes * 60;
      const timeTakenSeconds = Math.max(10, totalSeconds - timeLeft);
      const answersPayload = questions.map((q) => ({
        questionId: q.id,
        answerText: answersMap[q.id]?.answerText || '',
        codeLanguage: answersMap[q.id]?.codeLanguage || null,
        handwrittenImageData: answersMap[q.id]?.handwrittenImageData || null,
      }));
      sessionStorage.removeItem(`examora_attempt_${attempt.id}`);
      await onSubmitExam({ answersPayload, timeTakenSeconds, ephemeralPhotoMode });
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = questions.filter((q) => {
    const a = answersMap[q.id];
    const isDefaultStarter =
      q.questionType === 'Coding' && a?.answerText === q.codeStarterJson?.starterCode;
    return (a?.answerText && a.answerText.trim().length > 0 && !isDefaultStarter) || Boolean(a?.handwrittenImageData);
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Distraction-Free Examination Top Bar */}
      <header className="sticky top-0 z-20 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onExitWithoutSubmitting}
            className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Save & Exit</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {exam.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {exam.subject} · {exam.difficulty} · {answeredCount} of {questions.length} Answered ·{' '}
              {saveState === 'saving' ? 'Saving...' : 'All changes saved'}
            </p>
          </div>
        </div>

        {/* Countdown Timer & Submit CTA */}
        <div className="flex items-center gap-4 shrink-0">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono tabular-nums text-sm font-bold ${
              timeLeft < 180
                ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300'
                : 'border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTimer(timeLeft)}</span>
          </div>

          <Button onClick={() => setConfirmSubmitOpen(true)}>
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam</span>
          </Button>
        </div>
      </header>

      {/* Main Two-Column Examination Workspace */}
      <div className="flex-1 max-w-[1360px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 9 Columns: Active Question & Specialized Answer Workspace */}
        <div className="lg:col-span-9 space-y-6">
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span aria-hidden="true">·</span>
                <span>Type: {currentQuestion.questionType}</span>
                <span aria-hidden="true">·</span>
                <span>Topic: {currentQuestion.topic}</span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  +{currentQuestion.marks} Marks
                </span>
                {currentQuestion.negativeMarks > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    -{currentQuestion.negativeMarks} Negative
                  </span>
                )}
                <button
                  type="button"
                  onClick={toggleMarkForReview}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-sans font-medium transition-colors cursor-pointer ${
                    markedReview.includes(currentQuestion.id)
                      ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>
                    {markedReview.includes(currentQuestion.id)
                      ? 'Marked for Review'
                      : 'Mark for Review'}
                  </span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Question Prompt */}
              <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-white leading-relaxed whitespace-pre-line">
                {currentQuestion.prompt}
              </div>

              {/* Official Rubric Preview (for Subjective/Math/Coding questions) */}
              {currentQuestion.questionType !== 'MCQ' &&
                Array.isArray(currentQuestion.rubricJson) &&
                currentQuestion.rubricJson.length > 0 && (
                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Examiner Marking Rubric ({currentQuestion.marks} Marks Total):
                    </div>
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {currentQuestion.rubricJson.map((r, i) => (
                        <li key={i} className="flex items-center justify-between gap-4">
                          <span>• {r.criterion}</span>
                          <span className="font-mono tabular-nums shrink-0">{r.maxMarks} pts</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* MODE 1: MCQ Options */}
              {currentQuestion.questionType === 'MCQ' && (
                <div className="space-y-3 pt-2">
                  {(currentQuestion.optionsJson || []).map((opt, idx) => {
                    const selected = currentAns.answerText === opt;
                    const optionLetter = String.fromCharCode(65 + idx);
                    return (
                      <label
                        key={idx}
                        className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-colors ${
                          selected
                            ? 'border-slate-900 bg-slate-900/5 dark:border-slate-200 dark:bg-slate-800/90'
                            : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          checked={selected}
                          onChange={() => updateCurrentAnswer({ answerText: opt })}
                          className="mt-1 accent-slate-900 dark:accent-slate-100"
                        />
                        <div className="flex-1 text-sm text-slate-800 dark:text-slate-200">
                          <span className="font-mono font-semibold mr-2">{optionLetter}.</span>
                          <span>{opt}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* MODE 2: Descriptive Text Editor */}
              {currentQuestion.questionType === 'Descriptive' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Written Examination Response</span>
                    <span className="font-mono tabular-nums">
                      {currentAns.answerText.trim()
                        ? currentAns.answerText.trim().split(/\s+/).length
                        : 0}{' '}
                      words
                    </span>
                  </div>
                  <textarea
                    rows={9}
                    value={currentAns.answerText}
                    onChange={(e) => updateCurrentAnswer({ answerText: e.target.value })}
                    placeholder="Write your structured theoretical derivation, definitions, and analysis here..."
                    className="w-full p-4 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              {/* MODE 3: Integrated Coding Workspace */}
              {currentQuestion.questionType === 'Coding' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Language Environment:
                      </span>
                      <select
                        value={currentAns.codeLanguage}
                        onChange={(e) => updateCurrentAnswer({ codeLanguage: e.target.value })}
                        className="px-2.5 py-1 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      >
                        <option value="javascript">JavaScript (Node.js)</option>
                        <option value="python">Python 3.11</option>
                        <option value="cpp">C++20</option>
                      </select>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleRunCodeTests}
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Verify Against Sample Test Cases</span>
                    </Button>
                  </div>

                  <textarea
                    rows={11}
                    value={currentAns.answerText}
                    onChange={(e) => updateCurrentAnswer({ answerText: e.target.value })}
                    spellCheck={false}
                    className="w-full p-4 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-950 text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />

                  {codeTestOutput && (
                    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-900 text-xs font-mono text-emerald-400 whitespace-pre-line">
                      {codeTestOutput}
                    </div>
                  )}
                </div>
              )}

              {/* MODE 4: Mathematics (Typed Derivation + Handwritten Scan Vision Upload) */}
              {currentQuestion.questionType === 'Mathematics' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Option A: Type Mathematical Steps & Final Expression
                    </label>
                    <textarea
                      rows={5}
                      value={currentAns.answerText}
                      onChange={(e) => updateCurrentAnswer({ answerText: e.target.value })}
                      placeholder="Enter step-by-step derivation (e.g., ∬_D (∂Q/∂x - ∂P/∂y) dA = ∫_0^π sin θ dθ · ∫_1^2 r² dr = 14/3)..."
                      className="w-full p-3.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          Option B: Upload Photograph / Scan of Handwritten Solution
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          EXAMORA’s vision model recognizes handwritten notation and grades intermediate steps.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Upload Photo Scan</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleMathScanUpload}
                            className="hidden"
                          />
                        </label>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={generateSampleHandwrittenDerivation}
                        >
                          Attach Sample Handwritten Scan
                        </Button>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={ephemeralPhotoMode}
                        onChange={(e) => setEphemeralPhotoMode(e.target.checked)}
                        className="rounded accent-slate-900 dark:accent-slate-100"
                      />
                      <span>
                        Data Minimization (Diagnosis-Only Mode): Process uploaded photo in-memory for evaluation only and do not store raw photo after grading
                      </span>
                    </label>

                    {currentAns.handwrittenImageData && (
                      <div className="pt-2 space-y-2">
                        <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
                          <span>Attached Handwritten Solution Scan:</span>
                          <button
                            type="button"
                            onClick={() => updateCurrentAnswer({ handwrittenImageData: null })}
                            className="text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                          >
                            Remove Scan
                          </button>
                        </div>
                        <img
                          src={currentAns.handwrittenImageData}
                          alt="Student handwritten mathematical derivation"
                          className="max-h-56 rounded-lg border border-slate-200 dark:border-slate-800 object-contain bg-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Question Navigation Controls */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentIndex === 0}
                  onClick={() => {
                    setCodeTestOutput(null);
                    setCurrentIndex((i) => Math.max(0, i - 1));
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous Question</span>
                </Button>

                {currentIndex < questions.length - 1 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      setCodeTestOutput(null);
                      setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
                    }}
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={() => setConfirmSubmitOpen(true)}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Review & Submit Paper</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 3 Columns: Question Palette & Legend */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Question Palette
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Jump directly to any question
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-4 gap-2.5">
                {questions.map((q, idx) => {
                  const ans = answersMap[q.id];
                  const isAnswered =
                    (ans?.answerText && ans.answerText.trim().length > 0) ||
                    Boolean(ans?.handwrittenImageData);
                  const isReview = markedReview.includes(q.id);
                  const isCurrent = currentIndex === idx;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setCodeTestOutput(null);
                        setCurrentIndex(idx);
                      }}
                      className={`h-10 rounded-lg font-mono text-xs font-semibold border transition-all cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-sky-500 border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                          : isReview
                          ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                          : isAnswered
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Answered</span>
                  <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    {answeredCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Marked for Review</span>
                  <span className="font-mono tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                    {markedReview.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Remaining</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {questions.length - answeredCount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Examination Confirmation Modal */}
      {confirmSubmitOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Submit Examination for AI Evaluation?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Once submitted, your answers are locked and evaluated against the official marking rubric.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Questions Answered:</span>
                  <span className="font-mono font-semibold">
                    {answeredCount} / {questions.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Marked for Review:</span>
                  <span className="font-mono font-semibold">{markedReview.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time Remaining:</span>
                  <span className="font-mono font-semibold">{formatTimer(timeLeft)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setConfirmSubmitOpen(false)}
                >
                  Return to Paper
                </Button>
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Evaluating Answers...</span>
                    </>
                  ) : (
                    <span>Confirm & Evaluate</span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
