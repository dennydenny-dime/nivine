import React from 'react';
import { Persona } from '../types';

interface MentalTrainingPageProps {
  onStart: (persona: Persona) => void;
}

const mentalCoach: Persona = {
  name: 'Nova',
  role: 'Mental Performance Coach',
  mood: 'Encouraging',
  gender: 'Female',
  language: 'English',
  difficultyLevel: 6,
};

const MentalTrainingPage: React.FC<MentalTrainingPageProps> = ({ onStart }) => {
  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-700">
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 to-slate-950 p-8 md:p-10 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-300 font-bold">Elite Module</p>
        <h2 className="text-4xl font-black mt-3">Mental Training Module</h2>
        <p className="text-slate-300 mt-4 leading-relaxed">
          Build confidence, focus, composure, and emotional control before high-stakes conversations.
          This module is available on the Elite plan.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">Stress reframing drills</div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">Confidence priming scripts</div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">Focus + breathing prompts</div>
        </div>

        <button
          onClick={() => onStart(mentalCoach)}
          className="mt-8 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold transition-colors"
        >
          Start Mental Training Session
        </button>
      </div>
    </div>
  );
};

export default MentalTrainingPage;
