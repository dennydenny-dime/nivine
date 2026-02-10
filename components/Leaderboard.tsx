
import React, { useMemo } from 'react';
import { LeaderboardEntry, UserStats, User } from '../types';

interface LeaderboardProps {
  onBack: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
  const currentUser: User = JSON.parse(localStorage.getItem('tm_current_user') || '{}');
  const userStats: UserStats = JSON.parse(localStorage.getItem('tm_user_stats') || '{"totalXP":0,"totalQuizzes":0,"avgRating":0}');

  const globalRankings: LeaderboardEntry[] = useMemo(() => {
    // Get all real users from the pool
    const pool = JSON.parse(localStorage.getItem('tm_leaderboard_pool') || '[]');
    
    // Convert pool to leaderboard entries and sort by XP
    const sorted = pool
      .map((user: any) => ({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        xp: user.xp || 0,
        rank: 0,
        isCurrentUser: user.email === currentUser.email
      }))
      .sort((a: any, b: any) => b.xp - a.xp);

    // Assign ranks
    return sorted.map((entry: any, index: number) => ({ ...entry, rank: index + 1 }));
  }, [currentUser]);

  const userRankEntry = globalRankings.find(e => e.isCurrentUser);
  const userRank = userRankEntry?.rank || 0;
  const totalCompetitors = globalRankings.length;
  const percentile = totalCompetitors > 0 
    ? Math.max(1, Math.round((1 - userRank / totalCompetitors) * 100)) 
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight">Global <span className="gradient-text">Rankings</span></h2>
          <p className="text-slate-400 mt-2">Practice more to climb the world stage. Real users only.</p>
        </div>
        <button 
          onClick={onBack}
          className="px-6 py-2 bg-slate-900 border border-slate-800 rounded-full hover:bg-slate-800 transition-all text-xs font-bold uppercase tracking-widest flex-shrink-0"
        >
          Back Home
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 shadow-2xl shadow-indigo-500/20 text-white relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
            <div className="relative z-10">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-70 mb-1">Your Rank</h3>
              <div className="text-6xl font-black italic">{userRank > 0 ? `#${userRank}` : '--'}</div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
                  {totalCompetitors > 1 ? `Top ${100 - percentile}%` : 'Newcomer'}
                </span>
                <span className="text-xs opacity-70">Worldwide</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Your Progress</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Total XP</span>
                <span className="font-bold text-white">{userStats.totalXP.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Avg Rating</span>
                <span className="font-bold text-white">{userStats.avgRating}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Quizzes Done</span>
                <span className="font-bold text-white">{userStats.totalQuizzes}</span>
              </div>
              <div className="pt-2">
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                   <div 
                    className="h-full bg-indigo-500 transition-all duration-1000" 
                    style={{ width: `${(userStats.totalXP % 1000) / 10}%` }}
                   ></div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-600 uppercase">
                  <span>Level {Math.floor(userStats.totalXP / 1000)}</span>
                  <span>{1000 - (userStats.totalXP % 1000)} XP to Next Rank</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl min-h-[400px]">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Ranking ({totalCompetitors})</span>
              <span className="text-xs font-bold text-indigo-400">Verified Sessions</span>
            </div>
            
            {globalRankings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-lg font-bold text-slate-300">Leaderboard Empty</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xs">Be the first to complete a Daily Quiz and claim the #1 spot in the world!</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto scrollbar-hide">
                {globalRankings.map((entry) => (
                  <div 
                    key={entry.id}
                    className={`flex items-center gap-4 p-5 border-b border-slate-800/50 hover:bg-slate-800/30 transition-all ${entry.isCurrentUser ? 'bg-indigo-500/10 border-indigo-500/30 relative' : ''}`}
                  >
                    <div className="w-8 flex justify-center shrink-0">
                      {entry.rank === 1 ? (
                        <span className="text-2xl" title="Gold">🥇</span>
                      ) : entry.rank === 2 ? (
                        <span className="text-2xl" title="Silver">🥈</span>
                      ) : entry.rank === 3 ? (
                        <span className="text-2xl" title="Bronze">🥉</span>
                      ) : (
                        <span className="font-black text-slate-600 text-lg">#{entry.rank}</span>
                      )}
                    </div>
                    
                    <img src={entry.avatar} alt={entry.name} className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700" />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate flex items-center gap-2">
                        {entry.name}
                        {entry.isCurrentUser && (
                          <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">You</span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500">Master Level {Math.floor(entry.xp / 1000)}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-indigo-400">{entry.xp.toLocaleString()}</div>
                      <div className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Total XP</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
