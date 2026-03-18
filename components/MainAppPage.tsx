import React, { useState } from 'react';
import { Persona } from '../types';
import { PRESET_PERSONAS, COMMON_LANGUAGES } from '../constants';
import { SynapseLogo } from '../App';

interface MainAppPageProps {
  onStart: (persona: Persona) => void;
}

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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <span className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
            Neural Training Modules
          </h2>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{language} Mode</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_PERSONAS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetStart(p)}
              className="p-6 glass rounded-2xl text-left hover:border-blue-500/50 hover:bg-slate-900/50 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-pink-400 font-black">{p.mood}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">NTM {idx + 1}</div>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{p.name}</h3>
              <p className="text-sm text-slate-400 mt-1">{p.role}</p>
              <p className="text-sm text-slate-500 mt-3">Start {p.name}'s neural training module in {language}.</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MainAppPage;
