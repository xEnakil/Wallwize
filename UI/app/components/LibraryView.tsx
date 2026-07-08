import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MaterialSymbol, MdFilledButton, MdIconButton } from '../material/components';
import { BentoCard, MorphPill, PopBadge, Stagger, StaggerItem } from '../material/expressive';
import { BusyTask, WallpaperItem, WallwizeSettings } from '../types';
import { DetailsPanel } from './DetailsPanel';
import { InlineTaskLabel } from './TaskStatus';
import { WallpaperThumbnail } from './WallpaperThumbnail';

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

type FilterTone = 'primary' | 'error' | 'secondary' | 'tertiary';

const FILTER_TILES = [
  { value: 'All', label: 'All', icon: 'apps', tone: 'primary', countKey: 'all' },
  { value: 'Needs Review', label: 'Review', icon: 'rate_review', tone: 'error', countKey: 'review' },
  { value: 'OLED', label: 'OLED', icon: 'contrast', tone: 'secondary', countKey: 'oled' },
  { value: 'Duplicates', label: 'Duplicates', icon: 'content_copy', tone: 'tertiary', countKey: 'duplicates' },
] as const;

const SECONDARY_FILTERS = [
  { value: 'AI Confident', label: 'AI confident' },
  { value: 'Low Confidence', label: 'Low confidence' },
] as const;

const SORT_OPTIONS = [
  { value: 'confidence-desc', label: 'Highest confidence' },
  { value: 'confidence-asc', label: 'Lowest confidence' },
  { value: 'category', label: 'Category' },
  { value: 'name', label: 'Filename' },
  { value: 'pure-black', label: 'Pure black coverage' },
] as const;

const GRID_MIN_CARD_WIDTH = 292;
const GRID_GAP = 14;
const GRID_HORIZONTAL_PADDING = 32;
const GRID_TOP_PADDING = 8;
const GRID_BOTTOM_PADDING = 32;
const GRID_OVERSCAN_ROWS = 1;

type PrimaryFilterValue = (typeof FILTER_TILES)[number]['value'];
type SecondaryFilterValue = (typeof SECONDARY_FILTERS)[number]['value'];
type FilterValue = PrimaryFilterValue | SecondaryFilterValue;
type SortValue = (typeof SORT_OPTIONS)[number]['value'];

