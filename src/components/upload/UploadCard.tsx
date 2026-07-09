import { useState, useRef } from 'react';
import { Upload, FileText, Check, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import type { DocumentSlot, DocumentStatus } from '../../types';
import Badge from '../shared/Badge';
import Button from '../shared/Button';
import PasteTextPanel from './PasteTextPanel';

interface UploadCardProps {
  slot: DocumentSlot;
  onStatusChange: (id: string, updates: Partial<DocumentSlot>) => void;
  onRealUpload?: (slot: DocumentSlot, rawText: string) => void;
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

async function readFileAsText(file: File): Promise<{ text: string; warning?: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'txt') {
    const text = await file.text();
    return { text };
  }
  return {
    text: '',
    warning: `We could not reliably extract text from "${file.name}" (${ext?.toUpperCase() ?? 'unknown'} format). Please paste the document text instead.`,
  };
}

export default function UploadCard({ slot, onStatusChange, onRealUpload, isIndexing = false }: UploadCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const [pasteText, setPasteText] = useState(slot.pasteText || '');
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isUploaded = slot.status !== 'empty';
  const pasteOpen = slot.pasteOpen ?? false;

  async function handleFileSelected(file: File) {
    setParseWarning(null);
    const { text, warning } = await readFileAsText(file);
    if (warning) {
      setParseWarning(warning);
      onStatusChange(slot.id, { pasteOpen: true });
      return;
    }
    const charCount = text.length;
    const chunkCount = Math.max(4, Math.floor(charCount / 400));
    const updates: Partial<DocumentSlot> = {
      status: 'indexed',
      fileName: file.name,
      charCount,
      chunkCount,
      pasteOpen: false,
    };
    onStatusChange(slot.id, updates);
    onRealUpload?.({ ...slot, ...updates }, text);
  }

  function handlePasteConfirm() {
    setParseWarning(null);
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
    onRealUpload?.({ ...slot, ...updates }, pasteText);
  }

  function handleRemove() {
    setPasteText('');
    setParseWarning(null);
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
      ].join(' ')}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) void handleFileSelected(file);
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

        {parseWarning && (
          <div className="mb-3 bg-[#FFF8E7] border border-[#FADDAA] rounded-sm px-3 py-2 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#92600A] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-[#92600A] leading-relaxed">{parseWarning}</p>
          </div>
        )}

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
            <p className="font-mono text-[10px] text-[#9A958F]">TXT supported · PDF/DOCX: paste text</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="sr-only"
              aria-label={`File input for ${slot.title}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileSelected(file);
                e.target.value = '';
              }}
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
              <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
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
