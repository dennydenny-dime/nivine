import React, { useEffect, useState } from 'react';
import { ConversationHistoryItem, User, UserStats } from '../types';
import { getUserConversationHistory, getUserStats } from '../lib/userStorage';

interface PersonalDashboardProps {
  currentUser: User;
  onContinueTraining: () => void;
}

const getRingOffset = (score: number, radius = 52) => {
  const circumference = 2 * Math.PI * radius;
  return circumference - (Math.max(0, Math.min(score, 100)) / 100) * circumference;
};

const AnimatedMetric: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '' }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 700;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(value * progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className="metric-counter">{display}{suffix}</span>;
};

const PersonalDashboard: React.FC<PersonalDashboardProps> = ({ currentUser, onContinueTraining }) => {
  const userStats: UserStats = getUserStats(currentUser.id);
  const userHistory: ConversationHistoryItem[] = getUserConversationHistory(currentUser.id);
  const latestSession = userHistory[0];
  const score = latestSession?.scoreCard;

  const confidenceScore = score?.confidenceScore ?? 0;
  const clarityScore = score?.clarityScore ?? 0;
  const fillerCount = score?.fillerCount ?? 0;
  const pressureHandling = Math.max(0, Math.min(100, (score?.overallScore ?? 0) + 8));
  const speakingSpeed = latestSession
    ? Math.round((score?.totalWords ?? 0) / Math.max(1, (latestSession.transcriptions.at(-1)?.timestamp ?? Date.now()) - latestSession.transcriptions[0].timestamp) * 60000)
    : 0;
  const structureScore = Math.max(0, Math.min(100, Math.round((score?.concisenessScore ?? 0) * 9.5)));

  return (
    <section className="premium-panel rounded-[2rem] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Cognitive Intelligence Console</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#ededed]">Cognitive Performance Profile</h2>
          <p className="mt-2 text-sm text-[#8a8f98]">Scientific breakdown of composure, language control, and reasoning architecture.</p>
        </div>
        <button onClick={onContinueTraining} className="rounded-xl border border-white/20 bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-slate-100">
          Start Next Session
        </button>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        <div className="premium-panel premium-glow-active rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Confidence Score</p>
          <div className="mt-4 flex justify-center">
            <svg viewBox="0 0 140 140" className="h-36 w-36">
              <circle cx="70" cy="70" r="52" className="fill-none stroke-slate-700" strokeWidth="10" />
              <circle cx="70" cy="70" r="52" className="fill-none stroke-indigo-400" strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={getRingOffset(confidenceScore)} transform="rotate(-90 70 70)" />
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-slate-100 text-3xl font-semibold">{confidenceScore}</text>
            </svg>
          </div>
        </div>

        <div className="premium-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Clarity Index</p>
          <div className="mt-4 h-2 rounded-full bg-slate-700">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" style={{ width: `${Math.max(0, Math.min(clarityScore, 100))}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-slate-500">Filler Frequency</p>
              <p className="mt-1 text-2xl font-semibold text-[#ededed]"><AnimatedMetric value={fillerCount} /></p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-slate-500">Speaking Speed</p>
              <p className="mt-1 text-2xl font-semibold text-[#ededed]"><AnimatedMetric value={speakingSpeed || 0} /> <span className="text-xs text-slate-500">WPM</span></p>
            </div>
          </div>
        </div>

        <div className="premium-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Cognitive Structure</p>
          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-400"><span>Logical sequencing</span><span>{structureScore}%</span></div>
              <div className="h-2 rounded-full bg-slate-700"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${structureScore}%` }} /></div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-400"><span>Pressure response rating</span><span>{pressureHandling}%</span></div>
              <div className="h-2 rounded-full bg-slate-700"><div className="h-full rounded-full bg-violet-400" style={{ width: `${pressureHandling}%` }} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#8a8f98]">
        {latestSession
          ? `${new Date(latestSession.date).toLocaleDateString()} · ${latestSession.persona.name} · overall ${score?.overallScore ?? '--'} · clarity ${clarityScore} · confidence ${confidenceScore}`
          : 'No session data yet. Complete one AI interview to populate your profile.'}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-500">Total XP</p><p className="mt-1 text-xl font-semibold"><AnimatedMetric value={userStats.totalXP} /></p></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-500">Quizzes</p><p className="mt-1 text-xl font-semibold"><AnimatedMetric value={userStats.totalQuizzes} /></p></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-500">Avg Quiz Score</p><p className="mt-1 text-xl font-semibold"><AnimatedMetric value={userStats.avgRating} suffix="%" /></p></div>
      </div>
    </section>
  );
};

export default PersonalDashboard;
