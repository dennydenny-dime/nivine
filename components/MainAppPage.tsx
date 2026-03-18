import React, { useState } from 'react';
import { Persona } from '../types';
import { PRESET_PERSONAS, COMMON_LANGUAGES } from '../constants';
import { SynapseLogo } from '../App';

interface MainAppPageProps {
  onStart: (persona: Persona) => void;
}

const MOOD_STYLES: Record<string, { glow: string; badge: string; link: string }> = {
  Formal: {
    glow: '#2563eb',
    badge: 'bg-blue-500/15 text-blue-300 border border-blue-400/30',
    link: 'text-blue-300',
  },
  Challenging: {
    glow: '#f97316',
    badge: 'bg-orange-500/15 text-orange-300 border border-orange-400/30',
    link: 'text-orange-300',
  },
  Strict: {
    glow: '#ef4444',
    badge: 'bg-red-500/15 text-red-300 border border-red-400/30',
    link: 'text-red-300',
  },
  default: {
    glow: '#7c3aed',
    badge: 'bg-purple-500/15 text-purple-300 border border-purple-400/30',
    link: 'text-purple-300',
  },
};

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join('');

const MainAppPage: React.FC<MainAppPageProps> = ({ onStart }) => {
  const [language, setLanguage] = useState('English');

  const handlePresetStart = (p: Persona) => {
    onStart({ ...p, difficultyLevel: 5, language });
  };

  return (
    <div className="animate-in fade-in duration-1000">
      <div className="text-center mb-12 space-y-6 flex flex-col items-center">
        <div className="relative group">
          <div className="absolute -inset-4 bg-white/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
          <SynapseLogo className="w-24 h-24 sm:w-32 sm:h-32 relative synapse-glow mb-4 transform group-hover:scale-105 transition duration-500 shadow-2xl shadow-white/5" />
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          Master Your <span className="synapse-gradient">Communication</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Choose a neural training module and practice with focused scenarios in your target language.
        </p>

        <div className="relative inline-block w-64 mt-4">
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Target Practice Language</label>
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
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-4xl font-bold text-white text-left">Neural Training Modules</h2>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{language} Mode</span>
        </div>
        <div className="space-y-4">
          {PRESET_PERSONAS.map((p, idx) => {
            const moodStyle = MOOD_STYLES[p.mood] ?? MOOD_STYLES.default;
            const initials = getInitials(p.name);

            return (
              <button
                key={idx}
                onClick={() => handlePresetStart(p)}
                className="relative flex min-h-[180px] w-full overflow-hidden rounded-2xl border bg-[#1a1a2e] p-8 text-left transition-transform duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/20"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div
                  className="pointer-events-none absolute right-12 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full blur-3xl"
                  style={{ backgroundColor: moodStyle.glow, opacity: 0.32 }}
                />
                <div className="relative z-10 flex w-full items-center justify-between gap-6">
                  <div className="flex max-w-2xl flex-1 flex-col justify-center">
                    <span className={`mb-4 inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] ${moodStyle.badge}`}>
                      {p.mood}
                    </span>
                    <h3 className="text-[28px] font-bold leading-tight text-white">{p.name}</h3>
                    <p className="mt-2 text-base text-slate-400">{p.role}</p>
                    <p className={`mt-6 text-sm font-medium ${moodStyle.link}`}>
                      Start {p.name}'s neural training module in {language}.
                    </p>
                  </div>

                  <div className="relative z-10 flex h-full shrink-0 items-center justify-center pr-2">
                    <div
                      className="absolute right-2 h-32 w-32 rounded-full blur-2xl"
                      style={{ backgroundColor: moodStyle.glow, opacity: 0.45 }}
                    />
                    <div
                      className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-3xl font-bold text-white shadow-[0_10px_35px_rgba(15,23,42,0.45)]"
                      style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 0 40px ${moodStyle.glow}55` }}
                    >
                      {initials}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MainAppPage;
