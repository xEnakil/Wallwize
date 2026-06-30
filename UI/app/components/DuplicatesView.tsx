import { CheckCircle2, Copy } from 'lucide-react';

interface DuplicatesViewProps {
  skippedCount?: number;
}

export function DuplicatesView({ skippedCount = 0 }: DuplicatesViewProps) {
  const hasDuplicates = skippedCount > 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: 'var(--w-bg-raised)',
          borderBottom: '1px solid var(--w-border-default)',
        }}
      >
        <div>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
            Duplicates
          </h2>
          <p className="text-[12px]" style={{ color: 'var(--w-text-70)' }}>
            {hasDuplicates
              ? `${skippedCount} duplicate file${skippedCount !== 1 ? 's' : ''} were skipped during organize`
              : 'No duplicate files detected in current categories'}
          </p>
        </div>

        {hasDuplicates && (
          <span
            className="rounded-full px-3 py-1 text-[12px] font-semibold tabular-nums"
            style={{
              background: 'var(--w-amber-tint)',
              color: 'var(--w-amber)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            {skippedCount} skipped
          </span>
        )}
      </div>

      {/* Body */}
      <div
        className="flex min-h-0 flex-1 items-center justify-center p-6"
        style={{ background: 'var(--w-bg-base)' }}
      >
        <div className="ww-fade-in-up max-w-sm text-center">
          {/* Icon */}
          <div
            className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl"
            style={{
              background: hasDuplicates ? 'var(--w-amber-tint)' : 'var(--w-emerald-tint)',
              border: '1px solid',
              borderColor: hasDuplicates ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
              boxShadow: hasDuplicates
                ? '0 0 20px rgba(245,158,11,0.08)'
                : '0 0 20px rgba(16,185,129,0.08)',
            }}
          >
            {hasDuplicates
              ? <Copy className="size-6" style={{ color: 'var(--w-amber)' }} />
              : <CheckCircle2 className="size-6" style={{ color: 'var(--w-emerald)' }} />
            }
          </div>

          <div className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
            {hasDuplicates ? 'Exact duplicates were skipped' : 'No duplicates found'}
          </div>
          <div className="text-[12.5px] leading-relaxed" style={{ color: 'var(--w-text-70)' }}>
            {hasDuplicates
              ? `Wallwize kept the first file in each exact-match group (${skippedCount} duplicate${skippedCount !== 1 ? 's' : ''} skipped). This protects your disk from redundant copies.`
              : 'Wallwize did not find any exact duplicate files in your current wallpaper collection. All files are unique.'
            }
          </div>

          {hasDuplicates && (
            <div
              className="mt-5 rounded-xl p-4"
              style={{
                background: 'var(--w-bg-raised)',
                border: '1px solid var(--w-border-default)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: 'var(--w-text-70)' }}>
                  Exact duplicates removed
                </span>
                <span
                  className="text-[18px] font-bold tabular-nums"
                  style={{ color: 'var(--w-amber)' }}
                >
                  {skippedCount}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
