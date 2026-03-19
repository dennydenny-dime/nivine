import React, { useEffect, useState } from 'react';
import BackgroundOrb from './BackgroundOrb';

interface LandingPageProps {
  onEnterApp: () => void;
}
const metrics = [
  { label: 'Clarity Score', value: '87%', width: '87%', color: '#22c55e' },
  { label: 'Confidence', value: '74%', width: '74%', color: '#60a5fa' },
  { label: 'Response Speed', value: 'Fast', width: '92%', color: '#a78bfa' },
];

const overviewBlocks = [
  {
    eyebrow: 'What the app is for',
    title: 'AI interview practice for students, job seekers, and career changers',
    description:
      'Nivine helps people prepare for real interviews by simulating recruiter conversations, evaluating spoken answers, and giving practical feedback after every session.',
  },
  {
    eyebrow: 'Different features',
    title: 'Mock interviews, coaching, and progress insights in one flow',
    description:
      'Users can practice role-specific interviews, improve delivery with a custom coach, review performance trends, and build confidence before important hiring rounds.',
  },
  {
    eyebrow: 'Why this app is important',
    title: 'It turns interview anxiety into repeatable preparation',
    description:
      'Instead of guessing what to say, users get a safe place to rehearse, identify weak areas, and improve communication skills that directly affect job outcomes.',
  },
];

const featureCards = [
  {
    label: 'Interview Simulation',
    title: 'Practice realistic hiring conversations',
    description:
      'Launch AI-led mock interviews for different roles, difficulty levels, and interviewer styles so every session feels closer to a real hiring experience.',
    bullets: ['Role-based interview prompts', 'Adaptive follow-up questions', 'Natural speaking practice'],
  },
  {
    label: 'Personal Coaching',
    title: 'Improve how you answer, explain, and communicate',
    description:
      'Receive actionable coaching on structure, clarity, confidence, and pacing so you know exactly what to fix before the next interview.',
    bullets: ['Feedback on delivery and tone', 'Answer refinement guidance', 'Targeted practice between sessions'],
  },
  {
    label: 'Growth Tracking',
    title: 'Measure progress across every interview session',
    description:
      'Track improvements over time with performance signals that make growth visible and help users focus on the areas that matter most.',
    bullets: ['Confidence and clarity signals', 'Session-by-session review', 'Visible improvement over time'],
  },
];

