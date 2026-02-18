import React from 'react';

interface PricingPageProps {
  onBack: () => void;
  onOpenCustomFeature: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onBack, onOpenCustomFeature }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-6xl mx-auto py-12">
      <div className="text-center mb-6">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Choose Your <span className="gradient-text">Business Plan</span></h2>
        <p className="text-slate-400 text-lg max-w-3xl mx-auto">
          A simple business model: individuals subscribe monthly, teams pay per seat, and enterprise customers unlock custom integrations.
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl px-6 py-4 mb-14 text-sm text-slate-300 max-w-4xl mx-auto">
        <p className="font-semibold text-slate-100 mb-2">How Synapse monetizes</p>
        <ul className="list-disc pl-5 space-y-1 marker:text-indigo-400">
          <li>Starter grows top-of-funnel adoption with a free forever entry.</li>
          <li>Pro drives recurring MRR with premium coaching and analytics.</li>
          <li>Team scales revenue using seat-based billing and admin controls.</li>
          <li>Custom creates high-ACV deals via integrations, onboarding, and SLA support.</li>
        </ul>
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
            <li className="flex items-center gap-3 text-sm text-slate-300"><svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Standard Neural Link</li>
            <li className="flex items-center gap-3 text-sm text-slate-300"><svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Basic Feedback Engine</li>
            <li className="flex items-center gap-3 text-sm text-slate-300"><svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Daily Quiz Access</li>
          </ul>
          <button onClick={onBack} className="w-full py-3 bg-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all">Active Plan</button>
        </div>

        {/* Pro Plan */}
        <div className="bg-slate-900 border-2 border-indigo-500 rounded-3xl p-8 flex flex-col relative shadow-2xl transform md:-translate-y-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">
            Most Popular
          </div>
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-2 text-indigo-300">Pro</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">$19</span>
              <span className="text-slate-500 text-sm">/ user / month</span>
            </div>
            <p className="text-slate-400 text-sm mt-4">For consistent learners who want measurable progress and richer AI coaching.</p>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-sm text-slate-200"><svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Advanced Voice Profiles</li>
            <li className="flex items-center gap-3 text-sm text-slate-200"><svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Weekly Progress Reports</li>
            <li className="flex items-center gap-3 text-sm text-slate-200"><svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Goal-based Practice Plans</li>
          </ul>
          <button className="w-full py-4 bg-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all">Upgrade to Pro</button>
        </div>

        {/* Team Plan */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col hover:border-slate-700 transition-all">
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-2">Team</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">$49</span>
              <span className="text-slate-500 text-sm">/ manager / month</span>
            </div>
            <p className="text-slate-400 text-sm mt-4">For coaches, schools, and sales leaders managing multiple learners.</p>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-sm text-slate-300"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Seat-based Billing + Team Dashboards</li>
            <li className="flex items-center gap-3 text-sm text-slate-300"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Centralized Billing & Member Roles</li>
            <li className="flex items-center gap-3 text-sm text-slate-300"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Performance & Retention Analytics</li>
          </ul>
          <button onClick={onOpenCustomFeature} className="w-full py-3 border border-slate-700 rounded-xl font-bold text-sm text-slate-100 hover:bg-slate-800 transition-all">See Custom Options</button>
        </div>
      </div>

      <div className="mt-16 text-center text-slate-500 text-sm max-w-xl mx-auto space-y-4">
        <p>
          Revenue from Pro and Team plans funds new AI voice capabilities, better feedback loops,
          and enterprise-grade reliability for larger customers.
        </p>
      </div>
    </div>
  );
};

export default PricingPage;
