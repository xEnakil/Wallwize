import { useEffect } from 'react';
import {
  MaterialSymbol,
  MdFilledButton,
  MdFilledTonalButton,
  MdIconButton,
} from '../material/components';
import { WallpaperItem } from '../types';
import { WallpaperThumbnail } from './WallpaperThumbnail';

interface DetailsPanelProps {
  wallpaper: WallpaperItem;
  busy: boolean;
  onClose: () => void;
  onSetDesktopWallpaper: (path: string, fallbackPath?: string) => void;
  onApproveWallpaper: (path: string, fallbackPath?: string, destination?: string, operation?: string) => void;
}

function getClassificationExplanation(wallpaper: WallpaperItem) {
  if (wallpaper.reason?.trim()) return wallpaper.reason.trim();

  switch (wallpaper.source) {
    case 'AI Vision':
      return `The local vision model classified this image as ${wallpaper.category}.`;
    case 'AI Suggestion':
      return `The local model suggested ${wallpaper.category}; review it before organizing.`;
    case 'Filename':
      return `The filename matched the ${wallpaper.category} rule.`;
    case 'Discovery':
      return `Its source-folder pattern matched the discovered ${wallpaper.category} collection.`;
    case 'OLED Rule':
      return `Pure black coverage (${wallpaper.blackPixels}%) matched your OLED rule.`;
    case 'Manual':
      return `You assigned this wallpaper to ${wallpaper.category}.`;
    case 'Approved':
      return `This wallpaper was approved for ${wallpaper.category}.`;
    case 'Ignored':
      return 'This wallpaper is currently ignored.';
    case 'Needs Review':
      return 'Wallwize could not make a confident category decision.';
    case 'Mixed':
      return `Multiple local signals matched ${wallpaper.category}.`;
    default:
      return `Wallwize matched this wallpaper to ${wallpaper.category}.`;
  }
}

