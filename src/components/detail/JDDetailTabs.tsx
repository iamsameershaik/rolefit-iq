type Tab = 'overview' | 'evidence' | 'gaps' | 'interview' | 'rewrite';

interface Props {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'gaps', label: 'Gaps' },
  { key: 'interview', label: 'Interview' },
  { key: 'rewrite', label: 'Rewrite' },
];

export default function JDDetailTabs({ activeTab, onChange }: Props) {
  return (
    <div
      className="flex border-b border-[#DDD8CE] bg-white overflow-x-auto"
      role="tablist"
      aria-label="JD detail sections"
    >
      {TABS.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={tab.key === activeTab}
          aria-controls={`tab-panel-${tab.key}`}
          onClick={() => onChange(tab.key)}
          className={[
            'flex-shrink-0 px-4 py-3 font-mono text-[10px] uppercase tracking-widest transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#111111]',
            tab.key === activeTab
              ? 'border-b-2 border-[#111111] text-[#111111] bg-white'
              : 'text-[#9A958F] hover:text-[#6B6862] border-b-2 border-transparent',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
