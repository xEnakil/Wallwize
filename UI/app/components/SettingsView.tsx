import { FolderOpen, ShieldCheck } from 'lucide-react';
import { WallwizeSettings } from '../types';

interface SettingsViewProps {
  settings: WallwizeSettings;
  onChooseSource: () => void;
  onChooseOutput: () => void;
  onSettingsChange: (settings: Partial<WallwizeSettings>) => void;
}

export function SettingsView({
  settings,
  onChooseSource,
  onChooseOutput,
  onSettingsChange,
}: SettingsViewProps) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div
        className="px-4 py-3"
        style={{
          background: 'var(--w-bg-raised)',
          borderBottom: '1px solid var(--w-border-default)',
        }}
      >
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
          Settings
        </h2>
        <p className="text-[12px]" style={{ color: 'var(--w-text-70)' }}>
          Configure Wallwize behaviour and file handling
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6" style={{ background: 'var(--w-bg-base)' }}>
        <div className="mx-auto max-w-[620px] space-y-4">

          {/* Folders */}
          <div className="ww-card p-5">
            <h3 className="mb-4 text-[13px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
              Folders
            </h3>
            <div className="space-y-3.5">
              <FolderRow
                label="Source Wallpaper Folder"
                value={settings.sourceFolder || 'No folder selected'}
                onBrowse={onChooseSource}
              />
              <FolderRow
                label="Output Folder"
                value={settings.outputFolder || 'No output folder selected'}
                onBrowse={onChooseOutput}
              />
            </div>
          </div>

          {/* File Operations */}
          <div className="ww-card p-5">
            <h3 className="mb-4 text-[13px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
              File Operations
            </h3>
            <div className="space-y-4">

              {/* Mode */}
              <div>
                <span className="ww-section-label">Operation Mode</span>
                <div className="space-y-2">
                  {[
                    { id: 'copy', title: 'Copy files',  desc: 'Keep originals in source — copy organized files to output' },
                    { id: 'move', title: 'Move files',  desc: 'Remove originals from source after moving to output' },
                  ].map((mode) => {
                    const isSelected = settings.mode === mode.id;
                    return (
                      <label
                        key={mode.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 transition-all"
                        style={{
                          background: isSelected ? 'var(--w-iris-tint)' : 'var(--w-bg-interactive)',
                          border: '1px solid',
                          borderColor: isSelected ? 'rgba(99,102,241,0.25)' : 'var(--w-border-default)',
                        }}
                      >
                        <input
                          type="radio"
                          name="mode"
                          checked={isSelected}
                          onChange={() => onSettingsChange({ mode: mode.id as 'copy' | 'move' })}
                        />
                        <div>
                          <div
                            className="text-[12.5px] font-semibold"
                            style={{ color: isSelected ? 'var(--w-iris-bright)' : 'var(--w-text-100)' }}
                          >
                            {mode.title}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--w-text-70)' }}>
                            {mode.desc}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Conflict */}
              <div>
                <span className="ww-section-label">Conflict Handling</span>
                <div
                  className="grid grid-cols-2 gap-1 overflow-hidden rounded-xl p-1"
                  style={{
                    background: 'var(--w-bg-interactive)',
                    border: '1px solid var(--w-border-default)',
                  }}
                >
                  {[
                    { id: 'skip',   label: 'Skip existing' },
                    { id: 'rename', label: 'Rename copies' },
                  ].map((conflict) => {
                    const isSelected = settings.conflict === conflict.id;
                    return (
                      <button
                        key={conflict.id}
                        type="button"
                        onClick={() => onSettingsChange({ conflict: conflict.id as 'skip' | 'rename' })}
                        className="rounded-lg px-3 py-2 text-[12.5px] font-medium transition-all"
                        style={{
                          background: isSelected ? 'var(--w-iris)' : 'transparent',
                          color: isSelected ? 'white' : 'var(--w-text-70)',
                          boxShadow: isSelected ? '0 1px 4px var(--w-iris-glow)' : 'none',
                        }}
                      >
                        {conflict.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Detection Rules */}
          <div className="ww-card p-5">
            <h3 className="mb-4 text-[13px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
              Detection Rules
            </h3>

            <div className="space-y-5">
              {/* OLED threshold */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <label className="text-[12.5px] font-medium" style={{ color: 'var(--w-text-100)' }}>
                      OLED Pure Black Threshold
                    </label>
                    <p className="mt-0.5 text-[11px]" style={{ color: 'var(--w-text-70)' }}>
                      Only near-neutral black pixels count — dark blue or colored darks are excluded
                    </p>
                  </div>
                  <span
                    className="ml-4 shrink-0 rounded-lg px-3 py-1 text-[14px] font-bold tabular-nums"
                    style={{
                      color: 'var(--w-iris-bright)',
                      background: 'var(--w-iris-tint)',
                      border: '1px solid rgba(99,102,241,0.2)',
                    }}
                  >
                    {settings.oledBlackThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.oledBlackThreshold}
                  onChange={(e) => onSettingsChange({ oledBlackThreshold: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Discovery count */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <label className="text-[12.5px] font-medium" style={{ color: 'var(--w-text-100)' }}>
                      Discovery Minimum Count
                    </label>
                    <p className="mt-0.5 text-[11px]" style={{ color: 'var(--w-text-70)' }}>
                      Minimum wallpapers with the same pattern to create a discovered category
                    </p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.discoveryMinCount}
                    onChange={(e) => onSettingsChange({ discoveryMinCount: Number(e.target.value) })}
                    className="ww-input ml-4 w-[68px] px-3 py-2 text-center text-[13px] font-semibold tabular-nums"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="ww-card p-5">
            <h3 className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
              Privacy
            </h3>
            <div
              className="flex items-center gap-3 rounded-xl p-4"
              style={{
                background: 'var(--w-emerald-tint)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <div
                className="grid size-9 shrink-0 place-items-center rounded-lg"
                style={{ background: 'var(--w-emerald-tint)', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                <ShieldCheck className="size-4" style={{ color: 'var(--w-emerald)' }} />
              </div>
              <div>
                <div className="text-[12.5px] font-semibold mb-0.5" style={{ color: 'var(--w-emerald)' }}>
                  100% Local Processing
                </div>
                <div className="text-[11.5px]" style={{ color: 'var(--w-text-70)' }}>
                  Image analysis runs entirely on this machine. No data ever leaves your computer.
                </div>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="ww-card p-5">
            <h3 className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
              About
            </h3>
            <div
              className="overflow-hidden rounded-xl"
              style={{ border: '1px solid var(--w-border-faint)' }}
            >
              {[
                ['Version',   '0.8.0'],
                ['Backend',   'Wallwize local CLI'],
                ['License',   'Local · free stack'],
              ].map(([label, value], i) => (
                <div
                  key={label}
                  className="flex justify-between px-4 py-3"
                  style={{
                    background: i % 2 === 0 ? 'var(--w-bg-raised)' : 'var(--w-bg-interactive)',
                    borderBottom: i < 2 ? '1px solid var(--w-border-faint)' : 'none',
                  }}
                >
                  <span className="text-[12px]" style={{ color: 'var(--w-text-40)' }}>{label}</span>
                  <span className="text-[12px] font-medium" style={{ color: 'var(--w-text-100)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FolderRow({ label, value, onBrowse }: { label: string; value: string; onBrowse: () => void }) {
  const isEmpty = !value || value.includes('No ');
  return (
    <div>
      <span className="ww-section-label">{label}</span>
      <div className="flex gap-2">
        <div
          className="flex flex-1 items-center rounded-xl px-3.5 py-2.5"
          style={{
            background: 'var(--w-bg-interactive)',
            border: '1px solid var(--w-border-default)',
          }}
        >
          <span
            className="flex-1 truncate font-mono text-[11.5px]"
            style={{ color: isEmpty ? 'var(--w-text-40)' : 'var(--w-text-70)' }}
          >
            {value}
          </span>
        </div>
        <button
          type="button"
          onClick={onBrowse}
          className="ww-btn-ghost flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium"
        >
          <FolderOpen className="size-4" />
          Browse
        </button>
      </div>
    </div>
  );
}
