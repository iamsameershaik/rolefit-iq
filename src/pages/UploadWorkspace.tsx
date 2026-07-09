import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Info, Loader2 } from 'lucide-react';
import Button from '../components/shared/Button';
import UploadCard from '../components/upload/UploadCard';
import ProcessingPipeline from '../components/upload/ProcessingPipeline';
import RetroColorBars from '../components/brand/RetroColorBars';
import type { DocumentSlot, Page, WorkspaceState } from '../types';
import { emptyWorkspace, sampleWorkspace } from '../data/mockData';
import { createSession, uploadDocument, analyseSession, deleteSession, getSession } from '../lib/apiClient';

interface UploadWorkspaceProps {
  onNavigate: (page: Page) => void;
  initialWorkspace?: WorkspaceState;
  /** Called once the real Supabase session is established. */
  onSessionReady?: (sessionId: string) => void;
  /** Existing session ID from App (persisted across navigations). */
  sessionId?: string | null;
}

function cloneWorkspace(ws: WorkspaceState): WorkspaceState {
  return {
    cv: { ...ws.cv },
    jds: [{ ...ws.jds[0] }, { ...ws.jds[1] }, { ...ws.jds[2] }],
  };
}

export default function UploadWorkspace({
  onNavigate,
  initialWorkspace,
  onSessionReady,
  sessionId: externalSessionId,
}: UploadWorkspaceProps) {
  const [workspace, setWorkspace] = useState<WorkspaceState>(
    initialWorkspace ? cloneWorkspace(initialWorkspace) : cloneWorkspace(emptyWorkspace)
  );
  const [localSessionId, setLocalSessionId] = useState<string | null>(externalSessionId ?? null);
  const [apiError, setApiError]             = useState<string | null>(null);
  const [indexingSlotId, setIndexingSlotId] = useState<string | null>(null);
  const [isAnalysing, setIsAnalysing]       = useState(false);
  const [isDeleting, setIsDeleting]         = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [showResetSuccess, setShowResetSuccess]     = useState(false);
  const [showJdAdded, setShowJdAdded]               = useState(false);

  // Track which job_indices are already occupied in the backend session
  const [backendJdIndices, setBackendJdIndices] = useState<number[]>([]);

  const pendingCVUpload = useRef<{ slot: DocumentSlot; rawText: string } | null>(null);
  // Track whether we've already hydrated from backend (prevent double-load)
  const hydratedForSession = useRef<string | null>(null);

  const activeSessionId = localSessionId ?? externalSessionId ?? null;

  // ── Hydrate from backend when navigating back to an existing session ──
  useEffect(() => {
    if (!activeSessionId) return;
    if (hydratedForSession.current === activeSessionId) return;
    hydratedForSession.current = activeSessionId;

    setIsLoadingSession(true);
    getSession(activeSessionId).then((result) => {
      setIsLoadingSession(false);
      if (!result.success) return;

      const docs = result.data.documents ?? [];
      const cvDoc = docs.find((d) => d.document_type === 'resume' && !d.status.includes('deleted'));
      const jdDocs = docs.filter(
        (d) => d.document_type === 'job_description' && d.status === 'indexed'
      );

      const occupiedIndices = jdDocs.map((d) => d.job_index ?? 0).filter(Boolean);
      setBackendJdIndices(occupiedIndices);

      setWorkspace((prev) => {
        const next = cloneWorkspace(prev);

        if (cvDoc) {
          Object.assign(next.cv, {
            status:    'indexed' as const,
            fileName:  cvDoc.title ?? cvDoc.file_name ?? 'CV',
            chunkCount: cvDoc.chunk_count ?? 0,
            charCount:  cvDoc.text_char_count ?? undefined,
          });
        }

        // Map each backend JD to its local slot by job_index
        jdDocs.forEach((jd) => {
          const idx = jd.job_index;
          if (!idx || idx < 1 || idx > 3) return;
          const slotIndex = idx - 1; // job_index 1→slot 0, 2→slot 1, 3→slot 2
          Object.assign(next.jds[slotIndex], {
            status:    'indexed' as const,
            fileName:  jd.title ?? jd.file_name ?? `Job Description ${idx}`,
            chunkCount: jd.chunk_count ?? 0,
            charCount:  jd.text_char_count ?? undefined,
          });
        });

        return next;
      });
    }).catch(() => {
      setIsLoadingSession(false);
    });
  }, [activeSessionId]);

  const allSlots: DocumentSlot[] = [workspace.cv, ...workspace.jds];
  const indexedCount  = allSlots.filter((s) => s.status === 'indexed').length;
  const hasCV         = workspace.cv.status !== 'empty';
  const hasAnyJD      = workspace.jds.some((j) => j.status !== 'empty');
  const canAnalyse    = activeSessionId ? true : (hasCV && hasAnyJD);

  // Number of JD slots still available for upload
  const backendJdCount = backendJdIndices.length;
  const jdSlotsAvailable = 3 - backendJdCount;
  const jdLimitReached = backendJdCount >= 3;

  // ── Pipeline stage ──────────────────────────────────────────────
  const activeStage: string | undefined = (() => {
    if (isAnalysing) return 'analyse';
    if (indexingSlotId) {
      return workspace.cv.status === 'indexed' ? 'embed' : 'chunk';
    }
    if (indexedCount === 0) return undefined;
    if (canAnalyse && !activeSessionId) return 'analyse';
    if (activeSessionId && indexedCount > 0) return 'embed';
    return 'chunk';
  })();

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
    setApiError(null);
    setIndexingSlotId(null);
  }

  /** Get the next available job_index (1, 2, or 3) not yet in use on the backend. */
  function nextAvailableJobIndex(currentBackendIndices: number[]): number | null {
    for (const i of [1, 2, 3]) {
      if (!currentBackendIndices.includes(i)) return i;
    }
    return null;
  }

  async function doRealUpload(slot: DocumentSlot, rawText: string) {
    setApiError(null);
    setIndexingSlotId(slot.id);
    try {
      let sid = activeSessionId;
      if (!sid) {
        const sr = await createSession({ source: 'web' });
        if (!sr.success) {
          setApiError(`Backend unavailable — using mock mode. (${sr.error.message})`);
          return;
        }
        sid = sr.data.session.id;
        setLocalSessionId(sid);
        onSessionReady?.(sid);
      }

      let jobIndex: number | null = null;
      if (slot.type === 'jd') {
        // Use next available backend index to prevent collisions with existing JDs
        const freshIndices = backendJdIndices;
        jobIndex = nextAvailableJobIndex(freshIndices);
        if (jobIndex === null) {
          setApiError('Maximum of 3 job descriptions reached. Remove one before uploading another.');
          return;
        }
      }

      const docType = slot.type === 'cv' ? 'resume' : 'job_description';

      const dr = await uploadDocument({
        session_id:    sid,
        document_type: docType,
        raw_text:      rawText,
        title:         slot.title,
        file_name:     slot.fileName,
        job_index:     jobIndex,
      });

      if (dr.success) {
        handleSlotChange(slot.id, {
          chunkCount: dr.data.chunks_created,
          charCount:  dr.data.document.text_char_count ?? rawText.length,
        });

        if (slot.type === 'jd' && jobIndex !== null) {
          // Record this index as occupied so subsequent uploads in the same session get the next slot
          setBackendJdIndices((prev) => [...prev, jobIndex as number]);
          if (activeSessionId) {
            setShowJdAdded(true);
          }
        }
      } else {
        setApiError(`Indexing note: ${dr.error.message}`);
      }
    } catch {
      setApiError('Backend unavailable — using mock mode.');
    } finally {
      setIndexingSlotId(null);
    }
  }

  async function handleRealUpload(slot: DocumentSlot, rawText: string) {
    if (slot.type === 'cv' && activeSessionId) {
      pendingCVUpload.current = { slot, rawText };
      setShowReplaceConfirm(true);
      return;
    }
    await doRealUpload(slot, rawText);
  }

  async function handleConfirmReplace() {
    setShowReplaceConfirm(false);

    if (activeSessionId) {
      try {
        await deleteSession(activeSessionId);
      } catch {
        // Non-fatal
      }
    }

    setLocalSessionId(null);
    onSessionReady?.('');
    setWorkspace(cloneWorkspace(emptyWorkspace));
    setBackendJdIndices([]);
    hydratedForSession.current = null;
    setApiError(null);
    setShowResetSuccess(true);

    const pending = pendingCVUpload.current;
    pendingCVUpload.current = null;
    if (pending) {
      await doRealUpload(pending.slot, pending.rawText);
    }
  }

  function handleCancelReplace() {
    pendingCVUpload.current = null;
    setShowReplaceConfirm(false);
  }

  async function handleAnalyse() {
    if (!canAnalyse) return;

    if (!activeSessionId) {
      onNavigate('results');
      return;
    }

    // Pre-flight validation
    if (workspace.cv.status === 'empty') {
      setApiError('No CV uploaded. Upload a CV before running analysis.');
      return;
    }
    if (!workspace.jds.some((j) => j.status === 'indexed')) {
      setApiError('No job descriptions indexed. Upload at least one JD before running analysis.');
      return;
    }

    setIsAnalysing(true);
    setApiError(null);
    try {
      const result = await analyseSession(activeSessionId);
      if (result.success) {
        onNavigate('results');
      } else {
        const code = result.error.code;
        if (code === 'MISSING_RESUME') {
          setApiError('No indexed CV found in this workspace. Please upload your CV first.');
        } else if (code === 'MISSING_JOB_DESCRIPTION') {
          setApiError('No indexed job descriptions found. Upload at least one JD before analysing.');
        } else {
          setApiError(`Analysis failed: ${result.error.message}`);
        }
      }
    } catch (e) {
      setApiError(`Analysis unavailable: ${e instanceof Error ? e.message : 'Network error'}`);
    } finally {
      setIsAnalysing(false);
    }
  }

  async function handleDelete() {
    if (!activeSessionId) return;
    setIsDeleting(true);
    setApiError(null);
    try {
      const result = await deleteSession(activeSessionId);
      if (result.success) {
        setLocalSessionId(null);
        setWorkspace(cloneWorkspace(emptyWorkspace));
        setBackendJdIndices([]);
        hydratedForSession.current = null;
        setShowDeleteConfirm(false);
        onSessionReady?.('');
        onNavigate('landing');
      } else {
        setApiError(`Could not delete workspace: ${result.error.message}`);
        setShowDeleteConfirm(false);
      }
    } catch (e) {
      setApiError(`Could not delete workspace: ${e instanceof Error ? e.message : 'Network error'}`);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  const totalChunks = allSlots.reduce((sum, s) => sum + (s.chunkCount ?? 0), 0);

  return (
    <div className="bg-[#F4F1EA] min-h-screen">
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
                {activeSessionId ? (
                  <span>
                    workspace · <span className="text-[#1A7A41]">{activeSessionId.slice(0, 8)}</span>
                    {' · '}
                    <span className="text-[#1A7A41]">real session</span>
                  </span>
                ) : (
                  'workspace · demo mode'
                )}
              </p>
              <h1 className="text-2xl font-bold text-[#111111] mb-1">
                {activeSessionId
                  ? 'Add job descriptions to your workspace'
                  : 'Create your role intelligence workspace'}
              </h1>
              <p className="text-sm text-[#6B6862] max-w-xl">
                {activeSessionId
                  ? jdLimitReached
                    ? 'You have reached the maximum of 3 job descriptions. Run analysis or start a new workspace.'
                    : `Your CV is loaded. Add up to ${jdSlotsAvailable} more job description${jdSlotsAvailable !== 1 ? 's' : ''} then run analysis.`
                  : 'Add one CV and up to three job descriptions. RoleFit IQ will turn them into an explainable fit analysis.'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {activeSessionId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-[#9A958F] hover:text-[#D42E3A] hover:border-[#D42E3A]"
                >
                  Delete workspace
                </Button>
              )}
              {!activeSessionId && (
                <Button variant="ghost" size="sm" onClick={loadSample}>
                  Load sample workspace
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5">
            <ProcessingPipeline activeStage={activeStage} />
          </div>
        </div>
      </div>

      <RetroColorBars height="h-1.5" />

      {isLoadingSession && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-white border border-[#DDD8CE] rounded-sm px-4 py-3 flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-[#9A958F] animate-spin" aria-hidden="true" />
            <p className="font-mono text-[10px] text-[#6B6862] uppercase tracking-widest">Loading workspace state…</p>
          </div>
        </div>
      )}

      {apiError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-[#FFF8E7] border border-[#FADDAA] rounded-sm px-4 py-3 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] text-[#92600A] uppercase tracking-widest mb-0.5">Notice</p>
              <p className="text-xs text-[#92600A]">{apiError}</p>
            </div>
            <button
              onClick={() => setApiError(null)}
              className="font-mono text-[10px] text-[#9A958F] hover:text-[#111111] uppercase tracking-widest focus-visible:outline-none flex-shrink-0"
              aria-label="Dismiss"
            >
              dismiss
            </button>
          </div>
        </div>
      )}

      {/* CV replace confirmation */}
      {showReplaceConfirm && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-[#FFF8E7] border border-[#FADDAA] rounded-sm px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] text-[#92600A] uppercase tracking-widest mb-0.5">Replace CV?</p>
              <p className="text-xs text-[#6B6862]">
                Replacing the CV will reset this workspace's job descriptions, analyses, and chat history. A new workspace will be created.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleCancelReplace}
                className="font-mono text-[10px] text-[#9A958F] hover:text-[#111111] uppercase tracking-widest focus-visible:outline-none"
              >
                cancel
              </button>
              <button
                onClick={() => void handleConfirmReplace()}
                className="font-mono text-[10px] text-[#92600A] border border-[#FADDAA] hover:border-[#92600A] uppercase tracking-widest px-3 py-1.5 rounded-sm transition-colors focus-visible:outline-none"
              >
                Replace &amp; reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace reset success */}
      {showResetSuccess && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-[#EEFBF3] border border-[#B3EACC] rounded-sm px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] text-[#1A7A41] uppercase tracking-widest mb-0.5">Workspace reset complete</p>
              <p className="text-xs text-[#6B6862]">
                Your previous workspace was cleared to prevent mixing evidence from different CVs. A fresh workspace is ready for the new CV.
              </p>
            </div>
            <button
              onClick={() => setShowResetSuccess(false)}
              className="font-mono text-[10px] text-[#1A7A41] uppercase tracking-widest focus-visible:outline-none flex-shrink-0"
            >
              continue
            </button>
          </div>
        </div>
      )}

      {/* New JD indexed — re-run notice */}
      {showJdAdded && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-[#EEF4FF] border border-[#BFCFF8] rounded-sm px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] text-[#1D4FAA] uppercase tracking-widest mb-0.5">New JD indexed</p>
              <p className="text-xs text-[#6B6862]">
                Click "Analyse role fit" to include it in your comparison.
              </p>
            </div>
            <button
              onClick={() => setShowJdAdded(false)}
              className="font-mono text-[10px] text-[#1D4FAA] uppercase tracking-widest focus-visible:outline-none flex-shrink-0"
            >
              dismiss
            </button>
          </div>
        </div>
      )}

      {/* JD limit reached banner */}
      {jdLimitReached && activeSessionId && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-[#F5F5F5] border border-[#DDD8CE] rounded-sm px-4 py-3">
            <p className="font-mono text-[10px] text-[#6B6862] uppercase tracking-widest mb-0.5">Maximum JDs reached</p>
            <p className="text-xs text-[#6B6862]">
              This workspace has 3 job descriptions. Run analysis below or go back to results.
            </p>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-[#FEF0EF] border border-[#F8C2BE] rounded-sm px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] text-[#D42E3A] uppercase tracking-widest mb-0.5">Confirm deletion</p>
              <p className="text-xs text-[#6B6862]">
                This will soft-delete the workspace and all indexed documents. This action cannot be undone from the UI.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="font-mono text-[10px] text-[#9A958F] hover:text-[#111111] uppercase tracking-widest focus-visible:outline-none"
              >
                cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="font-mono text-[10px] text-[#D42E3A] border border-[#F8C2BE] hover:border-[#D42E3A] uppercase tracking-widest px-3 py-1.5 rounded-sm transition-colors disabled:opacity-40 focus-visible:outline-none"
              >
                {isDeleting ? 'Deleting…' : 'Delete workspace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="bg-white border-b border-[#DDD8CE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 py-3 overflow-x-auto">
            {[
              { label: 'Documents',       value: `${indexedCount} / 4` },
              { label: 'Evidence chunks', value: totalChunks > 0 ? String(totalChunks) : '—' },
              { label: 'CV',  value: workspace.cv.status === 'indexed' ? 'indexed' : 'pending' },
              { label: 'JDs', value: `${backendJdCount || workspace.jds.filter((j) => j.status !== 'empty').length} of 3` },
              { label: 'Backend', value: activeSessionId ? 'connected' : 'mock' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest">{item.label}</span>
                <span className={`font-mono text-xs ${item.label === 'Backend' && activeSessionId ? 'text-[#1A7A41]' : 'text-[#111111]'}`}>
                  {item.value}
                </span>
              </div>
            ))}
            {indexingSlotId && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Loader2 className="w-3 h-3 text-[#6B6862] animate-spin" aria-hidden="true" />
                <span className="font-mono text-[10px] text-[#6B6862] uppercase tracking-widest">
                  chunking · embedding…
                </span>
              </div>
            )}
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
            isIndexing={indexingSlotId === workspace.cv.id}
          />
          {workspace.jds.map((jd, i) => {
            // In a real session, a slot is "locked" if its 1-based index is already occupied
            // and the slot isn't currently indexed locally (meaning it's a different JD).
            // For new sessions, all slots are available.
            const slotJobIndex = i + 1;
            const isOccupiedByBackend = backendJdIndices.includes(slotJobIndex);
            const isLocallyIndexed = jd.status === 'indexed';
            // Disable upload if limit reached and this slot isn't already showing an indexed doc
            const uploadDisabled = jdLimitReached && !isLocallyIndexed && !isOccupiedByBackend;

            return (
              <UploadCard
                key={jd.id}
                slot={jd}
                onStatusChange={handleSlotChange}
                onRealUpload={handleRealUpload}
                isIndexing={indexingSlotId === jd.id}
                disabled={uploadDisabled}
              />
            );
          })}
        </div>

        <div className="mt-6 bg-white border border-[#DDD8CE] rounded-sm p-4 flex gap-3">
          <Info className="w-4 h-4 text-[#9A958F] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-xs text-[#6B6862] leading-relaxed">
              <span className="font-semibold text-[#111111]">Privacy: </span>
              Documents are used only for this analysis workspace. Use the delete session action
              to invoke the right-to-delete pathway.
            </p>
            <p className="text-xs text-[#6B6862] leading-relaxed">
              <span className="font-semibold text-[#111111]">Accessibility: </span>
              Interface designed with keyboard-friendly controls, labelled fields, and high-contrast states.
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
              {isAnalysing
                ? 'Running AI analysis across all job descriptions…'
                : activeSessionId && indexedCount === 0
                ? 'Session connected — click to run analysis on indexed documents.'
                : canAnalyse
                ? `${indexedCount} document${indexedCount !== 1 ? 's' : ''} indexed · ${totalChunks} evidence chunks ready.`
                : 'Upload a CV and at least one job description to begin.'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="md"
            disabled={!canAnalyse || isAnalysing}
            onClick={handleAnalyse}
            className="border-[#333] text-[#F4F1EA] hover:border-[#F4F1EA] hover:text-[#F4F1EA] hover:bg-transparent disabled:opacity-30 whitespace-nowrap"
          >
            {isAnalysing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Analysing…
              </>
            ) : (
              <>
                Analyse role fit
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {['GDPR-ready architecture', 'Evidence-grounded recommendations', 'No hiring guarantees', 'WCAG-aware interface'].map((note) => (
            <span key={note} className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest border border-[#DDD8CE] px-2 py-1 rounded-sm bg-white">
              {note}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
