/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import {
  AppView,
  DashboardPayload,
  ExamAttempt,
  ExamConfig,
  ExamQuestion,
  ExamResultSummary,
  StudyDocument,
} from './types/examora.ts';
import {
  autoSaveAttempt,
  fetchDashboardData,
  fetchResultReport,
  generateExamPaper,
  startExamSession,
  submitExamAttempt,
  uploadAndAnalyzeDocument,
} from './services/api.ts';
import { LandingPage } from './pages/LandingPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { AppShell } from './components/layout/AppShell.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { DocumentsPage } from './pages/DocumentsPage.tsx';
import { CreateExamPage } from './pages/CreateExamPage.tsx';
import { ExamPlayerPage } from './pages/ExamPlayerPage.tsx';
import { ExamResultPage } from './pages/ExamResultPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { ExamArchivePage } from './pages/ExamArchivePage.tsx';
import { PersonalProfilePage } from './pages/PersonalProfilePage.tsx';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage.tsx';
import { SettingsPrivacyPage } from './pages/SettingsPrivacyPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { GlobalLoader } from './components/feedback/LoadingSystem.tsx';
import { ErrorToastProvider, useToast } from './components/feedback/ErrorSystem.tsx';
import { AppErrorBoundary } from './components/feedback/AppErrorBoundary.tsx';
import { mapErrorToUserMessage } from './utils/errorHandler.ts';

const KNOWN_PATHS: Record<string, AppView | 'landing' | 'login'> = {
  '/': 'landing',
  '/login': 'login',
  '/privacy-policy': 'privacy-policy',
  '/dashboard': 'dashboard',
  '/documents': 'documents',
  '/create-exam': 'create-exam',
  '/exam-player': 'exam-player',
  '/exam-result': 'exam-result',
  '/adaptive': 'adaptive',
  '/analytics': 'analytics',
  '/profile': 'profile',
  '/settings': 'settings',
};

function isKnownPathname(pathname: string): boolean {
  const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return Boolean(KNOWN_PATHS[normalized]);
}

