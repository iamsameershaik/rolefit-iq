import Badge from '../shared/Badge';

interface Props {
  documentsIndexed: number;
  evidenceChunks: number;
  isRealMode?: boolean;
  sessionId?: string;
  sessionStatus?: string;
  jdCount?: number;
}

export default function SystemTracePanel({
  documentsIndexed,
  evidenceChunks,
  isRealMode = false,
  sessionId,
  sessionStatus,
  jdCount,
}: Props) {
  const rows = [
    {
      label: 'Documents indexed',
      value: String(documentsIndexed),
    },
    {
      label: 'Evidence chunks',
      value: evidenceChunks > 0 ? String(evidenceChunks) : '—',
    },
    ...(isRealMode && jdCount !== undefined ? [{
      label: 'JDs analysed',
      value: String(jdCount),
    }] : []),
    {
      label: 'Retrieval mode',
      value: isRealMode ? 'Supabase pgvector' : 'Mock demo workspace',
    },
    {
      label: 'Assistant status',
      value: isRealMode ? 'Grounded retrieval active' : 'Demo mode',
    },
    {
      label: 'Model provider',
      value: isRealMode ? 'OpenAI active' : 'OpenAI-ready adapter',
    },
    ...(isRealMode && sessionStatus ? [{
      label: 'Session status',
      value: sessionStatus,
    }] : []),
  ];

  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
      <div className="border-b border-[#DDD8CE] px-5 py-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          System trace · RFQ-TRACE-01
        </span>
        <Badge variant={isRealMode ? 'indexed' : 'muted'}>{isRealMode ? 'live' : 'demo'}</Badge>
      </div>
      <div className="p-5 space-y-3">
        {isRealMode && sessionId && (
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest flex-shrink-0">
              Session
            </span>
            <span className="font-mono text-[10px] text-[#1A7A41] text-right">{sessionId.slice(0, 8)}</span>
          </div>
        )}
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
