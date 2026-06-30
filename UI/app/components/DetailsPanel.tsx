import { Check, Folder, Monitor, X } from 'lucide-react';
import { WallpaperItem } from '../types';
import { WallpaperThumbnail } from './WallpaperThumbnail';

interface DetailsPanelProps {
  wallpaper: WallpaperItem;
  busy: boolean;
  onClose: () => void;
  onSetDesktopWallpaper: (path: string, fallbackPath?: string) => void;
  onApproveWallpaper: (path: string, fallbackPath?: string, destination?: string, operation?: string) => void;
}

export function DetailsPanel({
  wallpaper,
  busy,
  onClose,
  onSetDesktopWallpaper,
  onApproveWallpaper,
}: DetailsPanelProps) {
  const fallbackPath = wallpaper.destination && wallpaper.destination !== wallpaper.absolutePath
    ? wallpaper.destination
    : undefined;

  const conf = wallpaper.confidence;
  const confColor = conf >= 80 ? 'var(--w-emerald)' : conf >= 60 ? 'var(--w-amber)' : 'var(--w-rose)';
  const confLabel = conf >= 80 ? 'High' : conf >= 60 ? 'Medium' : 'Low';
  const canApprove = Boolean(wallpaper.destination) && wallpaper.category !== 'Needs Review';

  return (
    <div
      className="ww-slide-in-right flex w-[300px] shrink-0 flex-col"
      style={{
        background: 'var(--w-bg-surface)',
        borderLeft: '1px solid var(--w-border-default)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--w-border-faint)' }}
      >
        <span className="text-[12.5px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
          Details
        </span>
        <button
          type="button"
          aria-label="Close details"
          onClick={onClose}
          className="grid size-7 place-items-center rounded-lg transition-colors"
          style={{ color: 'var(--w-text-40)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--w-bg-interactive)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--w-text-100)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--w-text-40)';
          }}
        >
          <X className="size-[15px]" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">

          {/* Preview */}
          <div
            className="aspect-video overflow-hidden rounded-xl"
            style={{
              background: 'var(--w-bg-base)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            <WallpaperThumbnail wallpaper={wallpaper} className="h-full w-full object-cover" />
          </div>

          {/* Suggested folder */}
          <div>
            <span className="ww-section-label">Destination Folder</span>
            <div
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
              style={{
                background: 'var(--w-bg-raised)',
                border: '1px solid var(--w-border-default)',
              }}
            >
              <Folder className="size-4 shrink-0" style={{ color: 'var(--w-iris-bright)' }} />
              <span className="text-[12.5px] font-medium truncate" style={{ color: 'var(--w-text-100)' }}>
                {wallpaper.category}
              </span>
            </div>
          </div>

          {/* Confidence */}
          <div
            className="rounded-xl p-3.5"
            style={{
              background: 'var(--w-bg-raised)',
              border: '1px solid var(--w-border-default)',
            }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="ww-section-label" style={{ marginBottom: 0 }}>Confidence</span>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2 py-px text-[10.5px] font-semibold"
                  style={{
                    background: `${confColor}18`,
                    color: confColor,
                    border: `1px solid ${confColor}33`,
                  }}
                >
                  {confLabel}
                </span>
                <span
                  className="text-[18px] font-bold tabular-nums"
                  style={{ color: confColor }}
                >
                  {conf}%
                </span>
              </div>
            </div>

            {/* Gradient bar */}
            <div
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--w-bg-interactive)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${conf}%`,
                  background: conf >= 80
                    ? `linear-gradient(90deg, #059669, var(--w-emerald))`
                    : conf >= 60
                      ? `linear-gradient(90deg, #b45309, var(--w-amber))`
                      : `linear-gradient(90deg, #be123c, var(--w-rose))`,
                }}
              />
            </div>

            {/* Source badge */}
            <div className="mt-2.5">
              <span
                className="inline-block rounded-full px-2.5 py-px text-[10.5px] font-medium"
                style={{
                  background: 'var(--w-bg-interactive)',
                  color: 'var(--w-text-70)',
                  border: '1px solid var(--w-border-default)',
                }}
              >
                {wallpaper.source}
              </span>
            </div>
          </div>

          {/* AI candidates */}
          {wallpaper.aiCandidates && wallpaper.aiCandidates.length > 0 && (
            <div>
              <span className="ww-section-label">AI Candidates</span>
              <div className="space-y-1.5">
                {wallpaper.aiCandidates.map((c) => (
                  <div
                    key={`${c.category}-${c.confidence}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{
                      background: 'var(--w-bg-raised)',
                      border: '1px solid var(--w-border-faint)',
                    }}
                  >
                    <span className="text-[12px]" style={{ color: 'var(--w-text-70)' }}>
                      {c.category}
                    </span>
                    <span
                      className="text-[12px] font-semibold tabular-nums"
                      style={{ color: c.confidence >= 70 ? 'var(--w-emerald)' : 'var(--w-text-40)' }}
                    >
                      {c.confidence}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <MetadataSection wallpaper={wallpaper} />

          {/* Dominant colors */}
          {wallpaper.dominantColors.length > 0 && (
            <div>
              <span className="ww-section-label">Dominant Colors</span>
              <div className="flex gap-2">
                {wallpaper.dominantColors.map((color) => (
                  <div key={color} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="h-9 w-full rounded-lg"
                      style={{
                        backgroundColor: color,
                        border: '1px solid var(--w-border-default)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}
                      title={color}
                    />
                    <span
                      className="text-[9.5px] font-mono"
                      style={{ color: 'var(--w-text-40)' }}
                    >
                      {color.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div
        className="space-y-2 p-4"
        style={{ borderTop: '1px solid var(--w-border-faint)' }}
      >
        <button
          type="button"
          onClick={() => onSetDesktopWallpaper(wallpaper.absolutePath, fallbackPath)}
          disabled={busy}
          className="ww-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold"
        >
          <Monitor className="size-4" />
          Set as Wallpaper
        </button>
        <button
          type="button"
          onClick={() => onApproveWallpaper(wallpaper.absolutePath, fallbackPath, wallpaper.destination, wallpaper.operation)}
          disabled={busy || !canApprove}
          title={canApprove ? 'Approve and organize' : 'Choose a category before approving'}
          className="ww-btn-success flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold"
        >
          <Check className="size-4" />
          Approve & Organize
        </button>
      </div>
    </div>
  );
}

function MetadataSection({ wallpaper }: { wallpaper: WallpaperItem }) {
  const rows = [
    ['Resolution',       wallpaper.resolution],
    ['Aspect Ratio',     wallpaper.aspectRatio],
    ['Pure Black',       `${wallpaper.blackPixels}%`],
    ['Dark Score',       `${wallpaper.darkScore}%`],
  ];

  return (
    <div>
      <span className="ww-section-label">Image Metadata</span>
      <div
        className="overflow-hidden rounded-xl"
        style={{ border: '1px solid var(--w-border-default)' }}
      >
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className="flex justify-between px-3 py-2.5"
            style={{
              background: i % 2 === 0 ? 'var(--w-bg-raised)' : 'var(--w-bg-interactive)',
              borderBottom: i < rows.length - 1 ? '1px solid var(--w-border-faint)' : 'none',
            }}
          >
            <span className="text-[11.5px]" style={{ color: 'var(--w-text-40)' }}>{label}</span>
            <span className="text-[11.5px] font-medium tabular-nums" style={{ color: 'var(--w-text-100)' }}>{value}</span>
          </div>
        ))}
        <div
          className="flex justify-between px-3 py-2.5"
          style={{ background: 'var(--w-bg-raised)' }}
        >
          <span className="text-[11.5px]" style={{ color: 'var(--w-text-40)' }}>Filename</span>
          <span
            className="max-w-[140px] truncate font-mono text-[10.5px]"
            style={{ color: 'var(--w-text-70)' }}
            title={wallpaper.filename}
          >
            {wallpaper.filename}
          </span>
        </div>
      </div>
    </div>
  );
}
