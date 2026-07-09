import type { MatrixSkill, SkillSignal, JDAnalysis, EvidenceType } from '../../types';

// ── Shared dot indicator ──────────────────────────────────────────

const DOT_FILLED = '●';
const DOT_EMPTY  = '○';

function dots(signal: SkillSignal): { filled: number; total: number; color: string } {
  const map: Record<SkillSignal, { filled: number; color: string }> = {
    strong:   { filled: 4, color: '#1A7A41' },
    moderate: { filled: 3, color: '#1D4FAA' },
    weak:     { filled: 2, color: '#92600A' },
    missing:  { filled: 0, color: '#DDD8CE' },
  };
  return { ...map[signal], total: 4 };
}

function DotIndicator({ signal }: { signal: SkillSignal }) {
  const { filled, total, color } = dots(signal);
  return (
    <span className="font-mono text-[11px] tracking-tight" style={{ color }} aria-label={signal}>
      {Array.from({ length: total }).map((_, i) =>
        i < filled
          ? <span key={i}>{DOT_FILLED}</span>
          : <span key={i} style={{ color: '#DDD8CE' }}>{DOT_EMPTY}</span>
      )}
    </span>
  );
}

// ── Dynamic signal derivation from JDAnalysis ─────────────────────

const SKILL_ROWS: { label: string; keywords: string[] }[] = [
  { label: 'Core technical skills',  keywords: ['typescript', 'javascript', 'python', 'engineering', 'software', 'code'] },
  { label: 'LLM / API integration',  keywords: ['llm', 'gpt', 'openai', 'anthropic', 'language model', 'ai model', 'api integration'] },
  { label: 'RAG / retrieval',        keywords: ['rag', 'retrieval', 'embedding', 'vector', 'pgvector', 'semantic', 'chunking'] },
  { label: 'Frontend / product',     keywords: ['react', 'frontend', 'product', 'interface', 'ui', 'next.js', 'dashboard'] },
  { label: 'Data / backend',         keywords: ['python', 'backend', 'database', 'postgres', 'sql', 'pipeline', 'data engineering'] },
  { label: 'Cloud / deployment',     keywords: ['aws', 'azure', 'gcp', 'cloud', 'docker', 'kubernetes', 'deployment', 'serverless'] },
  { label: 'Testing / evaluation',   keywords: ['testing', 'evaluation', 'benchmark', 'test', 'quality', 'qa', 'validation'] },
  { label: 'Observability',          keywords: ['observability', 'monitoring', 'logging', 'tracing', 'alerting', 'metrics', 'datadog'] },
  { label: 'Client delivery',        keywords: ['client', 'stakeholder', 'delivery', 'consulting', 'engagement', 'communication'] },
  { label: 'Domain fit',             keywords: ['ai', 'automation', 'machine learning', 'ml', 'nlp', 'intelligence'] },
];

function evidenceTypeToSignal(et: EvidenceType): SkillSignal {
  switch (et) {
    case 'Direct':       return 'strong';
    case 'Adjacent':     return 'moderate';
    case 'Transferable': return 'weak';
    case 'Missing':      return 'missing';
  }
}

function deriveSignal(analysis: JDAnalysis, keywords: string[]): SkillSignal {
  const match = (text: string) => keywords.some(k => text.toLowerCase().includes(k));

  // experience_alignment is the most authoritative source (structured per-requirement)
  const alignMatch = analysis.experienceAlignment?.find(ea => match(ea.requirement));
  if (alignMatch) return evidenceTypeToSignal(alignMatch.evidenceType);

  const inTopStrengths  = analysis.topStrengths.some(s => match(s));
  const inMatchedSkills = analysis.matchedSkills.some(s => match(s));
  const inMissingSkills = analysis.missingSkills.some(s => match(s));
  const gapHigh = analysis.skillGaps.some(g => match(g.skill) && g.impact === 'High');
  const gapAny  = analysis.skillGaps.some(g => match(g.skill));

  if (inTopStrengths && !inMissingSkills) return 'strong';
  if (inMatchedSkills && !gapHigh && !inMissingSkills) return 'moderate';
  if (inMissingSkills && !inMatchedSkills && !inTopStrengths) return 'missing';
  if (gapHigh && !inMatchedSkills) return 'weak';
  if (inMatchedSkills && gapAny) return 'moderate';
  if (keywords.includes('ai') && analysis.fitTier === 'Strong') return 'moderate';
  return 'weak';
}

function shortLabel(title: string, index: number): string {
  const words = title.split(/\s+/);
  const short = words.slice(0, 2).join(' ');
  return short.length > 14 ? `JD ${index + 1}` : short;
}

// ── Component ─────────────────────────────────────────────────────

type LegacyProps  = { skills: MatrixSkill[]; analyses?: never };
type DynamicProps = { analyses: JDAnalysis[]; skills?: never };
type Props        = LegacyProps | DynamicProps;

export default function RoleFitMatrix(props: Props) {
  const isDynamic = 'analyses' in props && !!props.analyses;

  if (isDynamic) {
    const analyses = props.analyses!;
    return (
      <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
        <div className="border-b border-[#DDD8CE] px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
            RoleFit Matrix · evidence signal map
          </span>
          <span className="font-mono text-[10px] text-[#9A958F]">
            <span style={{ color: '#1A7A41' }}>●●●●</span> direct ·{' '}
            <span style={{ color: '#1D4FAA' }}>●●●</span> adjacent ·{' '}
            <span style={{ color: '#92600A' }}>●●</span> transferable ·{' '}
            <span style={{ color: '#DDD8CE' }}>○</span> missing
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#DDD8CE]">
                <th className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] px-5 py-2.5 font-medium w-44">
                  Skill area
                </th>
                {analyses.map((a, i) => (
                  <th
                    key={a.id}
                    className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] px-4 py-2.5 font-medium text-center min-w-[90px]"
                    title={a.title}
                  >
                    {shortLabel(a.title, i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SKILL_ROWS.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FBFAF6]'}>
                  <td className="px-5 py-2.5 text-xs text-[#111111] font-medium border-b border-[#F4F1EA]">
                    {row.label}
                  </td>
                  {analyses.map((analysis) => (
                    <td key={analysis.id} className="px-4 py-2.5 text-center border-b border-[#F4F1EA]">
                      <DotIndicator signal={deriveSignal(analysis, row.keywords)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Legacy demo mode ────────────────────────────────────────────
  const skills = props.skills!;
  const cols = [
    { key: 'fde',          label: 'FDE' },
    { key: 'aiSolutions',  label: 'AI Sol.' },
    { key: 'aiAutomation', label: 'AI Auto.' },
  ] as const;

  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
      <div className="border-b border-[#DDD8CE] px-5 py-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          RoleFit Matrix · evidence signal map
        </span>
        <span className="font-mono text-[10px] text-[#9A958F]">
          ●●●● strong · ●●● mod · ●● weak · ○ missing
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#DDD8CE]">
              <th className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] px-5 py-2.5 font-medium w-48">
                Skill
              </th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] px-4 py-2.5 font-medium text-center"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skills.map((row, i) => (
              <tr key={row.skill} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FBFAF6]'}>
                <td className="px-5 py-2.5 text-xs text-[#111111] font-medium border-b border-[#F4F1EA]">
                  {row.skill}
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="px-4 py-2.5 text-center border-b border-[#F4F1EA]">
                    <DotIndicator signal={row[c.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
