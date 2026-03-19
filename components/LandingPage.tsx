import React, { useEffect, useMemo, useState } from 'react';

interface LandingPageProps {
  onEnterApp: () => void;
}

const systems = [
  ['Cognitive Load Mapping', 'Detects latency, verbal drag, and thought compression in live responses.'],
  ['Pressure Signal Tracking', 'Models composure drift and confidence oscillation under hostile questioning.'],
  ['Narrative Precision Index', 'Measures structure discipline, relevance density, and result clarity.'],
];

const accentColors = ['#2563eb', '#7c3aed', '#22c55e'];

const metrics = [
  { label: 'Clarity Score', value: '87%', width: '87%', color: '#22c55e' },
  { label: 'Confidence', value: '74%', width: '74%', color: '#60a5fa' },
  { label: 'Response Speed', value: 'Fast', width: '92%', color: '#a78bfa' },
];


const stats = [
  { value: '10,000+', label: 'Candidates Trained' },
  { value: '95%', label: 'Confidence Improvement' },
  { value: '500+', label: 'Interview Scenarios' },
];



const neuralSphereNodes = Array.from({ length: 132 }, (_, index) => {
  const total = 132;
  const y = 1 - (index / (total - 1)) * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = Math.PI * (3 - Math.sqrt(5)) * index;
  const x = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;
  const depthScale = 0.56 + ((z + 1) / 2) * 0.52;

  return {
    id: index,
    x,
    y,
    z,
    px: x * 248,
    py: y * 248,
    depthScale,
    size: 1.8 + ((z + 1) / 2) * 3.4,
  };
});

const neuralSphereEdges = neuralSphereNodes.flatMap((node, index) => {
  const candidateEdges = neuralSphereNodes
    .slice(index + 1)
    .map((target) => {
      const dx = node.x - target.x;
      const dy = node.y - target.y;
      const dz = node.z - target.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      return { from: node, to: target, distance };
    })
    .filter(({ distance }) => distance < 0.33)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  return candidateEdges;
});

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const rotatingWords = ['Think.', 'Speak.', 'Interview.'];
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [isWordVisible, setIsWordVisible] = useState(true);
  const neuralSphere = useMemo(() => ({ nodes: neuralSphereNodes, edges: neuralSphereEdges }), []);

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
        `}
      </style>

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
                className="relative flex w-full max-w-[320px] flex-col gap-4 rounded-2xl border p-6"
                style={{
                  background: '#1a1a2e',
                  borderColor: 'rgba(255,255,255,0.1)',
                  boxShadow: '0 0 40px rgba(124,58,237,0.3), 0 0 80px rgba(124,58,237,0.16)',
                  borderRadius: '16px',
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
                  <div className="mt-3 rounded-lg bg-white/[0.04] p-[10px]">
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
                          className="h-full rounded-full"
                          style={{ width: metric.width, backgroundColor: metric.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden px-0 py-6 sm:py-8 lg:py-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="neural-sphere-glow neural-sphere-glow-left" />
            <div className="neural-sphere-glow neural-sphere-glow-right" />
          </div>
          <div className="relative flex items-center justify-center">
            <div className="neural-sphere-frame">
              <svg viewBox="0 0 640 640" className="neural-sphere-svg" aria-hidden="true">
                <defs>
                  <radialGradient id="neuralSphereCore" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(134, 183, 255, 0.3)" />
                    <stop offset="65%" stopColor="rgba(37, 99, 235, 0.08)" />
                    <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
                  </radialGradient>
                  <filter id="neuralSphereGlow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="3.2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <circle cx="320" cy="320" r="214" fill="url(#neuralSphereCore)" />

                {neuralSphere.edges.map((edge, edgeIndex) => {
                  const opacity = Math.min(edge.from.depthScale, edge.to.depthScale) * 0.34;
                  return (
                    <line
                      key={`${edge.from.id}-${edge.to.id}-${edgeIndex}`}
                      x1={320 + edge.from.px}
                      y1={320 + edge.from.py}
                      x2={320 + edge.to.px}
                      y2={320 + edge.to.py}
                      className="neural-sphere-link"
                      style={{ opacity }}
                    />
                  );
                })}

                {neuralSphere.nodes.map((node) => (
                  <g key={node.id} filter="url(#neuralSphereGlow)">
                    <circle
                      cx={320 + node.px}
                      cy={320 + node.py}
                      r={node.size * 1.9}
                      className="neural-sphere-node-glow"
                      style={{ opacity: node.depthScale * 0.36 }}
                    />
                    <circle
                      cx={320 + node.px}
                      cy={320 + node.py}
                      r={node.size}
                      className="neural-sphere-node"
                      style={{ opacity: 0.58 + node.depthScale * 0.42 }}
                    />
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </section>

        <section
          className="w-screen border-y px-6 py-[60px]"
          style={{
            background: '#0f0f1a',
            borderColor: 'rgba(255,255,255,0.06)',
            marginLeft: 'calc(50% - 50vw)',
            marginRight: 'calc(50% - 50vw)',
          }}
        >
          <div className="mx-auto flex max-w-6xl flex-col divide-y divide-white/10 md:flex-row md:divide-x md:divide-y-0">
            {stats.map((stat) => (
              <div key={stat.label} className="flex-1 px-6 py-8 text-center md:py-0">
                <div className="text-[32px] font-bold leading-none text-white">{stat.value}</div>
                <div className="mt-3 text-[14px] text-[#8a8f98]">{stat.label}</div>
              </div>
            ))}
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
    </>
  );
};

export default LandingPage;
