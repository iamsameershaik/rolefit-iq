import type { ReactNode } from 'react';
import TopNav from './TopNav';
import type { Page } from '../../types';

interface AppShellProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function AppShell({ children, currentPage, onNavigate }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#111111]">
      <TopNav currentPage={currentPage} onNavigate={onNavigate} />
      <main>{children}</main>
    </div>
  );
}
