import React from 'react';
import {
  ArrowRight,
  BookOpen,
  FilePlus2,
  FolderKanban,
  Play,
  TrendingUp,
  Upload,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AppView,
  DashboardPayload,
} from '../types/examora.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Card, CardContent, CardHeader } from '../components/ui/Card.tsx';

interface DashboardPageProps {
  data: DashboardPayload | null;
  loading: boolean;
  error: string | null;
  onNavigate: (view: AppView) => void;
  onStartExam: (examId: string) => void;
  onViewResult: (attemptId: string) => void;
  onQuickAdaptiveTopic: (subject: string, topic: string, difficulty: string) => void;
}

export function DashboardPage({
  data,
  loading,
  error,
  onNavigate,
  onStartExam,
  onViewResult,
  onQuickAdaptiveTopic,
}: DashboardPageProps) {
  const { profile } = useAuth();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 rounded-xl bg-slate-200/70 dark:bg-slate-800/50 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 rounded-xl bg-slate-200/70 dark:bg-slate-800/50 animate-pulse"
            />
          ))}
        </div>
        <div className="h-80 rounded-xl bg-slate-200/70 dark:bg-slate-800/50 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            {error || 'Unable to load dashboard telemetry.'}
          </p>
          <Button onClick={() => window.location.reload()} size="sm">
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { stats, exams, recentResults, topicPerformance } = data;
  const weakTopics = topicPerformance.filter(
    (t) => t.masteryLevel === 'Needs Focus' || t.accuracyPercentage < 65
  );

  // Prepare subject-wise chart data
  const subjectAgg = new Map<string, { total: number; count: number }>();
  for (const t of topicPerformance) {
    const cur = subjectAgg.get(t.subject) || { total: 0, count: 0 };
    cur.total += t.averageScorePercentage;
    cur.count += 1;
    subjectAgg.set(t.subject, cur);
  }
  const subjectChartData = Array.from(subjectAgg.entries()).map(([subject, val]) => ({
    subject,
    score: Number((val.total / Math.max(1, val.count)).toFixed(1)),
  }));

  const progressionData = [...recentResults]
    .reverse()
    .map((r, i) => ({
      attempt: `Exam ${i + 1}`,
      title: r.examTitle || 'Assessment',
      percentage: r.percentage,
    }));

  const hasTakenExams = recentResults.length > 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner & Primary Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{profile?.academicLevel || 'University Scholar'}</span>
            <span aria-hidden="true">·</span>
            <span>Goal: {profile?.targetGoal || 'Honors Mastery'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back, {profile?.fullName || 'Scholar'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {hasTakenExams
              ? 'Review your verified examination evaluations, monitor weak concepts, or configure a new timed paper.'
              : 'Configure your first examination paper or upload lecture notes to begin tracking rubric evaluations.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button variant="outline" onClick={() => onNavigate('documents')}>
            <Upload className="w-4 h-4" />
            <span>Upload Study Material</span>
          </Button>
          <Button onClick={() => onNavigate('create-exam')}>
            <FilePlus2 className="w-4 h-4" />
            <span>Quick Start Exam</span>
          </Button>
        </div>
      </div>

      {/* 4-Column Quantitative KPI Strip (Tabular Numerals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Examinations Taken
            </div>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {stats.totalExamsTaken}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              {stats.availableExamsCount} configured papers available
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Average Score
            </div>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {hasTakenExams ? `${stats.averageScore}%` : '—'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              {hasTakenExams ? 'Weighted across all evaluated attempts' : 'Complete an exam to unlock'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Best Examination Score
            </div>
            <div className="text-3xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {hasTakenExams ? `${stats.bestScore}%` : '—'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              {hasTakenExams ? 'Highest verified rubric mark' : 'Awaiting first submission'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Study Materials Indexed
            </div>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {stats.documentsCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              Extracted into testable chapters
            </div>
          </CardContent>
        </Card>
      </div>

      {/* First-Time Scholar Onboarding Card (Clean, matte, non-AI-slop styling) */}
      {!hasTakenExams && (
        <Card>
          <CardContent className="p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                ACADEMIC LEDGER STATUS · READY FOR INITIAL ASSESSMENT
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Begin your first timed examination to record official scores
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Scores, rubric evaluations, and topic mastery metrics are calculated strictly from your submitted examinations. Upload your course notes or choose a topic to generate a paper.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button variant="secondary" onClick={() => onNavigate('documents')}>
                <BookOpen className="w-4 h-4" />
                <span>Upload Syllabus Notes</span>
              </Button>
              <Button onClick={() => onNavigate('create-exam')}>
                <FilePlus2 className="w-4 h-4" />
                <span>Configure First Paper</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row: Score Progression & Subject-Wise Mastery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7">
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Score Progression & Accuracy Trend
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Percentage marks achieved across sequential timed examinations
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent className="h-64">
            {progressionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressionData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#71717a" strokeOpacity={0.2} />
                  <XAxis dataKey="attempt" tick={{ fontSize: 12 }} stroke="#71717a" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#71717a" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121215',
                      borderColor: '#27272a',
                      color: '#f4f4f5',
                      fontSize: '12px',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="percentage"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  No examination attempts submitted yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Your score trajectory chart will populate automatically as soon as you submit your first examination.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Subject-Wise Performance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mean rubric mastery across active academic subjects
            </p>
          </CardHeader>
          <CardContent className="h-64">
            {subjectChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectChartData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#71717a" strokeOpacity={0.2} />
                  <XAxis dataKey="subject" tick={{ fontSize: 12 }} stroke="#71717a" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#71717a" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121215',
                      borderColor: '#27272a',
                      color: '#f4f4f5',
                      fontSize: '12px',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="score" fill="#71717a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  No subject mastery metrics recorded yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                  Subject-level accuracy bars appear after evaluation of your submitted answers.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ready Examination Papers + Weak Topics Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Configured Examinations Ready to Take */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Available Examination Papers
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Launch a timed assessment session or browse the Question Bank
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('adaptive')}>
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Question Bank</span>
            </Button>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
            {exams.length > 0 ? (
              exams.map((exam) => (
                <div
                  key={exam.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {exam.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{exam.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span>Format: {exam.format}</span>
                      <span aria-hidden="true">·</span>
                      <span>Difficulty: {exam.difficulty}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {exam.questionCount} Qs / {exam.durationMinutes} min / {exam.totalMarks} Marks
                      </span>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => onStartExam(exam.id)}>
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Exam</span>
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No examination papers generated yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Configure a personalized paper by selecting any subject, difficulty tier (Easy to Expert), and format (MCQ, Descriptive, Coding, Mathematics, or Mixed).
                </p>
                <div className="pt-1">
                  <Button size="sm" onClick={() => onNavigate('create-exam')}>
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>Generate Question Paper</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weak Topics & Revision Focus */}
        <Card className="lg:col-span-5">
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Weak Topics Requiring Revision
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Identified from rubric deductions and missed questions
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('analytics')}>
              <span>Analytics</span>
            </Button>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
            {weakTopics.length > 0 ? (
              weakTopics.map((wt) => (
                <div
                  key={wt.id}
                  className="px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {wt.topic}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{wt.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400">
                        Accuracy: {wt.accuracyPercentage}%
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Status: {wt.masteryLevel}</span>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      onQuickAdaptiveTopic(wt.subject, wt.topic, wt.recommendedDifficulty)
                    }
                  >
                    <span>Practice Topic</span>
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {hasTakenExams
                    ? 'All tested topics are above the 65% proficiency threshold'
                    : 'No weak topics detected yet'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {hasTakenExams
                    ? 'Keep challenging yourself with Hard or Expert papers.'
                    : 'Take an examination so EXAMORA can diagnose conceptual gaps.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Examination History Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Recent Examination History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Completed assessments with question-wise evaluation and rubric explanations
            </p>
          </div>
          {recentResults.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate('analytics')}>
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </CardHeader>
        {recentResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Examination Title</th>
                  <th className="py-3 px-4">Subject · Mode</th>
                  <th className="py-3 px-4 text-right">Marks</th>
                  <th className="py-3 px-4 text-right">Percentage</th>
                  <th className="py-3 px-4 text-right">Grade</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {recentResults.map((res) => (
                  <tr
                    key={res.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white">
                      {res.examTitle || 'Subject Assessment'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                      {res.subject} · {res.format} · {res.difficulty}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {res.obtainedMarks} / {res.totalMarks}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {res.percentage}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {res.grade}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewResult(res.attemptId)}
                      >
                        Inspect Rubric Report
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CardContent className="py-10 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No completed examinations yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Results, grades, and rubric explanations are generated strictly after you submit an examination attempt.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
