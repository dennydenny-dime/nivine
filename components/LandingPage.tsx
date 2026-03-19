import React, { useEffect, useState } from 'react';

interface LandingPageProps {
  onEnterApp: () => void;
}

const systems = [
  ['Cognitive Load Mapping', 'Detects latency, verbal drag, and thought compression in live responses.'],
  ['Pressure Signal Tracking', 'Models composure drift and confidence oscillation under hostile questioning.'],
  ['Narrative Precision Index', 'Measures structure discipline, relevance density, and result clarity.'],
];

const accentColors = ['#2563eb', '#7c3aed', '#22c55e'];

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
    <div className="space-y-20 pb-12">
      <section className="premium-noise hero-shell relative overflow-hidden rounded-2xl border border-white/10 px-8 py-16 text-center sm:px-14 lg:py-24 lg:text-left">
        <div className="pointer-events-none absolute inset-0">
          <div className="aura-blob aura-blob-one" />
          <div className="aura-blob aura-blob-two" />
          <div className="aura-blob aura-blob-three" />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Node AI Intelligence Console</p>
            <h1 className="mt-9 text-4xl font-semibold leading-[0.95] text-[#ededed] sm:text-5xl lg:text-6xl">
              <span className="inline-flex flex-col items-center lg:items-start">
                <span className="block sm:whitespace-nowrap">Train How You</span>
                <span className="mt-2 flex h-[80px] w-full items-start justify-center text-center lg:justify-start lg:text-left">
                  <span
                    className={`inline-block border-b-4 border-[#7c3aed] pb-1 text-center transition-opacity duration-300 lg:text-left ${isWordVisible ? 'opacity-100' : 'opacity-0'}`}
                  >
                    {rotatingWords[activeWordIndex]}
                  </span>
                </span>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-[#8a8f98] sm:text-lg lg:mx-0">
              AI-powered cognitive interview analysis.
            </p>
            <button
              onClick={onEnterApp}
              className="mt-11 rounded-xl border border-white/10 bg-[linear-gradient(90deg,#7c3aed_0%,#2563eb_100%)] px-8 py-3 text-sm font-bold tracking-wide text-white shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all duration-300 hover:scale-[1.01] hover:brightness-110 hover:shadow-[0_0_35px_rgba(124,58,237,0.8)]"
            >
              Enter Interview System
            </button>
          </div>

          <div className="relative hidden lg:flex lg:justify-end">
            <div
              className="relative w-full max-w-[320px] rounded-2xl border p-6"
              style={{
                background: '#1a1a2e',
                borderColor: 'rgba(255,255,255,0.1)',
                boxShadow: '0 0 40px rgba(124,58,237,0.3)',
                borderRadius: '16px',
              }}
            >
              <div className="absolute right-5 top-5 h-3 w-3 rounded-full bg-[#7c3aed]" />
              <div className="space-y-4 pt-3">
                <div className="h-3 w-3/4 rounded-full bg-white/10" />
                <div className="h-3 w-full rounded-full bg-white/10" />
                <div className="h-3 w-2/3 rounded-full bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {systems.map(([title, copy], idx) => (
          <article
            key={title}
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
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Core Module</p>
            <h3 className="mt-3 text-lg font-semibold text-[#ededed]">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#8a8f98]">{copy}</p>
          </article>
        ))}
      </section>
    </div>
  );
};

export default LandingPage;
