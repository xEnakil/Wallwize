import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileCheck,
  FileText,
  FolderOpen,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DetailsPanel } from './DetailsPanel';
import { InlineTaskLabel } from './TaskStatus';
import { WallpaperThumbnail } from './WallpaperThumbnail';
import { BusyTask, WallpaperItem, WallwizeSettings } from '../types';

interface LibraryActions {
  chooseSource: () => void;
  scan: () => void;
  plan: () => void;
  apply: () => void;
  setDesktopWallpaper: (path: string, fallbackPath?: string) => void;
  approveWallpaper: (path: string, fallbackPath?: string, destination?: string, operation?: string) => void;
}

interface LibraryViewProps {
  wallpapers: WallpaperItem[];
  settings: WallwizeSettings;
  status: string;
  error: string | null;
  busy: boolean;
  busyTask: BusyTask | null;
  hasPlan: boolean;
  actions: LibraryActions;
}

const BASE_FILTERS = ['All', 'Needs Review', 'AI Confident', 'Low Confidence', 'Duplicates'];
const SORT_OPTIONS = [
  { value: 'confidence-desc', label: 'Confidence ↑' },
  { value: 'confidence-asc',  label: 'Confidence ↓' },
  { value: 'category',        label: 'Category' },
  { value: 'name',            label: 'Name' },
  { value: 'pure-black',      label: 'Pure Black' },
] as const;

const GRID_MIN_CARD_WIDTH = 190;
const GRID_GAP = 10;
const GRID_PADDING = 16;
const GRID_OVERSCAN_ROWS = 1;

type SortValue = typeof SORT_OPTIONS[number]['value'];

