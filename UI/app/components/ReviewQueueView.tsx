import { useEffect, useMemo, useState } from 'react';
import {
  MaterialSymbol,
  MdCheckbox,
  MdFilledButton,
  MdTextButton,
} from '../material/components';
import { CategorySummary, WallpaperItem } from '../types';
import { WallpaperThumbnail } from './WallpaperThumbnail';

interface ReviewQueueViewProps {
  wallpapers?: WallpaperItem[];
  categories?: CategorySummary[];
  busy: boolean;
  onApproveWallpapers: (paths: string[]) => Promise<void>;
  onAssignCategory: (paths: string[], categoryName: string) => Promise<void>;
  onIgnoreWallpapers: (paths: string[]) => Promise<void>;
}

interface ReviewItem {
  id: string;
  wallpaper: WallpaperItem;
  currentSuggestion: string;
  confidence: number;
  filename: string;
}

// Standard categories mirror the backend taxonomy (src/wallwize/domain/taxonomy.py)
// plus OLED, so a wallpaper can be categorized even on a fresh library where no
// category has any wallpapers yet (otherwise the picker would be empty/disabled).
const STANDARD_CATEGORIES: readonly string[] = [
  'Abstract',
  'Anime',
  'Architecture',
  'Cities',
  'Cyberpunk',
  'Fantasy',
  'Games',
  'Minimalism',
  'Movies TV',
  'Music',
  'Nature',
  'OLED',
  'Retro',
  'Sci Fi',
  'Space',
  'Sports',
  'Superhero',
  'Technology',
  'Vehicles',
] as const;

