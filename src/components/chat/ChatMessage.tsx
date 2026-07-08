import type { ChatMessage as ChatMessageType } from '../../types';
import CitationSnippet from './CitationSnippet';

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6862]">
          {isUser ? 'You' : 'RoleFit IQ'}
        </span>
        <span className="font-mono text-[9px] text-[#444]">{message.timestamp}</span>
      </div>

      <div
        className={[
          'rounded-sm px-3 py-2.5 max-w-[90%] text-xs leading-relaxed',
          isUser
            ? 'bg-[#F4F1EA] border border-[#DDD8CE] text-[#111111]'
            : 'bg-[#111111] text-[#F4F1EA]',
        ].join(' ')}
      >
        {message.content}
      </div>

      {message.citations && message.citations.length > 0 && (
        <div className="w-full space-y-1.5 mt-1">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#6B6862] px-1">
            Retrieved evidence
          </p>
          {message.citations.map((c) => (
            <CitationSnippet key={c.id} citation={c} />
          ))}
        </div>
      )}
    </div>
  );
}
