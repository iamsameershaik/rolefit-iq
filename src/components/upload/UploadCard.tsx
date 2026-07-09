import { useState, useRef } from 'react';
import { Upload, FileText, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { DocumentSlot, DocumentStatus } from '../../types';
import Badge from '../shared/Badge';
import Button from '../shared/Button';
import PasteTextPanel from './PasteTextPanel';

interface UploadCardProps {
  slot: DocumentSlot;
  onStatusChange: (id: string, updates: Partial<DocumentSlot>) => void;
  /** Optional real upload handler — called after mock state is updated. */
  onRealUpload?: (slot: DocumentSlot, rawText: string) => void;
  /** Whether this specific card is currently being indexed (chunking + embedding). */
  isIndexing?: boolean;
}

function statusBadgeVariant(status: DocumentStatus) {
  if (status === 'indexed') return 'indexed';
  if (status === 'uploaded') return 'success';
  return 'muted';
}

function statusLabel(status: DocumentStatus) {
  if (status === 'indexed') return 'indexed';
  if (status === 'uploaded') return 'uploaded';
  return 'empty';
}

const mockFileNames: Record<string, string[]> = {
  cv: ['cv_2024.pdf', 'resume_final.pdf', 'john_doe_cv.docx'],
  jd: [
    'forward_deployed_engineer.pdf',
    'ai_solutions_engineer.pdf',
    'ai_automation_consultant.pdf',
    'job_description.pdf',
  ],
};

let jdNameIndex = 0;

function getMockFileName(type: 'cv' | 'jd', id: string): string {
  if (type === 'cv') {
    return mockFileNames.cv[Math.floor(Math.random() * mockFileNames.cv.length)];
  }
  const names = mockFileNames.jd;
  const idx = parseInt(id.slice(-2)) - 1;
  return names[idx % names.length] || names[0];
}

export default function UploadCard({ slot, onStatusChange, onRealUpload, isIndexing = false }: UploadCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const [pasteText, setPasteText] = useState(slot.pasteText || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const isUploaded = slot.status !== 'empty';
  const pasteOpen = slot.pasteOpen ?? false;

  function handleMockUpload() {
    const fileName = getMockFileName(slot.type, slot.id);
    const charCount = slot.type === 'cv' ? 8420 : Math.floor(Math.random() * 2000) + 3000;
    const chunkCount = slot.type === 'cv' ? 18 : Math.floor(Math.random() * 5) + 8;
    const updates: Partial<DocumentSlot> = {
      status: 'indexed',
      fileName,
      charCount,
      chunkCount,
      pasteOpen: false,
    };
    onStatusChange(slot.id, updates);
    // Attempt real backend upload with placeholder text (file parsing is Phase 2)
    onRealUpload?.(
      { ...slot, ...updates },
      `[Mock upload — file parsing in Phase 2] Filename: ${fileName}`
    );
  }

  function handlePasteConfirm() {
    const charCount = pasteText.length;
    const chunkCount = Math.max(4, Math.floor(charCount / 400));
    const updates: Partial<DocumentSlot> = {
      status: 'indexed',
      fileName: undefined,
      charCount,
      chunkCount,
      pasteText,
      pasteOpen: false,
    };
    onStatusChange(slot.id, updates);
    // Attempt real backend upload with the actual pasted text
    onRealUpload?.({ ...slot, ...updates }, pasteText);
  }

  function handleRemove() {
    setPasteText('');
    onStatusChange(slot.id, {
      status: 'empty',
      fileName: undefined,
      charCount: undefined,
      chunkCount: undefined,
      pasteText: undefined,
      pasteOpen: false,
    });
  }

  function togglePaste() {
    onStatusChange(slot.id, { pasteOpen: !pasteOpen });
  }

  return (
    <div
      className={[
        'border rounded-sm bg-white transition-all duration-200 overflow-hidden',
        dragOver ? 'border-[#111111] shadow-sm' : 'border-[#DDD8CE]',
        isUploaded ? 'border-[#DDD8CE]' : '',
      ].join(' ')}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleMockUpload();
      }}
    >
      <div className="p-5">
          <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {isIndexing ? (
              <div className="w-5 h-5 rounded-sm border border-[#DDD8CE] flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-3 h-3 text-[#6B6862] animate-spin" aria-hidden="true" />
              </div>
            ) : isUploaded ? (
              <div className="w-5 h-5 rounded-sm bg-[#111111] flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-sm border border-[#DDD8CE] flex items-center justify-center flex-shrink-0">
                <FileText className="w-3 h-3 text-[#9A958F]" />
              </div>
            )}
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
              {slot.id}
            </span>
          </div>
          {isIndexing ? (
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862] border border-[#DDD8CE] px-2 py-0.5 rounded-sm bg-[#F4F1EA]">
              indexing…
            </span>
          ) : (
            <Badge variant={statusBadgeVariant(slot.status)}>{statusLabel(slot.status)}</Badge>
          )}
        </div>

        <h3 className="text-sm font-semibold text-[#111111] mb-1">{slot.title}</h3>
        <p className="text-xs text-[#6B6862] leading-relaxed mb-4">{slot.description}</p>

        {!isUploaded ? (
          <div
            className={[
              'border-2 border-dashed rounded-sm p-6 text-center transition-colors duration-150 cursor-pointer',
              dragOver ? 'border-[#111111] bg-[#F4F1EA]' : 'border-[#DDD8CE] hover:border-[#9A958F]',
            ].join(' ')}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label={`Upload ${slot.title}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
          >
            <Upload className="w-5 h-5 text-[#9A958F] mx-auto mb-2" aria-hidden="true" />
            <p className="text-xs text-[#6B6862] mb-1">Drag & drop or click to upload</p>
            <p className="font-mono text-[10px] text-[#9A958F]">PDF · DOCX · TXT</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="sr-only"
              aria-label={`File input for ${slot.title}`}
              onChange={handleMockUpload}
            />
          </div>
        ) : (
          <div className="bg-[#F4F1EA] border border-[#DDD8CE] rounded-sm p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-3.5 h-3.5 text-[#6B6862] flex-shrink-0" aria-hidden="true" />
              <span className="text-xs text-[#111111] font-medium truncate">
                {slot.fileName || 'pasted text'}
              </span>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest">Chars</p>
                <p className="font-mono text-xs text-[#111111]">
                  {slot.charCount?.toLocaleString() ?? '—'}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-[#9A958F] uppercase tracking-widest">Chunks</p>
                <p className="font-mono text-xs text-[#111111]">{slot.chunkCount ?? '—'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          {!isUploaded && (
            <>
              <Button variant="secondary" size="sm" onClick={handleMockUpload}>
                <Upload className="w-3 h-3" aria-hidden="true" />
                Upload file
              </Button>
              <button
                onClick={togglePaste}
                className="flex items-center gap-1 text-xs text-[#6B6862] hover:text-[#111111] transition-colors font-mono uppercase tracking-widest focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111] rounded-sm px-1 py-1"
                aria-expanded={pasteOpen}
                aria-label="Toggle paste text panel"
              >
                paste text
                {pasteOpen ? (
                  <ChevronUp className="w-3 h-3" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3 h-3" aria-hidden="true" />
                )}
              </button>
            </>
          )}
          {isUploaded && (
            <button
              onClick={handleRemove}
              className="text-xs font-mono text-[#9A958F] hover:text-[#D42E3A] transition-colors uppercase tracking-widest focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#111111] rounded-sm px-1 py-1"
              aria-label={`Remove ${slot.title}`}
            >
              remove
            </button>
          )}
        </div>
      </div>

      {pasteOpen && !isUploaded && (
        <PasteTextPanel
          value={pasteText}
          onChange={setPasteText}
          onClose={togglePaste}
          onConfirm={handlePasteConfirm}
        />
      )}
    </div>
  );
}
