
import React from 'react';

interface PricingPageProps {
  onBack: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onBack }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-6xl mx-auto py-12">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Choose Your <span className="gradient-text">Coaching Plan</span></h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Scale your communication skills with flexible options tailored to your learning pace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Free Plan */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col hover:border-slate-700 transition-all">
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-2">Starter</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">$0</span>
              <span className="text-slate-500 text-sm">/ forever</span>
            </div>
            <p className="text-slate-400 text-sm mt-4">Perfect for casual practice and getting started.</p>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-sm text-slate-300">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              Standard Neural Link
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-300">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              Basic Feedback Engine
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-300">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              Daily Quiz Access
            </li>
          </ul>
          <button 
            onClick={onBack}
            className="w-full py-3 bg-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all"
          >
            Active Plan
          </button>
        </div>

        {/* Paid Plan Mock */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-8 flex flex-col relative shadow-2xl transform md:-translate-y-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">
            Coming Soon
          </div>
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-2 text-indigo-400">Pro Synapse</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">$19</span>
              <span className="text-slate-500 text-sm">/ month</span>
            </div>
            <p className="text-slate-400 text-sm mt-4">Professional grade coaching with persistent memory.</p>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-sm text-slate-200">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              Advanced Voice Profiles
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-200">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              High-Fidelity Synthesis
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-200">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              Deep Linguistic Analysis
            </li>
          </ul>
          <button 
            disabled
            className="w-full py-4 border border-slate-800 rounded-xl font-bold text-sm text-slate-600 cursor-not-allowed"
          >
            Unlock Later
          </button>
        </div>

        {/* Enterprise Mock Plan */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col hover:border-slate-700 transition-all">
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-2">Team</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">Custom</span>
            </div>
            <p className="text-slate-400 text-sm mt-4">Corporate solutions for HR and Sales teams.</p>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-sm text-slate-300">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              Centralized Billing
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-300">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              Custom Persona Training
            </li>
          </ul>
          <button 
            disabled
            className="w-full py-3 border border-slate-800 rounded-xl font-bold text-sm text-slate-600 cursor-not-allowed"
          >
            Contact Sales
          </button>
        </div>
      </div>

      <div className="mt-16 text-center text-slate-500 text-sm max-w-xl mx-auto space-y-4">
        <p>
          Neural Link capabilities are currently open for all verified pilots.
          Future upgrades will include specialized communication engines and long-term skill tracking.
        </p>
      </div>
    </div>
  );
};

export default PricingPage;
