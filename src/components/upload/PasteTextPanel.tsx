import { useState } from 'react';
import Button from '../shared/Button';

interface PasteTextPanelProps {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PasteTextPanel({ value, onChange, onClose, onConfirm }: PasteTextPanelProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="border-t border-[#DDD8CE] bg-[#FBFAF6] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          Paste text
        </span>
        <button
          onClick={onClose}
          className="text-[10px] font-mono text-[#9A958F] hover:text-[#111111] transition-colors uppercase tracking-widest focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111] rounded-sm px-1"
          aria-label="Close paste panel"
        >
          close
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={6}
        placeholder="Paste document text here..."
        aria-label="Document text input"
        className={[
          'w-full text-xs text-[#111111] bg-white border resize-none rounded-sm p-3 font-mono leading-relaxed placeholder:text-[#C5C0B8] transition-colors duration-150',
          focused ? 'border-[#111111] outline-none' : 'border-[#DDD8CE]',
        ].join(' ')}
      />
      <div className="flex items-center justify-between mt-3">
        <span className="font-mono text-[10px] text-[#9A958F]">
          {value.length > 0 ? `${value.length.toLocaleString()} chars` : 'No text yet'}
        </span>
        <Button
          variant="primary"
          size="sm"
          disabled={value.trim().length < 10}
          onClick={onConfirm}
        >
          Confirm text
        </Button>
      </div>
    </div>
  );
}
