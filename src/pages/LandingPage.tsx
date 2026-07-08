import { ArrowRight, ChevronRight } from 'lucide-react';
import RetroColorBars from '../components/brand/RetroColorBars';
import DotMatrix from '../components/brand/DotMatrix';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import { heroMetrics } from '../data/mockData';
import type { Page } from '../types';

interface LandingPageProps {
  onNavigate: (page: Page) => void;
}

const workflowSteps = [
  { num: '01', title: 'Upload CV + JDs', desc: 'Add your resume and up to three job descriptions.' },
  { num: '02', title: 'Extract + chunk documents', desc: 'Documents are parsed into structured evidence units.' },
  { num: '03', title: 'Retrieve evidence', desc: 'Relevant passages are retrieved per role and signal type.' },
  { num: '04', title: 'Generate fit intelligence', desc: 'Explainable fit estimates, gap analysis, and risk flags.' },
  { num: '05', title: 'Ask grounded questions', desc: 'A retrieval-grounded assistant answers role-specific queries.' },
];

const qualityBadges = [
  'Grounded AI',
  'Evidence-backed',
  'No hiring guarantees',
  'GDPR-ready design',
  'WCAG-aware interface',
];

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="bg-[#F4F1EA]">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-0" id="product">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-8">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862] border border-[#DDD8CE] px-2 py-1 rounded-sm">
              v0.1 — prototype
            </span>
            <span className="font-mono text-[10px] text-[#9A958F]">RFQ-2026-001</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#111111] leading-[1.1] mb-6">
            Explainable career intelligence for serious candidates.
          </h1>

          <p className="text-lg text-[#6B6862] leading-relaxed mb-8 max-w-2xl">
            Upload one CV and up to three job descriptions. RoleFit IQ analyses fit, evidence
            strength, skill gaps, risk flags, and interview preparation using grounded AI retrieval.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigate('upload')}
            >
              Start role analysis
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onNavigate('upload')}
            >
              Load sample workspace
            </Button>
          </div>

          {/* Quality badges */}
          <div className="flex flex-wrap gap-2">
            {qualityBadges.map((b) => (
              <Badge key={b} variant="muted">
                {b}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Retro color bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <RetroColorBars height="h-2.5" />
      </div>

      {/* Metrics strip */}
      <section className="border-y border-[#DDD8CE] bg-white mt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#DDD8CE]">
            {heroMetrics.map((m) => (
              <div key={m.id} className="py-5 px-6 first:pl-0 last:pr-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-1">
                  {m.id}
                </p>
                <p className="text-2xl font-bold text-[#111111] leading-none mb-1">{m.value}</p>
                <p className="text-xs text-[#6B6862]">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product preview cockpit */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" id="demo">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862] mb-4">
              Analysis cockpit preview
            </p>
            <h2 className="text-3xl font-bold text-[#111111] mb-4 leading-tight">
              Intelligence, not just a score.
            </h2>
            <p className="text-[#6B6862] leading-relaxed mb-6">
              Every output is grounded in retrieved evidence from your documents. No black-box
              scoring. No inflated confidence. Explainable fit estimates built on document retrieval.
            </p>
            <div className="space-y-3">
              {[
                { label: 'Explainable fit estimate', val: '78 / 100', color: 'bg-[#1A7A41]' },
                { label: 'Evidence strength', val: 'Strong', color: 'bg-[#1D4FAA]' },
                { label: 'Risk flags', val: '2 identified', color: 'bg-[#92600A]' },
                { label: 'Preparation priority', val: '3 areas', color: 'bg-[#8C2377]' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between bg-white border border-[#DDD8CE] rounded-sm px-4 py-3"
                >
                  <span className="text-sm text-[#6B6862]">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} aria-hidden="true" />
                    <span className="font-mono text-xs text-[#111111]">{item.val}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mock cockpit card */}
          <div className="bg-[#050505] rounded-sm border border-[#1a1a1a] overflow-hidden">
            <div className="border-b border-[#1a1a1a] px-5 py-3 flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#6B6862] uppercase tracking-widest">
                RFQ · workspace-01
              </span>
              <div className="flex gap-1.5" aria-hidden="true">
                <div className="w-2 h-2 rounded-full bg-[#D42E3A] opacity-80" />
                <div className="w-2 h-2 rounded-full bg-[#F5C518] opacity-80" />
                <div className="w-2 h-2 rounded-full bg-[#1A7A41] opacity-80" />
              </div>
            </div>

            <RetroColorBars height="h-1.5" />

            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#6B6862] uppercase tracking-widest">
                  Candidate
                </span>
                <span className="font-mono text-[10px] text-[#F4F1EA]">Sample Candidate</span>
              </div>

              {[
                { role: 'Forward Deployed Engineer', fit: 82, color: '#1A7A41' },
                { role: 'AI Solutions Engineer', fit: 74, color: '#1D4FAA' },
                { role: 'AI Automation Consultant', fit: 68, color: '#92600A' },
              ].map((r) => (
                <div
                  key={r.role}
                  className="bg-[#0B0B0B] border border-[#1a1a1a] rounded-sm p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#F4F1EA] font-medium">{r.role}</span>
                    <span className="font-mono text-xs" style={{ color: r.color }}>
                      {r.fit}
                    </span>
                  </div>
                  <div className="h-0.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${r.fit}%`, backgroundColor: r.color }}
                    />
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <DotMatrix rows={3} cols={20} className="opacity-40" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        className="border-t border-[#DDD8CE] bg-white py-16"
        id="workflow"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862] mb-2">
            How it works
          </p>
          <h2 className="text-3xl font-bold text-[#111111] mb-10">Five-stage pipeline.</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-[#DDD8CE] border border-[#DDD8CE] rounded-sm overflow-hidden">
            {workflowSteps.map((step) => (
              <div key={step.num} className="bg-white p-5">
                <p className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest mb-3">
                  {step.num}
                </p>
                <h3 className="text-sm font-semibold text-[#111111] mb-2">{step.title}</h3>
                <p className="text-xs text-[#6B6862] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" id="architecture">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862] mb-2">
              Architecture
            </p>
            <h2 className="text-2xl font-bold text-[#111111] mb-4">Retrieval-grounded design.</h2>
            <p className="text-sm text-[#6B6862] leading-relaxed">
              RoleFit IQ uses a document-first retrieval pipeline. Every claim in the analysis
              traces back to a specific passage in your uploaded documents — no hallucination,
              no generalisation.
            </p>
          </div>
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
            {[
              {
                id: 'ARC-01',
                title: 'Document ingestion',
                desc: 'CV and JDs parsed, chunked into evidence units.',
              },
              {
                id: 'ARC-02',
                title: 'Vector retrieval',
                desc: 'Semantic search matches CV evidence to JD requirements.',
              },
              {
                id: 'ARC-03',
                title: 'Fit scoring',
                desc: 'Explainable estimates with evidence citations, not black-box numbers.',
              },
              {
                id: 'ARC-04',
                title: 'Grounded assistant',
                desc: 'Q&A grounded in your documents. Sources always visible.',
              },
            ].map((item) => (
              <div key={item.id} className="bg-white border border-[#DDD8CE] rounded-sm p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-2">
                  {item.id}
                </p>
                <h3 className="text-sm font-semibold text-[#111111] mb-1">{item.title}</h3>
                <p className="text-xs text-[#6B6862] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-[#050505] border-t border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <RetroColorBars height="h-1" />
          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-[#F4F1EA] mb-2">
                Ready to analyse your fit?
              </h2>
              <p className="text-sm text-[#6B6862]">
                Upload your CV and up to three roles. Analysis takes under a minute.
              </p>
            </div>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => onNavigate('upload')}
              className="border-[#333] text-[#F4F1EA] hover:border-[#F4F1EA] hover:text-[#F4F1EA] hover:bg-transparent whitespace-nowrap"
            >
              Start role analysis
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#DDD8CE] bg-[#F4F1EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <span className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest">
            ROLEFIT IQ ▦ — prototype build v0.1
          </span>
          <div className="flex flex-wrap gap-4">
            {['GDPR-ready architecture', 'WCAG-aware interface', 'No hiring guarantees'].map((note) => (
              <span key={note} className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest">
                {note}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
