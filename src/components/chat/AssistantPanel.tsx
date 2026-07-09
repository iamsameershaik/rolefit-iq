import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import type { ChatMessage as ChatMessageType, EvidenceSnippetType } from '../../types';
import ChatMessageComponent from './ChatMessage';
import SuggestedPrompts from './SuggestedPrompts';
import { initialChatMessages, mockChatResponses } from '../../data/mockData';
import { sendChatMessage } from '../../lib/apiClient';
import type { ChatCitation } from '../../lib/apiClient';

function buildSuggestedPrompts(jdCount: number | undefined, isRealMode: boolean): string[] {
  if (!isRealMode) {
    return [
      'Which role is my strongest fit?',
      'What skills am I missing for Job 2?',
      'What should I prepare for interview?',
      'Rewrite my CV summary for Job 1.',
      'What should I avoid claiming?',
    ];
  }
  if (jdCount === 1 || jdCount === undefined) {
    return [
      'Which parts of my CV best support this role?',
      'What skills or experience gaps should I prepare for?',
      'What interview questions should I expect?',
      'How should I position myself for this role?',
      'What should I avoid claiming?',
    ];
  }
  // Multiple JDs
  return [
    'Which role is my strongest fit and why?',
    'What is the biggest shared gap across these roles?',
    'How should I prioritise interview preparation?',
    'Which JD should I tailor my CV for first?',
    `Compare Job 1 and Job 2 using evidence.`,
  ];
}

function getResponseKey(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('strongest') || lower.includes('best fit') || lower.includes('which role') || lower.includes('best support')) return 'fit';
  if (lower.includes('missing') || lower.includes('gap') || lower.includes('job 2')) return 'missing';
  if (lower.includes('interview') || lower.includes('prepare') || lower.includes('preparation') || lower.includes('expect')) return 'interview';
  if (lower.includes('rewrite') || lower.includes('summary') || lower.includes('cv') || lower.includes('position')) return 'rewrite';
  if (lower.includes('avoid') || lower.includes('claim') || lower.includes("don't")) return 'avoid';
  return 'default';
}

function makeTimestamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function mapCitationsToSnippets(citations: ChatCitation[]): EvidenceSnippetType[] {
  return citations.map((c, i) => ({
    id: `cite-${i}`,
    text: c.excerpt,
    source: c.source,
    sourceType: c.source_type,
    relevance: c.relevance,
  }));
}

interface Props {
  sessionId?: string | null;
  jdCount?: number;
}

export default function AssistantPanel({ sessionId, jdCount }: Props) {
  const isRealMode = !!sessionId;

  const [messages, setMessages] = useState<ChatMessageType[]>(
    isRealMode ? [] : initialChatMessages
  );
  const [input, setInput]       = useState('');
  const [showPrompts, setShowPrompts] = useState(true);
  const [isLoading, setIsLoading]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = buildSuggestedPrompts(jdCount, isRealMode);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function sendReal(text: string) {
    if (!text.trim() || !sessionId) return;
    const ts = makeTimestamp();

    const userMsg: ChatMessageType = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: text.trim(),
      timestamp: ts,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setShowPrompts(false);
    setIsLoading(true);

    try {
      const result = await sendChatMessage({ session_id: sessionId, content: text.trim() });
      const ts2 = makeTimestamp();

      if (result.success) {
        const assistantMsg: ChatMessageType = {
          id: result.data.message_id ?? `msg-${Date.now()}-a`,
          role: 'assistant',
          content: result.data.answer,
          citations: mapCitationsToSnippets(result.data.citations),
          timestamp: ts2,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-err`,
            role: 'assistant',
            content: `Could not get an answer: ${result.error.message}. Please try again.`,
            timestamp: ts2,
          },
        ]);
      }
    } catch (e) {
      const ts2 = makeTimestamp();
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: `Connection error: ${e instanceof Error ? e.message : 'Network unavailable'}. Please try again.`,
          timestamp: ts2,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function sendMock(text: string) {
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

  function sendMessage(text: string) {
    if (isRealMode) {
      void sendReal(text);
    } else {
      sendMock(text);
    }
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
              {isRealMode
                ? 'Grounded in your uploaded CV and job descriptions'
                : 'Demo — grounded in sample workspace'}
            </p>
          </div>
          <span className={[
            'font-mono text-[9px] border px-2 py-0.5 rounded-sm',
            isRealMode
              ? 'text-[#4CAF70] border-[#1A7A41]/30 bg-[#1A7A41]/10'
              : 'text-[#9A958F] border-[#333] bg-[#111]',
          ].join(' ')}>
            {isRealMode ? 'real session' : 'demo mode'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[260px] max-h-[400px]">
        {messages.map((m) => (
          <ChatMessageComponent key={m.id} message={m} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-[#6B6862]">
            <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-widest">Thinking…</span>
          </div>
        )}
        {showPrompts && !isLoading && (
          <SuggestedPrompts
            prompts={suggestedPrompts}
            onSelect={(p) => {
              setInput(p);
              sendMessage(p);
            }}
          />
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[#1a1a1a] p-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Ask about fit, gaps, preparation…"
          aria-label="Chat input"
          disabled={isLoading}
          className="flex-1 bg-[#0B0B0B] border border-[#1a1a1a] rounded-sm px-3 py-2 text-xs text-[#F4F1EA] placeholder:text-[#444] resize-none focus:outline-none focus:border-[#333] font-mono leading-relaxed disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          className="bg-[#111111] border border-[#333] hover:border-[#555] text-[#F4F1EA] rounded-sm p-2 transition-colors duration-150 disabled:opacity-30 flex-shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F4F1EA]"
          aria-label="Send message"
        >
          {isLoading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            : <Send className="w-3.5 h-3.5" aria-hidden="true" />
          }
        </button>
      </div>
    </div>
  );
}
