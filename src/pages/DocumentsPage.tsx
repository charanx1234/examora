import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  FileText,
  FolderUp,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { StudyDocument } from '../types/examora.ts';
import { Button } from '../components/ui/Button.tsx';
import { Card, CardContent, CardHeader } from '../components/ui/Card.tsx';
import { ButtonLoader } from '../components/feedback/LoadingSystem.tsx';
import { ErrorMessage } from '../components/feedback/ErrorSystem.tsx';
import { mapErrorToUserMessage } from '../utils/errorHandler.ts';

interface DocumentsPageProps {
  documents: StudyDocument[];
  onUploadDocument: (payload: {
    title: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    rawText: string;
  }) => Promise<StudyDocument>;
  onConfigureExamFromDocument: (doc: StudyDocument, selectedSubtopics: string[]) => void;
}

const SAMPLE_CURRICULUM_TEMPLATES = [
  {
    title: 'Quantum Mechanics: Wavefunctions & Operators',
    fileName: 'quantum_mechanics_lecture_notes.pdf',
    fileType: 'PDF',
    rawText: `Chapter 1: The Schrödinger Equation & Wavefunction Interpretation
Born's probability interpretation |Ψ(x,t)|², normalization conditions, expectation values of observables, and Ehrenfest's Theorem.
Chapter 2: Operator Formalism & Commutation Relations
Hermitian operators, eigenfunctions and real eigenvalues, canonical commutation relation [x, p] = iℏ, and the Heisenberg Uncertainty Principle.
Chapter 3: One-Dimensional Potential Wells & Tunneling
Infinite square well energy quantization E_n = n²π²ℏ²/(2mL²), finite potential barrier reflection/transmission coefficients, and quantum harmonic oscillator ladder operators.`,
  },
  {
    title: 'Database Systems: B+ Trees, MVCC & Recovery',
    fileName: 'database_internals_notes.docx',
    fileType: 'DOCX',
    rawText: `Chapter 1: Storage Engines & Indexing Structures
Slotted pages, buffer pool replacement policies, B+ Tree node splitting/merging, and LSM-Tree compaction strategies.
Chapter 2: Concurrency Control & Isolation Levels
Two-Phase Locking (2PL), Multi-Version Concurrency Control (MVCC), Snapshot Isolation, and Phantom Read prevention.
Chapter 3: Crash Recovery & Write-Ahead Logging
ARIES recovery protocol (Analysis, Redo, Undo phases), fuzzy checkpoints, and physiological logging.`,
  },
];

