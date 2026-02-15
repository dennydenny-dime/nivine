import React, { useEffect, useState } from 'react';
import { Persona } from '../types';
import { PRESET_PERSONAS, COMMON_LANGUAGES, getSystemApiKey } from '../constants';
import { SynapseLogo } from '../App';

interface LandingPageProps {
  onStart: (persona: Persona) => void;
  onSeePlans: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onSeePlans }) => {
  const [language, setLanguage] = useState('English');
  const [hasKey, setHasKey] = useState<boolean>(true);

  useEffect(() => {
    const apiKey = getSystemApiKey();
    setHasKey(!!apiKey && apiKey.length > 0);
  }, []);


  const personaMeta: Record<string, { title: string; description: string }> = {
    Maya: {
      title: 'Ex Recruiter',
      description: 'Runs realistic interviews, checks clarity, and gives direct hiring-focused feedback.'
    },
    Ethan: {
      title: 'Angel Investor',
      description: 'Pushes for crisp business storytelling, traction proof, and confident pitch delivery.'
    },
    Nora: {
      title: 'Company Manager',
      description: 'Practices clear team communication, stakeholder alignment, and calm decision updates.'
    },
    Leo: {
      title: 'Salesman',
      description: 'Trains objection handling, discovery flow, and concise value-first closing language.'
    }
  };

  const handlePresetStart = (persona: Persona) => {
    onStart({ ...persona, difficultyLevel: 5, language });
  };

  return (
    <div className="animate-in fade-in duration-1000 space-y-10">
      <div className="card-premium shiny-outline rounded-3xl p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute -top-24 -right-20 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full"></div>
        <div className="absolute -bottom-24 -left-20 w-64 h-64 bg-cyan-500/20 blur-3xl rounded-full"></div>

        <div className="text-center space-y-6 flex flex-col items-center relative z-10">
          <SynapseLogo className="w-24 h-24 sm:w-28 sm:h-28 synapse-glow shadow-2xl shadow-white/5" />
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Pick Your <span className="gradient-text">Conversation Coach</span>
          </h1>
          <p className="text-lg text-slate-300/90 max-w-3xl mx-auto leading-relaxed">
            Four practical, job-focused coaches only: Ex-Recruiter, Angel Investor, Company Manager, and Salesman.
            They are tuned for realistic, human-like conversations with direct and respectful feedback.
          </p>

          <div className="relative inline-block w-64 mt-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Practice Language</label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full appearance-none bg-slate-900 border border-slate-700 text-white py-3 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold text-center"
              >
                {COMMON_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

          <button
            onClick={onSeePlans}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 font-bold text-sm cta-glow transition-all"
          >
            View Plans
          </button>
        </div>
      </div>

      {!hasKey && (
        <div className="card-premium rounded-2xl p-5 border border-amber-500/30 text-center">
          <p className="text-amber-300 font-semibold">API key missing.</p>
          <p className="text-sm text-slate-400 mt-1">Set <code>VITE_API_KEY</code> (or <code>REACT_APP_API_KEY</code>) to start live sessions.</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <span className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
            Training Personas
          </h2>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{language} Mode</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESET_PERSONAS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetStart(p)}
              className="p-6 card-premium rounded-2xl text-left hover:-translate-y-0.5 hover:border-blue-500/50 transition-all duration-300 group"
            >
              <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-black mb-1.5">{p.mood}</div>
              <h3 className="text-lg font-bold group-hover:text-blue-400 transition-colors">{personaMeta[p.name]?.title || p.role}</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{personaMeta[p.name]?.description || p.role}</p>
              <p className="text-xs text-slate-500 mt-3">Coach: {p.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
