import {
  calculateConcisenessScore,
  calculateFillerScore,
  clamp,
  computeSynapseTotal,
  scoreToGrade,
} from '../utils/synapseScoring.js';

const tests = [
  {
    name: 'conciseness prefers focused responses',
    run: () => {
      const concise = 'I led a migration that cut cloud costs by 22% while improving API latency by 18% in two quarters.';
      const rambling = Array.from({ length: 220 }, () => 'word').join(' ');
      return calculateConcisenessScore(concise) > calculateConcisenessScore(rambling);
    },
  },
  {
    name: 'filler score penalizes filler-heavy responses',
    run: () => {
      const clean = 'I delivered three initiatives that improved churn and lifted activation by ten percent.';
      const filler = 'Um I kind of like basically delivered things and you know it was actually good.';
      return calculateFillerScore(clean) > calculateFillerScore(filler);
    },
  },
  {
    name: 'grade mapping is deterministic',
    run: () => scoreToGrade(95) === 'A+' && scoreToGrade(88) === 'A' && scoreToGrade(40) === 'F',
  },
  {
    name: 'clamp bounds values',
    run: () => clamp(500, 0, 100) === 100 && clamp(-5, 0, 100) === 0,
  },
  {
    name: 'total score contains all required components',
    run: () => {
      const out = computeSynapseTotal({
        structure: 18,
        clarity: 13,
        impact: 12,
        confidence: 14,
        relevance: 13,
        answer: 'I led a team of five to launch a pricing redesign in six weeks and increased conversion by 14%.',
      });
      return (
        typeof out.synapse_total_score === 'number' &&
        out.synapse_total_score > 0 &&
        out.pillar_breakdown.conciseness >= 0 &&
        out.pillar_breakdown.filler_density >= 0 &&
        out.percentile >= 1 &&
        out.percentile <= 99
      );
    },
  },
];

let failures = 0;
for (const test of tests) {
  const ok = test.run();
  if (ok) {
    console.log(`PASS: ${test.name}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${test.name}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${tests.length} scoring tests passed.`);
