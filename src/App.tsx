import { useState, useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import LandingPage from './pages/LandingPage';
import UploadWorkspace from './pages/UploadWorkspace';
import ResultsDashboard from './pages/ResultsDashboard';
import JDDetailView from './pages/JDDetailView';
import type { Page, WorkspaceState } from './types';
import { sampleWorkspace } from './data/mockData';

const SESSION_STORAGE_KEY = 'rolefit_iq_session';

interface PersistedSession {
  sessionId: string;
  page: Page;
  selectedJdId?: string;
}

function loadPersistedSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed.sessionId || !parsed.page) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedSession(data: PersistedSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable (private mode) — silently ignore
  }
}

function clearPersistedSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [loadSample, setLoadSample] = useState(false);
  const [selectedJdId, setSelectedJdId] = useState<string | undefined>(undefined);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const persisted = loadPersistedSession();
    if (persisted) {
      setSessionId(persisted.sessionId);
      setPage(persisted.page);
      if (persisted.selectedJdId) setSelectedJdId(persisted.selectedJdId);
    }
    setRestored(true);
  }, []);

  // Persist session whenever it changes
  useEffect(() => {
    if (!restored) return;
    if (sessionId && page !== 'landing') {
      savePersistedSession({ sessionId, page, selectedJdId });
    } else if (!sessionId) {
      clearPersistedSession();
    }
  }, [sessionId, page, selectedJdId, restored]);

  function navigate(target: Page, jdId?: string) {
    if (jdId) setSelectedJdId(jdId);
    if (target === 'landing') setLoadSample(false);
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const uploadWorkspaceInitial: WorkspaceState | undefined = loadSample
    ? sampleWorkspace
    : undefined;

  return (
    <AppShell
      currentPage={page}
      onNavigate={(p) => navigate(p)}
      hasSession={!!sessionId}
      onNewWorkspace={() => {
        clearPersistedSession();
        setSessionId(null);
        navigate('upload');
      }}
    >
      {page === 'landing' && (
        <LandingPage onNavigate={(p) => navigate(p)} />
      )}
      {page === 'upload' && (
        <UploadWorkspace
          key={loadSample ? 'sample' : 'empty'}
          onNavigate={(p) => navigate(p)}
          initialWorkspace={uploadWorkspaceInitial}
          onSessionReady={(id) => setSessionId(id || null)}
          sessionId={sessionId}
        />
      )}
      {page === 'results' && (
        <ResultsDashboard
          onNavigate={(p, jdId) => navigate(p, jdId)}
          sessionId={sessionId}
          onNewWorkspace={() => {
            clearPersistedSession();
            setSessionId(null);
            navigate('upload');
          }}
          onAddMoreJDs={() => navigate('upload')}
        />
      )}
      {page === 'jd-detail' && (
        <JDDetailView
          onNavigate={(p, jdId) => navigate(p, jdId)}
          initialJdId={selectedJdId}
          sessionId={sessionId}
          onAddMoreJDs={() => navigate('upload')}
          onNewWorkspace={() => {
            clearPersistedSession();
            setSessionId(null);
            navigate('upload');
          }}
        />
      )}
    </AppShell>
  );
}
