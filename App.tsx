
import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import MainAppPage from './components/MainAppPage';
import CustomCoachPage from './components/CustomCoachPage';
import ConversationRoom from './components/ConversationRoom';
import DailyQuiz from './components/DailyQuiz';
import PricingPage from './components/PricingPage';
import Leaderboard from './components/Leaderboard';
import AuthPage from './components/AuthPage';
import { clearStoredSession, mapFirebaseUser, signOutSession, subscribeToAuthChanges } from './lib/firebaseAuth';
import MentalPerformanceCoachPage from './components/MentalPerformanceCoachPage';
import PersonalDashboard from './components/PersonalDashboard';
import InterviewIntelPage from './components/InterviewIntelPage';
import LearningModulesPage from './components/LearningModulesPage';
import { CallCategory, SubscriptionTier, consumeCall, getPlanAccess, getRemainingCalls, getSubscriptionTier, isAdminEmail, setSubscriptionTier as persistSubscriptionTier } from './lib/subscription';
import { Persona, User } from './types';

export const SynapseLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="nodeMarkAccent" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0EA5E9" />
        <stop offset="1" stopColor="#4F46E5" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="22" fill="white" />
    <path d="M30 72V28L70 72V28" stroke="#0F172A" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M35 67L65 67" stroke="url(#nodeMarkAccent)" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
    <circle cx="30" cy="72" r="4" fill="url(#nodeMarkAccent)" />
    <circle cx="70" cy="28" r="4" fill="url(#nodeMarkAccent)" />
  </svg>
);

enum View {
  LANDING = 'landing',
  APP = 'app',
  CONVERSATION = 'conversation',
  QUIZ = 'quiz',
  PRICING = 'pricing',
  LEADERBOARD = 'leaderboard',
  CUSTOM_COACH = 'custom_coach',
  MENTAL_PERFORMANCE = 'mental_performance',
  PERSONAL_DASHBOARD = 'personal_dashboard',
  INTERVIEW_INTEL = 'interview_intel',
  LEARNING_MODULES = 'learning_modules',
};

