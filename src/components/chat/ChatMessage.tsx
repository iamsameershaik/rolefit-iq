import type { ChatMessage as ChatMessageType } from '../../types';
import CitationSnippet from './CitationSnippet';

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={[
          'max-w-[85%] rounded-sm px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-[#F4F1EA] text-[#111111] border border-[#DDD8CE]'
            : 'bg-[#0B0B0B] text-[#D5D5D0] border border-[#1a1a1a]',
        ].join(' ')}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      {message.citations && message.citations.length > 0 && (
        <div className="max-w-[90%] space-y-2 w-full">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#444] pl-1">
            Retrieved evidence
          </p>
          {message.citations.map((c) => (
            <CitationSnippet key={c.id} snippet={c} />
          ))}
        </div>
      )}
    </div>
  );
}