function ExamoraApplication() {
  const { profile, loading: authLoading, getValidIdToken } = useAuth();
  const { showErrorToast } = useToast();

  const [isNotFoundRoute, setIsNotFoundRoute] = useState<boolean>(() =>
    !isKnownPathname(window.location.pathname)
  );

  const [unauthScreen, setUnauthScreen] = useState<'login' | 'landing'>(() =>
    window.location.pathname === '/login' ? 'login' : 'landing'
  );
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const path = window.location.pathname;
    if (path === '/privacy-policy') return 'privacy-policy';
    const mapped = KNOWN_PATHS[path];
    if (mapped && mapped !== 'landing' && mapped !== 'login') {
      return mapped;
    }
    return 'dashboard';
  });

  const [dashboardData, setDashboardData] = useState<DashboardPayload | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Preset for CreateExamPage when triggered from Documents or Adaptive Learning
  const [examPreset, setExamPreset] = useState<{
    sourceType?: 'document' | 'topic';
    documentId?: string;
    subject?: string;
    topics?: string[];
    difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  } | null>(null);

  // Active live examination session state
  const [activeSession, setActiveSession] = useState<{
    exam: ExamConfig;
    attempt: ExamAttempt;
    questions: ExamQuestion[];
    savedAnswers: any[];
  } | null>(null);
  const [startingExam, setStartingExam] = useState<boolean>(false);

  // Active evaluation report state
  const [activeReport, setActiveReport] = useState<{
    result: ExamResultSummary;
    exam: ExamConfig;
    questions: ExamQuestion[];
    answers: any[];
  } | null>(null);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [lastAttemptId, setLastAttemptId] = useState<string | null>(null);

  // Sync URL pathname (/privacy-policy, /login, /, or unknown 404 routes) with screen state
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (!isKnownPathname(path)) {
        setIsNotFoundRoute(true);
        return;
      }
      setIsNotFoundRoute(false);

      if (path === '/privacy-policy') {
        setCurrentView('privacy-policy');
      } else if (path === '/login') {
        setUnauthScreen('login');
      } else {
        setUnauthScreen('landing');
        if (currentView === 'privacy-policy') {
          setCurrentView('dashboard');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentView]);

  const loadDashboard = useCallback(async () => {
    if (!profile) return;
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const token = await getValidIdToken();
      const payload = await fetchDashboardData(token);
      setDashboardData(payload);
    } catch (err: unknown) {
      const friendly = mapErrorToUserMessage(err, 'dashboard');
      setDashboardError(friendly.message);
    } finally {
      setDashboardLoading(false);
    }
  }, [profile, getValidIdToken]);

  useEffect(() => {
    if (profile) {
      loadDashboard();
    }
  }, [profile, loadDashboard]);

  // 1. Session Restoration / Initial Application Loader
  if (authLoading) {
    return (
      <GlobalLoader
        message="Restoring your EXAMORA academic session..."
        submessage="Verifying credentials and workspace preferences"
      />
    );
  }

  // 2. Custom 404 Page Not Found for unknown URLs
  if (isNotFoundRoute) {
    return (
      <NotFoundPage
        isAuthenticated={Boolean(profile)}
        onBackToDashboard={() => {
          window.history.pushState({}, '', '/');
          setIsNotFoundRoute(false);
          if (profile) {
            setCurrentView('dashboard');
          } else {
            setUnauthScreen('login');
          }
        }}
        onGoHome={() => {
          window.history.pushState({}, '', '/');
          setIsNotFoundRoute(false);
          setUnauthScreen('landing');
          setCurrentView('dashboard');
        }}
      />
    );
  }

  // 3. Dedicated /privacy-policy route (accessible whether logged out or logged in)
  if (currentView === 'privacy-policy') {
    return (
      <PrivacyPolicyPage
        isAuthenticated={Boolean(profile)}
        onBack={() => {
          const targetPath = !profile && unauthScreen === 'login' ? '/login' : '/';
          window.history.pushState({}, '', targetPath);
          setCurrentView('dashboard');
        }}
        onOpenSettings={() => {
          window.history.pushState({}, '', '/');
          setCurrentView('settings');
        }}
      />
    );
  }

  // 4. Show Overview Landing Page or Dedicated Login Page when not signed in
  if (!profile) {
    if (unauthScreen === 'landing') {
      return (
        <LandingPage
          onOpenLogin={() => {
            window.history.pushState({}, '', '/login');
            setUnauthScreen('login');
          }}
          onOpenPrivacyPolicy={() => {
            window.history.pushState({}, '', '/privacy-policy');
            setCurrentView('privacy-policy');
          }}
        />
      );
    }

    return (
      <LoginPage
        onBackToOverview={() => {
          window.history.pushState({}, '', '/');
          setUnauthScreen('landing');
        }}
        onOpenPrivacyPolicy={() => {
          window.history.pushState({}, '', '/privacy-policy');
          setCurrentView('privacy-policy');
        }}
      />
    );
  }

  // 5. Full-screen loader when preparing/launching a live timed examination room
  if (startingExam) {
    return (
      <GlobalLoader
        message="Preparing Examination Room..."
        submessage="Loading calibrated questions, marking rubrics, and timer state"
      />
    );
  }

  // Handlers for Document Upload, Exam Creation, Exam Player, and Evaluation
  const handleUploadDocument = async (payload: {
    title: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    rawText: string;
  }): Promise<StudyDocument> => {
    const token = await getValidIdToken();
    const res = await uploadAndAnalyzeDocument(token, payload);
    await loadDashboard();
    return res.document;
  };

  const handleConfigureFromDocument = (doc: StudyDocument, subtopics: string[]) => {
    setExamPreset({
      sourceType: 'document',
      documentId: doc.id,
      subject: doc.subject,
      topics: subtopics,
      difficulty: 'Medium',
    });
    setCurrentView('create-exam');
  };

  const handleGenerateExam = async (payload: {
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
  }) => {
    const token = await getValidIdToken();
    const created = await generateExamPaper(token, payload);
    await loadDashboard();
    return created;
  };

  const handleStartExam = async (examId: string) => {
    setStartingExam(true);
    try {
      const token = await getValidIdToken();
      const session = await startExamSession(token, examId);
      setActiveSession(session);
      setCurrentView('exam-player');
    } catch (err: unknown) {
      const friendly = mapErrorToUserMessage(err, 'exam_start');
      showErrorToast(friendly.message, friendly.title);
    } finally {
      setStartingExam(false);
    }
  };

  const handleAutoSaveAttempt = async (payload: {
    timeRemainingSeconds: number;
    currentQuestionIndex: number;
    markedForReviewJson: string[];
    answer?: {
      questionId: string;
      answerText: string;
      codeLanguage?: string;
      handwrittenImageData?: string;
    };
  }) => {
    if (!activeSession) return;
    const token = await getValidIdToken();
    await autoSaveAttempt(token, activeSession.attempt.id, payload);
  };

  const handleSubmitExam = async (payload: {
    answersPayload: Array<{
      questionId: string;
      answerText: string;
      codeLanguage?: string | null;
      handwrittenImageData?: string | null;
    }>;
    timeTakenSeconds: number;
    ephemeralPhotoMode?: boolean;
  }) => {
    if (!activeSession) return;
    const token = await getValidIdToken();
    const submitted = await submitExamAttempt(token, activeSession.attempt.id, payload);
    await loadDashboard();
    await handleViewResult(submitted.attemptId);
  };

  const handleViewResult = async (attemptId: string) => {
    setLastAttemptId(attemptId);
    setReportLoading(true);
    setReportError(null);
    setCurrentView('exam-result');
    try {
      const token = await getValidIdToken();
      const rep = await fetchResultReport(token, attemptId);
      setActiveReport(rep);
    } catch (err: unknown) {
      const friendly = mapErrorToUserMessage(err, 'result_load');
      setReportError(friendly.message);
      showErrorToast(friendly.message, friendly.title);
    } finally {
      setReportLoading(false);
    }
  };

  const handleTriggerAdaptive = (
    subject: string,
    topics: string[],
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert'
  ) => {
    setExamPreset({
      sourceType: 'topic',
      subject,
      topics,
      difficulty,
    });
    setCurrentView('create-exam');
  };

  // Distraction-free full-screen view when inside an active timed examination
  if (currentView === 'exam-player' && activeSession) {
    return (
      <ExamPlayerPage
        exam={activeSession.exam}
        attempt={activeSession.attempt}
        questions={activeSession.questions}
        initialAnswers={activeSession.savedAnswers}
        onAutoSave={handleAutoSaveAttempt}
        onSubmitExam={handleSubmitExam}
        onExitWithoutSubmitting={() => {
          loadDashboard();
          setCurrentView('dashboard');
        }}
      />
    );
  }

  return (
    <AppShell
      currentView={currentView}
      onNavigate={(view) => {
        if (view === 'privacy-policy') {
          window.history.pushState({}, '', '/privacy-policy');
        } else if (window.location.pathname === '/privacy-policy') {
          window.history.pushState({}, '', '/');
        }
        if (view !== 'create-exam') {
          setExamPreset(null);
        }
        setCurrentView(view);
      }}
    >
      {currentView === 'dashboard' && (
        <DashboardPage
          data={dashboardData}
          loading={dashboardLoading}
          error={dashboardError}
          onRetry={loadDashboard}
          onNavigate={setCurrentView}
          onStartExam={handleStartExam}
          onViewResult={handleViewResult}
          onQuickAdaptiveTopic={(subject, topic, diff) =>
            handleTriggerAdaptive(subject, [topic], diff as any)
          }
        />
      )}

      {currentView === 'documents' && (
        <DocumentsPage
          documents={dashboardData?.documents || []}
          onUploadDocument={handleUploadDocument}
          onConfigureExamFromDocument={handleConfigureFromDocument}
        />
      )}

      {currentView === 'create-exam' && (
        <CreateExamPage
          documents={dashboardData?.documents || []}
          initialPreset={examPreset}
          onGenerateExam={handleGenerateExam}
          onStartGeneratedExam={handleStartExam}
        />
      )}

      {currentView === 'exam-result' && (
        <ExamResultPage
          report={activeReport}
          loading={reportLoading}
          error={reportError}
          onRetry={lastAttemptId ? () => handleViewResult(lastAttemptId) : undefined}
          onBackToDashboard={() => setCurrentView('dashboard')}
          onRetakeExam={handleStartExam}
          onGenerateAdaptiveFromMistakes={(subj, weakTopics) =>
            handleTriggerAdaptive(subj, weakTopics, 'Medium')
          }
        />
      )}

      {currentView === 'adaptive' && (
        <ExamArchivePage
          data={dashboardData}
          loading={dashboardLoading}
          error={dashboardError}
          onRetry={loadDashboard}
          onNavigate={setCurrentView}
          onStartExam={handleStartExam}
          onViewResult={handleViewResult}
          onQuickConfigureTopic={handleTriggerAdaptive}
        />
      )}

      {currentView === 'analytics' && (
        <AnalyticsPage
          data={dashboardData}
          loading={dashboardLoading}
          error={dashboardError}
          onRetry={loadDashboard}
          onViewResult={handleViewResult}
          onTriggerAdaptiveExam={handleTriggerAdaptive}
        />
      )}

      {currentView === 'profile' && (
        <PersonalProfilePage onNavigate={setCurrentView} />
      )}

      {currentView === 'settings' && (
        <SettingsPrivacyPage
          documents={dashboardData?.documents || []}
          onNavigate={setCurrentView}
          onRefreshDashboard={loadDashboard}
        />
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <ErrorToastProvider>
        <AuthProvider>
          <ExamoraApplication />
        </AuthProvider>
      </ErrorToastProvider>
    </AppErrorBoundary>
  );
}
