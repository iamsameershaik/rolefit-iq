import { useState } from 'react';
import { Copy, Check, Loader2, RefreshCw, AlertCircle, FileText, Shield } from 'lucide-react';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import type { TailoredCV, TailoredCVBullet, TailoredCVProjectBullet } from '../../types';
import { generateTailoredCV } from '../../lib/apiClient';

interface Props {
  sessionId: string | null;
  jobDocumentId: string | null;
  jobTitle: string;
  analysisAvailable: boolean;
}

function confidenceBadge(c: 'High' | 'Medium' | 'Low') {
  if (c === 'High')   return <Badge variant="success">High confidence</Badge>;
  if (c === 'Medium') return <Badge variant="warning">Medium confidence</Badge>;
  return <Badge variant="error">Low confidence</Badge>;
}

function buildPlainText(cv: TailoredCV): string {
  const lines: string[] = [];
  const r = cv.target_role;
  lines.push(`TAILORED CV — ${r.role_title}${r.company_name ? ` at ${r.company_name}` : ''}`);
  lines.push('');
  lines.push(`${cv.candidate.name}${cv.candidate.location ? ' · ' + cv.candidate.location : ''}`);
  lines.push(cv.candidate.headline);
  lines.push('');
  lines.push('PROFESSIONAL SUMMARY');
  lines.push(cv.tailored_cv.professional_summary);
  lines.push('');
  lines.push('CORE SKILLS');
  lines.push(cv.tailored_cv.core_skills.join(' · '));
  lines.push('');

  if (cv.tailored_cv.experience_bullets.length > 0) {
    lines.push('EXPERIENCE HIGHLIGHTS');
    for (const b of cv.tailored_cv.experience_bullets) {
      lines.push(`[${b.section}] ${b.tailored_bullet}`);
    }
    lines.push('');
  }

  if (cv.tailored_cv.project_bullets.length > 0) {
    lines.push('PROJECTS');
    for (const p of cv.tailored_cv.project_bullets) {
      lines.push(`[${p.project_name}] ${p.tailored_bullet}`);
    }
    lines.push('');
  }

  if (cv.tailored_cv.do_not_claim.length > 0) {
    lines.push('DO NOT CLAIM (missing from CV)');
    for (const d of cv.tailored_cv.do_not_claim) lines.push(`- ${d}`);
    lines.push('');
  }

  if (cv.tailored_cv.preparation_gaps.length > 0) {
    lines.push('PREPARATION GAPS');
    for (const g of cv.tailored_cv.preparation_gaps) lines.push(`→ ${g}`);
    lines.push('');
  }

  lines.push('GROUNDING NOTE');
  lines.push(cv.notes.grounding_summary);

  return lines.join('\n');
}

// Demo mode mock
const DEMO_TAILORED_CV: TailoredCV = {
  target_role: { role_title: 'Senior AI Engineer', company_name: 'Acme Corp', location: 'London, UK' },
  candidate: { name: 'Demo Candidate', headline: 'Full-Stack Engineer with AI/ML focus', location: 'London, UK' },
  tailored_cv: {
    professional_summary:
      'Full-stack engineer with demonstrated experience building LLM-powered applications using OpenAI APIs, RAG pipelines, and vector databases. Strong TypeScript/React foundations with production deployment experience on Supabase and Vercel. Evidence suggests transferable cloud architecture skills; Kubernetes not yet evidenced.',
    core_skills: ['TypeScript', 'React', 'Node.js', 'OpenAI API', 'RAG / Retrieval', 'Supabase', 'Postgres', 'Vite', 'REST APIs', 'Tailwind CSS'],
    experience_bullets: [
      {
        section: 'Experience',
        original_signal: 'Built RAG-based document search system',
        tailored_bullet: 'Designed and deployed a retrieval-augmented generation system using OpenAI text-embedding-3-small and pgvector, processing 50+ documents with semantic chunking, embedding, and cosine similarity retrieval.',
        evidence_basis: 'CV mentions RAG pipeline, embedding model, and pgvector directly.',
        confidence: 'High',
      },
      {
        section: 'Experience',
        original_signal: 'TypeScript/React front-end development',
        tailored_bullet: 'Developed responsive React/TypeScript interfaces with real-time state management, integrating AI-powered chat and evidence citation UIs aligned to production accessibility standards.',
        evidence_basis: 'CV demonstrates strong React/TypeScript production work.',
        confidence: 'High',
      },
    ],
    project_bullets: [
      {
        project_name: 'RoleFit IQ',
        tailored_bullet: 'End-to-end AI career intelligence platform: Supabase Edge Functions (Deno), OpenAI structured analysis, pgvector semantic retrieval, and explainable fit estimates.',
        evidence_basis: 'Project present in CV with supporting technical detail.',
        confidence: 'High',
      },
    ],
    keyword_alignment: ['LLM integration', 'RAG', 'vector search', 'TypeScript', 'React', 'REST APIs', 'Supabase', 'Postgres'],
    do_not_claim: ['Kubernetes deployment experience', 'AWS Bedrock production use', 'Enterprise security certifications'],
    preparation_gaps: [
      'Kubernetes: no evidence in CV — consider a personal project or certification before claiming.',
      'AWS Bedrock: not in CV — mention as a learning goal, not current capability.',
    ],
  },
  notes: {
    grounding_summary: 'Strong alignment on AI/ML tooling and full-stack TypeScript. Moderate alignment on cloud infrastructure. Missing Kubernetes and enterprise security experience.',
    limitations: ['Kubernetes not evidenced', 'No enterprise security certifications', 'Scale of production deployments unclear'],
  },
};

