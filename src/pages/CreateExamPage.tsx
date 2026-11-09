import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  FilePlus2,
  FileText,
  Loader2,
  Play,
  Plus,
  X,
} from 'lucide-react';
import { ExamConfig, StudyDocument } from '../types/examora.ts';
import { Button } from '../components/ui/Button.tsx';
import { Card, CardContent, CardHeader } from '../components/ui/Card.tsx';

interface CreateExamPageProps {
  documents: StudyDocument[];
  initialPreset?: {
    sourceType?: 'document' | 'topic';
    documentId?: string;
    subject?: string;
    topics?: string[];
    difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  } | null;
  onGenerateExam: (payload: {
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
  }) => Promise<{ exam: ExamConfig; questionsCount: number }>;
  onStartGeneratedExam: (examId: string) => void;
}

const CURATED_SUBJECT_TOPICS: Record<string, string[]> = {
  Mathematics: [
    'Partial Differentiation & Gradients',
    'Multiple Integrals & Jacobians',
    'Green’s & Stokes’ Theorems',
    'Eigenvalues & Spectral Decomposition',
    'Ordinary Differential Equations',
  ],
  'Computer Science': [
    'Process Synchronization & Semaphores',
    'Deadlock Avoidance & Banker’s Algorithm',
    'Virtual Memory & LRU Paging',
    'Dynamic Programming & Graph Shortest Paths',
    'B+ Trees & MVCC Transactions',
  ],
  Physics: [
    'Schrödinger Wave Equation',
    'Electrodynamics & Maxwell’s Equations',
    'Statistical Mechanics & Entropy',
    'Special Relativity & Lorentz Transformations',
  ],
  Chemistry: [
    'Chemical Kinetics & Rate Laws',
    'Molecular Orbital Theory',
    'Electrochemistry & Nernst Equation',
    'Coordiation Complexes & Ligand Field Theory',
  ],
};

