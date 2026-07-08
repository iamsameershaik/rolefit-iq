import type { InterviewQuestion } from '../../types';
import Badge from '../shared/Badge';

interface Props {
  questions: InterviewQuestion[];
  jdLabel?: string;
}

export default function InterviewPrepPanel({ questions, jdLabel }: Props) {
  return (
    <div className="bg-white border border-[#DDD8CE] rounded-sm overflow-hidden">
      <div className="border-b border-[#DDD8CE] px-5 py-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6862]">
          Interview preparation {jdLabel ? `· ${jdLabel}` : '· consolidated'}
        </span>
      </div>
      <div className="p-5 space-y-5">
        {questions.map((q, i) => (
          <div key={i} className="border border-[#DDD8CE] rounded-sm p-4">
            <div className="flex items-start gap-2 mb-3">
              <span className="font-mono text-[10px] text-[#9A958F] mt-0.5 flex-shrink-0">Q{String(i + 1).padStart(2, '0')}</span>
              <p className="text-sm font-semibold text-[#111111]">{q.question}</p>
            </div>
            <div className="space-y-2 pl-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A958F] mb-0.5">Answer angle</p>
                <p className="text-xs text-[#6B6862] leading-relaxed">{q.answerAngle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] text-[#9A958F]">Evidence:</span>
                <Badge variant="muted">{q.evidenceToMention}</Badge>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#D42E3A] mb-0.5">Risk to avoid</p>
                <p className="text-xs text-[#6B6862] leading-relaxed">{q.riskToAvoid}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
