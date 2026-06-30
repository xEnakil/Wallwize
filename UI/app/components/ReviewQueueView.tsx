import { AlertCircle, Check, FolderInput, X, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  finalFolder: string;
}

export function ReviewQueueView({
  wallpapers = [],
  categories = [],
  busy,
  onApproveWallpapers,
  onAssignCategory,
  onIgnoreWallpapers,
}: ReviewQueueViewProps) {
  const reviewItems = useMemo(
    () =>
      wallpapers
        .filter((item) => item.category === 'Needs Review' || item.confidence < 70)
        .map((item) => ({
          id: item.id,
          wallpaper: item,
          currentSuggestion: item.category,
          confidence: item.confidence,
          filename: item.filename,
          finalFolder: item.category,
        })),
    [wallpapers],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [pendingCategory, setPendingCategory] = useState('');

  const categoryChoices = useMemo(
    () =>
      categories
        .map((category) => category.name)
        .filter((name) => name !== 'Needs Review' && name !== 'Ignored')
        .sort((a, b) => a.localeCompare(b)),
    [categories],
  );

  useEffect(() => {
    const currentIds = new Set(reviewItems.map((item) => item.id));
    setSelectedIds((previous) => {
      const next = new Set([...previous].filter((id) => currentIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [reviewItems]);

  const selectedItems = useMemo(
    () => reviewItems.filter((item) => selectedIds.has(item.id)),
    [reviewItems, selectedIds],
  );
  const selectedPaths = selectedItems.map((item) => item.wallpaper.absolutePath);
  const allSelected = reviewItems.length > 0 && selectedIds.size === reviewItems.length;
  const canApproveSelected =
    selectedItems.length > 0 &&
    selectedItems.every((item) => canApproveReviewItem(item));

  const toggleSelected = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(() => (allSelected ? new Set() : new Set(reviewItems.map((item) => item.id))));
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
    <div className="flex flex-1 flex-col">
      <div
        className="px-4 py-3"
        style={{
          background: 'var(--w-bg-raised)',
          borderBottom: '1px solid var(--w-border-default)',
        }}
      >
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
            Review Queue
          </h2>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums"
            style={{
              background: reviewItems.length > 0 ? 'var(--w-amber-tint)' : 'var(--w-bg-interactive)',
              color: reviewItems.length > 0 ? 'var(--w-amber)' : 'var(--w-text-40)',
              border: '1px solid',
              borderColor: reviewItems.length > 0 ? 'rgba(245,158,11,0.2)' : 'var(--w-border-faint)',
            }}
          >
            {reviewItems.length} items
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ReviewActionButton
            icon={Check}
            label="Approve Selected"
            disabled={busy || !canApproveSelected}
            onClick={approveSelected}
            title={canApproveSelected ? 'Approve selected wallpapers' : 'Choose categories before approving'}
          />
          <div className="flex items-center gap-1.5">
            <select
              value={pendingCategory}
              onChange={(event) => setPendingCategory(event.target.value)}
              disabled={busy || selectedItems.length === 0 || categoryChoices.length === 0}
              className="h-8 rounded-lg px-2.5 text-[12px] font-medium outline-none"
              style={{
                background: 'var(--w-bg-interactive)',
                color: pendingCategory ? 'var(--w-text-100)' : 'var(--w-text-40)',
                border: '1px solid var(--w-border-faint)',
              }}
              aria-label="Target category"
            >
              <option value="">Choose category</option>
              {categoryChoices.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <ReviewActionButton
              icon={FolderInput}
              label="Change Category"
              disabled={busy || selectedItems.length === 0 || !pendingCategory}
              onClick={assignSelectedCategory}
            />
          </div>
          <ReviewActionButton
            label="Ignore"
            disabled={busy || selectedItems.length === 0}
            onClick={ignoreSelected}
          />
          {selectedItems.length > 0 && (
            <span className="text-[11.5px]" style={{ color: 'var(--w-text-70)' }}>
              {selectedItems.length} selected
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto" style={{ background: 'var(--w-bg-base)' }}>
        {reviewItems.length === 0 ? (
          <EmptyReviewQueue />
        ) : (
          <ReviewTable
            items={reviewItems}
            busy={busy}
            allSelected={allSelected}
            selectedIds={selectedIds}
            onToggleAll={toggleAll}
            onToggleSelected={toggleSelected}
            onApprove={onApproveWallpapers}
            onIgnore={onIgnoreWallpapers}
          />
        )}
      </div>
    </div>
  );
}

function canApproveReviewItem(item: ReviewItem) {
  return item.currentSuggestion !== 'Needs Review' && Boolean(item.wallpaper.destination);
}

function EmptyReviewQueue() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="ww-fade-in-up max-w-sm text-center">
        <div
          className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl"
          style={{
            background: 'var(--w-emerald-tint)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          <Check className="size-5" style={{ color: 'var(--w-emerald)' }} />
        </div>
        <div className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
          Nothing to review
        </div>
        <div className="text-[12.5px]" style={{ color: 'var(--w-text-70)' }}>
          Low-confidence and uncategorized wallpapers appear here after categorizing.
        </div>
      </div>
    </div>
  );
}

function ReviewTable({
  items,
  busy,
  allSelected,
  selectedIds,
  onToggleAll,
  onToggleSelected,
  onApprove,
  onIgnore,
}: {
  items: ReviewItem[];
  busy: boolean;
  allSelected: boolean;
  selectedIds: Set<string>;
  onToggleAll: () => void;
  onToggleSelected: (id: string) => void;
  onApprove: (paths: string[]) => Promise<void>;
  onIgnore: (paths: string[]) => Promise<void>;
}) {
  return (
    <table className="w-full">
      <thead
        className="sticky top-0"
        style={{
          background: 'var(--w-bg-surface)',
          borderBottom: '1px solid var(--w-border-default)',
        }}
      >
        <tr>
          <th className="w-10 px-4 py-3 text-left">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              aria-label="Select all review items"
            />
          </th>
          <th className="px-4 py-3 text-left">
            <span className="ww-section-label" style={{ marginBottom: 0 }}>Preview</span>
          </th>
          <th className="px-4 py-3 text-left">
            <span className="ww-section-label" style={{ marginBottom: 0 }}>Suggestion</span>
          </th>
          <th className="px-4 py-3 text-left">
            <span className="ww-section-label" style={{ marginBottom: 0 }}>Confidence</span>
          </th>
          <th className="px-4 py-3 text-left">
            <span className="ww-section-label" style={{ marginBottom: 0 }}>Filename</span>
          </th>
          <th className="px-4 py-3 text-left">
            <span className="ww-section-label" style={{ marginBottom: 0 }}>Destination</span>
          </th>
          <th className="w-24 px-4 py-3 text-left">
            <span className="ww-section-label" style={{ marginBottom: 0 }}>Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const conf = item.confidence;
          const confColor = conf >= 70 ? 'var(--w-emerald)' : conf >= 50 ? 'var(--w-amber)' : 'var(--w-rose)';
          const confBg = conf >= 70 ? 'var(--w-emerald-tint)' : conf >= 50 ? 'var(--w-amber-tint)' : 'var(--w-rose-tint)';
          const isSelected = selectedIds.has(item.id);
          const canApprove = canApproveReviewItem(item);

          return (
            <tr
              key={item.id}
              className="ww-table-row"
              style={isSelected ? { background: 'var(--w-bg-raised)' } : undefined}
            >
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelected(item.id)}
                  aria-label={`Select ${item.filename}`}
                />
              </td>
              <td className="px-4 py-3">
                <div
                  className="h-[46px] w-[82px] overflow-hidden rounded-lg"
                  style={{ background: 'var(--w-bg-raised)' }}
                >
                  <WallpaperThumbnail
                    wallpaper={item.wallpaper}
                    className="h-full w-full object-cover"
                  />
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-[12.5px] font-medium" style={{ color: 'var(--w-text-100)' }}>
                  {item.currentSuggestion}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold tabular-nums"
                  style={{
                    background: confBg,
                    color: confColor,
                    border: `1px solid ${confColor}33`,
                  }}
                >
                  {conf}%
                </span>
              </td>
              <td className="max-w-[220px] px-4 py-3">
                <span
                  className="block truncate font-mono text-[11.5px]"
                  style={{ color: 'var(--w-text-70)' }}
                  title={item.filename}
                >
                  {item.filename}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--w-text-70)' }}>
                  {!canApprove && <AlertCircle className="size-3.5 shrink-0" style={{ color: 'var(--w-amber)' }} />}
                  <span>{item.finalFolder}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <IconOnlyButton
                    icon={Check}
                    label="Approve"
                    disabled={busy || !canApprove}
                    onClick={() => onApprove([item.wallpaper.absolutePath])}
                  />
                  <IconOnlyButton
                    icon={X}
                    label="Ignore"
                    disabled={busy}
                    onClick={() => onIgnore([item.wallpaper.absolutePath])}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ReviewActionButton({
  icon: Icon,
  label,
  disabled,
  onClick,
  title,
}: {
  icon?: LucideIcon;
  label: string;
  disabled: boolean;
  onClick: () => void | Promise<void>;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        void onClick();
      }}
      title={title || label}
      className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-colors"
      style={{
        background: disabled ? 'var(--w-bg-interactive)' : 'var(--w-iris-tint)',
        color: disabled ? 'var(--w-text-40)' : 'var(--w-iris-bright)',
        border: '1px solid',
        borderColor: disabled ? 'var(--w-border-faint)' : 'rgba(99,102,241,0.28)',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {Icon && <Icon className="size-[14px]" />}
      {label}
    </button>
  );
}

function IconOnlyButton({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  disabled: boolean;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={() => {
        void onClick();
      }}
      className="grid size-7 place-items-center rounded-lg transition-colors"
      style={{
        background: disabled ? 'var(--w-bg-interactive)' : 'var(--w-bg-raised)',
        color: disabled ? 'var(--w-text-40)' : 'var(--w-text-100)',
        border: '1px solid var(--w-border-faint)',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
