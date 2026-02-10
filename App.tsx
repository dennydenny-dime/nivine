
import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import ConversationRoom from './components/ConversationRoom';
import DailyQuiz from './components/DailyQuiz';
import PricingPage from './components/PricingPage';
import AuthPage from './components/AuthPage';
import Leaderboard from './components/Leaderboard';
import { Persona, User, UserStats } from './types';

export const SynapseLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="20" fill="white" />
    <path d="M70 35.5C70 28.5 64.5 23 57.5 23H42.5C35.5 23 30 28.5 30 35.5V38.5C30 45.5 35.5 51 42.5 51H57.5C64.5 51 70 56.5 70 63.5V66.5C70 73.5 64.5 79 57.5 79H42.5C35.5 79 30 73.5 30 66.5" stroke="black" strokeWidth="8" strokeLinecap="round" />
    {/* Vocal/Soundwave styling elements */}
    <rect x="38" y="47" width="4" height="8" rx="2" fill="black" />
    <rect x="48" y="44" width="4" height="14" rx="2" fill="black" />
    <rect x="58" y="47" width="4" height="8" rx="2" fill="black" />
  </svg>
);

enum View {
  LANDING = 'landing',
  CONVERSATION = 'conversation',
  QUIZ = 'quiz',
  PRICING = 'pricing',
  LEADERBOARD = 'leaderboard'
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.LANDING);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Check for saved session on load
  useEffect(() => {
    const savedUser = localStorage.getItem('tm_current_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const enterFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Fullscreen entry denied: ${err.message}`);
      });
    }
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      enterFullScreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [enterFullScreen]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('tm_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tm_current_user');
    setCurrentView(View.LANDING);
  };

  const startConversation = (persona: Persona) => {
    // Attempt to enter fullscreen as the user clicked a primary action button
    enterFullScreen();
    setSelectedPersona(persona);
    setCurrentView(View.CONVERSATION);
  };

  const openQuiz = () => {
    setCurrentView(View.QUIZ);
  };

  const openPricing = () => {
    setCurrentView(View.PRICING);
  };

  const openLeaderboard = () => {
    setCurrentView(View.LEADERBOARD);
  };

  const goBack = () => {
    setCurrentView(View.LANDING);
    setSelectedPersona(null);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <nav className="h-16 flex items-center px-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <SynapseLogo className="w-8 h-8 shadow-lg shadow-white/5" />
            <span className="text-xl font-bold tracking-tight">Synapse <span className="text-indigo-400">AI</span></span>
          </div>
        </nav>
        <AuthPage onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      {/* Navigation - hidden in conversation mode if desired, but here we keep it for exit */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 transition-transform duration-500">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={goBack}>
            <SynapseLogo className="w-8 h-8 shadow-lg shadow-white/5" />
            <span className="text-xl font-bold tracking-tight">Synapse <span className="text-indigo-400">AI</span></span>
          </div>
          <div className="flex gap-2 md:gap-4 items-center">
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
              onClick={openLeaderboard}
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all flex items-center gap-2 ${currentView === View.LEADERBOARD ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-slate-800'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              <span className="hidden sm:inline">Leaderboard</span>
            </button>
            <button 
              onClick={openPricing}
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all ${currentView === View.PRICING ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
            >
              Plans
            </button>
            <button 
              onClick={openQuiz}
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all ${currentView === View.QUIZ ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
            >
              Quizzes
            </button>
            <div className="h-8 w-px bg-slate-800 mx-1 hidden md:block"></div>
            <div className="flex items-center gap-2 bg-slate-900 rounded-full pl-1 pr-3 py-1 border border-slate-800">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-6 h-6 rounded-full" />
              <span className="text-xs font-bold hidden sm:inline">{currentUser.name}</span>
              <button 
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-400 transition-colors ml-1"
                title="Logout"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className={`pt-20 pb-12 px-4 max-w-7xl mx-auto transition-all duration-500 ${currentView === View.CONVERSATION ? 'max-w-none px-0 pt-16' : ''}`}>
        {currentView === View.LANDING && (
          <LandingPage onStart={startConversation} onSeePlans={openPricing} />
        )}

        {currentView === View.CONVERSATION && selectedPersona && (
          <ConversationRoom persona={selectedPersona} onExit={goBack} />
        )}

        {currentView === View.QUIZ && (
          <DailyQuiz onSeeLeaderboard={openLeaderboard} />
        )}

        {currentView === View.PRICING && (
          <PricingPage onBack={goBack} />
        )}

        {currentView === View.LEADERBOARD && (
          <Leaderboard onBack={goBack} />
        )}
      </main>

      <footer className="py-8 text-center text-slate-500 text-sm border-t border-slate-900 mt-auto">
        &copy; 2024 Synapse AI. Powered by Gemini. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
