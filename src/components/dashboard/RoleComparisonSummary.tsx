import type { JDAnalysis } from '../../types';

interface Props {
  analyses: JDAnalysis[];
}

export default function RoleComparisonSummary({ analyses }: Props) {
  if (analyses.length < 2) return null;

  const sorted = [...analyses].sort((a, b) => b.explainableFitEstimate - a.explainableFitEstimate);
  const bestFit = sorted[0];

  const evidenceOrder: Record<string, number> = { Strong: 3, Moderate: 2, Weak: 1 };
  const bestEvidence = [...analyses].sort(
    (a, b) => (evidenceOrder[b.evidenceStrength] ?? 0) - (evidenceOrder[a.evidenceStrength] ?? 0)
  )[0];

  const priorityOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
  const highestPrep = [...analyses].sort(
    (a, b) => (priorityOrder[b.preparationPriority] ?? 0) - (priorityOrder[a.preparationPriority] ?? 0)
  )[0];

  // Most common gap across analyses
  const gapScores: Record<string, number> = {};
  for (const a of analyses) {
    for (const skill of a.missingSkills) {
      gapScores[skill] = (gapScores[skill] ?? 0) + 1;
    }
    for (const gap of a.skillGaps.filter(g => g.impact === 'High')) {
      gapScores[gap.skill] = (gapScores[gap.skill] ?? 0) + 0.5;
    }
  }
  const sharedGapEntry = Object.entries(gapScores)
    .filter(([, count]) => count >= 1)
    .sort(([, a], [, b]) => b - a)[0];
  const sharedGap      = sharedGapEntry?.[0];
  const sharedGapCount = sharedGapEntry ? Math.ceil(sharedGapEntry[1]) : 0;

  const items = [
    {
      label: 'Strongest fit',
      value: bestFit.title,
      sub: `${bestFit.explainableFitEstimate}% · ${bestFit.fitTier}`,
      accent: '#1A7A41',
      border: '#B3EACC',
      bg: '#EEFBF3',
    },
    {
      label: 'Best evidence',
      value: bestEvidence.title,
      sub: `${bestEvidence.evidenceStrength} evidence strength`,
      accent: '#1D4FAA',
      border: '#BFCFF8',
      bg: '#EEF4FF',
    },
    {
      label: 'Needs preparation',
      value: highestPrep.title,
      sub: `${highestPrep.preparationPriority} priority`,
      accent: '#92600A',
      border: '#FADDAA',
      bg: '#FFF8E7',
    },
    {
      label: 'Shared gap',
      value: sharedGap ?? 'No common gap found',
      sub: sharedGap
        ? `Affects ${sharedGapCount} of ${analyses.length} roles`
        : 'Gaps are role-specific',
      accent: '#D42E3A',
      border: '#F8C2BE',
      bg: '#FEF0EF',
    },
  ];

  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
      <div className="border-b border-[#DDD8CE] px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          Role comparison snapshot · {analyses.length} roles
        </span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#F4F1EA]">
        {items.map((item) => (
          <div key={item.label} className="px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-1.5">
              {item.label}
            </p>
            <div
              className="inline-block font-mono text-[10px] border rounded-sm px-1.5 py-0.5 mb-1.5 max-w-full truncate"
              style={{ color: item.accent, borderColor: item.border, background: item.bg }}
              title={item.value}
            >
              {item.value.length > 22 ? item.value.slice(0, 20) + '…' : item.value}
            </div>
            <p className="font-mono text-[10px] text-[#9A958F]">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
