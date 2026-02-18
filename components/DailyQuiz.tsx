import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import {
  QuizQuestion,
  QuizCategory,
  Difficulty,
  SynapseEvaluation,
  User,
  UserStats,
} from '../types';
import { COMMON_LANGUAGES, getSystemApiKey } from '../constants';
import { clamp, computeSynapseTotal, scoreToGrade } from '../utils/synapseScoring';

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
  const [result, setResult] = useState<SynapseEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const saveStats = (quizResult: SynapseEvaluation) => {
    const currentUser: User = JSON.parse(localStorage.getItem('tm_current_user') || '{}');
    const savedStats = localStorage.getItem('tm_user_stats');
    const stats: UserStats = savedStats ? JSON.parse(savedStats) : { totalQuizzes: 0, totalXP: 0, avgRating: 0 };

    const xpEarned = Math.round(
      quizResult.synapse_total_score *
        (selectedDifficulty === 'Expert' ? 2 : selectedDifficulty === 'Intermediate' ? 1.5 : 1),
    );

    const newTotalQuizzes = stats.totalQuizzes + 1;
    const newTotalXP = stats.totalXP + xpEarned;
    const newAvgRating =
      ((stats.avgRating * stats.totalQuizzes) + quizResult.synapse_total_score) / newTotalQuizzes;

    const updatedStats = {
      totalQuizzes: newTotalQuizzes,
      totalXP: newTotalXP,
      avgRating: Math.round(newAvgRating * 10) / 10,
    };

    localStorage.setItem('tm_user_stats', JSON.stringify(updatedStats));

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
        alert('API Key missing. Check Vercel settings.');
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
              tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['id', 'scenario', 'challenge', 'tips'],
          },
        },
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
        alert('API Key missing.');
        setEvaluating(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `You are evaluating an interview response.

QUESTION:
${quiz?.challenge}

CANDIDATE ANSWER:
${userResponse}

Evaluate using the Synapse Communication Score™ pillars:

Structure Score (0–20)

Does the answer follow Situation, Task, Action, Result?

Is there clear sequencing?

Is the result explicit?

Clarity Score (0–15)

Are sentences direct and easy to understand?

Is there minimal ambiguity?

Is wording precise?

Impact Score (0–15)

Are measurable outcomes included?

Are specific numbers used?

Is business impact clear?

Confidence Language Score (0–15)

Avoids weak phrases ("I think", "maybe", "kind of")

Uses assertive language

Sounds decisive

Response Relevance Score (0–15)

Directly answers the question

Avoids tangents

Stays aligned with interviewer intent

Return STRICT JSON in this format:

{
"structure_score": number,
"clarity_score": number,
"impact_score": number,
"confidence_score": number,
"relevance_score": number,
"strengths": ["bullet1", "bullet2"],
"weaknesses": ["bullet1", "bullet2"],
"improvement_suggestions": ["bullet1", "bullet2"]
}

Do not include filler analysis or conciseness scoring.
Those are handled separately.

Do not include explanations outside JSON.

All feedback text (strengths, weaknesses, suggestions) must be in ${selectedLanguage}.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              structure_score: { type: Type.NUMBER },
              clarity_score: { type: Type.NUMBER },
              impact_score: { type: Type.NUMBER },
              confidence_score: { type: Type.NUMBER },
              relevance_score: { type: Type.NUMBER },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvement_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'structure_score',
              'clarity_score',
              'impact_score',
              'confidence_score',
              'relevance_score',
              'strengths',
              'weaknesses',
              'improvement_suggestions',
            ],
          },
        },
      });

      const diagnostics = JSON.parse(response.text);
      const structure = clamp(Math.round(diagnostics.structure_score), 0, 20);
      const clarity = clamp(Math.round(diagnostics.clarity_score), 0, 15);
      const impact = clamp(Math.round(diagnostics.impact_score), 0, 15);
      const confidence = clamp(Math.round(diagnostics.confidence_score), 0, 15);
      const relevance = clamp(Math.round(diagnostics.relevance_score), 0, 15);

      const computedScore = computeSynapseTotal({
        structure,
        clarity,
        impact,
        confidence,
        relevance,
        answer: userResponse,
      });

      const parsedResult: SynapseEvaluation = {
        synapse_total_score: computedScore.synapse_total_score,
        percentile: computedScore.percentile,
        pillar_breakdown: computedScore.pillar_breakdown,
        diagnostics: {
          structure_score: structure,
          clarity_score: clarity,
          impact_score: impact,
          confidence_score: confidence,
          relevance_score: relevance,
          strengths: diagnostics.strengths || [],
          weaknesses: diagnostics.weaknesses || [],
          improvement_suggestions: diagnostics.improvement_suggestions || [],
        },
        trend_delta: 0,
      };

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
                    {COMMON_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
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

      {step === 'result' && result && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Synapse <span className="gradient-text">Performance Tracking</span></h2>
            <div className="inline-flex flex-col items-center">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black shadow-2xl border-4 ${
                scoreToGrade(result.synapse_total_score).startsWith('A') ? 'border-green-500 text-green-500 bg-green-500/5 shadow-green-500/20' :
                scoreToGrade(result.synapse_total_score).startsWith('B') ? 'border-blue-500 text-blue-500 bg-blue-500/5 shadow-blue-500/20' :
                scoreToGrade(result.synapse_total_score).startsWith('C') ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5 shadow-yellow-500/20' :
                'border-red-500 text-red-500 bg-red-500/5 shadow-red-500/20'
              }`}>
                {result.synapse_total_score}
              </div>
              <div className="mt-4 flex items-center gap-2 text-indigo-400 font-bold uppercase text-[10px] tracking-widest">
                XP EARNED: +{Math.round(result.synapse_total_score * (selectedDifficulty === 'Expert' ? 2 : selectedDifficulty === 'Intermediate' ? 1.5 : 1))}
              </div>
              <div className="mt-2 text-sm font-bold text-slate-400">
                Grade {scoreToGrade(result.synapse_total_score)} · Percentile {result.percentile}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-6">Pillar Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">Structure <div className="text-2xl font-black mt-2">{result.pillar_breakdown.structure}/20</div></div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">Clarity <div className="text-2xl font-black mt-2">{result.pillar_breakdown.clarity}/15</div></div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">Impact <div className="text-2xl font-black mt-2">{result.pillar_breakdown.impact}/15</div></div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">Confidence <div className="text-2xl font-black mt-2">{result.pillar_breakdown.confidence}/15</div></div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">Relevance <div className="text-2xl font-black mt-2">{result.pillar_breakdown.relevance}/15</div></div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">Conciseness <div className="text-2xl font-black mt-2">{result.pillar_breakdown.conciseness}/15</div></div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">Filler Density <div className="text-2xl font-black mt-2">{result.pillar_breakdown.filler_density}/10</div></div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">Trend Delta <div className="text-2xl font-black mt-2">{result.trend_delta >= 0 ? '+' : ''}{result.trend_delta}</div></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl h-full">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><span className="text-green-500">✨</span> Strengths</h3>
              <ul className="space-y-4">
                {result.diagnostics.strengths.map((s, i) => (
                  <li key={i} className="text-slate-300 text-sm leading-relaxed">• {s}</li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl h-full">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><span className="text-amber-500">⚠️</span> Weaknesses</h3>
              <ul className="space-y-4">
                {result.diagnostics.weaknesses.map((w, i) => (
                  <li key={i} className="text-slate-300 text-sm leading-relaxed">• {w}</li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl h-full">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><span className="text-cyan-400">🛠</span> Improvement Suggestions</h3>
              <ul className="space-y-4">
                {result.diagnostics.improvement_suggestions.map((tip, i) => (
                  <li key={i} className="text-slate-300 text-sm leading-relaxed">• {tip}</li>
                ))}
              </ul>
            </div>
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