export default function TailoredCVGenerator({ sessionId, jobDocumentId, jobTitle, analysisAvailable }: Props) {
  const [tailoredCV, setTailoredCV]     = useState<TailoredCV | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);

  const isRealMode = !!sessionId && !!jobDocumentId;

  async function handleGenerate() {
    if (!isRealMode) {
      // Demo mode: show mock
      setTailoredCV(DEMO_TAILORED_CV);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await generateTailoredCV({ session_id: sessionId!, job_document_id: jobDocumentId! });
      if (result.success) {
        setTailoredCV(result.data.tailored_cv as TailoredCV);
      } else {
        setError(result.error.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!tailoredCV) return;
    await navigator.clipboard.writeText(buildPlainText(tailoredCV));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!tailoredCV && !loading) {
    return (
      <div className="bg-white border border-[#DDD8CE] rounded-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <FileText className="w-4 h-4 text-[#9A958F] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-1">
              Tailored CV generator
            </p>
            <p className="text-sm text-[#111111] font-semibold mb-1">
              Generate a JD-specific CV draft
            </p>
            <p className="text-xs text-[#6B6862] leading-relaxed max-w-lg">
              {!isRealMode
                ? 'Demo mode: see a sample tailored CV based on mock data.'
                : !analysisAvailable
                ? 'Run analysis first — the tailored CV uses your fit analysis as context.'
                : `Generate a grounded CV draft tailored to "${jobTitle}". Only evidence present in your uploaded CV will be used.`}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerate}
          disabled={isRealMode && !analysisAvailable}
        >
          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
          {isRealMode ? 'Generate tailored CV' : 'Preview demo tailored CV'}
        </Button>
        {isRealMode && !analysisAvailable && (
          <p className="font-mono text-[10px] text-[#92600A] mt-2">
            Run analysis first to enable tailored CV generation.
          </p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-[#DDD8CE] rounded-sm p-5 flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-[#6B6862] animate-spin flex-shrink-0" aria-hidden="true" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862] mb-0.5">
            Generating tailored CV…
          </p>
          <p className="text-xs text-[#9A958F]">
            Grounding output in your uploaded CV evidence. This takes 15–30 seconds.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-[#DDD8CE] rounded-sm p-5">
        <div className="flex items-start gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-[#D42E3A] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#D42E3A] mb-1">Generation failed</p>
            <p className="text-xs text-[#6B6862]">{error}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleGenerate}>
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  if (!tailoredCV) return null;
  const cv = tailoredCV.tailored_cv;

  return (
    <div className="space-y-4">
      {!isRealMode && (
        <div className="bg-[#FFF8E7] border border-[#FADDAA] rounded-sm px-4 py-2">
          <p className="font-mono text-[10px] text-[#92600A] uppercase tracking-widest">
            Demo mode · sample output only
          </p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-[#DDD8CE] rounded-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-1">
              Tailored CV draft
            </p>
            <h3 className="text-base font-bold text-[#111111] mb-0.5">
              {tailoredCV.target_role.role_title}
              {tailoredCV.target_role.company_name && (
                <span className="text-[#6B6862] font-normal"> at {tailoredCV.target_role.company_name}</span>
              )}
            </h3>
            <p className="text-xs text-[#6B6862]">
              {tailoredCV.candidate.name}
              {tailoredCV.candidate.location && ` · ${tailoredCV.candidate.location}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="secondary" size="sm" onClick={() => { setTailoredCV(null); setError(null); }}>
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Regenerate
            </Button>
            <Button variant="primary" size="sm" onClick={handleCopy}>
              {copied ? (
                <><Check className="w-3.5 h-3.5" aria-hidden="true" />Copied</>
              ) : (
                <><Copy className="w-3.5 h-3.5" aria-hidden="true" />Copy tailored CV</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Professional Summary */}
      <div className="bg-[#FBFAF6] border border-[#DDD8CE] rounded-sm p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-2">
          Professional summary
        </p>
        <p className="text-sm text-[#111111] leading-relaxed">{cv.professional_summary}</p>
      </div>

      {/* Core Skills */}
      {cv.core_skills.length > 0 && (
        <div className="bg-white border border-[#DDD8CE] rounded-sm p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-3">
            Core skills · evidenced in CV
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cv.core_skills.map((s) => (
              <span key={s} className="font-mono text-[10px] bg-[#EEFBF3] border border-[#B3EACC] text-[#1A7A41] px-2 py-0.5 rounded-sm">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience Bullets */}
      {cv.experience_bullets.length > 0 && (
        <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
          <div className="border-b border-[#DDD8CE] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F]">
              Experience highlights
            </p>
          </div>
          <div className="divide-y divide-[#DDD8CE]">
            {cv.experience_bullets.map((b: TailoredCVBullet, i) => (
              <div key={i} className="p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-[10px] text-[#6B6862] border border-[#DDD8CE] px-2 py-0.5 rounded-sm bg-[#F4F1EA]">
                    {b.section}
                  </span>
                  {confidenceBadge(b.confidence)}
                </div>
                <p className="text-sm text-[#111111] leading-relaxed mb-2">{b.tailored_bullet}</p>
                <p className="font-mono text-[10px] text-[#9A958F]">
                  Evidence basis: {b.evidence_basis}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Bullets */}
      {cv.project_bullets.length > 0 && (
        <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
          <div className="border-b border-[#DDD8CE] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F]">
              Project highlights
            </p>
          </div>
          <div className="divide-y divide-[#DDD8CE]">
            {cv.project_bullets.map((p: TailoredCVProjectBullet, i) => (
              <div key={i} className="p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-[10px] text-[#1D4FAA] border border-[#BFCFF8] px-2 py-0.5 rounded-sm bg-[#EEF4FF]">
                    {p.project_name}
                  </span>
                  {confidenceBadge(p.confidence)}
                </div>
                <p className="text-sm text-[#111111] leading-relaxed mb-2">{p.tailored_bullet}</p>
                <p className="font-mono text-[10px] text-[#9A958F]">
                  Evidence basis: {p.evidence_basis}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyword Alignment */}
      {cv.keyword_alignment.length > 0 && (
        <div className="bg-white border border-[#DDD8CE] rounded-sm p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-2">
            JD keywords evidenced in CV
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cv.keyword_alignment.map((k) => (
              <span key={k} className="font-mono text-[10px] bg-[#F4F1EA] border border-[#DDD8CE] text-[#111111] px-2 py-0.5 rounded-sm">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Do Not Claim */}
      {cv.do_not_claim.length > 0 && (
        <div className="bg-[#FEF0EF] border border-[#F8C2BE] rounded-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-3.5 h-3.5 text-[#D42E3A]" aria-hidden="true" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#D42E3A]">
              Do not claim · not evidenced in CV
            </p>
          </div>
          <ul className="space-y-1.5">
            {cv.do_not_claim.map((d, i) => (
              <li key={i} className="flex gap-2 text-xs text-[#6B6862] leading-relaxed">
                <span className="text-[#D42E3A] flex-shrink-0">—</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preparation Gaps */}
      {cv.preparation_gaps.length > 0 && (
        <div className="bg-[#FFF8E7] border border-[#FADDAA] rounded-sm p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#92600A] mb-2">
            Preparation gaps
          </p>
          <ul className="space-y-1.5">
            {cv.preparation_gaps.map((g, i) => (
              <li key={i} className="flex gap-2 text-xs text-[#6B6862] leading-relaxed">
                <span className="text-[#92600A] flex-shrink-0">→</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grounding Notes */}
      <div className="bg-[#F4F1EA] border border-[#DDD8CE] rounded-sm p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-2">
          Grounding note
        </p>
        <p className="text-xs text-[#6B6862] leading-relaxed mb-2">{tailoredCV.notes.grounding_summary}</p>
        {tailoredCV.notes.limitations.length > 0 && (
          <ul className="space-y-1">
            {tailoredCV.notes.limitations.map((l, i) => (
              <li key={i} className="font-mono text-[10px] text-[#9A958F] flex gap-2">
                <span>·</span>{l}
              </li>
            ))}
          </ul>
        )}
        <p className="font-mono text-[10px] text-[#9A958F] border-t border-[#DDD8CE] mt-3 pt-3">
          This draft only strengthens evidence already present in your CV. It does not invent experience.
        </p>
      </div>
    </div>
  );
}
