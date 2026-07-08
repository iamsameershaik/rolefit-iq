import type { CandidateProfile } from '../../types';
import Badge from '../shared/Badge';

interface Props {
  candidate: CandidateProfile;
}

export default function CandidateSummaryCard({ candidate }: Props) {
  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
      <div className="border-b border-[#DDD8CE] px-5 py-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          CANDIDATE · CV-01
        </span>
        <Badge variant="success">Active evidence</Badge>
      </div>
      <div className="p-5">
        <h2 className="text-xl font-bold text-[#111111] mb-0.5">{candidate.name}</h2>
        <p className="text-sm text-[#6B6862] mb-4">{candidate.positioning}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Location', value: candidate.location },
            { label: 'Role signals', value: `0${candidate.roleSignalsDetected}` },
            { label: 'CV chunks', value: String(candidate.cvChunksIndexed) },
            { label: 'Evidence total', value: String(candidate.evidenceChunks) },
          ].map((item) => (
            <div key={item.label}>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-0.5">
                {item.label}
              </p>
              <p className="font-mono text-xs text-[#111111]">{item.value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-2">
            Primary themes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {candidate.primaryThemes.map((theme) => (
              <Badge key={theme} variant="default">
                {theme}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
