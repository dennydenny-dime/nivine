import React, { useEffect, useState } from 'react';
import { Persona, Gender, Mood } from '../types';
import { COMMON_LANGUAGES, MOODS, getSystemApiKey } from '../constants';
import { SynapseLogo } from '../App';

interface CustomCoachPageProps {
  onStart: (persona: Persona) => void;
}

const CustomCoachPage: React.FC<CustomCoachPageProps> = ({ onStart }) => {
  const [step, setStep] = useState(1);
  const [customDescription, setCustomDescription] = useState('');
  const [gender, setGender] = useState<Gender>('Female');
  const [mood, setMood] = useState<Mood>('Friendly');
  const [difficultyLevel, setDifficultyLevel] = useState(5);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('English');
  const [hasKey, setHasKey] = useState<boolean>(true);

  useEffect(() => {
    const apiKey = getSystemApiKey();
    setHasKey(!!apiKey && apiKey.length > 0);
  }, []);

  const handleStartSession = () => {
    if (!customDescription.trim() && !name.trim()) return;
    onStart({
      name: name || 'AI Coach',
      role: customDescription || 'Personalized Mentor',
      mood,
      gender,
      language,
      difficultyLevel,
    });
  };

  const getIntensityLabel = (val: number) => {
    if (val <= 2) return 'Serene & Gentle';
    if (val <= 4) return 'Friendly Support';
    if (val <= 6) return 'Balanced Professional';
    if (val <= 8) return 'Strict & Demanding';
    return 'High-Pressure Mastery';
  };

  return (
    <div className="animate-in fade-in duration-1000">
      <div className="text-center mb-12 space-y-6 flex flex-col items-center">
        <div className="relative group">
          <div className="absolute -inset-4 bg-white/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
          <SynapseLogo className="w-24 h-24 sm:w-32 sm:h-32 relative synapse-glow mb-4 transform group-hover:scale-105 transition duration-500 shadow-2xl shadow-white/5" />
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          Build Your <span className="synapse-gradient">Custom Coach</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Configure personality, tone, language, and challenge level in a dedicated custom coach workflow.
        </p>
      </div>

      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl synapse-glow min-h-[500px] flex flex-col transition-all duration-500">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold">Custom Coach</h2>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Network Config Step {step} / 2</p>
          </div>
          <div className="flex gap-2">
            <div className={`w-3 h-1.5 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-blue-500 w-6' : 'bg-slate-700'}`}></div>
            <div className={`w-3 h-1.5 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-blue-500 w-6' : 'bg-slate-700'}`}></div>
          </div>
        </div>

        <div className="flex-1">
          {!hasKey ? (
            <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-6">
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-3xl animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.2)]">🔑</div>
              <div>
                <h3 className="text-xl font-bold mb-2">API Key Missing</h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-xs">The API Key was not found in the environment variables.</p>
              </div>
              <div className="p-4 bg-slate-950 rounded-lg text-[10px] font-mono text-slate-500 break-all border border-slate-800 text-left">
                <p className="mb-2 font-bold text-slate-400">Vercel Configuration:</p>
                Add <span className="text-indigo-400">VITE_API_KEY</span>, <span className="text-indigo-400">GEMINI_API_KEY</span>, or <span className="text-indigo-400">REACT_APP_API_KEY</span> to your Project Settings.
              </div>
            </div>
          ) : (
            <div className="space-y-6 h-full flex flex-col">
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col flex-1">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Coach Description & Role</label>
                    <textarea
                      placeholder="Describe the person you are talking to and the context of the conversation..."
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Persona Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sarah"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Primary Mood</label>
                      <select
                        value={mood}
                        onChange={(e) => setMood(e.target.value as Mood)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm appearance-none"
                      >
                        {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Communication Hardness (1-10)</label>
                      <span className="text-[10px] font-bold text-blue-400">{difficultyLevel} - {getIntensityLabel(difficultyLevel)}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={difficultyLevel}
                      onChange={(e) => setDifficultyLevel(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-800">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Voice Frequency (Gender)</label>
                    <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1">
                      <button
                        onClick={() => setGender('Male')}
                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${gender === 'Male' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-400'}`}
                      >
                        <span className="text-lg">♂</span> Masculine
                      </button>
                      <button
                        onClick={() => setGender('Female')}
                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${gender === 'Female' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-400'}`}
                      >
                        <span className="text-lg">♀</span> Feminine
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!customDescription.trim() || !name.trim()}
                    className="w-full py-4 bg-blue-600 rounded-xl font-bold text-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
                  >
                    Finalize Setup →
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl synapse-glow">🌍</div>
                    <h3 className="text-xl font-bold">Linguistic Origin</h3>
                    <p className="text-sm text-slate-400 mt-2">The synapse will initialize in this language, but understands all dialects.</p>
                  </div>

                  <div className="flex-1 flex flex-col justify-center">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none text-center text-lg font-medium"
                    >
                      {COMMON_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                    <p className="text-[10px] text-slate-500 text-center mt-3 uppercase tracking-widest font-black">Dynamic Polyglot Engine: Active</p>
                  </div>

                  <div className="bg-slate-950/50 border border-slate-800/50 p-4 rounded-2xl mt-4">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center text-[10px]">✨</span>
                      <span><b>Synapse Ready:</b> The coach will automatically detect and respond to any language shifts during your session.</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto pt-8">
                    <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-800 rounded-xl font-bold text-slate-400 hover:bg-slate-700 transition-all">Back</button>
                    <button
                      onClick={handleStartSession}
                      className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-lg hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25"
                    >
                      Engage Neural Link
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomCoachPage;
