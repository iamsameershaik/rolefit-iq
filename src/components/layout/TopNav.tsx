import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import LogoMark from '../brand/LogoMark';
import Button from '../shared/Button';
import type { Page } from '../../types';

interface TopNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navLinks = [
  { label: 'Product', href: '#product' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'Demo', href: '#demo' },
];

export default function TopNav({ currentPage, onNavigate }: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#F4F1EA]/95 backdrop-blur-sm border-b border-[#DDD8CE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <button
            onClick={() => onNavigate('landing')}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 rounded-sm"
            aria-label="Go to home"
          >
            <LogoMark size="sm" />
          </button>

          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-[#6B6862] hover:text-[#111111] transition-colors duration-150 tracking-wide"
                onClick={(e) => {
                  if (currentPage !== 'landing') {
                    e.preventDefault();
                    onNavigate('landing');
                  }
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('upload')}
            >
              Start analysis
            </Button>
          </div>

          <button
            className="md:hidden p-1.5 text-[#6B6862] hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] rounded-sm"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-[#DDD8CE] bg-[#F4F1EA] px-4 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-[#6B6862] hover:text-[#111111] py-1"
              onClick={() => {
                setMenuOpen(false);
                if (currentPage !== 'landing') onNavigate('landing');
              }}
            >
              {link.label}
            </a>
          ))}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setMenuOpen(false);
              onNavigate('upload');
            }}
          >
            Start analysis
          </Button>
        </div>
      )}
    </header>
  );
}
