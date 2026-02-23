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
import { Persona, User } from './types';

export const SynapseLogo = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="20" fill="white" />
    <path d="M70 35.5C70 28.5 64.5 23 57.5 23H42.5C35.5 23 30 28.5 30 35.5V38.5C30 45.5 35.5 51 42.5 51H57.5C64.5 51 70 56.5 70 63.5V66.5C70 73.5 64.5 79 57.5 79H42.5C35.5 79 30 73.5 30 66.5" stroke="black" strokeWidth="8" strokeLinecap="round" />
    <rect x="38" y="47" width="4" height="8" rx="2" fill="black" />
    <rect x="48" y="44" width="4" height="14" rx="2" fill="black" />
    <rect x="58" y="47" width="4" height="8" rx="2" fill="black" />
  </svg>
);

const VIEW = {
  LANDING: 'landing',
  APP: 'app',
  CONVERSATION: 'conversation',
  QUIZ: 'quiz',
  PRICING: 'pricing',
  LEADERBOARD: 'leaderboard',
  CUSTOM_COACH: 'custom_coach',
  MENTAL: 'mental_training',
} as const;

type View = (typeof VIEW)[keyof typeof VIEW];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentView, setCurrentView] = useState<View>(VIEW.LANDING);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('free');
  const [callsUsed, setCallsUsed] = useState(0);
  const [usageMessage, setUsageMessage] = useState<string | null>(null);

  const planConfig = PLAN_CONFIGS[currentPlan];

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
    setCurrentView(VIEW.CONVERSATION);
  };

  const openApp = () => {
    setUsageMessage(null);
    setCurrentView(VIEW.APP);
  };

  const openQuiz = () => {
    if (!guardByPlan('quiz')) return;
    setUsageMessage(null);
    setCurrentView(VIEW.QUIZ);
  };

  const openPricing = () => setCurrentView(VIEW.PRICING);
  const openLeaderboard = () => setCurrentView(VIEW.LEADERBOARD);

  const openCustomCoach = () => {
    if (!guardByPlan('custom')) return;
    setUsageMessage(null);
    setCurrentView(VIEW.CUSTOM_COACH);
  };

  const openMentalTraining = () => {
    if (!guardByPlan('mental')) return;
    setUsageMessage(null);
    setCurrentView(VIEW.MENTAL);
  };

  const goBack = () => {
    setCurrentView(VIEW.LANDING);
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
      }
    }

    clearStoredSession();
    localStorage.removeItem('tm_current_user');
    setCurrentUser(null);
    setCurrentView(VIEW.LANDING);
    setSelectedPersona(null);
  };

  if (!authReady) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div></div>;
  }

  if (!currentUser) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30 px-4"><AuthPage onLogin={setCurrentUser} /></div>;
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
            <button onClick={() => setCurrentView(VIEW.LANDING)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === VIEW.LANDING ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Home</button>
            <button onClick={openApp} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === VIEW.APP ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Neural Modules</button>
            <button onClick={openCustomCoach} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === VIEW.CUSTOM_COACH ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Custom Coach</button>
            <button onClick={openQuiz} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === VIEW.QUIZ ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Quizzes</button>
            <button onClick={openMentalTraining} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === VIEW.MENTAL ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Mental Training</button>
            <button onClick={openPricing} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === VIEW.PRICING ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Plans</button>
            <button onClick={openLeaderboard} className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentView === VIEW.LEADERBOARD ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>Leaderboard</button>

            <div className="hidden md:flex items-center gap-2 bg-slate-900 rounded-full pl-1 pr-3 py-1 border border-slate-800">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-6 h-6 rounded-full" />
              <span className="text-xs font-bold">{currentUser.name}</span>
            </div>
            <button onClick={handleLogout} className="px-3 py-1.5 rounded-full text-xs font-medium hover:bg-slate-800">Logout</button>
          </div>
        </div>
      </nav>

      <main className={`pt-32 md:pt-20 pb-12 px-4 max-w-7xl mx-auto transition-all duration-500 ${currentView === VIEW.CONVERSATION ? 'max-w-none px-0 pt-16' : ''}`}>
        <div className="mb-4 mt-2 flex flex-wrap gap-2 items-center">
          <span className="text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 rounded-full px-3 py-1">Plan: {planConfig.label}</span>
          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-300 rounded-full px-3 py-1">Calls: {callsUsed}/{planConfig.callsLimit}</span>
          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-300 rounded-full px-3 py-1">Session Length: {planConfig.maxMinutesPerCall} mins</span>
        </div>

        {usageMessage && <p className="mb-4 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">{usageMessage}</p>}

        {currentView === VIEW.LANDING && <LandingPage onEnterApp={openApp} currentUser={currentUser} />}
        {currentView === VIEW.APP && <MainAppPage onStart={startConversation} />}
        {currentView === VIEW.CUSTOM_COACH && <CustomCoachPage onStart={startConversation} />}
        {currentView === VIEW.MENTAL && <MentalTrainingPage onStart={startConversation} />}
        {currentView === VIEW.CONVERSATION && selectedPersona && (
          <ConversationRoom
            persona={selectedPersona}
            maxDurationMinutes={planConfig.maxMinutesPerCall}
            onSessionLimitReached={() => setUsageMessage(`Session ended: ${planConfig.maxMinutesPerCall}-minute limit reached for ${planConfig.label}.`)}
            onExit={goBack}
          />
        )}
        {currentView === VIEW.QUIZ && <DailyQuiz onSeeLeaderboard={openLeaderboard} />}
        {currentView === VIEW.PRICING && <PricingPage onBack={goBack} currentPlan={currentPlan} onPlanSelect={handlePlanSelect} />}
        {currentView === VIEW.LEADERBOARD && <Leaderboard onBack={goBack} />}
      </main>

      <footer className="py-8 text-center text-slate-500 text-sm border-t border-slate-900 mt-auto">&copy; 2024 Synapse AI. All rights reserved.</footer>
    </div>
  );
};

export default App;