function isSecondaryFilter(filter: FilterValue): filter is SecondaryFilterValue {
  return SECONDARY_FILTERS.some((option) => option.value === filter);
}

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
  const [filter, setFilter] = useState<FilterValue>('All');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [sort, setSort] = useState<SortValue>('confidence-desc');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!viewMenuOpen && !actionMenuOpen) return;

    const closeMenus = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!viewMenuRef.current?.contains(target)) setViewMenuOpen(false);
      if (!actionMenuRef.current?.contains(target)) setActionMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setViewMenuOpen(false);
      setActionMenuOpen(false);
    };

    window.addEventListener('pointerdown', closeMenus);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeMenus);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [actionMenuOpen, viewMenuOpen]);

  const filterCounts = useMemo(() => {
    let review = 0;
    let oled = 0;
    let duplicates = 0;
    for (const wallpaper of wallpapers) {
      if (wallpaper.category === 'Needs Review') review += 1;
      if (wallpaper.category === 'OLED') oled += 1;
      if (wallpaper.warnings.some((warning) => warning.toLowerCase().includes('duplicate'))) duplicates += 1;
    }
    return { all: wallpapers.length, review, oled, duplicates };
  }, [wallpapers]);

  const reviewCount = filterCounts.review;

  const filteredWallpapers = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const filtered = wallpapers.filter((wallpaper) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        wallpaper.filename.toLowerCase().includes(normalizedQuery) ||
        wallpaper.category.toLowerCase().includes(normalizedQuery) ||
        wallpaper.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

      if (!matchesQuery) return false;
      if (filter === 'OLED') return wallpaper.category === 'OLED';
      if (filter === 'Needs Review') return wallpaper.category === 'Needs Review';
      if (filter === 'AI Confident') {
        return wallpaper.source === 'AI Vision' && wallpaper.confidence >= 70;
      }
      if (filter === 'Low Confidence') return wallpaper.confidence < 70;
      if (filter === 'Duplicates') {
        return wallpaper.warnings.some((warning) => warning.toLowerCase().includes('duplicate'));
      }
      return true;
    });

    return filtered.toSorted((first, second) => {
      if (sort === 'confidence-asc') return first.confidence - second.confidence;
      if (sort === 'category') {
        return first.category.localeCompare(second.category) || first.filename.localeCompare(second.filename);
      }
      if (sort === 'name') return first.filename.localeCompare(second.filename);
      if (sort === 'pure-black') {
        return second.blackPixels - first.blackPixels || second.darkScore - first.darkScore;
      }
      return second.confidence - first.confidence;
    });
  }, [deferredQuery, filter, sort, wallpapers]);

  useEffect(() => {
    if (!selectedId) return;
    const selectionStillVisible = filteredWallpapers.some((wallpaper) => wallpaper.id === selectedId);
    if (!selectionStillVisible) setSelectedId(null);
  }, [filteredWallpapers, selectedId]);

  const selectedWallpaper = selectedId
    ? filteredWallpapers.find((wallpaper) => wallpaper.id === selectedId) ?? null
    : null;

  const handleSelect = useCallback((id: string) => {
    setSelectedId((current) => (current === id ? null : id));
  }, []);

  const selectFilter = useCallback((nextFilter: FilterValue) => {
    setFilter(nextFilter);
    setViewMenuOpen(false);
  }, []);

  const emptyTitle = wallpapers.length === 0 ? 'Your library is ready for a folder' : 'No wallpapers found';
  const emptyDescription =
    wallpapers.length === 0
      ? 'Choose a wallpaper folder to scan it privately on this device.'
      : 'Try another search or filter.';

  const isFiltered = filter !== 'All' || deferredQuery.trim().length > 0;
  const resultLabel = isFiltered
    ? `${filteredWallpapers.length} of ${wallpapers.length} shown`
    : `${wallpapers.length} ${wallpapers.length === 1 ? 'wallpaper' : 'wallpapers'}`;
  const selectedSortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Highest confidence';
  const secondaryFilter = isSecondaryFilter(filter)
    ? SECONDARY_FILTERS.find((option) => option.value === filter)
    : undefined;

  return (
    <main
      className="flex min-w-0 flex-1 overflow-hidden"
      style={{ background: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)' }}
    >
      <section className="flex min-w-0 flex-1 flex-col" aria-labelledby="library-heading">
        <header className="relative shrink-0 px-8 pb-4 pt-7" style={{ background: 'var(--md-sys-color-surface)' }}>
          <div className="flex min-w-0 items-start justify-between gap-5">
            <div className="min-w-0">
              <div
                className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--md-sys-color-primary)' }}
              >
                Wallpaper library
              </div>
              <h1 id="library-heading" className="ww-display-hero text-[44px]">
                Library
              </h1>
              <div className="ww-wavy-accent mt-2.5 w-16" />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <PopBadge tone={hasPlan ? 'primary' : 'surface-high'} icon={hasPlan ? 'check_circle' : 'pending'}>
                  {hasPlan ? 'Plan ready' : wallpapers.length > 0 ? 'Ready to plan' : 'No source'}
                </PopBadge>
                {reviewCount > 0 ? (
                  <PopBadge tone="error" icon="rate_review">
                    {reviewCount} to review
                  </PopBadge>
                ) : null}
                <span className="text-[14px]" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} aria-live="polite">
                  {resultLabel}
                </span>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              {busyTask ? <InlineTaskLabel task={busyTask} /> : null}
              <div ref={actionMenuRef} className="relative">
                <MdIconButton
                  type="button"
                  aria-label="Library actions"
                  aria-haspopup="menu"
                  aria-expanded={actionMenuOpen}
                  onClick={() => setActionMenuOpen((open) => !open)}
                >
                  <MaterialSymbol>more_vert</MaterialSymbol>
                </MdIconButton>

                {actionMenuOpen ? (
                  <div
                    role="menu"
                    aria-label="Library actions"
                    className="ww-menu-pop absolute right-0 top-12 z-50 w-[250px] overflow-hidden p-2"
                    style={{
                      background: 'var(--md-sys-color-surface-container-high)',
                      borderRadius: 'var(--md-sys-shape-corner-extra-large)',
                      boxShadow: 'var(--md-sys-elevation-level4)',
                    }}
                  >
                    <MenuAction
                      icon="folder_open"
                      label="Choose wallpaper folder"
                      disabled={busy}
                      onClick={() => {
                        setActionMenuOpen(false);
                        actions.chooseSource();
                      }}
                    />
                    <MenuAction
                      icon="refresh"
                      label="Rescan folder"
                      disabled={busy || !settings.sourceFolder}
                      disabledReason="Choose a source folder first"
                      onClick={() => {
                        setActionMenuOpen(false);
                        actions.scan();
                      }}
                    />
                    <MenuAction
                      icon="auto_awesome"
                      label={hasPlan ? 'Refresh organization plan' : 'Create organization plan'}
                      disabled={busy || wallpapers.length === 0}
                      disabledReason="Scan wallpapers first"
                      onClick={() => {
                        setActionMenuOpen(false);
                        actions.plan();
                      }}
                    />
                    <div className="mx-3 my-1 h-px" style={{ background: 'var(--md-sys-color-outline-variant)' }} />
                    <MenuAction
                      icon="drive_file_move"
                      label={`Organize plan (${settings.mode})`}
                      disabled={busy || !hasPlan}
                      disabledReason="Create an organization plan first"
                      onClick={() => {
                        setActionMenuOpen(false);
                        actions.apply();
                      }}
                      emphasized
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <span className="sr-only" role="status" aria-live="polite">
            {status}
          </span>

          {error ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-3 px-4 py-3 text-[13px]"
              style={{
                background: 'var(--md-sys-color-error-container)',
                color: 'var(--md-sys-color-on-error-container)',
                borderRadius: 'var(--md-sys-shape-corner-large)',
              }}
            >
              <MaterialSymbol className="mt-px shrink-0 text-[20px] leading-none">error</MaterialSymbol>
              <span>{error}</span>
            </div>
          ) : null}

          <label
            className="mt-5 flex h-16 items-center gap-3 px-5"
            style={{
              background: 'var(--md-sys-color-surface-container-high)',
              color: 'var(--md-sys-color-on-surface-variant)',
              borderRadius: 'var(--md-sys-shape-corner-extra-large)',
            }}
          >
            <span className="sr-only">Search wallpapers</span>
            <MaterialSymbol className="shrink-0 text-[24px] leading-none">search</MaterialSymbol>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search wallpapers, categories, tags"
              className="min-w-0 flex-1 bg-transparent text-[16px] leading-6 outline-none placeholder:text-[var(--md-sys-color-on-surface-variant)]"
              style={{ color: 'var(--md-sys-color-on-surface)' }}
            />
            {query ? (
              <MdIconButton type="button" aria-label="Clear search" onClick={() => setQuery('')}>
                <MaterialSymbol>close</MaterialSymbol>
              </MdIconButton>
            ) : null}
          </label>

          <Stagger className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FILTER_TILES.map((tile) => {
              const selected = filter === tile.value;
              const count = filterCounts[tile.countKey];
              return (
                <StaggerItem key={tile.value} className="min-w-0">
                  <BentoCard
                    interactive
                    selected={selected}
                    ariaPressed={selected}
                    ariaLabel={`${tile.label} filter, ${count} wallpapers`}
                    tone={selected ? (tile.tone as FilterTone) : 'surface-high'}
                    onClick={() => selectFilter(tile.value)}
                    className="h-full w-full p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="grid size-9 place-items-center rounded-full"
                        style={{ background: 'color-mix(in srgb, currentColor 14%, transparent)' }}
                      >
                        <MaterialSymbol className="text-[20px] leading-none" fill={selected} opticalSize={20}>
                          {tile.icon}
                        </MaterialSymbol>
                      </span>
                      <span className="ww-display-hero text-[26px] leading-none tabular-nums">{count}</span>
                    </div>
                    <div className="mt-2.5 text-[13px] font-semibold">{tile.label}</div>
                  </BentoCard>
                </StaggerItem>
              );
            })}
          </Stagger>

          <div className="mt-3 flex items-center justify-end gap-2">
            <span
              className="mr-auto hidden text-[12px] sm:block"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              Sorted by {selectedSortLabel}
            </span>
            <div ref={viewMenuRef} className="relative">
              <MorphPill
                icon="tune"
                selected={viewMenuOpen || Boolean(secondaryFilter)}
                ariaLabel="Sort and additional filters"
                onClick={() => setViewMenuOpen((open) => !open)}
              >
                {secondaryFilter?.label ?? 'Sort & filter'}
              </MorphPill>

              {viewMenuOpen ? (
                <div
                  role="menu"
                  aria-label="Filter and sort options"
                  className="ww-menu-pop absolute right-0 top-12 z-50 w-[260px] overflow-hidden p-2"
                  style={{
                    background: 'var(--md-sys-color-surface-container-high)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    borderRadius: 'var(--md-sys-shape-corner-extra-large)',
                    boxShadow: 'var(--md-sys-elevation-level3)',
                  }}
                >
                  <p
                    className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
                  >
                    More filters
                  </p>
                  {SECONDARY_FILTERS.map((option) => (
                    <MenuChoice
                      key={option.value}
                      label={option.label}
                      checked={filter === option.value}
                      onClick={() => selectFilter(option.value)}
                    />
                  ))}
                  <div className="mx-3 my-1 h-px" style={{ background: 'var(--md-sys-color-outline-variant)' }} />
                  <p
                    className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
                  >
                    Sort by
                  </p>
                  {SORT_OPTIONS.map((option) => (
                    <MenuChoice
                      key={option.value}
                      label={option.label}
                      checked={sort === option.value}
                      onClick={() => {
                        setSort(option.value);
                        setViewMenuOpen(false);
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          {filteredWallpapers.length === 0 ? (
            <EmptyLibraryState
              title={emptyTitle}
              description={emptyDescription}
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
      </section>

      {selectedWallpaper ? (
        <DetailsPanel
          wallpaper={selectedWallpaper}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onSetDesktopWallpaper={actions.setDesktopWallpaper}
          onApproveWallpaper={actions.approveWallpaper}
        />
      ) : null}
    </main>
  );
}

interface MenuActionProps {
  icon: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  emphasized?: boolean;
  onClick: () => void;
}

function MenuAction({
  icon,
  label,
  disabled = false,
  disabledReason,
  emphasized = false,
  onClick,
}: MenuActionProps) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={disabled}
      aria-label={disabled && disabledReason ? `${label}. ${disabledReason}.` : label}
      title={disabled && disabledReason ? disabledReason : undefined}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className={`flex min-h-11 w-full items-center gap-3 rounded-[16px] px-3 text-left text-[13px] font-semibold transition-colors ${
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-[var(--md-sys-color-surface-container-highest)]'
      }`}
      style={{ color: emphasized ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface)' }}
    >
      <MaterialSymbol className="shrink-0 text-[20px] leading-none" fill={emphasized} opticalSize={20}>
        {icon}
      </MaterialSymbol>
      <span>{label}</span>
    </button>
  );
}

interface MenuChoiceProps {
  label: string;
  checked: boolean;
  onClick: () => void;
}

function MenuChoice({ label, checked, onClick }: MenuChoiceProps) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      onClick={onClick}
      className="flex min-h-10 w-full items-center justify-between gap-3 rounded-[16px] px-3 text-left text-[13px] font-medium transition-colors hover:bg-[var(--md-sys-color-surface-container-highest)]"
      style={{ color: checked ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface)' }}
    >
      <span>{label}</span>
      {checked ? (
        <MaterialSymbol className="shrink-0 text-[19px] leading-none" fill opticalSize={20}>
          check
        </MaterialSymbol>
      ) : null}
    </button>
  );
}

interface EmptyLibraryStateProps {
  title: string;
  description: string;
  canChooseFolder: boolean;
  onChooseFolder: () => void;
}

function EmptyLibraryState({ title, description, canChooseFolder, onChooseFolder }: EmptyLibraryStateProps) {
  return (
    <div className="flex h-full items-center justify-center px-8 pb-16">
      <div className="ww-reveal max-w-sm text-center">
        <div
          className="mx-auto mb-5 grid size-24 place-items-center"
          style={{
            background: 'var(--md-sys-color-secondary-container)',
            color: 'var(--md-sys-color-on-secondary-container)',
            borderRadius: 'var(--md-sys-shape-corner-extra-large-increased)',
          }}
        >
          <MaterialSymbol className="text-[44px] leading-none" fill opticalSize={40}>
            photo_library
          </MaterialSymbol>
        </div>
        <h2 className="ww-type-headline-emphasized text-[24px]">{title}</h2>
        <p
          className="mx-auto mt-2 max-w-xs text-[14px] leading-5"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          {description}
        </p>
        {canChooseFolder ? (
          <MdFilledButton className="mt-6" type="button" onClick={onChooseFolder} hasIcon>
            <MaterialSymbol slot="icon">folder_open</MaterialSymbol>
            Choose folder
          </MdFilledButton>
        ) : null}
      </div>
    </div>
  );
}

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
    const viewportElement = viewportRef.current;
    if (!viewportElement) return;

    const updateViewport = () => {
      setViewport({ width: viewportElement.clientWidth, height: viewportElement.clientHeight });
    };

    updateViewport();
    const resizeObserver = new ResizeObserver(updateViewport);
    resizeObserver.observe(viewportElement);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      if (scrollEndTimerRef.current !== null) window.clearTimeout(scrollEndTimerRef.current);
    };
  }, []);

  const handleScroll = useCallback(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return;

    pendingScrollTopRef.current = viewportElement.scrollTop;
    setIsScrolling(true);
    if (scrollEndTimerRef.current !== null) window.clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = window.setTimeout(() => setIsScrolling(false), 120);
    if (frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(() => {
      setScrollTop(pendingScrollTopRef.current);
      frameRef.current = null;
    });
  }, []);

  const availableWidth = Math.max(viewport.width - GRID_HORIZONTAL_PADDING * 2, GRID_MIN_CARD_WIDTH);
  const columns = Math.max(1, Math.floor((availableWidth + GRID_GAP) / (GRID_MIN_CARD_WIDTH + GRID_GAP)));
  const cardWidth = Math.floor((availableWidth - (columns - 1) * GRID_GAP) / columns);
  const cardHeight = Math.max(140, Math.round((cardWidth * 9) / 16));
  const rowStride = cardHeight + GRID_GAP;
  const rowCount = Math.ceil(wallpapers.length / columns);
  const startRow = Math.max(
    0,
    Math.floor(Math.max(scrollTop - GRID_TOP_PADDING, 0) / rowStride) - GRID_OVERSCAN_ROWS,
  );
  const endRow = Math.min(
    rowCount,
    Math.ceil((scrollTop + viewport.height + GRID_BOTTOM_PADDING) / rowStride) + GRID_OVERSCAN_ROWS,
  );
  const startIndex = startRow * columns;
  const endIndex = Math.min(wallpapers.length, endRow * columns);
  const visibleWallpapers = wallpapers.slice(startIndex, endIndex);
  const totalHeight = GRID_TOP_PADDING + GRID_BOTTOM_PADDING + Math.max(rowCount * rowStride - GRID_GAP, 0);

  return (
    <div
      ref={viewportRef}
      onScroll={handleScroll}
      className="wallwize-library-scroll h-full overflow-auto"
      style={{ background: 'var(--md-sys-color-surface)' }}
    >
      <div className="relative" style={{ height: totalHeight }}>
        {visibleWallpapers.map((wallpaper, offset) => {
          const index = startIndex + offset;
          const row = Math.floor(index / columns);
          const column = index % columns;
          const left = GRID_HORIZONTAL_PADDING + column * (cardWidth + GRID_GAP);
          const top = GRID_TOP_PADDING + row * rowStride;

          return (
            <div
              key={wallpaper.id}
              className="absolute"
              style={{ width: cardWidth, height: cardHeight, transform: `translate3d(${left}px, ${top}px, 0)` }}
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

interface WallpaperCardProps {
  wallpaper: WallpaperItem;
  selected: boolean;
  deferImage: boolean;
  onSelect: (id: string) => void;
}

const WallpaperCard = memo(function WallpaperCard({
  wallpaper,
  selected,
  deferImage,
  onSelect,
}: WallpaperCardProps) {
  const needsReview = wallpaper.category === 'Needs Review' || wallpaper.confidence < 70;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${wallpaper.filename}, ${wallpaper.category}, ${wallpaper.confidence}% confidence`}
      onClick={() => onSelect(wallpaper.id)}
      className="wallwize-wallpaper-card group relative h-full w-full overflow-hidden text-left outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)]"
      style={{
        background: 'var(--md-sys-color-surface-container-high)',
        boxShadow: selected
          ? '0 0 0 3px var(--md-sys-color-primary), var(--md-sys-elevation-level3)'
          : 'none',
      }}
    >
      <WallpaperThumbnail
        wallpaper={wallpaper}
        defer={deferImage}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-3.5 pb-3 pt-10 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ background: 'linear-gradient(to top, rgba(12, 10, 20, 0.86), transparent)', color: '#fff' }}
      >
        <span className="truncate text-[13px] font-semibold">{wallpaper.category}</span>
        <span className="shrink-0 text-[12px] font-semibold tabular-nums">{wallpaper.confidence}%</span>
      </div>

      {needsReview ? (
        <span
          className="pointer-events-none absolute bottom-3 left-3 inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold"
          style={{
            background: 'var(--md-sys-color-error-container)',
            color: 'var(--md-sys-color-on-error-container)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.22)',
          }}
        >
          <MaterialSymbol className="text-[16px] leading-none" opticalSize={20}>
            rate_review
          </MaterialSymbol>
          Review
        </span>
      ) : null}

      {selected ? (
        <span
          className="ww-pop pointer-events-none absolute right-3 top-3 grid size-9 place-items-center rounded-full"
          style={{
            background: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
            boxShadow: '0 3px 12px rgba(0, 0, 0, 0.24)',
          }}
        >
          <MaterialSymbol className="text-[22px] leading-none" fill>
            check
          </MaterialSymbol>
        </span>
      ) : null}
    </button>
  );
});
