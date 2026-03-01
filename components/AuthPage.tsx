import React, { useState } from 'react';
import { User } from '../types';
import { SynapseLogo } from '../App';
import { mapFirebaseUser, saveSession, signInWithEmail, signUpWithEmail } from '../lib/firebaseAuth';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const syncToLeaderboardPool = (user: User) => {
    const pool = JSON.parse(localStorage.getItem('tm_leaderboard_pool') || '[]');
    const existingIndex = pool.findIndex((u: any) => u.email === user.email);

    if (existingIndex === -1) {
      pool.push({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        xp: 0,
        totalQuizzes: 0
      });
      localStorage.setItem('tm_leaderboard_pool', JSON.stringify(pool));
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    if (!normalizedEmail || !password || (!isLogin && !normalizedName)) {
      setAuthError('Please enter all required fields before continuing.');
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const response = isLogin
        ? await signInWithEmail(normalizedEmail, password)
        : await signUpWithEmail(normalizedEmail, password, normalizedName);

      saveSession(response);
      const user = mapFirebaseUser(response.user);
      syncToLeaderboardPool(user);
      onLogin(user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#312e81_0%,#0b1020_45%,#060913_100%)] flex items-center justify-center px-4 py-10">
      <div className="absolute -top-20 -left-10 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute -bottom-20 -right-10 w-80 h-80 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-2xl shadow-indigo-900/30 p-8 md:p-10">
        <div className="text-center mb-7">
          <div className="inline-flex p-2.5 rounded-2xl bg-white/95 shadow-lg shadow-indigo-900/20 mb-4">
            <SynapseLogo className="w-12 h-12" />
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-indigo-200/80">Node AI Secure Access</p>
          <h1 className="text-3xl md:text-4xl font-semibold mt-2 text-white tracking-tight">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-slate-300 mt-2 text-sm">Professional AI coaching starts with your secure login.</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/70"
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/70"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-slate-950/70 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/70"
              placeholder="••••••••"
            />
          </div>

          {authError && (
            <p className="text-sm rounded-xl border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-rose-200">{authError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-3 font-semibold text-white shadow-lg shadow-indigo-900/40 hover:brightness-110 transition disabled:opacity-60 flex items-center justify-center"
          >
            {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : (isLogin ? 'Sign In Securely' : 'Create Account')}
          </button>
        </form>

        <p className="text-center text-sm text-slate-300 mt-6">
          {isLogin ? "New to NODE AI?" : 'Already have an account?'}
          <button onClick={() => setIsLogin(!isLogin)} className="ml-1 font-semibold text-cyan-300 hover:text-cyan-200 transition-colors">
            {isLogin ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