function formatFileSize(sizeBytes?: number) {
  if (sizeBytes === undefined || !Number.isFinite(sizeBytes) || sizeBytes < 0) return null;
  if (sizeBytes < 1024) return `${sizeBytes} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = sizeBytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function DetailsPanel({
  wallpaper,
  busy,
  onClose,
  onSetDesktopWallpaper,
  onApproveWallpaper,
}: DetailsPanelProps) {
  const fallbackPath =
    wallpaper.destination && wallpaper.destination !== wallpaper.absolutePath
      ? wallpaper.destination
      : undefined;
  const confidenceTone =
    wallpaper.confidence >= 80
      ? {
          background: 'var(--md-sys-color-tertiary-container)',
          color: 'var(--md-sys-color-on-tertiary-container)',
        }
      : wallpaper.confidence >= 60
        ? {
            background: 'var(--md-sys-color-secondary-container)',
            color: 'var(--md-sys-color-on-secondary-container)',
          }
        : {
            background: 'var(--md-sys-color-error-container)',
            color: 'var(--md-sys-color-on-error-container)',
          };
  const canApprove = Boolean(wallpaper.destination) && wallpaper.category !== 'Needs Review';
  const fileSize = formatFileSize(wallpaper.sizeBytes);
  const explanation = getClassificationExplanation(wallpaper);
  const immediateActionDescription = !canApprove
    ? 'Choose a category before organizing this file.'
    : wallpaper.operation === 'move'
      ? 'Approve & organize moves this file now.'
      : wallpaper.operation === 'copy'
        ? 'Approve & organize copies this file now.'
        : 'Approve & organize processes this file now.';

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <aside
      className="ww-slide-in-right flex w-[400px] shrink-0 flex-col overflow-hidden"
      aria-label={`${wallpaper.category} wallpaper details`}
      style={{
        background: 'var(--md-sys-color-surface-container-low)',
        boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.18)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      <div className="min-h-0 flex-1 overflow-auto px-7 pb-6 pt-7">
        <div className="flex justify-end">
          <MdIconButton type="button" aria-label="Close wallpaper details" onClick={onClose}>
            <MaterialSymbol>close</MaterialSymbol>
          </MdIconButton>
        </div>

        <div
          className="ww-details-thumb mt-1 aspect-[16/11] overflow-hidden rounded-[28px]"
          style={{ background: 'var(--md-sys-color-surface-container-high)' }}
        >
          <WallpaperThumbnail wallpaper={wallpaper} className="h-full w-full object-cover" />
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <h2 className="ww-display-hero min-w-0 truncate text-[30px] leading-none">
            {wallpaper.category}
          </h2>
          <span
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[12px] font-semibold tabular-nums"
            style={confidenceTone}
          >
            <MaterialSymbol className="text-[16px] leading-none" fill opticalSize={20}>
              {wallpaper.confidence >= 80 ? 'verified' : wallpaper.confidence >= 60 ? 'pending' : 'warning'}
            </MaterialSymbol>
            {wallpaper.confidence}%
          </span>
        </div>

        <span
          className="mt-3 inline-flex h-7 items-center rounded-full px-3 text-[11px] font-medium"
          style={{
            background: 'var(--md-sys-color-secondary-container)',
            color: 'var(--md-sys-color-on-secondary-container)',
          }}
        >
          {wallpaper.source}
        </span>

        <details
          open
          className="group mt-6 rounded-[28px]"
          style={{
            background: 'var(--md-sys-color-surface-container)',
          }}
        >
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 outline-none [&::-webkit-details-marker]:hidden">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full"
              style={{
                background: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-on-primary-container)',
              }}
            >
              <MaterialSymbol className="text-[22px] leading-none" fill>
                auto_awesome
              </MaterialSymbol>
            </span>
            <span className="min-w-0 flex-1 text-[14px] font-medium">Why {wallpaper.category}?</span>
            <MaterialSymbol className="text-[21px] leading-none transition-transform group-open:rotate-180">
              expand_more
            </MaterialSymbol>
          </summary>
          <p
            className="px-4 pb-4 pl-[68px] text-[13px] leading-5"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            {explanation}
          </p>
        </details>

        <details
          className="group mt-3 rounded-[28px]"
          style={{
            background: 'var(--md-sys-color-surface-container)',
          }}
        >
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 outline-none [&::-webkit-details-marker]:hidden">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full"
              style={{
                background: 'var(--md-sys-color-surface-container-highest)',
                color: 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              <MaterialSymbol className="text-[22px] leading-none">info</MaterialSymbol>
            </span>
            <span className="min-w-0 flex-1 text-[14px] font-medium">Details</span>
            <MaterialSymbol className="text-[21px] leading-none transition-transform group-open:rotate-180">
              expand_more
            </MaterialSymbol>
          </summary>

          <div className="space-y-5 px-4 pb-5">
            <MetadataGrid wallpaper={wallpaper} fileSize={fileSize} />

            {wallpaper.aiCandidates && wallpaper.aiCandidates.length > 0 ? (
              <div>
                <p
                  className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
                >
                  Local AI candidates
                </p>
                <div className="space-y-1.5">
                  {wallpaper.aiCandidates.map((candidate) => (
                    <div
                      key={`${candidate.category}-${candidate.confidence}`}
                      className="flex items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-[12px]"
                      style={{ background: 'var(--md-sys-color-surface-container-high)' }}
                    >
                      <span className="truncate">{candidate.category}</span>
                      <span className="shrink-0 tabular-nums">{candidate.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {wallpaper.dominantColors.length > 0 ? (
              <div>
                <p
                  className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
                >
                  Dominant colors
                </p>
                <div className="flex flex-wrap gap-2">
                  {wallpaper.dominantColors.map((color) => (
                    <span
                      key={color}
                      className="size-8 rounded-full"
                      style={{
                        background: color,
                        border: '2px solid var(--md-sys-color-outline-variant)',
                      }}
                      title={color.toUpperCase()}
                      aria-label={`Dominant color ${color.toUpperCase()}`}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {wallpaper.warnings.length > 0 ? (
              <div
                className="flex items-start gap-2 rounded-[14px] p-3 text-[12px] leading-5"
                style={{
                  background: 'var(--md-sys-color-error-container)',
                  color: 'var(--md-sys-color-on-error-container)',
                }}
              >
                <MaterialSymbol className="mt-px shrink-0 text-[18px] leading-none">warning</MaterialSymbol>
                <span>{wallpaper.warnings.join(' ')}</span>
              </div>
            ) : null}
          </div>
        </details>
      </div>

      <div
        className="space-y-3 px-7 py-6"
        style={{
          background: 'var(--md-sys-color-surface-container-low)',
          borderTop: '1px solid var(--md-sys-color-outline-variant)',
        }}
      >
        <MdFilledTonalButton
          className="w-full"
          type="button"
          disabled={busy}
          onClick={() => onSetDesktopWallpaper(wallpaper.absolutePath, fallbackPath)}
          hasIcon
        >
          <MaterialSymbol slot="icon">desktop_windows</MaterialSymbol>
          Set wallpaper
        </MdFilledTonalButton>

        <MdFilledButton
          className="w-full"
          type="button"
          disabled={busy || !canApprove}
          title={canApprove ? 'Copy or move this wallpaper now' : 'Choose a category before organizing'}
          onClick={() =>
            onApproveWallpaper(
              wallpaper.absolutePath,
              fallbackPath,
              wallpaper.destination,
              wallpaper.operation,
            )
          }
          hasIcon
        >
          <MaterialSymbol slot="icon">drive_file_move</MaterialSymbol>
          Approve &amp; organize
        </MdFilledButton>

        <p
          className="text-center text-[11px] leading-4"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          {immediateActionDescription}
        </p>
      </div>
    </aside>
  );
}

interface MetadataGridProps {
  wallpaper: WallpaperItem;
  fileSize: string | null;
}

function MetadataGrid({ wallpaper, fileSize }: MetadataGridProps) {
  const metadata = [
    ['Resolution', wallpaper.resolution],
    ['Aspect ratio', wallpaper.aspectRatio],
    ['Pure black', `${wallpaper.blackPixels}%`],
    ['Dark score', `${wallpaper.darkScore}%`],
    ...(fileSize ? [['File size', fileSize]] : []),
  ];

  return (
    <div>
      <p
        className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
      >
        Image
      </p>
      <dl className="grid grid-cols-2 gap-2">
        {metadata.map(([label, value]) => (
          <div
            key={label}
            className="min-w-0 rounded-[14px] px-3 py-2.5"
            style={{ background: 'var(--md-sys-color-surface-container-high)' }}
          >
            <dt
              className="text-[10px] leading-4"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              {label}
            </dt>
            <dd className="mt-0.5 truncate text-[12px] font-medium tabular-nums" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div
        className="mt-2 rounded-[14px] px-3 py-2.5"
        style={{ background: 'var(--md-sys-color-surface-container-high)' }}
      >
        <p
          className="text-[10px] leading-4"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          File
        </p>
        <p
          className="mt-0.5 break-all font-mono text-[10px] leading-4"
          title={wallpaper.relativePath ?? wallpaper.filename}
        >
          {wallpaper.relativePath ?? wallpaper.filename}
        </p>
      </div>

      {wallpaper.destination ? (
        <div
          className="mt-2 rounded-[14px] px-3 py-2.5"
          style={{ background: 'var(--md-sys-color-surface-container-high)' }}
        >
          <p
            className="text-[10px] leading-4"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            Planned destination
          </p>
          <p className="mt-0.5 break-all font-mono text-[10px] leading-4" title={wallpaper.destination}>
            {wallpaper.destination}
          </p>
        </div>
      ) : null}
    </div>
  );
}
