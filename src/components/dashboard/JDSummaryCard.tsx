import Badge from '../shared/Badge';
import Button from '../shared/Button';
import type { FitTier, EvidenceStrength, RiskLevel } from '../../types';

interface Props {
  id: string;
  index: number;
  title: string;
  company: string;
  fitTier: FitTier;
  explainableFitEstimate: number;
  evidenceStrength: EvidenceStrength;
  riskLevel: RiskLevel;
  topMatchedSkills: string[];
  topGap: string;
  onViewDetail: () => void;
}

function fitColor(score: number) {
  if (score >= 80) return '#1A7A41';
  if (score >= 70) return '#1D4FAA';
  return '#92600A';
}

function tierVariant(tier: FitTier) {
  if (tier === 'Strong') return 'success';
  if (tier === 'Moderate') return 'info';
  return 'warning';
}

function riskVariant(level: RiskLevel) {
  if (level === 'Low') return 'success';
  if (level === 'Medium') return 'warning';
  return 'error';
}

function evidenceVariant(ev: EvidenceStrength) {
  if (ev === 'Strong') return 'success';
  if (ev === 'Moderate') return 'info';
  return 'warning';
}

export default function JDSummaryCard({
  id,
  index,
  title,
  company,
  fitTier,
  explainableFitEstimate,
  evidenceStrength,
  riskLevel,
  topMatchedSkills,
  topGap,
  onViewDetail,
}: Props) {
  const color = fitColor(explainableFitEstimate);

  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden flex flex-col">
      <div className="border-b border-[#DDD8CE] px-4 py-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          {id.toUpperCase()}
        </span>
        <Badge variant={tierVariant(fitTier)}>{fitTier}</Badge>
      </div>

      <div className="p-4 flex-1">
        <p className="font-mono text-[10px] text-[#9A958F] mb-0.5">JD {index}</p>
        <h3 className="text-sm font-bold text-[#111111] mb-0.5">{title}</h3>
        <p className="text-xs text-[#6B6862] mb-4">{company}</p>

        {/* Fit score */}
        <div className="mb-4">
          <div className="flex items-end justify-between mb-1">
            <span className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest">
              Explainable fit estimate
            </span>
            <span className="font-mono text-sm font-bold" style={{ color }}>
              {explainableFitEstimate}
            </span>
          </div>
          <div className="h-1 bg-[#F4F1EA] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${explainableFitEstimate}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {/* Signals */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <p className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest mb-1">Evidence</p>
            <Badge variant={evidenceVariant(evidenceStrength)}>{evidenceStrength}</Badge>
          </div>
          <div>
            <p className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest mb-1">Risk</p>
            <Badge variant={riskVariant(riskLevel)}>{riskLevel}</Badge>
          </div>
        </div>

        {/* Matched skills */}
        <div className="mb-3">
          <p className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest mb-1.5">
            Top matched
          </p>
          <div className="flex flex-wrap gap-1">
            {topMatchedSkills.slice(0, 3).map((s) => (
              <Badge key={s} variant="default">{s}</Badge>
            ))}
          </div>
        </div>

        {/* Top gap */}
        <div>
          <p className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest mb-1">
            Top gap
          </p>
          <p className="text-xs text-[#D42E3A] font-mono">{topGap}</p>
        </div>
      </div>

      <div className="border-t border-[#DDD8CE] px-4 py-3">
        <Button variant="secondary" size="sm" className="w-full" onClick={onViewDetail}>
          View role detail
        </Button>
      </div>
    </div>
  );
}
