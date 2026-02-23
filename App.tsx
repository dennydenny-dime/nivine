import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import MainAppPage from './components/MainAppPage';
import CustomCoachPage from './components/CustomCoachPage';
import ConversationRoom from './components/ConversationRoom';
import DailyQuiz from './components/DailyQuiz';
import PricingPage from './components/PricingPage';
import Leaderboard from './components/Leaderboard';
import AuthPage from './components/AuthPage';
import MentalTrainingPage from './components/MentalTrainingPage';
import { clearStoredSession, fetchUserWithAccessToken, getStoredSession, mapSupabaseUser, readSessionFromUrlHash, saveSession, signOutSession } from './lib/supabaseAuth';
import { consumeCall, getStoredPlan, getUsageSnapshot, PLAN_CONFIGS, setStoredPlan, SubscriptionPlan } from './lib/subscription';
import { startRazorpayCheckout } from './lib/razorpay';
import { clearStoredSession, fetchUserWithAccessToken, getStoredSession, mapSupabaseUser, readSessionFromUrlHash, saveSession, signOutSession } from './lib/supabaseAuth';
import MentalPerformanceCoachPage from './components/MentalPerformanceCoachPage';
import PersonalDashboard from './components/PersonalDashboard';
import { Persona, User } from './types';

export const SynapseLogo = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="20" fill="white" />
    <path d="M70 35.5C70 28.5 64.5 23 57.5 23H42.5C35.5 23 30 28.5 30 35.5V38.5C30 45.5 35.5 51 42.5 51H57.5C64.5 51 70 56.5 70 63.5V66.5C70 73.5 64.5 79 57.5 79H42.5C35.5 79 30 73.5 30 66.5" stroke="black" strokeWidth="8" strokeLinecap="round" />
    <rect x="38" y="47" width="4" height="8" rx="2" fill="black" />
    <rect x="48" y="44" width="4" height="14" rx="2" fill="black" />
    <rect x="58" y="47" width="4" height="8" rx="2" fill="black" />
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
  MENTAL = 'mental_training',
}

  MENTAL_PERFORMANCE = 'mental_performance',
  PERSONAL_DASHBOARD = 'personal_dashboard'
}

type NavItem = {
  key: View;
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
  locked?: boolean;
};

