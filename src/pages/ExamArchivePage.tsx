import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Clock,
  FileCheck2,
  FilePlus2,
  Filter,
  Layers,
  Play,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  AppView,
  DashboardPayload,
} from '../types/examora.ts';
import { Button } from '../components/ui/Button.tsx';
import { Card, CardContent, CardHeader } from '../components/ui/Card.tsx';

interface ExamArchivePageProps {
  data: DashboardPayload | null;
  onNavigate: (view: AppView) => void;
  onStartExam: (examId: string) => void;
  onViewResult: (attemptId: string) => void;
  onQuickConfigureTopic: (
    subject: string,
    topics: string[],
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert'
  ) => void;
}

const REFERENCE_SYLLABUS_BANK: Array<{
  subject: string;
  chapter: string;
  topics: string[];
  recommendedDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
}> = [
  {
    subject: 'Mathematics',
    chapter: 'Vector & Multivariable Calculus',
    topics: ['Partial Differentiation & Gradients', 'Green’s & Stokes’ Theorems', 'Multiple Integrals & Jacobians'],
    recommendedDifficulty: 'Medium',
  },
  {
    subject: 'Computer Science',
    chapter: 'Operating Systems & Concurrency',
    topics: ['Process Synchronization & Semaphores', 'Deadlock Avoidance & Banker’s Algorithm', 'Virtual Memory & LRU Paging'],
    recommendedDifficulty: 'Hard',
  },
  {
    subject: 'Computer Science',
    chapter: 'Database Internals & Storage',
    topics: ['B+ Trees & Node Splitting', 'MVCC & Snapshot Isolation', 'ARIES Write-Ahead Logging'],
    recommendedDifficulty: 'Hard',
  },
  {
    subject: 'Physics',
    chapter: 'Quantum Mechanics & Wave Formalism',
    topics: ['Schrödinger Wave Equation', 'Hermitian Operators & Commutators', '1D Potential Wells & Tunneling'],
    recommendedDifficulty: 'Medium',
  },
];

