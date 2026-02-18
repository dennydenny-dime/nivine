import React from 'react';

interface CustomFeaturePageProps {
  onBackToPlans: () => void;
}

const CustomFeaturePage: React.FC<CustomFeaturePageProps> = ({ onBackToPlans }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-5xl mx-auto py-12">
      <div className="mb-8">
        <button
          onClick={onBackToPlans}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          Back to Plans
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12">
        <p className="text-xs uppercase tracking-wider text-indigo-300 font-semibold mb-2">Custom Feature Program</p>
        <h2 className="text-3xl md:text-4xl font-extrabold mb-3">Build a custom business solution with Synapse</h2>
        <p className="text-slate-400 max-w-3xl mb-10">
          This page is for organizations that need custom workflows, internal integrations, and white-glove onboarding.
          We design a business package around your team size, usage, and compliance requirements.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-3">Included custom features</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>• CRM and LMS integrations</li>
              <li>• Custom persona training on your internal playbooks</li>
              <li>• Dedicated onboarding specialist and success check-ins</li>
              <li>• SSO and advanced role permissions</li>
              <li>• Priority support SLA</li>
            </ul>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-3">Business model details</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>• Platform base fee: starts at $999/month</li>
              <li>• Usage fee: $12 per active seat/month</li>
              <li>• One-time setup: from $2,500 for integrations</li>
              <li>• Annual commitments include volume discounts</li>
            </ul>
          </div>
        </div>

        <div className="border border-indigo-500/30 bg-indigo-500/5 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg">Need a proposal?</h3>
            <p className="text-sm text-slate-400">Share your goals and we will return a custom rollout plan in 2 business days.</p>
          </div>
          <button
            onClick={onBackToPlans}
            className="px-5 py-3 bg-indigo-600 rounded-xl font-semibold text-sm hover:bg-indigo-500 transition-all"
          >
            Request Custom Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomFeaturePage;
