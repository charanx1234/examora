import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  FilePlus2,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Maximize2,
  Minimize2,
  Moon,
  Plus,
  ShieldCheck,
  Sun,
  UserCircle2,
} from 'lucide-react';
import { AppView } from '../../types/examora.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { generateEmailDefaultAvatar, getUserAvatarUrl } from '../../utils/avatar.ts';
import { Button } from '../ui/Button.tsx';

interface AppShellProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  children: React.ReactNode;
}

export function AppShell({ currentView, onNavigate, children }: AppShellProps) {
  const { profile, isDemoMode, signOut, theme, toggleTheme } = useAuth();
  const [isDistractionFree, setIsDistractionFree] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsDistractionFree((prev) => !prev);
      } else if (e.key === 'Escape' && isDistractionFree) {
        setIsDistractionFree(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDistractionFree]);

  const navItems: Array<{ id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create-exam', label: 'Create Examination', icon: FilePlus2 },
    { id: 'documents', label: 'Study Materials', icon: BookOpen },
    { id: 'adaptive', label: 'Question Bank & Archive', icon: FolderKanban },
    { id: 'analytics', label: 'Performance Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Personal Information', icon: UserCircle2 },
    { id: 'settings', label: 'Privacy & Settings', icon: ShieldCheck },
  ];

  const viewTitles: Record<AppView, string> = {
    landing: 'Home',
    login: 'Sign In',
    dashboard: 'Student Overview',
    documents: 'Study Materials & Curriculum Extraction',
    'create-exam': 'Examination Configuration Studio',
    'exam-player': 'Live Examination Session',
    'exam-result': 'Official Evaluation Report',
    analytics: 'Performance Analytics & Topic Mastery',
    adaptive: 'Question Papers & Transcript Archive',
    profile: 'Personal Information & Profile',
    settings: 'Privacy, Consent & Account Settings (DPDP 2023)',
    'privacy-policy': 'Privacy Policy & Grievance Redressal',
  };

  const avatarSrc = getUserAvatarUrl(profile);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar Navigation (Hidden in Distraction-Free Reading Mode) */}
      {!isDistractionFree && (
        <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="text-lg font-bold tracking-tight text-slate-900 dark:text-white cursor-pointer"
            >
              EXAMORA
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle Light / Dark Theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>

          <nav className="flex-1 px-3 py-5 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Shortcut Hint & Clickable Student Account Footer (Opens Personal Information) */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Reading Mode</span>
              <kbd className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                Cmd/Ctrl + F
              </kbd>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              title="Click to view and edit your Personal Information & Profile Photo"
              className={`w-full flex items-center gap-3 p-2 rounded-xl border transition-colors text-left cursor-pointer ${
                currentView === 'profile'
                  ? 'border-slate-900 bg-slate-100 dark:border-slate-400 dark:bg-slate-800'
                  : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-800/60'
              }`}
            >
              <img
                src={avatarSrc}
                alt={profile?.fullName || 'Scholar'}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = generateEmailDefaultAvatar(profile?.email, profile?.fullName);
                }}
                className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {profile?.fullName || 'Scholar'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {isDemoMode ? 'Interactive Scholar Mode' : profile?.email}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all ${isDistractionFree ? '' : 'lg:pl-[260px]'}`}>
        {/* Top Header (Hidden in Distraction-Free Reading Mode) */}
        {!isDistractionFree && (
          <header className="sticky top-0 z-10 flex items-center justify-between gap-6 px-6 py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-slate-900 dark:text-white lg:hidden mr-2">
                EXAMORA
              </span>
              <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">Workspace</span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                {viewTitles[currentView]}
              </span>
            </div>

            {/* Mobile quick nav + Distraction-Free Toggle + Clickable Username/Profile + Primary CTA */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex lg:hidden items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate(item.id)}
                      className={`p-2 rounded-lg text-xs ${
                        currentView === item.id
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                      title={item.label}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer lg:hidden"
                title="Toggle Theme"
              >
                {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsDistractionFree(true)}
                title="Toggle Distraction-Free Reading Mode (Cmd/Ctrl + F)"
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Reading Mode</span>
                <kbd className="text-[10px] font-mono text-slate-400">⌘F</kbd>
              </button>

              {/* Clickable Username & Avatar Button in Top Bar -> Opens Personal Information */}
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                title="View and edit your Personal Information & Profile Photo"
                className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <img
                  src={avatarSrc}
                  alt={profile?.fullName || 'Scholar'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = generateEmailDefaultAvatar(profile?.email, profile?.fullName);
                  }}
                  className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
                <span className="max-w-[120px] truncate">{profile?.fullName || 'Scholar'}</span>
              </button>

              <Button
                size="sm"
                onClick={() => onNavigate('create-exam')}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Start Exam</span>
              </Button>
            </div>
          </header>
        )}

        <main className={`flex-1 p-6 lg:p-8 w-full mx-auto transition-all ${isDistractionFree ? 'max-w-[1040px] py-10' : 'max-w-[1240px]'}`}>
          {children}
        </main>

        {/* Floating Exit Control when Distraction-Free Reading Mode is Active */}
        {isDistractionFree && (
          <div className="fixed bottom-5 right-5 z-50">
            <button
              type="button"
              onClick={() => setIsDistractionFree(false)}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border border-slate-700 dark:border-slate-300 shadow-lg text-xs font-medium hover:opacity-95 transition-all cursor-pointer"
              title="Exit Distraction-Free Reading Mode (Cmd/Ctrl + F or Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Exit Reading Mode</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 dark:bg-slate-200 dark:text-slate-800 text-[10px] font-mono">
                Cmd/Ctrl + F
              </kbd>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
