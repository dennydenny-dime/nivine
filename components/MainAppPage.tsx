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
          Every Answer. <span className="synapse-gradient">Engineered.</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Choose your interviewer and start training with AI-powered real-time feedback.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-4xl font-bold text-white text-left">Neural Training Modules</h2>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <label className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
              Target Practice Language
            </label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="min-w-[140px] appearance-none rounded-lg border border-white/10 bg-[#1a1a2e] py-2 pl-3 pr-9 text-sm font-medium text-white shadow-[0_10px_30px_rgba(15,23,42,0.25)] transition-all focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10"
              >
                {COMMON_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {PRESET_PERSONAS.map((p, idx) => {
            const moodStyle = MOOD_STYLES[p.mood] ?? MOOD_STYLES.default;

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
                <div className="relative z-10 flex w-full flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-5">
                    <div
                      className="flex min-h-[88px] min-w-[164px] flex-col items-center justify-center rounded-2xl border px-5 py-4 text-center shadow-[0_10px_35px_rgba(15,23,42,0.28)]"
                      style={{
                        borderColor: `${moodStyle.glow}aa`,
                        backgroundColor: `${moodStyle.glow}22`,
                        boxShadow: `0 0 0 1px ${moodStyle.glow}22, 0 0 30px ${moodStyle.glow}22`,
                      }}
                    >
                      <span className="text-[14px] font-black leading-none text-white/90">{p.moduleLabel}</span>
                      <span className="mt-2 text-[26px] font-bold leading-tight text-white">{p.name}</span>
                    </div>

                    <div className="grid flex-1 gap-5 text-sm text-slate-300 md:grid-cols-3">
                      <div>
                        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Role</p>
                        <p className="whitespace-pre-line text-lg font-semibold leading-snug text-white">{p.moduleSubtitle ?? p.role}</p>
                      </div>
                      <div>
                        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Interviewer persona</p>
                        <p className="whitespace-pre-line text-lg font-semibold leading-snug text-white">{p.interviewerPersona ?? p.role}</p>
                      </div>
                      <div>
                        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Why it wins</p>
                        <p className="text-lg font-semibold leading-snug text-white">{p.whyItWins ?? `Start ${p.name}'s neural training module in ${language}.`}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 lg:w-auto lg:flex-col lg:items-end">
                    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] ${moodStyle.badge}`}>
                      {p.mood}
                    </span>
                    <p className={`text-sm font-medium ${moodStyle.link}`}>
                      Start {p.name} in {language}.
                    </p>
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