type NavItem = {
  key: View;
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
  locked?: boolean;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentView, setCurrentView] = useState<View>(View.LANDING);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [conversationCategory, setConversationCategory] = useState<CallCategory>('neural');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  const [trialExpiredNotice, setTrialExpiredNotice] = useState<string | null>(null);

  const normalizedEmail = currentUser?.email.trim().toLowerCase();
  const isAdmin = isAdminEmail(normalizedEmail);
  const effectiveTier: SubscriptionTier = isAdmin ? 'elite' : subscriptionTier;
  const planAccess = getPlanAccess(effectiveTier);
  const isNewUser = effectiveTier === 'free';
  const neuralRemainingCalls = getRemainingCalls(effectiveTier, 'neural');
  const coachingRemainingCalls = getRemainingCalls(effectiveTier, 'coaching');

  const redirectToPricing = useCallback((notice: string) => {
    setTrialExpiredNotice(notice);
    window.alert(notice);
    setCurrentView(View.PRICING);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullScreen(!!doc.fullscreenElement || !!doc.webkitFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(mapFirebaseUser(firebaseUser));
      } else {
        clearStoredSession();
        setCurrentUser(null);
      }

      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    setSubscriptionTier(getSubscriptionTier(currentUser.email || currentUser.id));
    localStorage.setItem('tm_current_user', JSON.stringify(currentUser));

    const pool = JSON.parse(localStorage.getItem('tm_leaderboard_pool') || '[]');
    const existingIndex = pool.findIndex((entry: User) => entry.id === currentUser.id);
    if (existingIndex === -1) {
      pool.push({
        ...currentUser,
        xp: 0,
        totalQuizzes: 0
      });
    } else {
      pool[existingIndex] = {
        ...pool[existingIndex],
        name: currentUser.name,
        avatar: currentUser.avatar,
        email: currentUser.email
      };
    }
    localStorage.setItem('tm_leaderboard_pool', JSON.stringify(pool));
  }, [currentUser]);

  const enterFullScreen = useCallback(() => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };

    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    const inFullscreen = !!doc.fullscreenElement || !!doc.webkitFullscreenElement;
    if (inFullscreen) return;

    const requestFullscreen = docEl.requestFullscreen?.bind(docEl) ?? docEl.webkitRequestFullscreen?.bind(docEl);
    if (!requestFullscreen) {
      // iOS Safari may not support fullscreen on regular pages.
      return;
    }

    Promise.resolve(requestFullscreen()).catch((err) => {
      console.warn(`Fullscreen entry denied: ${err?.message ?? err}`);
    });
  }, []);

  const toggleFullScreen = useCallback(() => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };

    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      enterFullScreen();
    } else {
      const exitFullscreen = document.exitFullscreen?.bind(document) ?? doc.webkitExitFullscreen?.bind(document);
      if (!exitFullscreen) return;

      Promise.resolve(exitFullscreen()).catch((err) => {
        console.warn(`Fullscreen exit denied: ${err?.message ?? err}`);
      });
    }
  }, [enterFullScreen]);

  const startConversation = (persona: Persona, category: CallCategory = 'neural') => {
    const remainingCalls = category === 'coaching' ? coachingRemainingCalls : neuralRemainingCalls;

    if (remainingCalls !== null && remainingCalls <= 0) {
      redirectToPricing(`You have reached your monthly ${category} call limit for this plan. Please upgrade to continue.`);
      return;
    }

    consumeCall(category);
    // Attempt to enter fullscreen as the user clicked a primary action button
    enterFullScreen();
    setConversationCategory(category);
    setSelectedPersona(persona);
    setCurrentView(View.CONVERSATION);
    setTrialExpiredNotice(null);
  };

  const openApp = () => {
    setCurrentView(View.APP);
  };

  const openQuiz = () => {
    if (!planAccess.quizzesEnabled) {
      redirectToPricing('Quizzes are available on Premium and above plans.');
      return;
    }
    setCurrentView(View.QUIZ);
  };

  const openPricing = () => {
    setCurrentView(View.PRICING);
  };

  const openLeaderboard = () => {
    if (!planAccess.leaderboardEnabled) {
      setTrialExpiredNotice('Leaderboard is available on Premium plans. Tap to choose a plan.');
      setCurrentView(View.PRICING);
      return;
    }
    setCurrentView(View.LEADERBOARD);
  };

  const openCustomCoach = () => {
    if (!planAccess.customCoachEnabled) {
      setTrialExpiredNotice('Custom Coach is available on Premium plans. Tap to choose a plan.');
      setCurrentView(View.PRICING);
      return;
    }
    if (coachingRemainingCalls !== null && coachingRemainingCalls <= 0) {
      setTrialExpiredNotice('You have reached your monthly custom coach calls limit for this plan. Tap to choose a plan.');
      setCurrentView(View.PRICING);
      return;
    }
    setCurrentView(View.CUSTOM_COACH);
  };

  const openMentalPerformance = () => {
    if (!planAccess.mentalPerformanceEnabled) {
      setTrialExpiredNotice('Mental Performance Coach is available on Premium plans. Tap to choose a plan.');
      setCurrentView(View.PRICING);
      return;
    }
    if (coachingRemainingCalls !== null && coachingRemainingCalls <= 0) {
      setTrialExpiredNotice('You have reached your monthly coaching calls limit for this plan. Tap to choose a plan.');
      setCurrentView(View.PRICING);
      return;
    }
    setCurrentView(View.MENTAL_PERFORMANCE);
  };

  const openPersonalDashboard = () => {
    setCurrentView(View.PERSONAL_DASHBOARD);
  };

  const openInterviewIntel = () => {
    setCurrentView(View.INTERVIEW_INTEL);
  };

  const openLearningModules = () => {
    if (!planAccess.learningModulesEnabled) {
      setTrialExpiredNotice('Learning Modules are available on Elite and Team plans. Tap to choose a plan.');
      setCurrentView(View.PRICING);
      return;
    }
    setCurrentView(View.LEARNING_MODULES);
  };

  const goBack = () => {
    setCurrentView(View.LANDING);
    setSelectedPersona(null);
    setConversationCategory('neural');
  };

  const handleLogout = async () => {
    try {
      await signOutSession();
    } catch {
      // Ignore logout API errors and clear local session anyway.
    }

    clearStoredSession();
    localStorage.removeItem('tm_current_user');
    setCurrentUser(null);
    setCurrentView(View.LANDING);
    setSelectedPersona(null);
    setConversationCategory('neural');
    setTrialExpiredNotice(null);
    setSubscriptionTier('free');
  };

  const navItems: NavItem[] = [
    { key: View.LANDING, label: 'Home', onClick: () => setCurrentView(View.LANDING) },
    { key: View.APP, label: 'Neural Training Modules', onClick: openApp },
    { key: View.INTERVIEW_INTEL, label: 'Interview Intel', onClick: openInterviewIntel },
    { key: View.LEARNING_MODULES, label: 'Learning Modules', onClick: openLearningModules, locked: isNewUser || !planAccess.learningModulesEnabled },
    { key: View.CUSTOM_COACH, label: 'Custom Coach', onClick: openCustomCoach, locked: isNewUser },
    { key: View.MENTAL_PERFORMANCE, label: 'Mental Performance Coach', onClick: openMentalPerformance, locked: isNewUser },
    {
      key: View.LEADERBOARD,
      label: 'Leaderboard',
      onClick: openLeaderboard,
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      className: 'shadow-lg shadow-indigo-500/20',
      locked: !planAccess.leaderboardEnabled
    },
    { key: View.PRICING, label: 'Plans', onClick: openPricing },
    { key: View.QUIZ, label: 'Quizzes', onClick: openQuiz }
  ];

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-[#EDEDED] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-[#EDEDED] selection:bg-indigo-500/30 px-4">
        <AuthPage onLogin={setCurrentUser} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#EDEDED] selection:bg-indigo-500/30">
      {/* Navigation - hidden in conversation mode if desired, but here we keep it for exit */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0A0A0B]/80 backdrop-blur-xl transition-transform duration-500">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-2 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={goBack}>
            <SynapseLogo className="w-8 h-8 shadow-lg shadow-white/5" />
            <span className="text-lg md:text-xl font-semibold tracking-tight">NODE <span className="text-indigo-300">AI</span></span>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={toggleFullScreen}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white"
                title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
              >
                {isFullScreen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9L4 4m0 0l5 0M4 4l0 5m11 11l5 5m0 0l-5 0m5 0l0-5M9 15l-5 5m0 0l5 0m-5 0l0-5m11-11l5-5m0 0l-5 0m5 0l0 5" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                )}
              </button>

              <button
                onClick={openPersonalDashboard}
                className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border transition ${currentView === View.PERSONAL_DASHBOARD ? 'bg-indigo-600/20 border-indigo-500/50 text-white' : 'bg-black/40 border-white/10 text-slate-100 hover:bg-white/5'}`}
                title="Open personal dashboard"
              >
                <img src={currentUser.avatar} alt={currentUser.name} className="w-6 h-6 rounded-full" />
                <span className="text-xs font-bold hidden sm:inline">{currentUser.name}</span>
              </button>

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium hover:bg-white/5 transition-all text-slate-300"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="premium-panel rounded-2xl p-1.5">
            <div className="flex gap-1.5 items-center overflow-x-auto md:overflow-visible scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={item.onClick}
                  className={`px-3 py-2 md:px-4 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${currentView === item.key ? `bg-indigo-600 text-white ${item.className ?? ''}` : 'text-slate-300 hover:bg-white/5 hover:text-white'} ${item.locked ? 'relative' : ''}`}
                >
                  {item.icon}
                  {item.label}
                  {item.locked && <span className="text-[10px] text-amber-300">🔒</span>}
                </button>
              ))}
            </div>
          </div>
          {trialExpiredNotice && (
            <button
              onClick={openPricing}
              className="text-left text-xs font-semibold text-rose-200 bg-rose-500/15 border border-rose-500/40 rounded-xl px-3 py-2 hover:bg-rose-500/25 transition-colors"
            >
              {trialExpiredNotice}
            </button>
          )}
        </div>
      </nav>

      <main className={`pt-40 md:pt-36 pb-12 px-4 max-w-7xl mx-auto transition-all duration-500 ${currentView === View.CONVERSATION ? 'max-w-none px-0 pt-16' : ''}`}>
        <div className="animate-in fade-in duration-300">
          {currentView === View.LANDING && <LandingPage onEnterApp={openApp} />}
          {currentView === View.PERSONAL_DASHBOARD && <PersonalDashboard currentUser={currentUser} onContinueTraining={openApp} />}
          {currentView === View.APP && (
            <MainAppPage
              onStart={(persona) => startConversation(persona, 'neural')}
              showTrialBanner={isNewUser}
              planNotice={'Premium includes 30 neural module calls per month (10 mins each), 120 minutes of custom coach calls, quizzes, and leaderboards.'}
            />
          )}
          {currentView === View.INTERVIEW_INTEL && <InterviewIntelPage />}
          {currentView === View.LEARNING_MODULES && <LearningModulesPage />}
          {currentView === View.CUSTOM_COACH && <CustomCoachPage onStart={(persona) => startConversation(persona, 'coaching')} />}
          {currentView === View.MENTAL_PERFORMANCE && <MentalPerformanceCoachPage />}
          {currentView === View.CONVERSATION && selectedPersona && (
            <ConversationRoom
              persona={selectedPersona}
              onExit={goBack}
              maxDurationMinutes={
                conversationCategory === 'coaching'
                  ? planAccess.coachingMaxMinutesPerCall
                  : planAccess.neuralMaxMinutesPerCall
              }
            />
          )}
          {currentView === View.QUIZ && <DailyQuiz onSeeLeaderboard={openLeaderboard} />}
          {currentView === View.PRICING && <PricingPage onBack={goBack} onPurchaseSuccess={(tier) => {
            persistSubscriptionTier(tier, currentUser.email || currentUser.id);
            setSubscriptionTier(tier);
            setTrialExpiredNotice(null);
            setCurrentView(View.LANDING);
          }} />}
          {currentView === View.LEADERBOARD && <Leaderboard onBack={goBack} />}
        </div>
      </main>

      <footer className="py-8 text-center text-slate-500 text-sm border-t border-white/10 mt-auto">
        &copy; 2026 NODE AI. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
