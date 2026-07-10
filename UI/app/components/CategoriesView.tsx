import { useMemo, useState } from 'react';
import {
  MaterialSymbol,
  MdFilledButton,
  MdFilledTonalButton,
  MdIconButton,
  MdTextButton,
} from '../material/components';
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
    () => wallpapers.filter((wallpaper) => wallpaper.category === activeCategory),
    [activeCategory, wallpapers],
  );
  const selectedWallpaper = activeWallpapers.find((wallpaper) => wallpaper.id === selectedId) ?? null;

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

  if (activeCategory) {
    return (
      <section className="ww-page ww-page--with-inspector" aria-labelledby="category-detail-title">
        <div className="ww-detail-main">
          <header className="ww-detail-header">
            <MdIconButton
              onClick={() => {
                setActiveCategory(null);
                setSelectedId(null);
              }}
              aria-label="Back to categories"
            >
              <MaterialSymbol>arrow_back</MaterialSymbol>
            </MdIconButton>
            <div>
              <span className="ww-eyebrow">Category</span>
              <h1 id="category-detail-title" className="ww-detail-title">{activeCategory}</h1>
              <p>{activeWallpapers.length} {activeWallpapers.length === 1 ? 'wallpaper' : 'wallpapers'}</p>
            </div>
          </header>

          <div className="ww-page-scroll ww-category-detail-scroll">
            {activeWallpapers.length ? (
              <div className="ww-media-grid ww-media-grid--category">
                {activeWallpapers.map((wallpaper) => {
                  const isSelected = selectedId === wallpaper.id;
                  return (
                    <button
                      key={wallpaper.id}
                      type="button"
                      className={`ww-category-wallpaper${isSelected ? ' is-selected' : ''}`}
                      onClick={() => setSelectedId(isSelected ? null : wallpaper.id)}
                    >
                      <WallpaperThumbnail wallpaper={wallpaper} className="size-full object-cover" />
                      <span className="ww-category-wallpaper-overlay">
                        <strong>{wallpaper.filename}</strong>
                        <span>{wallpaper.confidence}% match</span>
                      </span>
                      {isSelected && (
                        <span className="ww-card-check"><MaterialSymbol fill>check_circle</MaterialSymbol></span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="ww-empty-state">
                <div className="ww-empty-icon"><MaterialSymbol opticalSize={40}>photo_library</MaterialSymbol></div>
                <h2>This category is empty</h2>
                <p>Assign wallpapers from Review or Library to fill this collection.</p>
              </div>
            )}
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
      </section>
    );
  }

  return (
    <section className="ww-page" aria-labelledby="categories-title">
      <header className="ww-page-header">
        <div className="ww-page-copy">
          <span className="ww-eyebrow">Your collection</span>
          <h1 id="categories-title" className="ww-page-title">Categories</h1>
          <p className="ww-page-support">
            Browse the organized library without digging through folders.
          </p>
        </div>
        {!isAddingCategory && (
          <MdFilledTonalButton disabled={busy} onClick={() => setIsAddingCategory(true)}>
            <MaterialSymbol slot="icon">create_new_folder</MaterialSymbol>
            New category
          </MdFilledTonalButton>
        )}
      </header>

      <div className="ww-page-scroll">
        <div className="ww-page-width ww-page-width--wide">
          {isAddingCategory && (
            <form
              className="ww-create-category"
              onSubmit={(event) => {
                event.preventDefault();
                void submitCategory();
              }}
            >
              <div className="ww-create-category-copy">
                <MaterialSymbol opticalSize={40}>folder_special</MaterialSymbol>
                <div>
                  <h2>Create a category</h2>
                  <p>A matching folder is created in your output location.</p>
                </div>
              </div>
              <div className="ww-create-category-controls">
                <label>
                  <span className="sr-only">Category name</span>
                  <input
                    value={categoryName}
                    onChange={(event) => {
                      setCategoryName(event.target.value);
                      setCategoryError('');
                    }}
                    autoFocus
                    placeholder="Category name"
                    className={`ww-native-input${categoryError ? ' is-invalid' : ''}`}
                  />
                </label>
                <MdTextButton
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setCategoryName('');
                    setCategoryError('');
                  }}
                >
                  Cancel
                </MdTextButton>
                <MdFilledButton type="submit" disabled={busy}>Create</MdFilledButton>
              </div>
              {categoryError && <p className="ww-field-error">{categoryError}</p>}
            </form>
          )}

          {categories.length === 0 ? (
            <div className="ww-empty-state">
              <div className="ww-empty-icon"><MaterialSymbol opticalSize={40}>folder_open</MaterialSymbol></div>
              <h2>No categories yet</h2>
              <p>Choose a source folder and run categorization to create your first collections.</p>
              {!isAddingCategory && (
                <MdFilledButton disabled={busy} onClick={() => setIsAddingCategory(true)}>
                  Create category
                </MdFilledButton>
              )}
            </div>
          ) : (
            <div className="ww-category-grid">
              {categories.map((category, index) => (
                <CategoryCard
                  key={category.name}
                  category={category}
                  index={index}
                  onOpen={() => setActiveCategory(category.name)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({
  category,
  index,
  onOpen,
}: {
  category: CategorySummary;
  index: number;
  onOpen: () => void;
}) {
  const samples = category.samples.slice(0, 3);
  const tone =
    category.name === 'Needs Review'
      ? 'warning'
      : category.name === 'OLED'
        ? 'neutral'
        : ['lilac', 'blue', 'mint', 'rose'][index % 4];

  return (
    <button type="button" className={`ww-category-card ww-category-card--${tone}`} onClick={onOpen}>
      <div className={`ww-category-collage ww-category-collage--${samples.length}`}>
        {samples.length ? (
          samples.map((sample, sampleIndex) => (
            <img
              key={`${category.name}-${sampleIndex}-${sample}`}
              src={sample}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ))
        ) : (
          <div className="ww-category-placeholder"><MaterialSymbol opticalSize={48}>image</MaterialSymbol></div>
        )}
      </div>
      <div className="ww-category-card-copy">
        <div>
          <span>{category.count} {category.count === 1 ? 'item' : 'items'}</span>
          <h2>{category.name}</h2>
        </div>
        <span className="ww-category-arrow" aria-hidden="true">
          <MaterialSymbol>arrow_forward</MaterialSymbol>
        </span>
      </div>
      <div className="ww-category-confidence">
        <span style={{ width: `${Math.max(4, category.avgConfidence)}%` }} />
        <small>{category.avgConfidence}% average confidence</small>
      </div>
    </button>
  );
}
