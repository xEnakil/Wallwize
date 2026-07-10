import { MaterialSymbol } from '../material/components';

interface DuplicatesViewProps {
  skippedCount?: number;
}

export function DuplicatesView({ skippedCount = 0 }: DuplicatesViewProps) {
  const hasDuplicates = skippedCount > 0;

  return (
    <section className="ww-page" aria-labelledby="duplicates-title">
      <header className="ww-page-header">
        <div className="ww-page-copy">
          <span className="ww-eyebrow">Library health</span>
          <h1 id="duplicates-title" className="ww-page-title">Duplicates</h1>
          <p className="ww-page-support">Exact matches are skipped automatically during organization.</p>
        </div>
      </header>

      <div className="ww-page-scroll ww-duplicates-layout">
        <div className={`ww-duplicate-hero${hasDuplicates ? ' has-items' : ''}`}>
          <div className="ww-duplicate-orbit" aria-hidden="true">
            <MaterialSymbol fill opticalSize={48}>{hasDuplicates ? 'content_copy' : 'verified'}</MaterialSymbol>
          </div>

          <div className="ww-duplicate-copy">
            <span className="ww-eyebrow">Most recent organize</span>
            <strong>{skippedCount}</strong>
            <h2>{hasDuplicates ? 'redundant files skipped' : 'duplicate files found'}</h2>
            <p>
              {hasDuplicates
                ? 'Wallwize kept the first exact match and left the redundant source files untouched.'
                : 'Every planned wallpaper is unique. Nothing was removed or hidden.'}
            </p>
          </div>
        </div>

        <aside className="ww-tonal-card ww-duplicate-note">
          <MaterialSymbol>info</MaterialSymbol>
          <div>
            <h2>Safe by design</h2>
            <p>
              This count comes from exact file matching. Wallwize does not guess that visually similar images are duplicates.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
