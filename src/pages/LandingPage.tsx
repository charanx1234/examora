import React, { useState } from 'react';
import {
  ArrowRight,
  FileText,
  LineChart,
  Moon,
  Sliders,
  Sun,
  Timer,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Button } from '../components/ui/Button.tsx';
import heroStudyDeskImg from '../assets/images/hero_examora_study_desk_1794064388130.jpg';
import diagramCalculusImg from '../assets/images/diagram_calculus_evaluation_1794064388575.jpg';

interface LandingPageProps {
  onOpenPrivacyPolicy: () => void;
  onOpenLogin: () => void;
}

export function LandingPage({ onOpenPrivacyPolicy, onOpenLogin }: LandingPageProps) {
  const { theme, toggleTheme } = useAuth();

  const [selectedModeTab, setSelectedModeTab] = useState<
    'MCQ' | 'Descriptive' | 'Coding' | 'Mathematics' | 'Mixed'
  >('Mathematics');

  const modeDetails = {
    MCQ: {
      title: 'Precision Multiple-Choice Diagnostics',
      mechanism:
        'AI generates calibrated distractors targeting common conceptual misconceptions with optional negative marking (-0.25, -0.50, or -1.00).',
      outcome: 'Instant deterministic scoring with full post-submission derivation breakdowns.',
      samplePrompt:
        'Let A be a 3×3 real symmetric matrix with eigenvalues λ₁ = 2, λ₂ = -1, λ₃ = 4. Which statement holds for the quadratic form xᵀAx?',
    },
    Descriptive: {
      title: 'Structured Written & Theoretical Evaluation',
      mechanism:
        'Multi-criterion marking rubrics evaluate definitions, logical flow, and boundary assumptions independently.',
      outcome: 'Fair partial marks and targeted feedback pinpointing missing theoretical links.',
      samplePrompt:
        'Explain the physical interpretation of the curl of a vector field (∇ × F) and state the topological condition under which an irrotational field is conservative.',
    },
    Coding: {
      title: 'Algorithmic & Systems Programming Assessment',
      mechanism:
        'Integrated multi-language code workspace with automated test-case verification and asymptotic complexity review.',
      outcome: 'Combines deterministic test-case execution with AI code-quality rubric grading.',
      samplePrompt:
        'Implement numericalGradient(f, point, h = 1e-5) using second-order central finite differences in O(d) evaluations.',
    },
    Mathematics: {
      title: 'Handwritten Mathematical Derivation & Vision Grading',
      mechanism:
        'Upload photographs or scans of handwritten calculus, linear algebra, or physics proofs for step-by-step vision inspection.',
      outcome:
        'Awards partial marks for valid intermediate integration steps and flags ambiguous notation for manual review.',
      samplePrompt:
        'Use Green’s Theorem to evaluate ∮_C (y² dx + 3xy dy) over the upper half-annulus 1 ≤ x² + y² ≤ 4, y ≥ 0.',
    },
    Mixed: {
      title: 'Comprehensive University-Style Examination Papers',
      mechanism:
        'Combines Section A (MCQs), Section B (Analytical Proofs), and Section C (Applied Coding/Math) in one timed sitting.',
      outcome: 'Simulates full midterms and final examinations under authentic time constraints.',
      samplePrompt:
        'Full 40-mark examination blending rapid conceptual checks with deep multi-step problem solving.',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 lg:px-12 py-4 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          EXAMORA
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
          <a
            href="#workflow"
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Workflow
          </a>
          <a
            href="#modes"
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Exam Modes
          </a>
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/privacy-policy');
              onOpenPrivacyPolicy();
            }}
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Privacy Policy
          </button>
          <a
            href="#scholar-proof"
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Outcomes
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenLogin}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Section: 2-Column Split with items-stretch */}
        <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pt-10 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Left Column: Core Value Proposition & Get Started Action */}
            <div className="lg:col-span-7 flex flex-col justify-between py-2">
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    AI Examination Teacher Platform · DPDP Act 2023 Compliant · Rubric Grading
                  </p>
                  <button
                    onClick={toggleTheme}
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    title="Switch appearance theme"
                  >
                    {theme === 'light' ? (
                      <>
                        <Moon className="w-3.5 h-3.5" />
                        <span>Dark Theme</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-3.5 h-3.5" />
                        <span>Light Theme</span>
                      </>
                    )}
                  </button>
                </div>

                <h1
                  className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.12]"
                  style={{ textWrap: 'balance' }}
                >
                  Master every subject through rigorous, AI-graded examinations.
                </h1>

                <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  Transform lecture PDFs, DOCX notes, or any syllabus topic into timed university-grade
                  question papers. Practice across MCQ, descriptive, coding, and handwritten mathematics
                  modes with transparent rubric evaluation.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button size="lg" onClick={onOpenLogin}>
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <a
                    href="#modes"
                    className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    Explore Exam Modes
                  </a>
                </div>
              </div>

              <div className="pt-8 mt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-6">
                <div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    5 Modes
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    MCQ · Descriptive · Coding · Math · Mixed
                  </p>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    DPDP 2023
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Explicit consent · Data export & erasure
                  </p>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    100% Isolated
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Answer keys sealed until submission
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: High-Fidelity Visual Anchor */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="relative flex-1 min-h-[380px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900">
                <img
                  src={heroStudyDeskImg}
                  alt="Minimalist scholar desk with mathematical derivations and performance analytics"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent flex flex-col justify-end p-6">
                  <div className="space-y-2 text-white">
                    <p className="text-xs text-slate-300 font-mono tabular-nums">
                      SESSION PREVIEW · MULTIVARIABLE CALCULUS · 30:00
                    </p>
                    <p className="text-lg font-semibold leading-snug">
                      From raw course notes to structured examination papers in under 15 seconds.
                    </p>
                    <p className="text-xs text-slate-300">
                      Automatic chapter extraction · Calibrated difficulty · Full DPDP privacy controls
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width 4-Column Architectural Strip Below Hero */}
          <div
            id="workflow"
            className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-10 border-t border-slate-200 dark:border-slate-800"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                <span>01. INGESTION</span>
                <FileText className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Document & Topic Parsing
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Upload study notes (PDF, DOCX, PPT, TXT) or specify any syllabus topic. EXAMORA maps chapters
                and granular testable concepts automatically.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                <span>02. SYNTHESIS</span>
                <Sliders className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Calibrated Paper Generation
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Configure difficulty (Easy to Expert), total marks, duration, and negative marking. Questions
                are validated against structured schemas.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                <span>03. EXAMINATION</span>
                <Timer className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Distraction-Free Timed Player
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Navigate via question palette, flag items for review, auto-save answers across refreshes, and
                submit written, code, or scanned math work.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                <span>04. EVALUATION</span>
                <LineChart className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Rubric Grading & Analytics
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Receive question-wise marks, partial credit explanations, conceptual mistake diagnostics, and
                adaptive revision papers targeting weak areas.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Examination Modes Section */}
        <section
          id="modes"
          className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 py-16"
        >
          <div className="max-w-[1280px] mx-auto px-6 lg:px-12 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Five Specialized Assessment Environments
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  Built for every academic discipline.
                </h2>
              </div>

              {/* Interactive Segmented Control */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(['MCQ', 'Descriptive', 'Coding', 'Mathematics', 'Mixed'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedModeTab(mode)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedModeTab === mode
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2">
              <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Active Mode Specification</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{selectedModeTab}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {modeDetails[selectedModeTab].title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {modeDetails[selectedModeTab].mechanism}
                  </p>
                  <div className="pt-2">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                      Sample Examination Prompt
                    </p>
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                      {modeDetails[selectedModeTab].samplePrompt}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <strong className="text-slate-900 dark:text-white">Evaluation Outcome:</strong>{' '}
                    {modeDetails[selectedModeTab].outcome}
                  </p>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 cursor-pointer"
                  >
                    Get Started with {selectedModeTab} Mode
                  </button>
                </div>
              </div>

              <div
                id="rubrics"
                className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-900 flex flex-col justify-between"
              >
                <img
                  src={diagramCalculusImg}
                  alt="Vector Calculus Grading Matrix and Integral Evaluation Rubric"
                  referrerPolicy="no-referrer"
                  className="w-full h-56 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="p-6 space-y-3 text-white">
                  <div className="text-xs text-emerald-400 font-mono">
                    PROVIDER-INDEPENDENT AI RUBRIC ARCHITECTURE
                  </div>
                  <h4 className="text-lg font-semibold">
                    Deterministic + Rubric-Guided Grading
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    MCQs and coding test cases are scored deterministically. Descriptive essays and
                    handwritten mathematical derivations are evaluated criterion-by-criterion against
                    structured marking schemes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Proof & Scholar Outcome Section */}
        <section
          id="scholar-proof"
          className="max-w-[1280px] mx-auto px-6 lg:px-12 py-16 space-y-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Verified Academic Workflow
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Designed like a dedicated university examiner, not a generic chat window.
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Ordinary chatbots reveal answers prematurely and lack structured timing or longitudinal
                topic tracking. EXAMORA enforces real examination discipline and tracks accuracy across
                every syllabus subtopic.
              </p>
            </div>

            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-editorial italic">
                “Before EXAMORA, I was passively re-reading my Multivariable Calculus and Operating Systems
                lecture slides. Uploading my PDFs to generate timed 40-mark mixed papers exposed my exact
                blind spot in Green’s Theorem polar bounds and Banker’s Algorithm deadlock thresholds—raising
                my midterm score from 68% to 91% in three weeks.”
              </p>
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    University Honors Cohort
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    B.Sc. Mathematics &amp; Computer Science · Year 3 Assessment Study
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    +23% Score Gain
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Across 14 Timed Papers
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer with Privacy Policy & Grievance Link */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-6 lg:px-12 bg-white dark:bg-slate-950">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            EXAMORA · AI Examination Teacher Platform · DPDP Act 2023 Compliant
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a
              href="/privacy-policy"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/privacy-policy');
                onOpenPrivacyPolicy();
              }}
              className="hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
            >
              Privacy Policy & Grievance Officer (/privacy-policy)
            </a>
            <a
              href="mailto:privacy-grievance@examora.edu"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              privacy-grievance@examora.edu
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
