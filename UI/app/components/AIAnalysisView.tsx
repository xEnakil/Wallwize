import { AlertCircle, Download, Eye, FileText, LoaderCircle, Play, Sparkles } from 'lucide-react';
import { type ReactNode } from 'react';
import { InlineTaskLabel } from './TaskStatus';
import { BusyTask, WallwizeSettings, WallwizeStats } from '../types';

interface AIAnalysisViewProps {
  settings: WallwizeSettings;
  stats: WallwizeStats;
  busy: boolean;
  busyTask: BusyTask | null;
  onSettingsChange: (settings: Partial<WallwizeSettings>) => void;
  onRunPlan: () => void;
}

const profiles = [
  { id: 'off',      name: 'Rules Only',  desc: 'Filename patterns, OLED detection, discovered folder groupings', size: '—' },
  { id: 'small',    name: 'Small',       desc: 'Fast local AI, great for quick sorting of large collections',    size: '~400 MB' },
  { id: 'balanced', name: 'Balanced',    desc: 'Better category accuracy with moderate processing speed',         size: '~1.2 GB' },
  { id: 'large',    name: 'Large',       desc: 'Highest accuracy, takes longer on large sets',                   size: '~3.5 GB' },
] as const;

export function AIAnalysisView({
  settings,
  stats,
  busy,
  busyTask,
  onSettingsChange,
  onRunPlan,
}: AIAnalysisViewProps) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-4 px-4 py-3"
        style={{
          background: 'var(--w-bg-raised)',
          borderBottom: '1px solid var(--w-border-default)',
        }}
      >
        <div>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
            AI Analysis
          </h2>
          <p className="text-[12px]" style={{ color: 'var(--w-text-70)' }}>
            Configure local vision models and confidence thresholds
          </p>
        </div>
        {busyTask && <InlineTaskLabel task={busyTask} />}
      </div>

      <div className="flex-1 overflow-auto p-6" style={{ background: 'var(--w-bg-base)' }}>
        <div className="mx-auto max-w-[620px] space-y-4">

          {/* Model Profile */}
          <div className="ww-card p-5">
            <h3 className="mb-1 text-[13px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
              Model Profile
            </h3>
            <p className="mb-4 text-[12px]" style={{ color: 'var(--w-text-70)' }}>
              Choose how Wallwize categorizes your images. Larger models are more accurate but require more disk space.
            </p>

            <div className="space-y-2">
              {profiles.map((profile) => {
                const isSelected = settings.visionProfile === profile.id;
                return (
                  <label
                    key={profile.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl p-3.5 transition-all"
                    style={{
                      background: isSelected ? 'var(--w-iris-tint)' : 'var(--w-bg-interactive)',
                      border: '1px solid',
                      borderColor: isSelected ? 'rgba(99,102,241,0.25)' : 'var(--w-border-default)',
                    }}
                  >
                    <input
                      type="radio"
                      name="model"
                      checked={isSelected}
                      disabled={busy}
                      onChange={() => onSettingsChange({ visionProfile: profile.id })}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className="text-[13px] font-semibold"
                          style={{ color: isSelected ? 'var(--w-iris-bright)' : 'var(--w-text-100)' }}
                        >
                          {profile.name}
                        </span>
                        <span
                          className="text-[11px] font-mono"
                          style={{ color: 'var(--w-text-40)' }}
                        >
                          {profile.size}
                        </span>
                      </div>
                      <p className="text-[11.5px]" style={{ color: 'var(--w-text-70)' }}>
                        {profile.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Confidence Settings */}
          <div className="ww-card p-5">
            <h3 className="mb-4 text-[13px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
              Confidence Settings
            </h3>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-[12.5px] font-medium" style={{ color: 'var(--w-text-100)' }}>
                    Minimum Confidence Threshold
                  </label>
                  <p className="mt-0.5 text-[11px]" style={{ color: 'var(--w-text-70)' }}>
                    Scores below this value won't route images to a category
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
                  {Math.round(settings.visionMinConfidence * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={Math.round(settings.visionMinConfidence * 100)}
                disabled={busy}
                onChange={(e) => onSettingsChange({ visionMinConfidence: Number(e.target.value) / 100 })}
                className="w-full"
              />
            </div>

            <label
              className="flex cursor-pointer items-center gap-3 rounded-xl p-3.5"
              style={{
                background: 'var(--w-bg-interactive)',
                border: '1px solid var(--w-border-default)',
              }}
            >
              <input
                type="checkbox"
                checked={settings.visionLocalOnly}
                disabled={busy}
                onChange={(e) => onSettingsChange({ visionLocalOnly: e.target.checked })}
              />
              <div>
                <div className="text-[12.5px] font-medium" style={{ color: 'var(--w-text-100)' }}>
                  Local-only model loading
                </div>
                <div className="text-[11px]" style={{ color: 'var(--w-text-70)' }}>
                  Only load packaged or already-cached model files — no network requests
                </div>
              </div>
            </label>
          </div>

          {/* Model Status */}
          <div className="ww-card p-5">
            <h3 className="mb-4 text-[13px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
              Model Status
            </h3>

            <div className="space-y-2 mb-4">
              <StatusRow
                indicator="var(--w-emerald)"
                title="Selected Profile"
                subtitle={settings.visionProfile === 'off' ? 'Rules-only mode active' : `${settings.visionProfile} CLIP model configured`}
                badge="Configured"
                badgeColor="var(--w-emerald)"
                badgeBg="var(--w-emerald-tint)"
              />
              <StatusRow
                indicator="var(--w-text-40)"
                title="Model Cache"
                subtitle="Stored with Wallwize app data"
                badge="Auto"
                badgeColor="var(--w-text-70)"
                badgeBg="var(--w-bg-interactive)"
                badgeIcon={<Download className="size-3" />}
              />
            </div>

            <button
              type="button"
              onClick={onRunPlan}
              disabled={busy}
              className="ww-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold"
            >
              {busy
                ? <><LoaderCircle className="size-4 animate-spin" /> Working…</>
                : <><Play className="size-4" /> Run AI Categorization</>
              }
            </button>
          </div>

          {/* Stats */}
          <div className="ww-card p-5">
            <h3 className="mb-4 text-[13px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
              Current Results
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Library',      count: stats.library,      icon: Sparkles,    color: 'var(--w-iris-bright)' },
                { label: 'Categories',   count: stats.categories,   icon: FileText,    color: '#38BDF8' },
                { label: 'Review Queue', count: stats.reviewQueue,  icon: AlertCircle, color: 'var(--w-amber)' },
                { label: 'Duplicates',   count: stats.duplicates,   icon: Eye,         color: 'var(--w-rose)' },
              ].map(({ label, count, icon: Icon, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl p-3.5"
                  style={{
                    background: 'var(--w-bg-interactive)',
                    border: '1px solid var(--w-border-faint)',
                  }}
                >
                  <div
                    className="grid size-9 shrink-0 place-items-center rounded-lg"
                    style={{ background: `${color}18`, border: `1px solid ${color}22` }}
                  >
                    <Icon className="size-4" style={{ color }} />
                  </div>
                  <div>
                    <div className="text-[11px]" style={{ color: 'var(--w-text-70)' }}>{label}</div>
                    <div className="text-[20px] font-bold tabular-nums leading-tight" style={{ color: 'var(--w-text-100)' }}>
                      {count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  indicator,
  title,
  subtitle,
  badge,
  badgeColor,
  badgeBg,
  badgeIcon,
}: {
  indicator: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  badgeIcon?: ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-3.5 py-3"
      style={{
        background: 'var(--w-bg-interactive)',
        border: '1px solid var(--w-border-faint)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="size-2 shrink-0 rounded-full"
          style={{ background: indicator, boxShadow: `0 0 4px ${indicator}` }}
        />
        <div>
          <div className="text-[12.5px] font-medium" style={{ color: 'var(--w-text-100)' }}>{title}</div>
          <div className="text-[11px]" style={{ color: 'var(--w-text-40)' }}>{subtitle}</div>
        </div>
      </div>
      <div
        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
        style={{ background: badgeBg, color: badgeColor }}
      >
        {badgeIcon}
        {badge}
      </div>
    </div>
  );
}
