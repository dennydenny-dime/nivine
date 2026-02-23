import React from 'react';
import { PLAN_CONFIGS, SubscriptionPlan } from '../lib/subscription';

interface PricingPageProps {
  onBack: () => void;
  currentPlan: SubscriptionPlan;
  onPlanSelect: (plan: SubscriptionPlan) => Promise<void>;
}

const planOrder: SubscriptionPlan[] = ['free', 'premium', 'elite'];

const PricingPage: React.FC<PricingPageProps> = ({ onBack, currentPlan, onPlanSelect }) => {
  const [loadingPlan, setLoadingPlan] = React.useState<SubscriptionPlan | null>(null);

  const handleSelect = async (plan: SubscriptionPlan) => {
    setLoadingPlan(plan);
    try {
      await onPlanSelect(plan);
    } finally {
      setLoadingPlan(null);
    }
  };
  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-6xl mx-auto py-12">
      <div className="text-center mb-14">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
          Choose Your <span className="gradient-text">Synapse Plan</span>
        </h2>
        <p className="text-slate-400 text-lg max-w-3xl mx-auto">
          Features and session limits now follow your selected plan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planOrder.map((planId) => {
          const plan = PLAN_CONFIGS[planId];
          const selected = currentPlan === planId;

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 border transition-all ${selected ? 'border-indigo-400 bg-slate-900 shadow-xl shadow-indigo-500/20' : 'border-slate-800 bg-slate-950'}`}
            >
              <p className="text-xs uppercase tracking-widest text-slate-400">{plan.label}</p>
              <h3 className="text-4xl font-black mt-2">{plan.priceLabel}</h3>
              <p className="text-sm text-slate-500 mt-1">per month</p>

              <ul className="mt-6 space-y-3 text-sm text-slate-200">
                <li>• {plan.callsLimit} calls per month</li>
                <li>• {plan.maxMinutesPerCall} minutes per call</li>
                <li>• Neural training modules</li>
                <li className={plan.canUseCustomCoach ? '' : 'text-slate-500'}>• Custom coach settings</li>
                <li className={plan.canUseQuizzes ? '' : 'text-slate-500'}>• Quizzes section</li>
                <li className={plan.canUseMentalTrainingModule ? '' : 'text-slate-500'}>• Mental training module</li>
              </ul>

              <button
                onClick={() => handleSelect(plan.id)}
                disabled={loadingPlan !== null}
                className={`mt-8 w-full py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-60 ${selected ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
              >
                {loadingPlan === plan.id ? 'Processing...' : selected ? 'Current Plan' : `Choose ${plan.label}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex justify-center">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-slate-100 font-semibold"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default PricingPage;