export function LibraryView({
  wallpapers,
  settings,
  status,
  error,
  busy,
  busyTask,
  hasPlan,
  actions,
}: LibraryViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortValue>('confidence-desc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const filters = useMemo(
    () => (wallpapers.some((w) => w.category === 'OLED') ? [...BASE_FILTERS, 'OLED'] : BASE_FILTERS),
    [wallpapers],
  );

  useEffect(() => {
    if (filter === 'OLED' && !filters.includes('OLED')) setFilter('All');
  }, [filter, filters]);

  useEffect(() => {
    if (!sortMenuOpen) return;
    const close = (e: PointerEvent) => {
      if (!sortMenuRef.current?.contains(e.target as Node)) setSortMenuOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [sortMenuOpen]);

  const filteredWallpapers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = wallpapers.filter((w) => {
      const matchesQuery =
        q.length === 0 ||
        w.filename.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q) ||
        w.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchesQuery) return false;
      if (filter === 'OLED')           return w.category === 'OLED';
      if (filter === 'Needs Review')   return w.category === 'Needs Review';
      if (filter === 'AI Confident')   return w.source === 'AI Vision' && w.confidence >= 70;
      if (filter === 'Low Confidence') return w.confidence < 70;
      if (filter === 'Duplicates')     return w.warnings.some((warning) => warning.toLowerCase().includes('duplicate'));
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'confidence-asc') return a.confidence - b.confidence;
      if (sort === 'category')       return a.category.localeCompare(b.category) || a.filename.localeCompare(b.filename);
      if (sort === 'name')           return a.filename.localeCompare(b.filename);
      if (sort === 'pure-black')     return b.blackPixels - a.blackPixels || b.darkScore - a.darkScore;
      return b.confidence - a.confidence;
    });
  }, [wallpapers, query, filter, sort]);

  const selectedWallpaper = selectedId
    ? filteredWallpapers.find((w) => w.id === selectedId) || null
    : null;

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  const emptyTitle = wallpapers.length === 0 ? 'No wallpapers loaded' : 'No wallpapers match this filter';
  const emptyDesc =
    wallpapers.length === 0
      ? 'Choose a source folder — Wallwize will scan it automatically.'
      : 'Try adjusting your search or switching the active filter.';

  const selectedSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Sort';

  return (
    <div className="flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">

        {/* ── Toolbar ─────────────────────────────────────────── */}
        <div style={{ background: 'var(--w-bg-raised)', borderBottom: '1px solid var(--w-border-default)' }}>

          {/* Action bar */}
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ borderBottom: '1px solid var(--w-border-faint)' }}
          >
            <button
              type="button"
              onClick={actions.chooseSource}
              disabled={busy}
              className="ww-btn-ghost flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium"
            >
              <FolderOpen className="size-[15px]" />
              Choose Folder
            </button>

            <button
              type="button"
              onClick={actions.scan}
              disabled={busy || !settings.sourceFolder}
              className="ww-btn-ghost flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium"
            >
              <Play className="size-[15px]" />
              Rescan
            </button>

            {/* Separator */}
            <div className="h-5 w-px mx-0.5" style={{ background: 'var(--w-border-default)' }} />

            <button
              type="button"
              onClick={actions.plan}
              disabled={busy || wallpapers.length === 0}
              className="ww-btn-primary flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold"
            >
              <Sparkles className="size-[15px]" />
              Categorize
            </button>

            <button
              type="button"
              onClick={actions.apply}
              disabled={busy || !hasPlan}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-all"
              style={{
                background: hasPlan && !busy ? 'var(--w-emerald-tint)' : 'var(--w-bg-interactive)',
                color: hasPlan && !busy ? 'var(--w-emerald)' : 'var(--w-text-70)',
                border: '1px solid',
                borderColor: hasPlan && !busy ? 'rgba(16,185,129,0.2)' : 'var(--w-border-default)',
                opacity: busy || !hasPlan ? 0.45 : 1,
              }}
            >
              <FileCheck className="size-[15px]" />
              Organize
            </button>

            {/* Right: status / task label */}
            <div className="ml-auto min-w-0">
              {busyTask ? (
                <InlineTaskLabel task={busyTask} />
              ) : (
                <div className="text-right">
                  <div
                    className="max-w-[420px] truncate text-[12px] font-medium"
                    style={{ color: 'var(--w-text-70)' }}
                  >
                    {status}
                  </div>
                  {settings.sourceFolder && (
                    <div
                      className="max-w-[420px] truncate text-[11px] font-mono"
                      style={{ color: 'var(--w-text-40)' }}
                    >
                      {settings.sourceFolder}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="flex items-center gap-2 px-4 py-2 text-[12px]"
              style={{
                background: 'var(--w-rose-tint)',
                borderBottom: '1px solid rgba(244,63,94,0.15)',
                color: 'var(--w-rose)',
              }}
            >
              <AlertCircle className="size-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Search + Sort */}
          <div className="flex items-center gap-2 px-4 py-2">
            <div
              className="flex flex-1 items-center gap-2 rounded-lg px-3 py-[7px] ww-input"
              style={{ background: 'var(--w-bg-base)' }}
            >
              <Search className="size-[14px] shrink-0" style={{ color: 'var(--w-text-40)' }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, category, or tag…"
                className="flex-1 bg-transparent text-[12.5px] outline-none"
                style={{ color: 'var(--w-text-100)' }}
              />
            </div>

            {/* Sort dropdown */}
            <div ref={sortMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setSortMenuOpen((o) => !o)}
                className="ww-btn-ghost flex min-w-[156px] items-center justify-between gap-2 rounded-lg px-3 py-[7px] text-[12.5px] font-medium"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <SlidersHorizontal className="size-[14px] shrink-0" style={{ color: 'var(--w-text-70)' }} />
                  <span className="truncate" style={{ color: 'var(--w-text-100)' }}>{selectedSortLabel}</span>
                </span>
                <ChevronDown
                  className={`size-3 shrink-0 transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--w-text-70)' }}
                />
              </button>

              {sortMenuOpen && (
                <div
                  className="ww-scale-in absolute right-0 z-40 mt-1.5 w-[172px] overflow-hidden rounded-xl py-1"
                  style={{
                    background: 'var(--w-bg-raised)',
                    border: '1px solid var(--w-border-strong)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setSort(opt.value); setSortMenuOpen(false); }}
                      className="flex w-full items-center justify-between px-3.5 py-2 text-left text-[12.5px] transition-colors"
                      style={{
                        background: sort === opt.value ? 'var(--w-iris-tint)' : 'transparent',
                        color: sort === opt.value ? 'var(--w-iris-bright)' : 'var(--w-text-70)',
                      }}
                      onMouseEnter={(e) => {
                        if (sort !== opt.value)
                          (e.currentTarget as HTMLButtonElement).style.background = 'var(--w-bg-interactive)';
                      }}
                      onMouseLeave={(e) => {
                        if (sort !== opt.value)
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                    >
                      {opt.label}
                      {sort === opt.value && (
                        <CheckCircle2 className="size-3.5" style={{ color: 'var(--w-iris-bright)' }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto px-4 pb-2.5">
            {filters.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setFilter(name)}
                className={`ww-chip px-3 py-1 text-[11.5px] font-medium ${filter === name ? 'ww-chip-active' : ''}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Grid ─────────────────────────────────────────────── */}
        <div className="relative min-h-0 flex-1" style={{ background: 'var(--w-bg-base)' }}>
          {filteredWallpapers.length === 0 ? (
            <EmptyLibraryState
              title={emptyTitle}
              description={emptyDesc}
              canChooseFolder={wallpapers.length === 0}
              onChooseFolder={actions.chooseSource}
            />
          ) : (
            <VirtualWallpaperGrid
              wallpapers={filteredWallpapers}
              selectedId={selectedWallpaper?.id ?? null}
              onSelect={handleSelect}
            />
          )}
        </div>
      </div>

      {selectedWallpaper && (
        <DetailsPanel
          wallpaper={selectedWallpaper}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onSetDesktopWallpaper={actions.setDesktopWallpaper}
          onApproveWallpaper={actions.approveWallpaper}
        />
      )}
    </div>
  );
}

/* ── Empty state ──────────────────────────────────────────────── */
interface EmptyLibraryStateProps {
  title: string;
  description: string;
  canChooseFolder: boolean;
  onChooseFolder: () => void;
}

function EmptyLibraryState({ title, description, canChooseFolder, onChooseFolder }: EmptyLibraryStateProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="ww-fade-in-up max-w-sm text-center">
        <div
          className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl"
          style={{ background: 'var(--w-bg-raised)', border: '1px solid var(--w-border-default)' }}
        >
          <FolderOpen className="size-5" style={{ color: 'var(--w-text-40)' }} />
        </div>
        <div className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
          {title}
        </div>
        <div className="mb-5 text-[12.5px]" style={{ color: 'var(--w-text-70)' }}>
          {description}
        </div>
        {canChooseFolder && (
          <button
            type="button"
            onClick={onChooseFolder}
            className="ww-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold"
          >
            <FolderOpen className="size-4" />
            Choose Wallpapers
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Virtual grid ─────────────────────────────────────────────── */
interface VirtualWallpaperGridProps {
  wallpapers: WallpaperItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function VirtualWallpaperGrid({ wallpapers, selectedId, onSelect }: VirtualWallpaperGridProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const scrollEndTimerRef = useRef<number | null>(null);
  const pendingScrollTopRef = useRef(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setViewport({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      if (scrollEndTimerRef.current !== null) window.clearTimeout(scrollEndTimerRef.current);
    };
  }, []);

  const handleScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    pendingScrollTopRef.current = el.scrollTop;
    setIsScrolling(true);
    if (scrollEndTimerRef.current !== null) window.clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = window.setTimeout(() => setIsScrolling(false), 120);
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      setScrollTop(pendingScrollTopRef.current);
      frameRef.current = null;
    });
  }, []);

  const availableWidth = Math.max(viewport.width - GRID_PADDING * 2, GRID_MIN_CARD_WIDTH);
  const columns      = Math.max(1, Math.floor((availableWidth + GRID_GAP) / (GRID_MIN_CARD_WIDTH + GRID_GAP)));
  const cardWidth    = Math.floor((availableWidth - (columns - 1) * GRID_GAP) / columns);
  const cardHeight   = Math.max(108, Math.round(cardWidth * 9 / 16));
  const rowStride    = cardHeight + GRID_GAP;
  const rowCount     = Math.ceil(wallpapers.length / columns);
  const startRow     = Math.max(0, Math.floor(Math.max(scrollTop - GRID_PADDING, 0) / rowStride) - GRID_OVERSCAN_ROWS);
  const endRow       = Math.min(rowCount, Math.ceil((scrollTop + viewport.height + GRID_PADDING) / rowStride) + GRID_OVERSCAN_ROWS);
  const startIndex   = startRow * columns;
  const endIndex     = Math.min(wallpapers.length, endRow * columns);
  const visible      = wallpapers.slice(startIndex, endIndex);
  const totalHeight  = GRID_PADDING * 2 + Math.max(rowCount * rowStride - GRID_GAP, 0);

  return (
    <div
      ref={viewportRef}
      onScroll={handleScroll}
      className="wallwize-library-scroll h-full overflow-auto"
      style={{ background: 'var(--w-bg-base)' }}
    >
      <div className="relative" style={{ height: totalHeight }}>
        {visible.map((wallpaper, offset) => {
          const index  = startIndex + offset;
          const row    = Math.floor(index / columns);
          const column = index % columns;
          const left   = GRID_PADDING + column * (cardWidth + GRID_GAP);
          const top    = GRID_PADDING + row * rowStride;

          return (
            <div
              key={wallpaper.id}
              className="absolute"
              style={{ width: cardWidth, height: cardHeight, transform: `translate3d(${left}px,${top}px,0)` }}
            >
              <WallpaperCard
                wallpaper={wallpaper}
                selected={selectedId === wallpaper.id}
                deferImage={isScrolling}
                onSelect={onSelect}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Wallpaper card ─────────────────────────────────────────────── */
interface WallpaperCardProps {
  wallpaper: WallpaperItem;
  selected: boolean;
  deferImage: boolean;
  onSelect: (id: string) => void;
}

const WallpaperCard = memo(function WallpaperCard({ wallpaper, selected, deferImage, onSelect }: WallpaperCardProps) {
  const conf = wallpaper.confidence;
  const confColor = conf >= 80 ? 'var(--w-emerald)' : conf >= 60 ? 'var(--w-amber)' : 'var(--w-rose)';

  return (
    <button
      type="button"
      onClick={() => onSelect(wallpaper.id)}
      title={wallpaper.filename}
      className="wallwize-wallpaper-card group relative h-full w-full text-left"
      style={{
        background: 'var(--w-bg-surface)',
        boxShadow: selected
          ? `0 0 0 2px var(--w-iris), 0 0 0 4px var(--w-iris-tint)`
          : `0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px var(--w-border-faint)`,
      }}
    >
      {/* Thumbnail */}
      <WallpaperThumbnail
        wallpaper={wallpaper}
        defer={deferImage}
        className="h-full w-full object-cover"
      />

      {/* Hover overlay */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: 'linear-gradient(to top, rgba(6,8,14,0.85) 0%, rgba(6,8,14,0.15) 55%, transparent 100%)' }}
      />

      {/* Always-visible bottom gradient */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ background: 'linear-gradient(to top, rgba(6,8,14,0.90) 0%, rgba(6,8,14,0.4) 50%, transparent 100%)', padding: '8px 8px 6px' }}
      >
        {/* Category + confidence */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <span
            className="truncate text-[11.5px] font-medium text-white"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            {wallpaper.category}
          </span>
          <span
            className="shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-semibold tabular-nums"
            style={{
              background: `${confColor}22`,
              color: confColor,
              border: `1px solid ${confColor}44`,
            }}
          >
            {conf}%
          </span>
        </div>

        {/* Confidence bar */}
        <div
          className="mb-1.5 h-[2px] w-full overflow-hidden rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${conf}%`, background: confColor }}
          />
        </div>

        {/* Source badges */}
        <div className="flex items-center gap-1">
          {wallpaper.source === 'AI Vision'     && <SourceBadge icon="ai"        label="AI" />}
          {wallpaper.source === 'AI Suggestion' && <SourceBadge icon="review"    label="Review" />}
          {wallpaper.source === 'Filename'      && <SourceBadge icon="file"      label="File" />}
          {wallpaper.source === 'Discovery'     && <SourceBadge icon="discovery" label="Disc" />}
          {wallpaper.source === 'OLED Rule'     && <SourceBadge icon="file"      label="Rule" />}
          {conf < 70 && (
            <div
              className="flex items-center rounded-full px-1.5 py-px"
              style={{ background: 'var(--w-amber-tint)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <AlertCircle className="size-2.5" style={{ color: 'var(--w-amber)' }} />
            </div>
          )}
        </div>
      </div>

      {/* Selection ring glow */}
      {selected && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ boxShadow: '0 0 0 2px var(--w-iris) inset' }}
        />
      )}
    </button>
  );
});

function SourceBadge({ icon, label }: { icon: 'ai' | 'file' | 'discovery' | 'review'; label: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    ai:        { bg: 'var(--w-iris-tint)',    color: 'var(--w-iris-bright)', border: 'rgba(99,102,241,0.2)' },
    file:      { bg: 'rgba(56,189,248,0.12)', color: '#38BDF8',              border: 'rgba(56,189,248,0.2)' },
    discovery: { bg: 'var(--w-amber-tint)',   color: 'var(--w-amber)',        border: 'rgba(245,158,11,0.2)' },
    review:    { bg: 'var(--w-rose-tint)',    color: 'var(--w-rose)',         border: 'rgba(244,63,94,0.2)' },
  };
  const s = styles[icon];
  const Icon = icon === 'ai' ? Sparkles : icon === 'file' ? FileText : icon === 'review' ? AlertCircle : CheckCircle2;

  return (
    <div
      className="flex items-center gap-1 rounded-full px-1.5 py-px"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      <Icon className="size-2.5" />
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}
