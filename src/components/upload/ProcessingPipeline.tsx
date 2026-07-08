import { pipelineStages } from '../../data/mockData';

interface ProcessingPipelineProps {
  activeStage?: string | null;
}

export default function ProcessingPipeline({ activeStage }: ProcessingPipelineProps) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto" role="list" aria-label="Processing pipeline">
      {pipelineStages.map((stage, i) => {
        const isActive = stage.key === activeStage;
        const isPast =
          activeStage &&
          pipelineStages.findIndex((s) => s.key === activeStage) > i;

        return (
          <div key={stage.key} className="flex items-center" role="listitem">
            <span
              className={[
                'font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border-y border-l last:border-r transition-colors duration-150',
                i === 0 ? 'border-l' : '',
                i === pipelineStages.length - 1 ? 'border-r' : '',
                isActive
                  ? 'bg-[#111111] text-[#F4F1EA] border-[#111111]'
                  : isPast
                  ? 'bg-[#F4F1EA] text-[#6B6862] border-[#DDD8CE]'
                  : 'bg-transparent text-[#9A958F] border-[#DDD8CE]',
              ].join(' ')}
            >
              {stage.label}
            </span>
            {i < pipelineStages.length - 1 && (
              <span
                className={[
                  'font-mono text-[10px] px-1 border-y border-[#DDD8CE]',
                  isPast ? 'text-[#6B6862]' : 'text-[#DDD8CE]',
                ].join(' ')}
                aria-hidden="true"
              >
                →
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
