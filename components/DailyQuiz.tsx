
import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { QuizQuestion, QuizCategory, Difficulty, QuizResult, User, UserStats } from '../types';
import { COMMON_LANGUAGES, getSystemApiKey } from '../constants';

const CATEGORIES: { id: QuizCategory; icon: string; label: string }[] = [
  { id: 'Interview', icon: '💼', label: 'Job Interviews' },
  { id: 'Leadership', icon: '👑', label: 'Leadership' },
  { id: 'Sales', icon: '📈', label: 'Persuasion & Sales' },
  { id: 'Social', icon: '🤝', label: 'Social Networking' },
  { id: 'Conflict Resolution', icon: '⚖️', label: 'Conflict' },
];

const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Expert'];

interface DailyQuizProps {
  onSeeLeaderboard?: () => void;
}

const DailyQuiz: React.FC<DailyQuizProps> = ({ onSeeLeaderboard }) => {
  const [step, setStep] = useState<'selection' | 'quiz' | 'result'>('selection');
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory>('Interview');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('Intermediate');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [userResponse, setUserResponse] = useState('');
  const [result, setResult] = useState<QuizResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const saveStats = (quizResult: QuizResult) => {
    const currentUser: User = JSON.parse(localStorage.getItem('tm_current_user') || '{}');
    const savedStats = localStorage.getItem('tm_user_stats');
    let stats: UserStats = savedStats ? JSON.parse(savedStats) : { totalQuizzes: 0, totalXP: 0, avgRating: 0 };
    
    const xpEarned = Math.round(quizResult.rating * (selectedDifficulty === 'Expert' ? 2 : selectedDifficulty === 'Intermediate' ? 1.5 : 1));
    
    const newTotalQuizzes = stats.totalQuizzes + 1;
    const newTotalXP = stats.totalXP + xpEarned;
    const newAvgRating = ((stats.avgRating * stats.totalQuizzes) + quizResult.rating) / newTotalQuizzes;

    const updatedStats = {
      totalQuizzes: newTotalQuizzes,
      totalXP: newTotalXP,
      avgRating: Math.round(newAvgRating * 10) / 10
    };

    localStorage.setItem('tm_user_stats', JSON.stringify(updatedStats));

    // Sync to global pool
    const pool = JSON.parse(localStorage.getItem('tm_leaderboard_pool') || '[]');
    const userIndex = pool.findIndex((u: any) => u.email === currentUser.email);
    if (userIndex !== -1) {
      pool[userIndex].xp = newTotalXP;
      pool[userIndex].totalQuizzes = newTotalQuizzes;
      localStorage.setItem('tm_leaderboard_pool', JSON.stringify(pool));
    }
  };

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const apiKey = getSystemApiKey();
      if (!apiKey) {
        alert("API Key missing. Check Vercel settings.");
        setLoading(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a communication challenge for the category "${selectedCategory}" with a difficulty level of "${selectedDifficulty}". 
        The scenario and challenge MUST be written in ${selectedLanguage}.
        The scenario should be highly realistic and detailed.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              scenario: { type: Type.STRING },
              challenge: { type: Type.STRING },
              tips: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['id', 'scenario', 'challenge', 'tips']
          }
        }
      });
      const data = JSON.parse(response.text);
      setQuiz({ ...data, category: selectedCategory, difficulty: selectedDifficulty });
      setStep('quiz');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const evaluateResponse = async () => {
    if (!userResponse.trim()) return;
    setEvaluating(true);
    try {
      const apiKey = getSystemApiKey();
      if (!apiKey) {
        alert("API Key missing.");
        setEvaluating(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `You are an expert communication coach. Evaluate this response to a communication challenge.
        
        The interaction Language is: ${selectedLanguage}. Ensure the feedback is provided in ${selectedLanguage}.
        
        Category: ${quiz?.category}
        Difficulty: ${quiz?.difficulty}
        Scenario: ${quiz?.scenario}
        Challenge: ${quiz?.challenge}
        User's Response: "${userResponse}"
        
        Analyze strictly based on clarity, tone, professionalism, and persuasiveness.
        The Grade should be tough but fair. "A+" is rare. "F" is for complete failure to address the challenge or offensive tone.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              grade: { type: Type.STRING, enum: ['A+', 'A', 'B', 'C', 'D', 'F'] },
              rating: { type: Type.NUMBER, description: 'A score from 0 to 100' },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Specific areas where the user did great' },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Specific areas where the user messed up or could improve' },
              detailedFeedback: { type: Type.STRING, description: 'Overall synthesis of performance' }
            },
            required: ['grade', 'rating', 'strengths', 'weaknesses', 'detailedFeedback']
          }
        }
      });
      const parsedResult = JSON.parse(response.text);
      setResult(parsedResult);
      saveStats(parsedResult);
      setStep('result');
    } catch (err) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  const reset = () => {
    setStep('selection');
    setQuiz(null);
    setResult(null);
    setUserResponse('');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full"></div>
          <div className="absolute top-0 w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-400 font-medium animate-pulse">Crafting your custom challenge in {selectedLanguage}...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Step 1: Selection */}
      {step === 'selection' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold mb-4">Choose Your <span className="gradient-text">Practice Path</span></h2>
            <p className="text-slate-400">Select a category and difficulty to begin your daily communication test.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-6">1. Configuration</h3>
              
              <div className="mb-6">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Quiz Language</label>
                 <div className="relative">
                    <select 
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full appearance-none bg-slate-900 border border-slate-700 text-white py-3 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold"
                    >
                      {COMMON_LANGUAGES.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                      selectedCategory === cat.id 
                        ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="font-bold">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-6">2. Select Difficulty</h3>
              <div className="space-y-4">
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`w-full p-6 rounded-2xl border transition-all flex justify-between items-center ${
                      selectedDifficulty === diff 
                        ? 'bg-indigo-500 border-indigo-400 text-white scale-[1.02]' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-bold text-lg">{diff}</div>
                      <div className="text-xs opacity-70">
                        {diff === 'Beginner' && 'Standard scenarios, clear challenges.'}
                        {diff === 'Intermediate' && 'Workplace complexities and nuanced goals.'}
                        {diff === 'Expert' && 'High-stakes, high-pressure environments.'}
                      </div>
                    </div>
                    {selectedDifficulty === diff && <span className="text-white">✓</span>}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={generateQuiz}
                className="w-full mt-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-bold text-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-xl shadow-indigo-500/25"
              >
                Start Challenge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: The Challenge */}
      {step === 'quiz' && quiz && (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between mb-4">
            <button onClick={reset} className="text-slate-500 hover:text-white flex items-center gap-2 text-sm">
              ← Back to Selection
            </button>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-indigo-400 uppercase">{quiz.category}</span>
              <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-purple-400 uppercase">{quiz.difficulty}</span>
              <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-green-400 uppercase">{selectedLanguage}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="mb-10">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4">Scenario</h3>
              <p className="text-2xl font-semibold leading-relaxed text-white">{quiz.scenario}</p>
            </div>

            <div className="mb-10 p-6 bg-indigo-500/5 rounded-2xl border-l-4 border-indigo-500">
              <h3 className="text-xs uppercase tracking-widest text-indigo-400 font-bold mb-2">The Challenge</h3>
              <p className="text-lg text-slate-200 font-medium italic">{quiz.challenge}</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Your Verbal Response ({selectedLanguage})</label>
                <textarea 
                  rows={6}
                  value={userResponse}
                  onChange={(e) => setUserResponse(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-200 text-lg leading-relaxed placeholder:text-slate-700"
                  placeholder="Type exactly what you would say out loud..."
                />
              </div>
              <button 
                onClick={evaluateResponse}
                disabled={evaluating || !userResponse.trim()}
                className="w-full py-5 bg-indigo-600 rounded-2xl font-bold text-lg hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {evaluating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Evaluating Performance...
                  </>
                ) : 'Submit for Grading'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Session Performance <span className="gradient-text">Report</span></h2>
            <div className="inline-flex flex-col items-center">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black shadow-2xl border-4 ${
                result.grade.startsWith('A') ? 'border-green-500 text-green-500 bg-green-500/5 shadow-green-500/20' :
                result.grade.startsWith('B') ? 'border-blue-500 text-blue-500 bg-blue-500/5 shadow-blue-500/20' :
                result.grade.startsWith('C') ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5 shadow-yellow-500/20' :
                'border-red-500 text-red-500 bg-red-500/5 shadow-red-500/20'
              }`}>
                {result.grade}
              </div>
              <div className="mt-4 flex items-center gap-2 text-indigo-400 font-bold uppercase text-[10px] tracking-widest">
                XP EARNED: +{Math.round(result.rating * (selectedDifficulty === 'Expert' ? 2 : selectedDifficulty === 'Intermediate' ? 1.5 : 1))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 w-32 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${result.rating}%` }}></div>
                </div>
                <span className="text-sm font-bold text-slate-500">{result.rating}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl h-full">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <span className="text-green-500">✨</span> Where You Excelled
                </h3>
                <ul className="space-y-4">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex gap-4 items-start group">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 ring-4 ring-green-500/20"></div>
                      <p className="text-slate-300 text-sm leading-relaxed group-hover:text-white transition-colors">{s}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl h-full">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <span className="text-amber-500">⚠️</span> Areas for Growth
                </h3>
                <ul className="space-y-4">
                  {result.weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-4 items-start group">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20"></div>
                      <p className="text-slate-300 text-sm leading-relaxed group-hover:text-white transition-colors">{w}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600/5 border border-indigo-500/20 p-8 rounded-3xl text-center">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4">Detailed Coach's Summary</h3>
            <p className="text-slate-300 leading-relaxed italic">
              "{result.detailedFeedback}"
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
             <button 
                onClick={onSeeLeaderboard}
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl font-bold hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                View Global Rank
              </button>
            <button 
              onClick={reset}
              className="w-full sm:w-auto px-10 py-4 bg-slate-800 rounded-2xl font-bold hover:bg-slate-700 transition-all"
            >
              Take Another Quiz
            </button>
            <button 
              onClick={() => setStep('quiz')}
              className="w-full sm:w-auto px-10 py-4 border border-slate-800 rounded-2xl font-bold hover:bg-slate-900 transition-all text-slate-500 hover:text-white"
            >
              Try Scenario Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyQuiz;
