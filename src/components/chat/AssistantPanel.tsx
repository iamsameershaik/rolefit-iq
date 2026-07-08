import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import type { ChatMessage as ChatMessageType, EvidenceSnippetType } from '../../types';
import ChatMessageComponent from './ChatMessage';
import SuggestedPrompts from './SuggestedPrompts';
import { initialChatMessages, mockChatResponses } from '../../data/mockData';

const SUGGESTED_PROMPTS = [
  'Which role is my strongest fit?',
  'What skills am I missing for Job 2?',
  'What should I prepare for interview?',
  'Rewrite my CV summary for Job 1.',
  'What should I avoid claiming?',
];

function getResponseKey(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('strongest') || lower.includes('best fit') || lower.includes('which role')) return 'fit';
  if (lower.includes('missing') || lower.includes('gap') || lower.includes('job 2')) return 'missing';
  if (lower.includes('interview') || lower.includes('prepare') || lower.includes('preparation')) return 'interview';
  if (lower.includes('rewrite') || lower.includes('summary') || lower.includes('cv')) return 'rewrite';
  if (lower.includes('avoid') || lower.includes('claim') || lower.includes('don\'t')) return 'avoid';
  return 'default';
}

function makeTimestamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function AssistantPanel() {
  const [messages, setMessages] = useState<ChatMessageType[]>(initialChatMessages);
  const [input, setInput] = useState('');
  const [showPrompts, setShowPrompts] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const ts = makeTimestamp();

    const userMsg: ChatMessageType = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: text.trim(),
      timestamp: ts,
    };

    const key = getResponseKey(text);
    const resp = mockChatResponses[key] ?? mockChatResponses['default'];

    const assistantMsg: ChatMessageType = {
      id: `msg-${Date.now()}-a`,
      role: 'assistant',
      content: resp.content,
      citations: resp.citations as EvidenceSnippetType[],
      timestamp: ts,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setShowPrompts(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="bg-[#050505] border border-[#1a1a1a] rounded-sm overflow-hidden flex flex-col">
      <div className="border-b border-[#1a1a1a] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
              Ask RoleFit IQ
            </p>
            <p className="font-mono text-[9px] text-[#444] mt-0.5">
              Grounded in uploaded CV and job descriptions
            </p>
          </div>
          <span className="font-mono text-[9px] text-[#4CAF70] border border-[#1A7A41]/30 bg-[#1A7A41]/10 px-2 py-0.5 rounded-sm">
            grounded mode
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[260px] max-h-[400px]">
        {messages.map((m) => (
          <ChatMessageComponent key={m.id} message={m} />
        ))}
        {showPrompts && (
          <SuggestedPrompts
            prompts={SUGGESTED_PROMPTS}
            onSelect={(p) => {
              setInput(p);
              sendMessage(p);
            }}
          />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1a1a1a] p-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Ask about fit, gaps, preparation..."
          aria-label="Chat input"
          className="flex-1 bg-[#0B0B0B] border border-[#1a1a1a] rounded-sm px-3 py-2 text-xs text-[#F4F1EA] placeholder:text-[#444] resize-none focus:outline-none focus:border-[#333] font-mono leading-relaxed"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim()}
          className="bg-[#111111] border border-[#333] hover:border-[#555] text-[#F4F1EA] rounded-sm p-2 transition-colors duration-150 disabled:opacity-30 flex-shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F4F1EA]"
          aria-label="Send message"
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