export function CreateExamPage({
  documents,
  initialPreset,
  onGenerateExam,
  onStartGeneratedExam,
}: CreateExamPageProps) {
  const [sourceType, setSourceType] = useState<'document' | 'topic'>(
    initialPreset?.sourceType || 'topic'
  );
  const [selectedDocId, setSelectedDocId] = useState<string>(
    initialPreset?.documentId || documents[0]?.id || ''
  );
  const [subject, setSubject] = useState<string>(initialPreset?.subject || 'Mathematics');
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    initialPreset?.topics && initialPreset.topics.length > 0
      ? initialPreset.topics
      : ['Partial Differentiation & Gradients', 'Green’s & Stokes’ Theorems']
  );
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [examTitle, setExamTitle] = useState('');

  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Expert'>(
    initialPreset?.difficulty || 'Medium'
  );
  const [format, setFormat] = useState<
    'MCQ' | 'Descriptive' | 'Coding' | 'Mathematics' | 'Mixed'
  >('MCQ');
  const [questionCount, setQuestionCount] = useState<number>(4);
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [totalMarks, setTotalMarks] = useState<number>(40);
  const [negativeMarking, setNegativeMarking] = useState<number>(0);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedExam, setGeneratedExam] = useState<ExamConfig | null>(null);

  const activeDocument = documents.find((d) => d.id === selectedDocId) || documents[0];

  useEffect(() => {
    if (initialPreset) {
      if (initialPreset.sourceType) setSourceType(initialPreset.sourceType);
      if (initialPreset.documentId) setSelectedDocId(initialPreset.documentId);
      if (initialPreset.subject) setSubject(initialPreset.subject);
      if (initialPreset.topics && initialPreset.topics.length > 0) {
        setSelectedTopics(initialPreset.topics);
      }
      if (initialPreset.difficulty) setDifficulty(initialPreset.difficulty);
    }
  }, [initialPreset]);

  const handleSubjectSelect = (newSubj: string) => {
    setSubject(newSubj);
    const defaultTopics = CURATED_SUBJECT_TOPICS[newSubj] || [];
    setSelectedTopics(defaultTopics.slice(0, 2));
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleAddCustomTopic = () => {
    const trimmed = customTopicInput.trim();
    if (!trimmed) return;
    if (!selectedTopics.includes(trimmed)) {
      setSelectedTopics((prev) => [...prev, trimmed]);
    }
    setCustomTopicInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTopics.length === 0) {
      setError('Please select or enter at least one topic for the examination.');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const effectiveSubject =
        sourceType === 'document' && activeDocument ? activeDocument.subject : subject;
      const computedTitle =
        examTitle.trim() ||
        `${effectiveSubject}: ${selectedTopics.slice(0, 2).join(' & ')} (${difficulty})`;

      const res = await onGenerateExam({
        documentId: sourceType === 'document' && activeDocument ? activeDocument.id : null,
        title: computedTitle,
        subject: effectiveSubject,
        topicNames: selectedTopics,
        sourceType,
        difficulty,
        format,
        questionCount,
        durationMinutes,
        totalMarks,
        negativeMarking: format === 'MCQ' || format === 'Mixed' ? negativeMarking : 0,
        sourceContext:
          sourceType === 'document' && activeDocument ? activeDocument.extractedText : undefined,
      });

      setGeneratedExam(res.exam);
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI question paper.');
    } finally {
      setGenerating(false);
    }
  };

  const availableTopicsForMode =
    sourceType === 'document' && activeDocument
      ? activeDocument.chaptersJson.flatMap((c) => c.subtopics)
      : CURATED_SUBJECT_TOPICS[subject] || [];

  return (
    <div className="space-y-8">
      <div className="pb-6 border-b border-slate-200 dark:border-slate-800 space-y-1">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          AI Question Paper Synthesis
        </p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Configure Personalized Examination
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Choose between Document-Based or Topic-Based generation and calibrate the difficulty, question format,
          timing, and marking scheme.
        </p>
      </div>

      {generatedExam && (
        <Card className="border-emerald-500/60 dark:border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                EXAMINATION PAPER GENERATED & VALIDATED
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {generatedExam.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {generatedExam.subject} · {generatedExam.format} Mode · {generatedExam.difficulty} Difficulty ·{' '}
                {generatedExam.questionCount} Questions · {generatedExam.durationMinutes} Minutes ·{' '}
                {generatedExam.totalMarks} Total Marks
              </p>
            </div>
            <Button size="lg" onClick={() => onStartGeneratedExam(generatedExam.id)}>
              <Play className="w-4 h-4" />
              <span>Begin Timed Examination Now</span>
            </Button>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Source Mode & Topic Selection */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  1. Examination Source Mode
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Generate questions from an uploaded study document or any academic topic
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('topic');
                    setSelectedTopics((CURATED_SUBJECT_TOPICS[subject] || []).slice(0, 2));
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    sourceType === 'topic'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Topic-Based
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('document');
                    if (activeDocument) {
                      const docSubs = activeDocument.chaptersJson.flatMap((c) => c.subtopics);
                      setSelectedTopics(docSubs.slice(0, 3));
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    sourceType === 'document'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Document-Based
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {sourceType === 'document' ? (
                <div className="space-y-4">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Select Uploaded Study Document
                  </label>
                  {documents.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2.5">
                      {documents.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => {
                            setSelectedDocId(doc.id);
                            setSubject(doc.subject);
                            const subs = doc.chaptersJson.flatMap((c) => c.subtopics);
                            setSelectedTopics(subs.slice(0, 3));
                          }}
                          className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer flex items-center justify-between ${
                            selectedDocId === doc.id
                              ? 'border-slate-900 bg-slate-900/5 dark:border-slate-300 dark:bg-slate-800/80'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {doc.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {doc.subject} · {doc.fileName} · {doc.chaptersJson.length} Chapters
                            </div>
                          </div>
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-center space-y-2">
                      <BookOpen className="w-5 h-5 text-slate-400 mx-auto" />
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        No study documents uploaded yet
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Upload a study document in the Study Materials tab or switch to Topic-Based mode above.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Select or Enter Academic Subject
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {Object.keys(CURATED_SUBJECT_TOPICS).map((subj) => (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => handleSubjectSelect(subj)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            subject === subj
                              ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                          }`}
                        >
                          {subj}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Or type any custom subject (e.g., Macroeconomics, Organic Chemistry)"
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Topic & Subtopic Selection */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Select Specific Chapters / Concepts to Test
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTopicsForMode.map((topic) => {
                    const active = selectedTopics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          active
                            ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>

                {/* Add custom subtopic */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={customTopicInput}
                    onChange={(e) => setCustomTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTopic();
                      }
                    }}
                    placeholder="Add any custom topic or theorem (e.g., Laplace Transforms)..."
                    className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={handleAddCustomTopic}>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Concept</span>
                  </Button>
                </div>

                {selectedTopics.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Active Examination Syllabus ({selectedTopics.length} concepts):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTopics.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                        >
                          <span>{t}</span>
                          <button
                            type="button"
                            onClick={() => toggleTopic(t)}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Custom Examination Title (Optional)
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="Auto-generated from subject and selected topics if left blank"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 5 Columns: Difficulty, Format & Marking Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                2. Examination Parameters
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure difficulty, question format, duration, and rubric weights
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Difficulty */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Easy', 'Medium', 'Hard', 'Expert'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        difficulty === lvl
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Format */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Examination Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['MCQ', 'Descriptive', 'Coding', 'Mathematics', 'Mixed'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        format === fmt
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders / Numeric Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Number of Questions: <span className="font-mono">{questionCount}</span>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={10}
                    value={questionCount}
                    onChange={(e) => {
                      const c = Number(e.target.value);
                      setQuestionCount(c);
                      setTotalMarks(c * 10);
                    }}
                    className="w-full accent-slate-900 dark:accent-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Duration (Minutes): <span className="font-mono">{durationMinutes}m</span>
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full accent-slate-900 dark:accent-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    step={5}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Negative Marking (MCQ)
                  </label>
                  <select
                    value={negativeMarking}
                    onChange={(e) => setNegativeMarking(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    <option value={0}>0 (None)</option>
                    <option value={0.25}>-0.25 per wrong</option>
                    <option value={0.5}>-0.50 per wrong</option>
                    <option value={1}>-1.00 per wrong</option>
                  </select>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
              )}

              <Button type="submit" disabled={generating} size="lg" className="w-full">
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Questions & Rubrics...</span>
                  </>
                ) : (
                  <>
                    <FilePlus2 className="w-4 h-4" />
                    <span>Generate Examination Paper</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
