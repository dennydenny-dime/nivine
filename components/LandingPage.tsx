import React, { useEffect, useState } from 'react';

interface LandingPageProps {
  onEnterApp: () => void;
}

const systems = [
  ['Cognitive Load Mapping', 'Detects latency, verbal drag, and thought compression in live responses.'],
  ['Pressure Signal Tracking', 'Models composure drift and confidence oscillation under hostile questioning.'],
  ['Narrative Precision Index', 'Measures structure discipline, relevance density, and result clarity.'],
];

const testimonials = [
  {
    initials: 'AR',
    name: 'Ava Reynolds',
    handle: '@avareads',
    quote: 'Node AI made every mock interview feel intentional. I walked into final rounds calmer, sharper, and finally confident in my answers.',
    position: 'sm:col-start-2 sm:row-start-1 sm:translate-y-0',
  },
  {
    initials: 'MP',
    name: 'Marcus Patel',
    handle: '@marcusbuilds',
    quote: 'The feedback loops helped me tighten my stories fast. I stopped rambling and started sounding like someone ready to lead.',
    position: 'sm:col-start-1 sm:row-start-2 sm:-translate-y-2',
  },
  {
    initials: 'JL',
    name: 'Jordan Lee',
    handle: '@jordanpm',
    quote: 'I used to freeze under pressure. After a week with the platform, I could feel my confidence and clarity showing up in every response.',
    position: 'sm:col-start-3 sm:row-start-2 sm:-translate-y-16',
  },
];

const featuredCompanies = ['LinkedIn', 'TechCrunch', 'ProductHunt', 'YCombinator'];

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
      <section className="premium-noise hero-shell relative overflow-hidden rounded-2xl border border-white/10 px-8 py-24 text-center sm:px-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="aura-blob aura-blob-one" />
          <div className="aura-blob aura-blob-two" />
          <div className="aura-blob aura-blob-three" />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Node AI Intelligence Console</p>
          <h1 className="mt-9 text-4xl font-semibold leading-[0.95] text-[#ededed] sm:text-5xl lg:text-6xl">
            <span className="inline-flex flex-col items-center">
              <span className="block sm:whitespace-nowrap">Train How You</span>
              <span className="mt-2 flex h-[80px] w-full items-start justify-center text-center">
                <span
                  className={`inline-block border-b-4 border-[#7c3aed] pb-1 text-center transition-opacity duration-300 ${isWordVisible ? 'opacity-100' : 'opacity-0'}`}
                >
                  {rotatingWords[activeWordIndex]}
                </span>
              </span>
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-[#8a8f98] sm:text-lg">
            AI-powered cognitive interview analysis.
          </p>
          <button
            onClick={onEnterApp}
            className="mt-11 rounded-xl border border-white/25 bg-white px-8 py-3 text-sm font-semibold tracking-wide text-[#0a0a0b] transition hover:scale-[1.01] hover:bg-[#f5f5f5]"
          >
            Enter Interview System
          </button>
        </div>
      </section>

      <section className="testimonial-shell premium-noise relative overflow-hidden rounded-[28px] border border-white/8 px-8 py-12 sm:px-10 lg:px-12 lg:py-16">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full max-w-xl">
          <div className="testimonial-wave" />
          <div className="testimonial-wave testimonial-wave-secondary" />
        </div>

        <div className="relative grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-center">
          <div className="relative z-10 max-w-xl">
            <h2 className="text-4xl font-semibold leading-tight text-[#ededed] sm:text-5xl">
              See what candidates are{' '}
              <span className="testimonial-underline inline-block text-[#ededed]">saying</span>
            </h2>
            <div className="mt-12">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Featured In</p>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-500 sm:text-base">
                {featuredCompanies.map((company) => (
                  <span key={company}>{company}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 min-h-[420px]">
            <div className="grid gap-5 sm:grid-cols-3 sm:grid-rows-2">
              {testimonials.map(({ initials, name, handle, quote, position }) => (
                <article
                  key={handle}
                  className={`testimonial-card rounded-3xl p-6 sm:min-h-[220px] ${position}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold tracking-[0.16em] text-[#ededed]">
                      {initials}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-[#ededed]">{name}</p>
                      <p className="text-sm text-slate-400">{handle}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-slate-300">“{quote}”</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {systems.map(([title, copy]) => (
          <article key={title} className="premium-panel rounded-2xl p-6 transition duration-300 hover:border-white/20">
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
