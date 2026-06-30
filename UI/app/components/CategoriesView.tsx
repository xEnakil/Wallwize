import { ArrowLeft, Check, FolderOpen, Plus, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CategorySummary, WallpaperItem } from '../types';
import { DetailsPanel } from './DetailsPanel';
import { WallpaperThumbnail } from './WallpaperThumbnail';

interface CategoriesViewProps {
  categories?: CategorySummary[];
  wallpapers: WallpaperItem[];
  busy: boolean;
  onAddCategory: (categoryName: string) => Promise<void>;
  onSetDesktopWallpaper: (path: string, fallbackPath?: string) => void;
  onApproveWallpaper: (path: string, fallbackPath?: string, destination?: string, operation?: string) => void;
}

const accentGradients = [
  { from: '#6366F1', to: '#8B5CF6' },
  { from: '#EC4899', to: '#8B5CF6' },
  { from: '#10B981', to: '#06B6D4' },
  { from: '#F59E0B', to: '#EF4444' },
  { from: '#06B6D4', to: '#6366F1' },
  { from: '#8B5CF6', to: '#EC4899' },
  { from: '#F59E0B', to: '#10B981' },
  { from: '#3B82F6', to: '#6366F1' },
];

export function CategoriesView({
  categories = [],
  wallpapers,
  busy,
  onAddCategory,
  onSetDesktopWallpaper,
  onApproveWallpaper,
}: CategoriesViewProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const activeWallpapers = useMemo(
    () => wallpapers.filter((w) => w.category === activeCategory),
    [activeCategory, wallpapers],
  );
  const selectedWallpaper =
    activeWallpapers.find((w) => w.id === selectedId) || activeWallpapers[0] || null;

  /* ── Category detail view ─────────────────────────────────── */
  if (activeCategory) {
    return (
      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{
              background: 'var(--w-bg-raised)',
              borderBottom: '1px solid var(--w-border-default)',
            }}
          >
            <button
              type="button"
              onClick={() => { setActiveCategory(null); setSelectedId(null); }}
              className="grid size-8 place-items-center rounded-lg transition-colors"
              style={{
                background: 'var(--w-bg-interactive)',
                border: '1px solid var(--w-border-default)',
                color: 'var(--w-text-70)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--w-text-100)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--w-border-strong)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--w-text-70)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--w-border-default)';
              }}
            >
              <ArrowLeft className="size-4" />
            </button>

            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
                {activeCategory}
              </h2>
              <p className="text-[11.5px]" style={{ color: 'var(--w-text-70)' }}>
                {activeWallpapers.length} wallpapers
              </p>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--w-bg-base)' }}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2.5">
              {activeWallpapers.map((wallpaper) => {
                const isSelected = selectedWallpaper?.id === wallpaper.id;
                return (
                  <button
                    key={wallpaper.id}
                    type="button"
                    onClick={() => setSelectedId(wallpaper.id)}
                    className="group relative aspect-video overflow-hidden text-left transition-all"
                    style={{
                      borderRadius: 12,
                      background: 'var(--w-bg-surface)',
                      boxShadow: isSelected
                        ? `0 0 0 2px var(--w-iris), 0 0 0 4px var(--w-iris-tint)`
                        : `0 1px 3px rgba(0,0,0,0.25), 0 0 0 1px var(--w-border-faint)`,
                      transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                    }}
                  >
                    <WallpaperThumbnail wallpaper={wallpaper} className="size-full object-cover" />
                    <div
                      className="absolute inset-x-0 bottom-0 p-2"
                      style={{ background: 'linear-gradient(to top, rgba(6,8,14,0.9) 0%, transparent 100%)' }}
                    >
                      <div
                        className="truncate text-[11.5px] font-medium text-white"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                      >
                        {wallpaper.filename}
                      </div>
                      <div className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {wallpaper.confidence}% confidence
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {selectedWallpaper && (
          <DetailsPanel
            wallpaper={selectedWallpaper}
            busy={busy}
            onClose={() => setSelectedId(null)}
            onSetDesktopWallpaper={onSetDesktopWallpaper}
            onApproveWallpaper={onApproveWallpaper}
          />
        )}
      </div>
    );
  }

  /* ── Category overview ─────────────────────────────────────── */
  const submitCategory = async () => {
    const cleanName = categoryName.trim().replace(/\s+/g, ' ');
    if (!cleanName) {
      setCategoryError('Enter a category name.');
      return;
    }
    await onAddCategory(cleanName);
    setCategoryName('');
    setCategoryError('');
    setIsAddingCategory(false);
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
              Categories
            </h2>
            <p className="text-[12px]" style={{ color: 'var(--w-text-70)' }}>
              {categories.length
                ? `${categories.length} categories in the current library`
                : 'Categorize wallpapers to see collections here'}
            </p>
          </div>
          {!isAddingCategory && (
            <button
              type="button"
              onClick={() => setIsAddingCategory(true)}
              disabled={busy}
              aria-label="Add category"
              title="Add category"
              className="grid size-8 shrink-0 place-items-center rounded-lg transition-colors"
              style={{
                background: 'var(--w-iris-tint)',
                color: 'var(--w-iris-bright)',
                border: '1px solid rgba(99,102,241,0.28)',
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>

        {isAddingCategory && (
          <form
            className="mt-3 flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void submitCategory();
            }}
          >
            <input
              value={categoryName}
              onChange={(event) => {
                setCategoryName(event.target.value);
                setCategoryError('');
              }}
              autoFocus
              placeholder="New category"
              className="h-8 min-w-[220px] rounded-lg px-3 text-[12.5px] outline-none"
              style={{
                background: 'var(--w-bg-interactive)',
                color: 'var(--w-text-100)',
                border: `1px solid ${categoryError ? 'var(--w-rose)' : 'var(--w-border-default)'}`,
              }}
            />
            <button
              type="submit"
              disabled={busy}
              className="grid size-8 place-items-center rounded-lg"
              style={{
                background: 'var(--w-emerald-tint)',
                color: 'var(--w-emerald)',
                border: '1px solid rgba(16,185,129,0.22)',
                opacity: busy ? 0.6 : 1,
              }}
              aria-label="Save category"
              title="Save category"
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingCategory(false);
                setCategoryName('');
                setCategoryError('');
              }}
              className="grid size-8 place-items-center rounded-lg"
              style={{
                background: 'var(--w-bg-interactive)',
                color: 'var(--w-text-70)',
                border: '1px solid var(--w-border-default)',
              }}
              aria-label="Cancel category"
              title="Cancel"
            >
              <X className="size-4" />
            </button>
            {categoryError && (
              <span className="text-[11.5px]" style={{ color: 'var(--w-rose)' }}>
                {categoryError}
              </span>
            )}
          </form>
        )}
      </div>

      <div className="flex-1 overflow-auto p-5" style={{ background: 'var(--w-bg-base)' }}>
        {categories.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="ww-fade-in-up max-w-sm text-center">
              <div
                className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl"
                style={{
                  background: 'var(--w-bg-raised)',
                  border: '1px solid var(--w-border-default)',
                }}
              >
                <FolderOpen className="size-5" style={{ color: 'var(--w-text-40)' }} />
              </div>
              <div className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--w-text-100)' }}>
                No categories yet
              </div>
              <div className="text-[12.5px]" style={{ color: 'var(--w-text-70)' }}>
                Choose a wallpaper folder, then categorize. Collections will appear here.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category, index) => {
              const grad = accentGradients[index % accentGradients.length];
              const isDiscovered = !['OLED', 'Needs Review'].includes(category.name) && category.avgConfidence < 78;
              const conf = category.avgConfidence;
              const confColor = conf >= 80 ? 'var(--w-emerald)' : conf >= 60 ? 'var(--w-amber)' : 'var(--w-rose)';

              return (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => setActiveCategory(category.name)}
                  className="ww-card group overflow-hidden text-left transition-all"
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = 'var(--w-border-strong)';
                    el.style.transform = 'translateY(-1px)';
                    el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = 'var(--w-border-default)';
                    el.style.transform = 'translateY(0)';
                    el.style.boxShadow = 'none';
                  }}
                  style={{ transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease' }}
                >
                  {/* Accent bar */}
                  <div
                    className="h-[3px] w-full"
                    style={{ background: `linear-gradient(90deg, ${grad.from}, ${grad.to})` }}
                  />

                  <div className="p-4">
                    {/* Title row */}
                    <div className="mb-3 flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2 flex-wrap">
                          <h3
                            className="truncate text-[13.5px] font-semibold"
                            style={{ color: 'var(--w-text-100)' }}
                          >
                            {category.name}
                          </h3>
                          {isDiscovered && (
                            <div
                              className="flex items-center gap-1 rounded-full px-2 py-px"
                              style={{
                                background: 'var(--w-amber-tint)',
                                border: '1px solid rgba(245,158,11,0.2)',
                              }}
                            >
                              <Sparkles className="size-2.5" style={{ color: 'var(--w-amber)' }} />
                              <span className="text-[9.5px] font-semibold" style={{ color: 'var(--w-amber)' }}>
                                Discovered
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11.5px]">
                          <span style={{ color: 'var(--w-text-70)' }}>{category.count} items</span>
                          <span className="font-semibold tabular-nums" style={{ color: confColor }}>
                            {conf}% avg
                          </span>
                        </div>
                      </div>

                      {/* Gradient swatch */}
                      <div
                        className="ml-2 size-9 shrink-0 rounded-lg opacity-30 group-hover:opacity-50 transition-opacity"
                        style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}
                      />
                    </div>

                    {/* Sample images */}
                    <div className="flex gap-1.5">
                      {category.samples.length > 0
                        ? category.samples.map((sample, idx) => (
                            <div
                              key={`${category.name}-${idx}-${sample}`}
                              className="aspect-video flex-1 overflow-hidden rounded-lg"
                              style={{ background: 'var(--w-bg-base)' }}
                            >
                              <img
                                src={sample}
                                alt={`${category.name} sample ${idx + 1}`}
                                loading="lazy"
                                decoding="async"
                                className="size-full object-cover"
                              />
                            </div>
                          ))
                        : <div className="aspect-video flex-1 rounded-lg" style={{ background: 'var(--w-bg-base)' }} />
                      }
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
