/**
 * Prints the simulator's numbers for every template — a quick sanity check
 * after changing prices or engine logic.  Usage: npm run sim:report
 */
import { TEMPLATES } from '@cloudlab/catalog';
import { simulate } from '@cloudlab/sim-engine';

for (const t of TEMPLATES) {
  const r = simulate(t.design);
  const az = simulate(t.design, { azDown: true }).totals.survives;
  console.log(
    `\n== ${t.id}: $${r.totals.monthlyUsd.toFixed(2)}/mo  latency=${r.totals.latencyMs.toFixed(1)}ms  ` +
      `availability=${(r.totals.availability * 100).toFixed(4)}%  maxPeak=${r.totals.maxPeakRps?.toFixed(0) ?? '∞'}  survivesAzDown=${az}`,
  );
  for (const n of Object.values(r.nodes)) {
    console.log(
      `  ${n.service.padEnd(12)} $${n.monthlyUsd.toFixed(2).padStart(9)}  util=${(n.utilization * 100).toFixed(0).padStart(3)}%  ${n.model.summary}`,
    );
  }
  console.log('  findings:', r.findings.map((f) => f.id).join(', ') || '(none)');
}
