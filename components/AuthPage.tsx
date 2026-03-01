import React, { useState } from 'react';
import { User } from '../types';
import { SynapseLogo } from '../App';
import { mapFirebaseUser, saveSession, signInWithEmail, signInWithGoogle, signUpWithEmail } from '../lib/firebaseAuth';

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


  const handleGoogleAuth = async () => {
    setLoading(true);
    setAuthError(null);

    try {
      const response = await signInWithGoogle();

      if (!response) {
        setAuthError('Redirecting to Google sign-in… complete authentication in the opened tab/window.');
        return;
      }

      saveSession(response);
      const user = mapFirebaseUser(response.user);
      syncToLeaderboardPool(user);
      onLogin(user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google authentication failed.');
    } finally {
      setLoading(false);
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

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/15" />
            </div>
            <span className="relative block mx-auto w-fit bg-transparent px-3 text-xs uppercase tracking-[0.2em] text-slate-400">Or</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full rounded-xl border border-white/25 bg-white/10 py-3 font-semibold text-white hover:bg-white/20 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.3-1.9 3l3 2.3c1.8-1.6 2.8-4 2.8-6.9 0-.7-.1-1.4-.2-2H12z" />
              <path fill="#34A853" d="M12 21c2.7 0 5-0.9 6.7-2.5l-3-2.3c-.8.6-2 1-3.6 1-2.8 0-5.2-1.9-6-4.5l-3.1 2.4C4.8 18.6 8.1 21 12 21z" />
              <path fill="#4A90E2" d="M6 12c0-.8.1-1.5.4-2.2L3.3 7.4C2.5 8.9 2 10.4 2 12s.5 3.1 1.3 4.6l3.1-2.4C6.1 13.5 6 12.8 6 12z" />
              <path fill="#FBBC05" d="M12 6.8c1.5 0 2.8.5 3.9 1.5l2.9-2.9C17 3.8 14.7 3 12 3 8.1 3 4.8 5.4 3.3 9l3.1 2.4c.8-2.6 3.2-4.6 6-4.6z" />
            </svg>
            Continue with Google
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