const accentColors = ['#5f77ff', '#8b5cf6', '#ec4899'];

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const rotatingWords = ['Think.', 'Speak.', 'Interview.'];
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [isWordVisible, setIsWordVisible] = useState(true);

  useEffect(() => {
    const cycleTimer = window.setInterval(() => {
      setIsWordVisible(false);

      window.setTimeout(() => {
        setActiveWordIndex((currentIndex) => (currentIndex + 1) % rotatingWords.length);
        setIsWordVisible(true);
      }, 300);
    }, 2500);

    return () => {
      window.clearInterval(cycleTimer);
    };
  }, [rotatingWords.length]);

  return (
    <>
      <style>
        {`
          @keyframes livePulse {
            0% {
              transform: scale(0.95);
              opacity: 0.65;
              box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.35);
            }
            70% {
              transform: scale(1);
              opacity: 1;
              box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
            }
            100% {
              transform: scale(0.95);
              opacity: 0.7;
              box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
            }
          }

          @keyframes softFloat {
            0%,
            100% {
              transform: translate3d(0, 0, 0);
            }
            50% {
              transform: translate3d(0, -10px, 0);
            }
          }

          @keyframes heroFadeIn {
            0% {
              opacity: 0;
              transform: translate3d(0, 20px, 0);
            }
            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0);
            }
          }

          @keyframes glowPulse {
            0%,
            100% {
              box-shadow: 0 0 45px rgba(139, 92, 246, 0.4), 0 0 80px rgba(236, 72, 153, 0.16);
            }
            50% {
              box-shadow: 0 0 70px rgba(139, 92, 246, 0.58), 0 0 110px rgba(236, 72, 153, 0.24);
            }
          }
        `}
      </style>

      <div className="space-y-20 pb-12">
        <section className="premium-noise hero-shell relative overflow-hidden rounded-2xl border border-white/10 px-8 py-16 text-center shadow-[0_30px_120px_rgba(15,23,42,0.45)] sm:px-14 lg:py-24 lg:text-left">
          <BackgroundOrb />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-purple-500/20 blur-[120px] sm:h-72 sm:w-72" />
            <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-indigo-500/20 blur-[120px] sm:h-72 sm:w-72" />
            <div className="absolute left-1/2 top-[20%] h-64 w-64 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.18)_0%,rgba(17,24,39,0)_72%)] blur-[90px] sm:h-[26rem] sm:w-[26rem]" />
            <div className="aura-blob aura-blob-one" />
            <div className="aura-blob aura-blob-two" />
            <div className="aura-blob aura-blob-three" />
          </div>

          <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
            <div className="relative z-10" style={{ animation: 'heroFadeIn 900ms ease-out both' }}>
              <p className="text-[11px] uppercase tracking-[0.34em] text-purple-200/70">AI INTERVIEW TRAINING</p>
              <h1 className="mt-6 text-5xl font-bold tracking-tight leading-[0.95] text-[#ededed] sm:text-5xl lg:text-6xl">
                <span className="inline-flex flex-col items-center lg:items-start">
                  <span className="block sm:whitespace-nowrap">Train How You</span>
                  <span className="mt-3 flex h-[84px] w-full items-start justify-center text-center lg:justify-start lg:text-left">
                    <span
                      className={`inline-block rounded-full bg-gradient-to-r from-indigo-200 via-white to-purple-200 bg-clip-text pb-1 text-transparent transition-opacity duration-300 lg:text-left ${isWordVisible ? 'opacity-100' : 'opacity-0'}`}
                      style={{ textShadow: '0 0 24px rgba(129, 140, 248, 0.18)' }}
                    >
                      <span className="border-b border-purple-400/60 shadow-[0_10px_24px_rgba(139,92,246,0.18)]">{rotatingWords[activeWordIndex]}</span>
                    </span>
                  </span>
                </span>
              </h1>
              <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg lg:mx-0">
                Practice real interviews, get structured feedback, and improve your communication with AI.
              </p>
              <button
                onClick={onEnterApp}
                className="mt-14 rounded-xl border border-white/10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 py-3 text-sm font-bold tracking-wide text-white shadow-[0_0_80px_rgba(139,92,246,0.6)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_110px_rgba(139,92,246,0.72)] hover:brightness-110 active:scale-95"
                style={{ animation: 'glowPulse 4.8s ease-in-out infinite' }}
              >
                Enter Interview System
              </button>
            </div>

            <div className="relative z-20 hidden lg:flex lg:justify-end">
              <div
                className="relative flex w-full max-w-[320px] flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] active:scale-[0.99]"
                style={{
                  boxShadow: '0 24px 70px rgba(15,23,42,0.5), 0 0 80px rgba(124,58,237,0.14)',
                  animation: 'softFloat 7s ease-in-out infinite',
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/88">
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-[#22c55e]"
                      style={{ animation: 'livePulse 1.8s ease-out infinite' }}
                    />
                    <span>LIVE SESSION</span>
                  </div>
                  <span className="text-xs font-medium tracking-[0.18em] text-slate-500">02:34</span>
                </div>

                <div>
                  <h3 className="text-[16px] font-semibold text-white">Sarah — Executive Recruiter</h3>
                  <p className="mt-1 text-[12px] text-[#8a8f98]">Formal · Challenging</p>
                </div>

                <div className="h-px w-full bg-white/10" />

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">AI FEEDBACK</p>
                  <div className="mt-3 rounded-lg border border-white/6 bg-white/[0.04] p-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <p className="text-[12px] leading-relaxed text-white/72">
                      Strong opening. Watch your pacing in the middle section — confidence dipped slightly.
                    </p>
                  </div>
                </div>

                <div className="h-px w-full bg-white/10" />

                <div className="space-y-3">
                  {metrics.map((metric) => (
                    <div key={metric.label} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-[#c9ced6]">{metric.label}</span>
                        <span className="font-semibold" style={{ color: metric.color }}>
                          {metric.value}
                        </span>
                      </div>
                      <div className="h-[3px] rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full transition-[width] duration-700 ease-out"
                          style={{ width: metric.width, backgroundColor: metric.color, boxShadow: `0 0 18px ${metric.color}55` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {overviewBlocks.map((block, idx) => (
            <article
              key={block.eyebrow}
              className="rounded-[20px] border px-6 py-7 shadow-[0_18px_70px_rgba(15,23,42,0.24)]"
              style={{
                background: 'linear-gradient(180deg, rgba(26,26,46,0.96) 0%, rgba(17,24,39,0.96) 100%)',
                borderColor: `${accentColors[idx]}55`,
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.26em]" style={{ color: accentColors[idx] }}>
                {block.eyebrow}
              </p>
              <h2 className="mt-4 text-2xl font-semibold leading-tight text-[#ededed]">{block.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[#a0a6b4]">{block.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {featureCards.map((card, idx) => (
            <article
              key={card.title}
              className="relative overflow-hidden rounded-[16px] border p-6 transition duration-300 hover:-translate-y-0.5 hover:border-white/15"
              style={{
                backgroundColor: '#1a1a2e',
                borderColor: 'rgba(255,255,255,0.08)',
                borderTopColor: accentColors[idx],
                borderTopWidth: '1px',
              }}
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <div
                  className="h-5 w-5 rounded-md border border-white/20"
                  style={{ backgroundColor: `${accentColors[idx]}22`, borderColor: `${accentColors[idx]}66` }}
                />
              </div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
              <h3 className="mt-3 text-lg font-semibold text-[#ededed]">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#8a8f98]">{card.description}</p>
              <ul className="mt-5 space-y-2">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-[#c9ced6]">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColors[idx] }} />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </>
  );
};

export default LandingPage;