const ADMIN_EMAILS = new Set([
  'aryancode192@gmail.com',
  'work.of.god02@gmail.com'
]);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentView, setCurrentView] = useState<View>(View.LANDING);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('free');
  const [callsUsed, setCallsUsed] = useState(0);
  const [usageMessage, setUsageMessage] = useState<string | null>(null);

  const planConfig = PLAN_CONFIGS[currentPlan];
  const normalizedEmail = currentUser?.email.trim().toLowerCase();
  const isAdmin = normalizedEmail ? ADMIN_EMAILS.has(normalizedEmail) : false;
  const hasFullAccess = isAdmin;

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
    const restoreSession = async () => {
      const urlSession = readSessionFromUrlHash();
      const session = urlSession || getStoredSession();

      if (!session) {
        setAuthReady(true);
        return;
      }

      if (urlSession) {
        saveSession(urlSession);
      }

      try {
        const supabaseUser = await fetchUserWithAccessToken(session.access_token);
        setCurrentUser(mapSupabaseUser(supabaseUser));
      } catch {
        clearStoredSession();
        setCurrentUser(null);
      } finally {
        setAuthReady(true);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

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

  useEffect(() => {
    const restoreSession = async () => {
      const urlSession = readSessionFromUrlHash();
      const session = urlSession || getStoredSession();

      if (!session) {
        setAuthReady(true);
        return;
      }

      if (urlSession) saveSession(urlSession);

      try {
        if (!session.access_token) throw new Error('Missing access token');
        const supabaseUser = await fetchUserWithAccessToken(session.access_token);
        setCurrentUser(mapSupabaseUser(supabaseUser));
      } catch {
        clearStoredSession();
        setCurrentUser(null);
      } finally {
        setAuthReady(true);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    localStorage.setItem('tm_current_user', JSON.stringify(currentUser));

    const pool = JSON.parse(localStorage.getItem('tm_leaderboard_pool') || '[]');
    const existingIndex = pool.findIndex((entry: User) => entry.id === currentUser.id);
    if (existingIndex === -1) {
      pool.push({ ...currentUser, xp: 0, totalQuizzes: 0 });
    } else {
      pool[existingIndex] = { ...pool[existingIndex], name: currentUser.name, avatar: currentUser.avatar, email: currentUser.email };
    }
    localStorage.setItem('tm_leaderboard_pool', JSON.stringify(pool));

    const storedPlan = getStoredPlan(currentUser.id);
    setCurrentPlan(storedPlan);
    setCallsUsed(getUsageSnapshot(currentUser.id).callsUsed);
  }, [currentUser]);

  const enterFullScreen = useCallback(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element | null };
    const docEl = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    const inFullscreen = !!doc.fullscreenElement || !!doc.webkitFullscreenElement;
    if (inFullscreen) return;
    const requestFullscreen = docEl.requestFullscreen?.bind(docEl) ?? docEl.webkitRequestFullscreen?.bind(docEl);
    if (!requestFullscreen) return;
    Promise.resolve(requestFullscreen()).catch(() => undefined);
  }, []);

  const toggleFullScreen = useCallback(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      enterFullScreen();
      return;
    }
    const exitFullscreen = document.exitFullscreen?.bind(document) ?? doc.webkitExitFullscreen?.bind(document);
    if (!exitFullscreen) return;
    Promise.resolve(exitFullscreen()).catch(() => undefined);
  }, [enterFullScreen]);

  const guardByPlan = useCallback((feature: 'custom' | 'quiz' | 'mental') => {
    if (feature === 'custom' && !planConfig.canUseCustomCoach) {
      setUsageMessage('Custom Coach is available on Premium ($20) and Elite ($25).');
      return false;
    }
    if (feature === 'quiz' && !planConfig.canUseQuizzes) {
      setUsageMessage('Quizzes are available on Premium ($20) and Elite ($25).');
      return false;
    }
    if (feature === 'mental' && !planConfig.canUseMentalTrainingModule) {
      setUsageMessage('Mental Training Module is available on Elite ($25).');
      return false;
    }
    return true;
  }, [planConfig]);

  const startConversation = (persona: Persona) => {
    if (!currentUser) return;

    if (callsUsed >= planConfig.callsLimit) {
      setUsageMessage(`You have reached your ${planConfig.callsLimit} monthly calls on the ${planConfig.label} plan.`);
      return;
    }

    const usage = consumeCall(currentUser.id);
    setCallsUsed(usage.callsUsed);
    setUsageMessage(null);
    enterFullScreen();
    setSelectedPersona(persona);
    setCurrentView(View.CONVERSATION);
  };

  const openApp = () => {
    setUsageMessage(null);
    setCurrentView(View.APP);
  };

  const openQuiz = () => {
    if (!guardByPlan('quiz')) return;
    setUsageMessage(null);
    setCurrentView(View.QUIZ);
  };

  const openPricing = () => setCurrentView(View.PRICING);
  const openLeaderboard = () => setCurrentView(View.LEADERBOARD);

  const openCustomCoach = () => {
    if (!guardByPlan('custom')) return;
    setUsageMessage(null);
    setCurrentView(View.CUSTOM_COACH);
  };

  const openMentalTraining = () => {
    if (!guardByPlan('mental')) return;
    setUsageMessage(null);
    setCurrentView(View.MENTAL);
    if (!hasFullAccess) {
      setCurrentView(View.PRICING);
      return;
    }
    setCurrentView(View.QUIZ);
  };

  const openPricing = () => {
    setCurrentView(View.PRICING);
  };

  const openLeaderboard = () => {
    if (!hasFullAccess) {
      setCurrentView(View.PRICING);
      return;
    }
    setCurrentView(View.LEADERBOARD);
  };

  const openCustomCoach = () => {
    if (!hasFullAccess) {
      setCurrentView(View.PRICING);
      return;
    }
    setCurrentView(View.CUSTOM_COACH);
  };

  const openMentalPerformance = () => {
    if (!hasFullAccess) {
      setCurrentView(View.PRICING);
      return;
    }
    setCurrentView(View.MENTAL_PERFORMANCE);
  };

  const openPersonalDashboard = () => {
    setCurrentView(View.PERSONAL_DASHBOARD);
  };

  const goBack = () => {
    setCurrentView(View.LANDING);
    setSelectedPersona(null);
  };

  const handlePlanSelect = async (plan: SubscriptionPlan) => {
    if (!currentUser) return;

    if (plan === 'free') {
      setStoredPlan(currentUser.id, plan);
      setCurrentPlan(plan);
      setUsageMessage('Switched to Free plan.');
      return;
    }

    try {
      const isPaid = await startRazorpayCheckout({
        plan,
        userName: currentUser.name,
        userEmail: currentUser.email,
      });

      if (!isPaid) {
        setUsageMessage('Payment was not completed. Plan remains unchanged.');
        return;
      }

      setStoredPlan(currentUser.id, plan);
      setCurrentPlan(plan);
      setUsageMessage(`Payment successful. Plan upgraded to ${PLAN_CONFIGS[plan].label}.`);
    } catch (error) {
      setUsageMessage(error instanceof Error ? error.message : 'Unable to start Razorpay checkout.');
    }
  };

  const handleLogout = async () => {
    const session = getStoredSession();
    if (session?.access_token) {
      try {
        await signOutSession(session.access_token);
      } catch {
        // ignore
        // Ignore logout API errors and clear local session anyway.
      }
    }

    clearStoredSession();
    localStorage.removeItem('tm_current_user');
    setCurrentUser(null);
    setCurrentView(View.LANDING);
    setSelectedPersona(null);
  };

  if (!authReady) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div></div>;
  }

  if (!currentUser) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30 px-4"><AuthPage onLogin={setCurrentUser} /></div>;
  const navItems: NavItem[] = [
    { key: View.LANDING, label: 'Home', onClick: () => setCurrentView(View.LANDING) },
    { key: View.APP, label: 'Neural Training Modules', onClick: openApp },
    { key: View.CUSTOM_COACH, label: 'Custom Coach', onClick: openCustomCoach, locked: !hasFullAccess },
    { key: View.MENTAL_PERFORMANCE, label: 'Mental Performance Coach', onClick: openMentalPerformance, locked: !hasFullAccess },
    {
      key: View.LEADERBOARD,
      label: 'Leaderboard',
      onClick: openLeaderboard,
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      className: 'shadow-lg shadow-indigo-500/20',
      locked: !hasFullAccess
    },
    { key: View.PRICING, label: 'Plans', onClick: openPricing },
    { key: View.QUIZ, label: 'Quizzes', onClick: openQuiz, locked: !hasFullAccess }
  ];

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30 px-4">
        <AuthPage onLogin={setCurrentUser} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 transition-transform duration-500">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-0 md:h-16 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={goBack}>
            <SynapseLogo className="w-8 h-8 shadow-lg shadow-white/5" />
            <span className="text-lg md:text-xl font-bold tracking-tight">Synapse <span className="text-indigo-400">AI</span></span>
          </div>
          <div className="flex gap-2 items-center justify-between md:hidden">
            <button onClick={toggleFullScreen} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white" title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}>⛶</button>
            <div className="flex items-center gap-2 bg-slate-900 rounded-full pl-1 pr-3 py-1 border border-slate-800">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-6 h-6 rounded-full" />
              <span className="text-xs font-bold">{currentUser.name}</span>
            </div>
          </div>
          <div className="flex gap-2 md:gap-3 items-center overflow-x-auto md:overflow-visible pb-1 md:pb-0">
            <button onClick={() => setCurrentView(View.LANDING)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === View.LANDING ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Home</button>
            <button onClick={openApp} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === View.APP ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Neural Modules</button>
            <button onClick={openCustomCoach} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === View.CUSTOM_COACH ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Custom Coach</button>
            <button onClick={openQuiz} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === View.QUIZ ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Quizzes</button>
            <button onClick={openMentalTraining} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === View.MENTAL ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Mental Training</button>
            <button onClick={openPricing} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === View.PRICING ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Plans</button>
            <button onClick={openLeaderboard} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === View.LEADERBOARD ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Leaderboard</button>

            <div className="hidden md:flex items-center gap-2 bg-slate-900 rounded-full pl-1 pr-3 py-1 border border-slate-800">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-6 h-6 rounded-full" />
              <span className="text-xs font-bold">{currentUser.name}</span>
      {/* Navigation - hidden in conversation mode if desired, but here we keep it for exit */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800 transition-transform duration-500">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-2 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={goBack}>
            <SynapseLogo className="w-8 h-8 shadow-lg shadow-white/5" />
            <span className="text-lg md:text-xl font-bold tracking-tight">NODE <span className="text-indigo-400">AI</span></span>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={toggleFullScreen}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
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
                className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border transition ${currentView === View.PERSONAL_DASHBOARD ? 'bg-indigo-600/20 border-indigo-500/50 text-white' : 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800'}`}
                title="Open personal dashboard"
              >
                <img src={currentUser.avatar} alt={currentUser.name} className="w-6 h-6 rounded-full" />
                <span className="text-xs font-bold hidden sm:inline">{currentUser.name}</span>
              </button>

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium hover:bg-slate-800 transition-all text-slate-300"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-1.5">
            <div className="flex gap-1.5 items-center overflow-x-auto md:overflow-visible scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={item.onClick}
                  className={`px-3 py-2 md:px-4 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${currentView === item.key ? `bg-indigo-600 text-white ${item.className ?? ''}` : 'text-slate-300 hover:bg-slate-800 hover:text-white'} ${item.locked ? 'relative' : ''}`}
                >
                  {item.icon}
                  {item.label}
                  {item.locked && <span className="text-[10px] text-amber-300">🔒</span>}
                </button>
              ))}
            </div>
            <button onClick={handleLogout} className="px-3 py-1.5 rounded-full text-xs font-medium hover:bg-slate-800">Logout</button>
          </div>
          {!hasFullAccess && (
            <p className="text-xs text-amber-300 px-1">
              Subscription required for Custom Coach, Mental Performance Coach, Leaderboard, and Quizzes.
            </p>
          )}
        </div>
      </nav>

      <main className={`pt-32 md:pt-20 pb-12 px-4 max-w-7xl mx-auto transition-all duration-500 ${currentView === View.CONVERSATION ? 'max-w-none px-0 pt-16' : ''}`}>
        <div className="mb-4 mt-2 flex flex-wrap gap-2 items-center">
          <span className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 rounded-full px-3 py-1">Plan: {planConfig.label}</span>
          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-300 rounded-full px-3 py-1">Calls: {callsUsed}/{planConfig.callsLimit}</span>
          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-300 rounded-full px-3 py-1">Session Length: {planConfig.maxMinutesPerCall} mins</span>
        </div>
      <main className={`pt-40 md:pt-36 pb-12 px-4 max-w-7xl mx-auto transition-all duration-500 ${currentView === View.CONVERSATION ? 'max-w-none px-0 pt-16' : ''}`}>
        {currentView === View.LANDING && (
          <LandingPage onEnterApp={openApp} />
        )}

        {currentView === View.PERSONAL_DASHBOARD && (
          <PersonalDashboard currentUser={currentUser} onContinueTraining={openApp} />
        )}

        {usageMessage && <p className="mb-4 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">{usageMessage}</p>}

        {currentView === View.LANDING && <LandingPage onEnterApp={openApp} currentUser={currentUser} />}
        {currentView === View.APP && <MainAppPage onStart={startConversation} />}
        {currentView === View.CUSTOM_COACH && <CustomCoachPage onStart={startConversation} />}
        {currentView === View.MENTAL && <MentalTrainingPage onStart={startConversation} />}
        {currentView === View.MENTAL_PERFORMANCE && (
          <MentalPerformanceCoachPage />
        )}

        {currentView === View.CONVERSATION && selectedPersona && (
          <ConversationRoom
            persona={selectedPersona}
            maxDurationMinutes={planConfig.maxMinutesPerCall}
            onSessionLimitReached={() => setUsageMessage(`Session ended: ${planConfig.maxMinutesPerCall}-minute limit reached for ${planConfig.label}.`)}
            onExit={goBack}
          />
        )}
        {currentView === View.QUIZ && <DailyQuiz onSeeLeaderboard={openLeaderboard} />}
        {currentView === View.PRICING && <PricingPage onBack={goBack} currentPlan={currentPlan} onPlanSelect={handlePlanSelect} />}
        {currentView === View.LEADERBOARD && <Leaderboard onBack={goBack} />}
      </main>

      <footer className="py-8 text-center text-slate-500 text-sm border-t border-slate-900 mt-auto">&copy; 2024 Synapse AI. All rights reserved.</footer>
      <footer className="py-8 text-center text-slate-500 text-sm border-t border-slate-900 mt-auto">
        &copy; 2026 NODE AI. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