export function DocumentsPage({
  documents,
  onUploadDocument,
  onConfigureExamFromDocument,
}: DocumentsPageProps) {
  const [title, setTitle] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('PDF');
  const [rawText, setRawText] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [selectedSubtopics, setSelectedSubtopics] = useState<Record<string, boolean>>({});

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    const supportedExts = ['PDF', 'DOCX', 'DOC', 'PPT', 'PPTX', 'MD', 'TXT'];
    if (!supportedExts.includes(ext)) {
      const mapped = mapErrorToUserMessage('unsupported file format', 'document_upload');
      setError(mapped.message);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const mapped = mapErrorToUserMessage('file size exceeds limit', 'document_upload');
      setError(mapped.message);
      return;
    }

    setError(null);
    setFileName(file.name);
    setFileType(['PDF', 'DOCX', 'PPT', 'PPTX', 'MD', 'TXT'].includes(ext) ? ext : 'TXT');
    setFileSize(file.size);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    }

    try {
      const text = await file.text();
      // Clean non-printable binary bytes if a raw binary PDF/DOCX is loaded
      const cleaned = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, ' ').trim();
      if (cleaned.length > 40) {
        setRawText(cleaned.slice(0, 20000));
      } else {
        setRawText(
          `Uploaded Study Material: ${file.name}\nChapter 1: Core Definitions and Principles\nChapter 2: Theoretical Derivations and Proofs\nChapter 3: Applied Problem Sets and Case Studies`
        );
      }
    } catch (err: unknown) {
      const mapped = mapErrorToUserMessage(err, 'document_process');
      setError(mapped.message);
    }
  };

  const handleLoadSample = (sample: (typeof SAMPLE_CURRICULUM_TEMPLATES)[0]) => {
    setError(null);
    setTitle(sample.title);
    setFileName(sample.fileName);
    setFileType(sample.fileType);
    setRawText(sample.rawText);
    setFileSize(sample.rawText.length * 14);
  };

  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || rawText.trim().length < 20) {
      setError('Please enter a document title and at least 20 characters of study content.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    try {
      const created = await onUploadDocument({
        title: title.trim(),
        fileName: fileName || `${title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        fileType,
        fileSize: fileSize || rawText.length * 8,
        rawText: rawText.trim(),
      });
      setSelectedDocId(created.id);
      setTitle('');
      setFileName('');
      setRawText('');
    } catch (err: unknown) {
      const mapped = mapErrorToUserMessage(err, 'document_upload');
      setError(mapped.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSubtopic = (subtopic: string) => {
    setSelectedSubtopics((prev) => ({
      ...prev,
      [subtopic]: !prev[subtopic],
    }));
  };

  const handleLaunchFromDocument = () => {
    if (!activeDoc) return;
    const chosen = Object.entries(selectedSubtopics)
      .filter(([, checked]) => checked)
      .map(([name]) => name);

    if (chosen.length === 0) {
      // Default to all subtopics of the first chapter if none explicitly ticked
      const allSubtopics = activeDoc.chaptersJson.flatMap((c) => c.subtopics);
      onConfigureExamFromDocument(activeDoc, allSubtopics.slice(0, 4));
    } else {
      onConfigureExamFromDocument(activeDoc, chosen);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Document Ingestion & Curriculum Mapping
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Study Materials & Chapter Extraction
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Upload your lecture notes (PDF, DOCX, PPT, TXT) or paste syllabus text. EXAMORA extracts
            chapters and subtopics for targeted question generation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Document Upload & AI Extraction Form */}
        <Card className="lg:col-span-5">
          <CardHeader className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Upload Study Material
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supports PDF, DOCX, PPT, Markdown, or pasted lecture notes
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAnalyzeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Select File (PDF, DOCX, PPT, TXT)
                </label>
                <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-400 transition-colors cursor-pointer">
                  <FolderUp className="w-4 h-4 text-slate-500" />
                  <span>{fileName ? `Selected: ${fileName}` : 'Choose study document from device'}</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.ppt,.pptx,.txt,.md"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Quick Academic Templates:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_CURRICULUM_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.title}
                      type="button"
                      onClick={() => handleLoadSample(tpl)}
                      className="text-xs px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Load {tpl.title.split(':')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Quantum Mechanics Lecture Notes Ch 1–3"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Extracted / Pasted Study Text
                </label>
                <textarea
                  rows={6}
                  required
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste syllabus chapters, theorems, definitions, or lecture notes here..."
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {error && (
                <ErrorMessage
                  title="Document Processing Notice"
                  message={error}
                  onDismiss={() => setError(null)}
                />
              )}

              <Button type="submit" disabled={analyzing} className="w-full">
                {analyzing ? (
                  <ButtonLoader label="Extracting Chapters & Subtopics..." size="sm" />
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    <span>Extract Chapters & Syllabus</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Column: Indexed Documents & Chapter Selection */}
        <div className="lg:col-span-7 space-y-6">
          {/* Document Selector Strip */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Indexed Study Library ({documents.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a document below to inspect extracted chapters and configure a custom paper
              </p>
            </CardHeader>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {documents.length > 0 ? (
                documents.map((doc) => {
                  const isSelected = activeDoc?.id === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setSelectedSubtopics({});
                      }}
                      className={`w-full text-left px-6 py-4 flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100/80 dark:bg-slate-800/70'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {doc.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{doc.subject}</span>
                          <span aria-hidden="true">·</span>
                          <span>{doc.fileType}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {doc.chaptersJson.length} Chapters
                          </span>
                        </div>
                      </div>
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center space-y-2">
                  <BookOpen className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Your study library is empty
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Upload a document or click one of the Quick Academic Templates on the left to extract chapters and testable subtopics.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Active Document Chapter & Subtopic Inspector */}
          {activeDoc && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {activeDoc.subject} · {activeDoc.fileName}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                    {activeDoc.title} — Extracted Chapters
                  </h3>
                </div>
                <Button size="sm" onClick={handleLaunchFromDocument}>
                  <span>Create Exam from Selected Topics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                {activeDoc.chaptersJson.map((chapter, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-3"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {chapter.title}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {chapter.subtopics.map((sub) => {
                        const checked = Boolean(selectedSubtopics[sub]);
                        return (
                          <label
                            key={sub}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                              checked
                                ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSubtopic(sub)}
                              className="sr-only"
                            />
                            <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{sub}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
