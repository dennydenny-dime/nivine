import React, { useEffect, useMemo, useState } from 'react';
import { Persona, Gender, Mood } from '../types';
import { COMMON_LANGUAGES, MOODS, getSystemApiKey } from '../constants';
import { PlanAccess, SubscriptionTier } from '../lib/subscription';

interface CustomCoachPageProps {
  onStart: (persona: Persona) => void;
  tier: SubscriptionTier;
  planAccess: PlanAccess;
  coachingRemainingCalls: number | null;
  coachingResetHoursRemaining?: number;
  showPlanAccess?: boolean;
}

const CustomCoachPage: React.FC<CustomCoachPageProps> = ({
  onStart,
  tier,
  planAccess,
  coachingRemainingCalls,
  coachingResetHoursRemaining = 0,
  showPlanAccess = true,
}) => {
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

  const planSummary = useMemo(() => {
    if (!planAccess.customCoachEnabled) {
      return 'Upgrade to Pro or above to unlock Custom Coach sessions.';
    }

    if (planAccess.unlimitedCustomCoaches || coachingRemainingCalls === null) {
      return 'Your plan includes custom coach access tailored to your organization setup.';
    }

    if (planAccess.coachingResetHours) {
      return coachingRemainingCalls > 0
        ? `1 complimentary Custom Coach session every 24 hours · ${planAccess.coachingMaxMinutesPerCall} minutes per session · Ready to use now`
        : `1 complimentary Custom Coach session every 24 hours · ${planAccess.coachingMaxMinutesPerCall} minutes per session · Next free session unlocks 24 hours after your last one`;
    }

    const sessionLabel = planAccess.coachingMonthlyCallLimit === 1 ? 'session' : 'sessions';
    const remainingLabel = coachingRemainingCalls === 1 ? 'session' : 'sessions';
    return `${planAccess.coachingMonthlyCallLimit} ${sessionLabel} per month · ${planAccess.coachingMaxMinutesPerCall} minutes each · ${coachingRemainingCalls} ${remainingLabel} remaining this month`;
  }, [coachingRemainingCalls, planAccess]);

  const tierLabel = tier === 'premium' ? 'Pro' : tier === 'elite' ? 'Elite' : tier === 'team' ? 'Teams' : 'Free';

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
      <style>{`
        .custom-coach-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 10px;
          border-radius: 9999px;
          background: linear-gradient(90deg, rgba(99,102,241,0.95), rgba(168,85,247,0.95));
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 30px rgba(99,102,241,0.18);
        }
        .custom-coach-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #ffffff, #c7d2fe);
          border: 2px solid rgba(99,102,241,0.95);
          box-shadow: 0 0 0 6px rgba(99,102,241,0.15), 0 0 28px rgba(129,140,248,0.65);
          cursor: pointer;
        }
        .custom-coach-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #ffffff, #c7d2fe);
          border: 2px solid rgba(99,102,241,0.95);
          box-shadow: 0 0 0 6px rgba(99,102,241,0.15), 0 0 28px rgba(129,140,248,0.65);
          cursor: pointer;
        }
      `}</style>
      <div className="text-center mb-12 space-y-6 flex flex-col items-center">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Custom Coach Studio</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
            Build Your <span className="synapse-gradient">Custom Coach</span>
          </h1>
        </div>
        <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto leading-relaxed">
          Shape the personality, communication style, and challenge level of a dedicated AI coach in a premium workspace designed for focused interview practice.
        </p>
        {showPlanAccess && (
          <div className="inline-flex max-w-3xl flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/80 shadow-[0_20px_80px_rgba(79,70,229,0.18)] backdrop-blur-xl">
            <span className="text-[11px] font-black uppercase tracking-[0.32em] text-indigo-400">{tierLabel} plan access</span>
            <span>{planSummary}</span>
          </div>
        )}
        {tier === 'free' && (
          <div className="max-w-2xl rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-50 shadow-lg shadow-amber-500/10 backdrop-blur-xl">
            <p className="font-semibold">
              Free plan users receive 1 complimentary Custom Coach session of 7 minutes every 24 hours.
            </p>
            <p className="mt-1 text-amber-100/90">
              {coachingResetHoursRemaining > 0
                ? 'Your next free session will resume 24 hours after your last session started. Upgrade to Pro to continue practicing immediately.'
                : 'Your complimentary session is available now. Upgrade to Pro for longer sessions and uninterrupted practice.'}
            </p>
          </div>
        )}
      </div>

      <div className="relative max-w-4xl mx-auto overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_0_80px_rgba(99,102,241,0.15)] backdrop-blur-xl min-h-[560px] flex flex-col transition-all duration-500">
        <div className="pointer-events-none absolute -left-12 -top-12 h-56 w-56 rounded-full bg-purple-500 opacity-20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-16 -right-8 h-64 w-64 rounded-full bg-indigo-500 opacity-20 blur-[120px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="relative z-10 flex items-center justify-between mb-10 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-indigo-400 mb-3">Configuration flow</p>
            <h2 className="text-3xl font-bold tracking-tight text-white">Custom Coach</h2>
            <p className="text-sm text-white/60 mt-2">Network Config Step {step} / 2</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-2 backdrop-blur-md">
            <div className={`h-2 rounded-full transition-all duration-500 ${step >= 1 ? 'w-10 bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_18px_rgba(99,102,241,0.55)]' : 'w-6 bg-white/10'}`}></div>
            <div className={`h-2 rounded-full transition-all duration-500 ${step >= 2 ? 'w-10 bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_18px_rgba(99,102,241,0.55)]' : 'w-6 bg-white/10'}`}></div>
          </div>
        </div>

        <div className="relative z-10 flex-1">
          {!hasKey ? (
            <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl animate-pulse border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(99,102,241,0.24)] backdrop-blur-xl">🔑</div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-white mb-2">Connect API Key to Start Engine</h3>
                <p className="text-sm text-white/60 leading-relaxed max-w-xs">Engine startup is blocked because no API key was found in the environment variables.</p>
              </div>
              <div className="max-w-md rounded-2xl border border-white/10 bg-black/20 p-4 text-[10px] font-mono text-white/60 break-all text-left backdrop-blur-md">
                <p className="mb-2 font-bold text-white/80">Vercel Configuration:</p>
                Add <span className="text-indigo-300">VITE_API_KEY</span>, <span className="text-indigo-300">GEMINI_API_KEY</span>, or <span className="text-indigo-300">REACT_APP_API_KEY</span> to your Project Settings.
              </div>
            </div>
          ) : (
            <div className="space-y-6 h-full flex flex-col">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col flex-1">
                  <div className="rounded-3xl border border-white/10 bg-black/10 p-5 backdrop-blur-md">
                    <label className="block text-xs uppercase tracking-[0.32em] text-indigo-400 mb-3">Coach Description & Role</label>
                    <textarea
                      placeholder="Describe the person you are talking to and the context of the conversation..."
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      rows={4}
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-3xl border border-white/10 bg-black/10 p-5 backdrop-blur-md">
                      <label className="block text-xs uppercase tracking-[0.32em] text-indigo-400 mb-3">Persona Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sarah"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300"
                      />
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-black/10 p-5 backdrop-blur-md">
                      <label className="block text-xs uppercase tracking-[0.32em] text-indigo-400 mb-3">Primary Mood</label>
                      <select
                        value={mood}
                        onChange={(e) => setMood(e.target.value as Mood)}
                        className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300"
                      >
                        {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/10 p-5 backdrop-blur-md">
                    <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-center mb-4">
                      <label className="text-xs uppercase tracking-[0.32em] text-indigo-400">Communication Hardness (1-10)</label>
                      <span className="text-xs font-semibold text-white/80">{difficultyLevel} · <span className="text-indigo-300">{getIntensityLabel(difficultyLevel)}</span></span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={difficultyLevel}
                      onChange={(e) => setDifficultyLevel(parseInt(e.target.value))}
                      className="custom-coach-slider w-full cursor-pointer transition-all duration-300"
                    />
                  </div>

                  <div className="mt-auto rounded-3xl border border-white/10 bg-black/10 p-5 backdrop-blur-md">
                    <label className="block text-xs uppercase tracking-[0.32em] text-indigo-400 mb-3">Voice Frequency (Gender)</label>
                    <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1.5 gap-1.5">
                      <button
                        onClick={() => setGender('Male')}
                        className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 ${gender === 'Male' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-[0_10px_30px_rgba(99,102,241,0.35)]' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
                      >
                        <span className="text-lg">♂</span> Masculine
                      </button>
                      <button
                        onClick={() => setGender('Female')}
                        className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 ${gender === 'Female' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-[0_10px_30px_rgba(99,102,241,0.35)]' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
                      >
                        <span className="text-lg">♀</span> Feminine
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!customDescription.trim() || !name.trim()}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 font-bold text-lg text-white transition-all duration-300 shadow-[0_20px_60px_rgba(99,102,241,0.35)] hover:scale-[1.01] hover:shadow-[0_20px_80px_rgba(99,102,241,0.45)] disabled:opacity-50 disabled:hover:scale-100"
                  >
                    Finalize Setup →
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                  <div className="text-center py-6 rounded-3xl border border-white/10 bg-black/10 backdrop-blur-md">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl border border-white/10 bg-white/5 text-indigo-300 shadow-[0_0_30px_rgba(99,102,241,0.25)]">🌍</div>
                    <p className="text-xs uppercase tracking-[0.32em] text-indigo-400 mb-3">Language Layer</p>
                    <h3 className="text-2xl font-bold tracking-tight text-white">Linguistic Origin</h3>
                    <p className="text-sm text-white/60 mt-2">The synapse will initialize in this language, but understands all dialects.</p>
                  </div>

                  <div className="flex-1 flex flex-col justify-center rounded-3xl border border-white/10 bg-black/10 p-6 backdrop-blur-md">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-center text-lg font-medium text-white appearance-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300"
                    >
                      {COMMON_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                    <p className="text-[11px] text-white/45 text-center mt-4 uppercase tracking-[0.32em] font-black">Dynamic Polyglot Engine: Active</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mt-4 backdrop-blur-md">
                    <div className="flex items-center gap-3 text-sm text-white/65">
                      <span className="flex-shrink-0 w-8 h-8 bg-indigo-500/15 text-indigo-300 rounded-full flex items-center justify-center text-xs border border-indigo-400/20">✨</span>
                      <span><b className="text-white">Synapse Ready:</b> The coach stays in the selected language and only switches when you explicitly ask it to.</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto pt-8">
                    <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl border border-white/10 bg-white/5 font-bold text-white/70 hover:bg-white/10 transition-all duration-300">Back</button>
                    <button
                      onClick={handleStartSession}
                      className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 font-bold text-lg text-white transition-all duration-300 shadow-[0_20px_60px_rgba(99,102,241,0.35)] hover:scale-[1.01] hover:shadow-[0_20px_80px_rgba(99,102,241,0.45)]"
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
