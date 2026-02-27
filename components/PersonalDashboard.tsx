import React from 'react';
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
    <section className="rounded-3xl border border-slate-800 bg-[#111827]/70 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Feedback Dashboard</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-100">Cognitive Performance Profile</h2>
          <p className="mt-2 text-sm text-slate-400">A scientific summary of your interview behavior under pressure.</p>
        </div>
        <button onClick={onContinueTraining} className="rounded-xl border border-blue-400/40 bg-blue-500/90 px-5 py-2.5 text-sm font-medium text-slate-50">
          Start Next Session
        </button>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Confidence Score</p>
          <div className="mt-4 flex justify-center">
            <svg viewBox="0 0 140 140" className="h-36 w-36">
              <circle cx="70" cy="70" r="52" className="fill-none stroke-slate-700" strokeWidth="10" />
              <circle cx="70" cy="70" r="52" className="fill-none stroke-blue-400" strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={getRingOffset(confidenceScore)} transform="rotate(-90 70 70)" />
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-slate-100 text-3xl font-semibold">{confidenceScore}</text>
            </svg>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Clarity Score</p>
          <div className="h-2 rounded-full bg-slate-700">
            <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.max(0, Math.min(clarityScore, 100))}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-slate-800 bg-[#0B0F14] p-3">
              <p className="text-xs text-slate-500">Filler Words</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{fillerCount}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0B0F14] p-3">
              <p className="text-xs text-slate-500">Speaking Speed</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{speakingSpeed || '--'} <span className="text-xs text-slate-500">WPM</span></p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Response Structure</p>
          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-400"><span>Logical sequencing</span><span>{structureScore}%</span></div>
              <div className="h-2 rounded-full bg-slate-700"><div className="h-full rounded-full bg-blue-400" style={{ width: `${structureScore}%` }} /></div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-400"><span>Pressure handling</span><span>{pressureHandling}%</span></div>
              <div className="h-2 rounded-full bg-slate-700"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${pressureHandling}%` }} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Session Overview</p>
        {latestSession ? (
          <p className="mt-2 text-sm text-slate-300">
            {new Date(latestSession.date).toLocaleDateString()} · {latestSession.persona.name} · Overall {score?.overallScore ?? '--'} · Clarity {clarityScore} · Confidence {confidenceScore}
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No session data yet. Complete one AI interview to populate your profile.</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0B0F14] p-3"><p className="text-xs text-slate-500">Total XP</p><p className="mt-1 text-xl font-semibold">{userStats.totalXP.toLocaleString()}</p></div>
        <div className="rounded-xl border border-slate-800 bg-[#0B0F14] p-3"><p className="text-xs text-slate-500">Quizzes</p><p className="mt-1 text-xl font-semibold">{userStats.totalQuizzes}</p></div>
        <div className="rounded-xl border border-slate-800 bg-[#0B0F14] p-3"><p className="text-xs text-slate-500">Average Quiz Score</p><p className="mt-1 text-xl font-semibold">{userStats.avgRating}%</p></div>
      </div>
    </section>
  );
};

export default PersonalDashboard;
