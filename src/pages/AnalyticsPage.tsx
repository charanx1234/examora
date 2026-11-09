import React, { useState } from 'react';
import {
  FilePlus2,
  Play,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DashboardPayload,
} from '../types/examora.ts';
import { Button } from '../components/ui/Button.tsx';
import { Card, CardContent, CardHeader } from '../components/ui/Card.tsx';

interface AnalyticsPageProps {
  data: DashboardPayload | null;
  onViewResult: (attemptId: string) => void;
  onTriggerAdaptiveExam: (subject: string, topics: string[], difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert') => void;
}

export function AnalyticsPage({
  data,
  onViewResult,
  onTriggerAdaptiveExam,
}: AnalyticsPageProps) {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');

  if (!data) {
    return null;
  }

  const { topicPerformance, recentResults } = data;
  const subjects = ['ALL', ...Array.from(new Set(topicPerformance.map((t) => t.subject)))];

  const filteredTopics =
    selectedSubjectFilter === 'ALL'
      ? topicPerformance
      : topicPerformance.filter((t) => t.subject === selectedSubjectFilter);

  const weakTopics = topicPerformance.filter(
    (t) => t.masteryLevel === 'Needs Focus' || t.accuracyPercentage < 65
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Longitudinal Academic Telemetry
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Performance Analytics & Topic Mastery
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track topic-level accuracy, time management efficiency, and mastery progression across subjects.
          </p>
        </div>

        {/* Subject Filter Segmented Control */}
        {subjects.length > 1 && (
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg">
            {subjects.map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubjectFilter(subj)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  selectedSubjectFilter === subj
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {subj === 'ALL' ? 'All Subjects' : subj}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Topic-Wise Accuracy Bar Chart */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Topic-Wise Accuracy Distribution (%)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Empirical accuracy across individual syllabus concepts
            </p>
          </div>
          <TrendingUp className="w-4 h-4 text-slate-400" />
        </CardHeader>
        <CardContent className="h-72">
          {filteredTopics.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredTopics}
                margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#71717a" strokeOpacity={0.2} />
                <XAxis dataKey="topic" tick={{ fontSize: 11 }} stroke="#71717a" />
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
                <Bar dataKey="accuracyPercentage" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-1.5">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Awaiting first examination submission
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Topic accuracy distribution will render once you complete an exam.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topic Mastery Breakdown & Weakness Drills */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Concept Mastery Matrix & Targeted Drills
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calibrated practice difficulty based on your verified topic accuracy
              </p>
            </div>
          </div>
          {weakTopics.length > 0 && (
            <Button
              size="sm"
              onClick={() =>
                onTriggerAdaptiveExam(
                  weakTopics[0].subject,
                  weakTopics.map((w) => w.topic),
                  'Medium'
                )
              }
            >
              <span>Practice Weak Concepts</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {filteredTopics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTopics.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{t.subject}</span>
                      <span className="font-mono tabular-nums">
                        {t.questionsCorrect}/{t.questionsAttempted} Correct
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {t.topic}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Standing: <strong>{t.masteryLevel}</strong> · Next Tier:{' '}
                      <strong className="font-mono">{t.recommendedDifficulty}</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white">
                      {t.accuracyPercentage}% Accuracy
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        onTriggerAdaptiveExam(t.subject, [t.topic], t.recommendedDifficulty)
                      }
                    >
                      <Play className="w-3 h-3" />
                      <span>Start {t.recommendedDifficulty} Drill</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No topic telemetry recorded yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Complete your first timed examination so EXAMORA can evaluate your answers and compute concept mastery standing.
              </p>
              <div className="pt-1">
                <Button
                  size="sm"
                  onClick={() =>
                    onTriggerAdaptiveExam('Mathematics', ['Partial Differentiation & Gradients'], 'Medium')
                  }
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>Configure First Examination</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Time Management & Examination History Table */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Time Management & Evaluation Log
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Completion speed and score breakdown across all evaluated attempts
          </p>
        </CardHeader>
        {recentResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Examination</th>
                  <th className="py-3 px-4">Subject · Mode</th>
                  <th className="py-3 px-4 text-right">Time Used</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4 text-right">Grade</th>
                  <th className="py-3 px-6 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {recentResults.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white">
                      {r.examTitle}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                      {r.subject} · {r.format} · {r.difficulty}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {Math.floor(r.timeTakenSeconds / 60)}m {r.timeTakenSeconds % 60}s
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold">
                      {r.obtainedMarks}/{r.totalMarks} ({r.percentage}%)
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {r.grade}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewResult(r.attemptId)}
                      >
                        View Report
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CardContent className="py-10 text-center space-y-1.5">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No evaluation entries recorded yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your completed exams, completion times, and rubric reports will appear here after submission.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
