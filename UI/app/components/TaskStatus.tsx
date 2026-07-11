import { BusyTask } from '../types';

interface TaskStatusProps {
  task: BusyTask;
  compact?: boolean;
}

export function TaskStatus({ task, compact = false }: TaskStatusProps) {
  return (
    <div
      className="ww-pop overflow-hidden rounded-[28px]"
      style={{
        background: 'var(--md-sys-color-surface-container-high)',
        color: 'var(--md-sys-color-on-surface)',
        border: '1px solid var(--md-sys-color-outline-variant)',
        boxShadow: 'var(--md-sys-elevation-level4)',
        padding: compact ? '10px 14px' : '14px 18px 12px',
      }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-3">
        <div
          className="grid size-10 shrink-0 place-items-center rounded-full"
          style={{
            background: 'var(--md-sys-color-primary-container)',
            color: 'var(--md-sys-color-on-primary-container)',
          }}
          aria-hidden="true"
        >
          <span className="material-symbols-rounded animate-spin text-[22px] leading-none">
            progress_activity
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold tracking-[-0.005em]">
            {task.label}
          </div>
          <div
            className="mt-0.5 truncate text-[11.5px]"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            {task.hint}
          </div>
        </div>
      </div>

      {!compact && (
        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full"
          style={{ background: 'var(--md-sys-color-surface-container-highest)' }}
          aria-hidden="true"
        >
          <div
            className="wallwize-indeterminate-bar h-full rounded-full"
            style={{ background: 'var(--md-sys-color-primary)' }}
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
    <div
      className="flex min-w-0 items-center justify-end gap-2"
      role="status"
      aria-live="polite"
      title={task.hint}
    >
      <span
        className="material-symbols-rounded shrink-0 animate-spin text-[18px] leading-none"
        style={{ color: 'var(--md-sys-color-primary)' }}
        aria-hidden="true"
      >
        progress_activity
      </span>
      <span className="max-w-[260px] truncate text-[12px] font-medium">
        {task.label}
      </span>
    </div>
  );
}
