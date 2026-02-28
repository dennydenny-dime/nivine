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
  const [authMessage, setAuthMessage] = useState<string | null>(null);

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
    setAuthMessage(null);

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

  const handleGoogleSignIn = async () => {
    setAuthError('Google sign-in is not configured yet. Please continue with email and password.');
    setAuthMessage(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-indigo-500/10">
        <div className="text-center mb-8">
          <SynapseLogo className="w-16 h-16 mx-auto mb-4 shadow-xl shadow-white/5" />
          <h2 className="text-3xl font-bold">{isLogin ? 'Welcome Back' : 'Join Synapse AI'}</h2>
          <p className="text-slate-400 mt-2">Elevate your speech with AI coaching</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-slate-100 transition-all mb-6 disabled:opacity-60"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.94 0 3.51.68 4.75 1.81l3.5-3.5C18.16 1.33 15.31 0 12 0 7.31 0 3.33 2.69 1.45 6.6l3.96 3.08C6.35 7.17 8.98 5.04 12 5.04z" />
            <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.86 3c2.26-2.09 3.56-5.17 3.56-8.82z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.02 0-5.58-2.03-6.5-4.82l-4.11 3.19C3.33 21.31 7.31 24 12 24z" />
            <path fill="#FBBC05" d="M5.5 14.43c-.24-.72-.37-1.49-.37-2.43s.13-1.71.37-2.43L1.39 6.39C.5 8.09 0 10 0 12s.5 3.91 1.39 5.61l4.11-3.18z" />
          </svg>
          Google sign-in (coming soon)
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">Or continue with email</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white"
                placeholder="John Doe"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white"
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white"
              placeholder="••••••••"
            />
          </div>

          {authMessage && (
            <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">{authMessage}</p>
          )}

          {authError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{authError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-1 text-indigo-400 font-bold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
