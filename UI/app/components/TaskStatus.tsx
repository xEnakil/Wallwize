import { LoaderCircle } from 'lucide-react';
import { BusyTask } from '../types';

interface TaskStatusProps {
  task: BusyTask;
  compact?: boolean;
}

export function TaskStatus({ task, compact = false }: TaskStatusProps) {
  return (
    <div
      className="ww-fade-in-up rounded-2xl"
      style={{
        background: 'rgba(11, 14, 24, 0.92)',
        border: '1px solid var(--w-iris-tint)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 2px 24px var(--w-iris-glow)',
        padding: compact ? '10px 14px' : '14px 18px',
      }}
    >
      <div className="flex items-center gap-3.5">
        {/* Spinner ring */}
        <div
          className="relative grid shrink-0 place-items-center rounded-full"
          style={{
            width: 36,
            height: 36,
            background: 'var(--w-iris-tint)',
            border: '1px solid var(--w-iris-tint)',
          }}
        >
          <LoaderCircle
            className="size-5 animate-spin"
            style={{ color: 'var(--w-iris-bright)' }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: '0 0 12px var(--w-iris-glow)' }}
          />
        </div>

        <div className="min-w-0">
          <div className="text-[13px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
            {task.label}
          </div>
          <div className="truncate text-[11px]" style={{ color: 'var(--w-iris-bright)', opacity: 0.75 }}>
            {task.hint}
          </div>
        </div>
      </div>

      {!compact && (
        <div
          className="mt-3.5 h-[3px] overflow-hidden rounded-full"
          style={{ background: 'rgba(99,102,241,0.12)' }}
        >
          <div
            className="wallwize-indeterminate-bar h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, var(--w-iris-dim), var(--w-iris-bright))',
            }}
          />
        </div>
      )}
    </div>
  );
}

interface InlineTaskLabelProps {
  task: BusyTask;
}

export function InlineTaskLabel({ task }: InlineTaskLabelProps) {
  return (
    <div className="flex min-w-0 items-center justify-end gap-2.5">
      <LoaderCircle
        className="size-3.5 shrink-0 animate-spin"
        style={{ color: 'var(--w-iris-bright)' }}
      />
      <div className="min-w-0 text-right">
        <div className="truncate text-[12px] font-medium" style={{ color: 'var(--w-text-100)' }}>
          {task.label}
        </div>
        <div className="truncate text-[11px]" style={{ color: 'var(--w-iris-bright)', opacity: 0.7 }}>
          {task.hint}
        </div>
      </div>
    </div>
  );
}
