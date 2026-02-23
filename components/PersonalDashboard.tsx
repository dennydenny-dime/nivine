import React from 'react';
import { ConversationHistoryItem, User, UserStats } from '../types';
import { getUserConversationHistory, getUserStats } from '../lib/userStorage';

interface PersonalDashboardProps {
  currentUser: User;
  onContinueTraining: () => void;
}

const PersonalDashboard: React.FC<PersonalDashboardProps> = ({ currentUser, onContinueTraining }) => {
  const userStats: UserStats = getUserStats(currentUser.id);
  const userHistory: ConversationHistoryItem[] = getUserConversationHistory(currentUser.id);
  const latestSession = userHistory[0];
  const averageConversationScore = userHistory.length
    ? Math.round(
      (userHistory.reduce((sum, item) => sum + (item.scoreCard?.overallScore || 0), 0) / userHistory.length) * 10,
    ) / 10
    : 0;

  return (
    <section className="rounded-3xl border border-indigo-500/30 bg-slate-900/70 p-6 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Personal Dashboard</p>
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black">Welcome back, {currentUser.name.split(' ')[0]}.</h2>
          <p className="text-slate-400 mt-1">Your progress is private to your account and updates every time you train.</p>
        </div>
        <button
          onClick={onContinueTraining}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
        >
          Continue Training
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Total XP</p>
          <p className="text-2xl font-bold mt-2">{userStats.totalXP.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Quizzes Completed</p>
          <p className="text-2xl font-bold mt-2">{userStats.totalQuizzes}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Average Quiz Score</p>
          <p className="text-2xl font-bold mt-2">{userStats.avgRating}%</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Conversation Score</p>
          <p className="text-2xl font-bold mt-2">{averageConversationScore || '--'}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Latest Session</p>
        {latestSession ? (
          <p className="text-slate-300 mt-2">
            {new Date(latestSession.date).toLocaleDateString()} · {latestSession.persona.name} ({latestSession.persona.role}) · Score {latestSession.scoreCard?.overallScore || '--'}
          </p>
        ) : (
          <p className="text-slate-400 mt-2">No sessions yet. Start your first role-play to build your personal dashboard.</p>
        )}
      </div>
    </section>
  );
};

export default PersonalDashboard;
