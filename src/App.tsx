import { useState } from 'react';
import AppShell from './components/layout/AppShell';
import LandingPage from './pages/LandingPage';
import UploadWorkspace from './pages/UploadWorkspace';
import ResultsDashboard from './pages/ResultsDashboard';
import JDDetailView from './pages/JDDetailView';
import type { Page, WorkspaceState } from './types';
import { sampleWorkspace } from './data/mockData';

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [loadSample, setLoadSample] = useState(false);
  const [selectedJdId, setSelectedJdId] = useState<string | undefined>(undefined);

  function navigate(target: Page, jdId?: string) {
    if (jdId) setSelectedJdId(jdId);
    if (target !== 'upload') setLoadSample((prev) => (target === 'landing' ? false : prev));
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const uploadWorkspaceInitial: WorkspaceState | undefined = loadSample
    ? sampleWorkspace
    : undefined;

  return (
    <AppShell currentPage={page} onNavigate={(p) => navigate(p)}>
      {page === 'landing' && (
        <LandingPage onNavigate={(p) => navigate(p)} />
      )}
      {page === 'upload' && (
        <UploadWorkspace
          key={loadSample ? 'sample' : 'empty'}
          onNavigate={(p) => navigate(p)}
          initialWorkspace={uploadWorkspaceInitial}
        />
      )}
      {page === 'results' && (
        <ResultsDashboard onNavigate={(p, jdId) => navigate(p, jdId)} />
      )}
      {page === 'jd-detail' && (
        <JDDetailView
          onNavigate={(p, jdId) => navigate(p, jdId)}
          initialJdId={selectedJdId}
        />
      )}
    </AppShell>
  );
}