export function ReviewQueueView({
  wallpapers = [],
  categories = [],
  busy,
  onApproveWallpapers,
  onAssignCategory,
  onIgnoreWallpapers,
}: ReviewQueueViewProps) {
  const reviewItems = useMemo<ReviewItem[]>(
    () =>
      wallpapers
        .filter((item) => item.category === 'Needs Review' || item.confidence < 70)
        .map((item) => ({
          id: item.id,
          wallpaper: item,
          currentSuggestion: item.category,
          confidence: item.confidence,
          filename: item.filename,
        })),
    [wallpapers],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [pendingCategory, setPendingCategory] = useState('');

  const categoryChoices = useMemo(() => {
    const fromLibrary = categories
      .map((category) => category.name)
      .filter((name) => name !== 'Needs Review' && name !== 'Ignored');
    // Merge any already-organized categories with the standard taxonomy so the
    // picker is always usable, even before anything has been categorized.
    const merged = new Set<string>([...fromLibrary, ...STANDARD_CATEGORIES]);
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [categories]);

  useEffect(() => {
    const currentIds = new Set(reviewItems.map((item) => item.id));
    setSelectedIds((previous) => {
      const next = new Set([...previous].filter((id) => currentIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [reviewItems]);

  const selectedItems = reviewItems.filter((item) => selectedIds.has(item.id));
  const selectedPaths = selectedItems.map((item) => item.wallpaper.absolutePath);
  const allSelected = reviewItems.length > 0 && selectedIds.size === reviewItems.length;
  const canApproveSelected =
    selectedItems.length > 0 && selectedItems.every((item) => canApproveReviewItem(item));

  const toggleSelected = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(reviewItems.map((item) => item.id)));
  };

  const approveSelected = async () => {
    if (!canApproveSelected) return;
    await onApproveWallpapers(selectedPaths);
    setSelectedIds(new Set());
  };

  const assignSelectedCategory = async () => {
    if (!selectedPaths.length || !pendingCategory) return;
    await onAssignCategory(selectedPaths, pendingCategory);
    setSelectedIds(new Set());
  };

  const ignoreSelected = async () => {
    if (!selectedPaths.length) return;
    await onIgnoreWallpapers(selectedPaths);
    setSelectedIds(new Set());
  };

  return (
    <section className="ww-page" aria-labelledby="review-title">
      <header className="ww-page-header">
        <div className="ww-page-copy">
          <span className="ww-eyebrow">Quality check</span>
          <h1 id="review-title" className="ww-page-title">Review</h1>
          <p className="ww-page-support">
            Confirm uncertain matches before Wallwize organizes them.
          </p>
        </div>
        <div className="ww-count-bubble" aria-label={`${reviewItems.length} items to review`}>
          <strong>{reviewItems.length}</strong>
          <span>to review</span>
        </div>
      </header>

      {reviewItems.length > 0 ? (
        <div className="ww-selection-dock">
          <div className="ww-page-width ww-page-width--wide">
            <div className="ww-selection-bar">
              <label className="ww-selection-toggle">
                <MdCheckbox checked={allSelected} onChange={toggleAll} aria-label="Select all review items" />
                <span>{selectedItems.length ? `${selectedItems.length} selected` : 'Select all'}</span>
              </label>

              {selectedItems.length ? (
                <div className="ww-selection-actions">
                  <select
                    value={pendingCategory}
                    onChange={(event) => setPendingCategory(event.target.value)}
                    disabled={busy || categoryChoices.length === 0}
                    className="ww-native-select"
                    aria-label="Choose category for selected wallpapers"
                  >
                    <option value="">Choose category</option>
                    {categoryChoices.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <MdTextButton
                    disabled={busy || !pendingCategory}
                    onClick={() => void assignSelectedCategory()}
                  >
                    Change category
                  </MdTextButton>
                  <MdTextButton disabled={busy} onClick={() => void ignoreSelected()}>
                    Ignore
                  </MdTextButton>
                  <MdFilledButton
                    disabled={busy || !canApproveSelected}
                    onClick={() => void approveSelected()}
                    title={canApproveSelected ? 'Approve and organize selected wallpapers' : 'Choose a category first'}
                  >
                    <MaterialSymbol slot="icon" fill>done_all</MaterialSymbol>
                    Approve &amp; organize
                  </MdFilledButton>
                </div>
              ) : (
                <span className="ww-selection-hint">Select wallpapers to review together</span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="ww-page-scroll">
        {reviewItems.length === 0 ? (
          <EmptyReviewQueue />
        ) : (
          <div className="ww-page-width ww-page-width--wide">
            <div className="ww-review-grid">
              {reviewItems.map((item) => (
                <ReviewCard
                  key={item.id}
                  item={item}
                  selected={selectedIds.has(item.id)}
                  busy={busy}
                  onToggle={() => toggleSelected(item.id)}
                  onApprove={() => onApproveWallpapers([item.wallpaper.absolutePath])}
                  onIgnore={() => onIgnoreWallpapers([item.wallpaper.absolutePath])}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function canApproveReviewItem(item: ReviewItem) {
  return item.currentSuggestion !== 'Needs Review' && Boolean(item.wallpaper.destination);
}

function ReviewCard({
  item,
  selected,
  busy,
  onToggle,
  onApprove,
  onIgnore,
}: {
  item: ReviewItem;
  selected: boolean;
  busy: boolean;
  onToggle: () => void;
  onApprove: () => Promise<void>;
  onIgnore: () => Promise<void>;
}) {
  const canApprove = canApproveReviewItem(item);
  const confidenceTone = item.confidence >= 60 ? 'medium' : 'low';

  return (
    <article className={`ww-review-card${selected ? ' is-selected' : ''}`}>
      <button
        type="button"
        className="ww-review-preview"
        onClick={onToggle}
        aria-label={`${selected ? 'Deselect' : 'Select'} ${item.filename}`}
      >
        <WallpaperThumbnail wallpaper={item.wallpaper} className="size-full object-cover" />
        <span className="ww-card-check" aria-hidden="true">
          <MaterialSymbol fill={selected}>{selected ? 'check_circle' : 'circle'}</MaterialSymbol>
        </span>
        <span className={`ww-confidence-badge ww-confidence-badge--${confidenceTone}`}>
          {item.confidence}%
        </span>
      </button>

      <div className="ww-review-card-body">
        <div className="ww-review-card-heading">
          <div className="ww-review-card-copy">
            <span className="ww-card-kicker">Suggested category</span>
            <h2>{item.currentSuggestion}</h2>
          </div>
          {!canApprove && (
            <span className="ww-needs-choice" title="Choose a category before approving">
              <MaterialSymbol>error</MaterialSymbol>
              Needs category
            </span>
          )}
        </div>
        <p className="ww-file-name" title={item.filename}>{item.filename}</p>
        <div className="ww-card-actions">
          <MdTextButton disabled={busy} onClick={() => void onIgnore()}>Ignore</MdTextButton>
          {canApprove && (
            <MdFilledButton disabled={busy} onClick={() => void onApprove()}>
              Approve
            </MdFilledButton>
          )}
        </div>
      </div>
    </article>
  );
}

function EmptyReviewQueue() {
  return (
    <div className="ww-empty-state">
      <div className="ww-empty-icon ww-empty-icon--success">
        <MaterialSymbol fill opticalSize={40}>task_alt</MaterialSymbol>
      </div>
      <h2>You’re all caught up</h2>
      <p>Low-confidence wallpapers will appear here after the next categorization run.</p>
    </div>
  );
}
