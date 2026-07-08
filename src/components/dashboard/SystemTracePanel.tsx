import Badge from '../shared/Badge';

interface Props {
  documentsIndexed: number;
  evidenceChunks: number;
}

export default function SystemTracePanel({ documentsIndexed, evidenceChunks }: Props) {
  const rows = [
    { label: 'Documents indexed', value: String(documentsIndexed) },
    { label: 'Evidence chunks', value: String(evidenceChunks) },
    { label: 'Retrieval mode', value: 'Mocked vector retrieval' },
    { label: 'Assistant status', value: 'Grounded mode ready' },
    { label: 'Model provider', value: 'OpenAI-ready adapter' },
  ];

  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
      <div className="border-b border-[#DDD8CE] px-5 py-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          System trace · RFQ-TRACE-01
        </span>
        <Badge variant="indexed">live</Badge>
      </div>
      <div className="p-5 space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4">
            <span className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest flex-shrink-0">
              {r.label}
            </span>
            <span className="font-mono text-[10px] text-[#111111] text-right">{r.value}</span>
          </div>
        ))}
        <div className="border-t border-[#DDD8CE] pt-3 space-y-1.5">
          {['GDPR-ready design', 'WCAG-aware interface'].map((note) => (
            <p key={note} className="font-mono text-[10px] text-[#9A958F]">
              — {note}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