export function ExamArchivePage({
  data,
  onNavigate,
  onStartExam,
  onViewResult,
  onQuickConfigureTopic,
}: ExamArchivePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'papers' | 'transcripts' | 'syllabus'>('papers');

  const exams = data?.exams || [];
  const recentResults = data?.recentResults || [];
  const activeAttempts = data?.activeAttempts || [];
  const documents = data?.documents || [];

  const inProgressExamIds = useMemo(
    () => new Set(activeAttempts.filter((a) => a.status === 'in_progress').map((a) => a.examId)),
    [activeAttempts]
  );

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesFormat = formatFilter === 'ALL' || exam.format === formatFilter;
      const matchesDiff = difficultyFilter === 'ALL' || exam.difficulty === difficultyFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        exam.title.toLowerCase().includes(q) ||
        exam.subject.toLowerCase().includes(q) ||
        (exam.topicNames || []).some((t) => t.toLowerCase().includes(q));
      return matchesFormat && matchesDiff && matchesSearch;
    });
  }, [exams, formatFilter, difficultyFilter, searchQuery]);

  // Combine user's uploaded document chapters with reference syllabus modules
  const syllabusModules = useMemo(() => {
    const fromDocs = documents.flatMap((doc) =>
      (doc.chaptersJson || []).map((ch) => ({
        subject: doc.subject,
        chapter: `${doc.title} — ${ch.title}`,
        topics: ch.subtopics,
        recommendedDifficulty: 'Medium' as const,
      }))
    );
    return [...fromDocs, ...REFERENCE_SYLLABUS_BANK];
  }, [documents]);

  return (
    <div className="space-y-8">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Examination Repository & Syllabus Vault
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Question Papers & Transcript Archive
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Browse generated question papers, resume unfinished attempts, inspect graded answer scripts, or launch a syllabus module paper.
          </p>
        </div>

        <Button onClick={() => onNavigate('create-exam')}>
          <FilePlus2 className="w-4 h-4" />
          <span>New Examination Paper</span>
        </Button>
      </div>

      {/* Section Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('papers')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'papers'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Configured Papers ({exams.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transcripts')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'transcripts'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Graded Answer Scripts ({recentResults.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('syllabus')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'syllabus'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Syllabus Topic Bank ({syllabusModules.length})
          </button>
        </div>

        {activeTab === 'papers' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, subject, topic..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">All Formats</option>
                <option value="MCQ">MCQ</option>
                <option value="Descriptive">Descriptive</option>
                <option value="Coding">Coding</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Mixed">Mixed</option>
              </select>

              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: Configured Question Papers */}
      {activeTab === 'papers' && (
        <div className="space-y-4">
          {filteredExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredExams.map((exam) => {
                const hasActiveAttempt = inProgressExamIds.has(exam.id);
                return (
                  <Card key={exam.id} className="flex flex-col justify-between">
                    <CardHeader className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {exam.subject}
                        </span>
                        <span className="font-mono tabular-nums">
                          {exam.format} · {exam.difficulty}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {exam.title}
                      </h3>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {Array.isArray(exam.topicNames) && exam.topicNames.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Tested Syllabus Concepts:
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                            {exam.topicNames.join(' · ')}
                          </p>
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {exam.durationMinutes}m
                          </span>
                          <span>·</span>
                          <span>{exam.questionCount} Qs</span>
                          <span>·</span>
                          <span>{exam.totalMarks} Marks</span>
                        </div>

                        <Button size="sm" onClick={() => onStartExam(exam.id)}>
                          <Play className="w-3.5 h-3.5" />
                          <span>{hasActiveAttempt ? 'Resume Paper' : 'Start Paper'}</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <Layers className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {exams.length === 0
                      ? 'No question papers configured yet'
                      : 'No papers match your current filters'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    {exams.length === 0
                      ? 'Generate a personalized paper from your study materials or any academic topic to build your personal question paper repository.'
                      : 'Try clearing the search query or switching the format/difficulty filter.'}
                  </p>
                </div>
                <div className="pt-2">
                  <Button size="sm" onClick={() => onNavigate('create-exam')}>
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>Configure New Question Paper</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: Graded Answer Scripts & Official Transcripts */}
      {activeTab === 'transcripts' && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Completed Examination Transcripts
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verified evaluation reports with question-by-question rubric grading and official answer keys
            </p>
          </CardHeader>

          {recentResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-6">Examination Paper</th>
                    <th className="py-3 px-4">Subject · Format</th>
                    <th className="py-3 px-4 text-right">Breakdown</th>
                    <th className="py-3 px-4 text-right">Marks</th>
                    <th className="py-3 px-4 text-right">Grade</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {recentResults.map((res) => (
                    <tr
                      key={res.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white">
                        {res.examTitle || 'Academic Examination'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {res.subject} · {res.format} · {res.difficulty}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                        {res.correctCount}C / {res.partialCount}P / {res.incorrectCount}W
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                        {res.obtainedMarks}/{res.totalMarks} ({res.percentage}%)
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        {res.grade}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewResult(res.attemptId)}
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Answer Script</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onStartExam(res.examId)}
                            title="Retake this paper"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <CardContent className="py-12 text-center space-y-2">
              <FileCheck2 className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                No graded answer scripts yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Your official transcripts and rubric evaluations are stored here once you complete and submit a timed examination.
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* TAB 3: Syllabus Topic Bank */}
      {activeTab === 'syllabus' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {syllabusModules.map((mod, idx) => (
            <Card key={idx} className="flex flex-col justify-between">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{mod.subject}</span>
                  <span className="font-mono">Tier: {mod.recommendedDifficulty}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {mod.chapter}
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Included Subtopics:
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {mod.topics.map((t) => (
                      <li key={t}>• {t}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {mod.topics.length} Testable Concepts
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      onQuickConfigureTopic(mod.subject, mod.topics, mod.recommendedDifficulty)
                    }
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Configure Paper from Module</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
