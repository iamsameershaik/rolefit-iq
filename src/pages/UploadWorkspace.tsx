import { useState } from 'react';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import Button from '../components/shared/Button';
import UploadCard from '../components/upload/UploadCard';
import ProcessingPipeline from '../components/upload/ProcessingPipeline';
import RetroColorBars from '../components/brand/RetroColorBars';
import type { DocumentSlot, Page, WorkspaceState } from '../types';
import { emptyWorkspace, sampleWorkspace } from '../data/mockData';
import { createSession, uploadDocument } from '../lib/apiClient';

interface UploadWorkspaceProps {
  onNavigate: (page: Page) => void;
  initialWorkspace?: WorkspaceState;
}

function cloneWorkspace(ws: WorkspaceState): WorkspaceState {
  return {
    cv: { ...ws.cv },
    jds: [{ ...ws.jds[0] }, { ...ws.jds[1] }, { ...ws.jds[2] }],
  };
}

export default function UploadWorkspace({ onNavigate, initialWorkspace }: UploadWorkspaceProps) {
  const [workspace, setWorkspace] = useState<WorkspaceState>(
    initialWorkspace ? cloneWorkspace(initialWorkspace) : cloneWorkspace(emptyWorkspace)
  );
  // Real session ID from Edge Function — null when using mock flow
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const allSlots: DocumentSlot[] = [workspace.cv, ...workspace.jds];
  const indexedCount = allSlots.filter((s) => s.status === 'indexed').length;
  const hasCV = workspace.cv.status !== 'empty';
  const hasAnyJD = workspace.jds.some((j) => j.status !== 'empty');
  const canAnalyse = hasCV && hasAnyJD;

  function handleSlotChange(id: string, updates: Partial<DocumentSlot>) {
    setWorkspace((prev) => {
      const next = cloneWorkspace(prev);
      if (next.cv.id === id) {
        Object.assign(next.cv, updates);
      } else {
        const jd = next.jds.find((j) => j.id === id);
        if (jd) Object.assign(jd, updates);
      }
      return next;
    });
  }

  function loadSample() {
    setWorkspace(cloneWorkspace(sampleWorkspace));
    setSessionId(null);
    setApiError(null);
  }

  /**
   * Attempt to create a real backend session and upload a document.
   * Falls back gracefully to mock mode if the API call fails.
   */
  async function handleRealUpload(slot: DocumentSlot, rawText: string) {
    setApiError(null);
    try {
      // Get or create a session for this workspace
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const sessionResult = await createSession({ source: 'web' });
        if (!sessionResult.success) {
          // API failed — stay in mock mode, show a non-blocking notice
          setApiError(`Backend session unavailable — using mock mode. (${sessionResult.error.message})`);
          return;
        }
        activeSessionId = sessionResult.data.session.id;
        setSessionId(activeSessionId);
      }

      // Upload the document
      const docType = slot.type === 'cv' ? 'resume' : 'job_description';
      const docResult = await uploadDocument({
        session_id: activeSessionId,
        document_type: docType,
        raw_text: rawText,
        title: slot.title,
        file_name: slot.fileName,
        job_index: slot.type === 'jd' ? (parseInt(slot.id.slice(-2)) || 1) : null,
      });

      if (!docResult.success) {
        setApiError(`Upload recorded in mock only. (${docResult.error.message})`);
        // Continue — mock state already updated by UploadCard
      }
      // Success — mock state drives the UI; real data is persisted in Supabase
    } catch {
      setApiError('Backend unavailable — using mock mode.');
    }
  }

  const totalChunks = allSlots.reduce((sum, s) => sum + (s.chunkCount ?? 0), 0);

  const activeStage =
    indexedCount === 0
      ? null
      : indexedCount < 4
      ? 'extract'
      : canAnalyse
      ? 'analyse'
      : 'chunk';

  return (
    <div className="bg-[#F4F1EA] min-h-screen">
      {/* Page header */}
      <div className="border-b border-[#DDD8CE] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-1.5 text-xs font-mono text-[#9A958F] hover:text-[#111111] transition-colors uppercase tracking-widest mb-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111] rounded-sm"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-3 h-3" aria-hidden="true" />
            back
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862] mb-1">
                {sessionId ? (
                  <span>
                    workspace ·{' '}
                    <span className="text-[#1A7A41]">{sessionId.slice(0, 8)}</span>
                  </span>
                ) : (
                  'workspace-01 · mock mode'
                )}
              </p>
              <h1 className="text-2xl font-bold text-[#111111] mb-1">
                Create your role intelligence workspace
              </h1>
              <p className="text-sm text-[#6B6862] max-w-xl">
                Add one CV and up to three job descriptions. RoleFit IQ will turn them into an
                explainable fit analysis.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={loadSample}>
                Load sample workspace
              </Button>
            </div>
          </div>

          {/* Pipeline */}
          <div className="mt-5">
            <ProcessingPipeline activeStage={activeStage ?? undefined} />
          </div>
        </div>
      </div>

      <RetroColorBars height="h-1.5" />

      {/* API error notice — non-blocking, mock mode continues */}
      {apiError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-[#FFF8E7] border border-[#FADDAA] rounded-sm px-4 py-2 flex items-center justify-between gap-4">
            <p className="font-mono text-[10px] text-[#92600A] uppercase tracking-widest">
              {apiError}
            </p>
            <button
              onClick={() => setApiError(null)}
              className="font-mono text-[10px] text-[#9A958F] hover:text-[#111111] uppercase tracking-widest focus-visible:outline-none"
              aria-label="Dismiss notice"
            >
              dismiss
            </button>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="bg-white border-b border-[#DDD8CE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 py-3 overflow-x-auto">
            {[
              { label: 'Documents', value: `${indexedCount} / 4` },
              { label: 'Evidence chunks', value: totalChunks > 0 ? String(totalChunks) : '—' },
              { label: 'CV', value: workspace.cv.status === 'indexed' ? 'indexed' : 'pending' },
              {
                label: 'JDs',
                value: `${workspace.jds.filter((j) => j.status !== 'empty').length} of 3`,
              },
              {
                label: 'Backend',
                value: sessionId ? 'connected' : 'mock',
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest">
                  {item.label}
                </span>
                <span className={`font-mono text-xs ${item.label === 'Backend' && sessionId ? 'text-[#1A7A41]' : 'text-[#111111]'}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <UploadCard
            slot={workspace.cv}
            onStatusChange={handleSlotChange}
            onRealUpload={handleRealUpload}
          />
          {workspace.jds.map((jd) => (
            <UploadCard
              key={jd.id}
              slot={jd}
              onStatusChange={handleSlotChange}
              onRealUpload={handleRealUpload}
            />
          ))}
        </div>

        {/* Privacy note */}
        <div className="mt-6 bg-white border border-[#DDD8CE] rounded-sm p-4 flex gap-3">
          <Info className="w-4 h-4 text-[#9A958F] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-xs text-[#6B6862] leading-relaxed">
              <span className="font-semibold text-[#111111]">Privacy: </span>
              Documents are used only for this analysis workspace. Production deployments enforce
              retention, deletion, and access controls. Use the delete session action to invoke the
              right-to-delete pathway.
            </p>
            <p className="text-xs text-[#6B6862] leading-relaxed">
              <span className="font-semibold text-[#111111]">Accessibility: </span>
              Interface designed with keyboard-friendly controls, labelled fields, and high-contrast
              states.
            </p>
          </div>
        </div>

        {/* Analyse CTA */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#050505] border border-[#1a1a1a] rounded-sm px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862] mb-1">
              Ready to analyse?
            </p>
            <p className="text-sm text-[#F4F1EA]">
              {canAnalyse
                ? `${indexedCount} document${indexedCount !== 1 ? 's' : ''} indexed · ${totalChunks} evidence chunks ready.`
                : 'Upload a CV and at least one job description to begin.'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="md"
            disabled={!canAnalyse}
            onClick={() => canAnalyse && onNavigate('results')}
            className="border-[#333] text-[#F4F1EA] hover:border-[#F4F1EA] hover:text-[#F4F1EA] hover:bg-transparent disabled:opacity-30 whitespace-nowrap"
          >
            Analyse role fit
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Compliance notes */}
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            'GDPR-ready architecture',
            'Evidence-grounded recommendations',
            'No hiring guarantees',
            'WCAG-aware interface',
          ].map((note) => (
            <span
              key={note}
              className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest border border-[#DDD8CE] px-2 py-1 rounded-sm bg-white"
            >
              {note}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
