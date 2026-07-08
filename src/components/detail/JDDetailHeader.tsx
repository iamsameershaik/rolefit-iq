import type { JDAnalysis } from '../../types';
import Badge from '../shared/Badge';

interface Props {
  analysis: JDAnalysis;
}

function fitColor(score: number) {
  if (score >= 80) return '#1A7A41';
  if (score >= 70) return '#1D4FAA';
  return '#92600A';
}

export default function JDDetailHeader({ analysis }: Props) {
  const color = fitColor(analysis.explainableFitEstimate);

  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-1">
            {analysis.id.toUpperCase()} · {analysis.company}
          </p>
          <h2 className="text-xl font-bold text-[#111111] mb-3">{analysis.title}</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant={analysis.fitTier === 'Strong' ? 'success' : analysis.fitTier === 'Moderate' ? 'info' : 'warning'}>
              {analysis.fitTier}
            </Badge>
            <Badge variant={analysis.evidenceStrength === 'Strong' ? 'success' : analysis.evidenceStrength === 'Moderate' ? 'info' : 'warning'}>
              Evidence: {analysis.evidenceStrength}
            </Badge>
            <Badge variant={analysis.riskLevel === 'Low' ? 'success' : analysis.riskLevel === 'Medium' ? 'warning' : 'error'}>
              Risk: {analysis.riskLevel}
            </Badge>
            <Badge variant={analysis.preparationPriority === 'Low' ? 'muted' : analysis.preparationPriority === 'Medium' ? 'warning' : 'error'}>
              Prep: {analysis.preparationPriority}
            </Badge>
          </div>
        </div>

        {/* Score */}
        <div className="flex-shrink-0 text-right">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-1">
            Explainable fit estimate
          </p>
          <p className="font-mono text-4xl font-bold leading-none" style={{ color }}>
            {analysis.explainableFitEstimate}
          </p>
          <div className="w-24 h-1 bg-[#F4F1EA] rounded-full mt-2 ml-auto overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${analysis.explainableFitEstimate}%`, backgroundColor: color }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
