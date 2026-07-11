import { InlineTaskLabel } from './TaskStatus';
import {
  MaterialSymbol,
  MdFilledButton,
  MdSlider,
  MdSwitch,
} from '../material/components';
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
  { id: 'off', name: 'Rules', short: 'No model download', size: 'Local rules' },
  { id: 'small', name: 'Quick', short: 'Fast on large libraries', size: '~400 MB' },
  { id: 'balanced', name: 'Balanced', short: 'Recommended accuracy', size: '~1.2 GB' },
  { id: 'large', name: 'Precise', short: 'Best category matching', size: '~3.5 GB' },
] as const;

export function AIAnalysisView({
  settings,
  stats,
  busy,
  busyTask,
  onSettingsChange,
  onRunPlan,
}: AIAnalysisViewProps) {
  const confidencePercent = Math.round(settings.visionMinConfidence * 100);
  const currentProfile = profiles.find((profile) => profile.id === settings.visionProfile) ?? profiles[0];

  return (
    <section className="ww-page" aria-labelledby="ai-title">
      <header className="ww-page-header">
        <div className="ww-page-copy">
          <span className="ww-eyebrow">On-device intelligence</span>
          <h1 id="ai-title" className="ww-page-title">Rules &amp; AI</h1>
          <p className="ww-page-support">Tune how confidently Wallwize understands and routes each image.</p>
        </div>
        {busyTask && <InlineTaskLabel task={busyTask} />}
      </header>

      <div className="ww-page-scroll">
        <div className="ww-page-width ww-settings-grid">
          <div className="ww-settings-main">
            <section className="ww-surface-card ww-profile-section" aria-labelledby="profile-title">
              <div className="ww-section-heading">
                <div>
                  <span className="ww-eyebrow">Processing profile</span>
                  <h2 id="profile-title">Choose the right level</h2>
                  <p>Everything runs on this device. Larger profiles trade speed and disk space for better recognition.</p>
                </div>
                <div className="ww-model-mark" aria-hidden="true">
                  <MaterialSymbol fill opticalSize={40}>neurology</MaterialSymbol>
                </div>
              </div>

              <div className="ww-profile-picker" role="radiogroup" aria-label="Vision model profile">
                {profiles.map((profile) => {
                  const selected = settings.visionProfile === profile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`ww-profile-option${selected ? ' is-selected' : ''}`}
                      disabled={busy}
                      onClick={() => onSettingsChange({ visionProfile: profile.id })}
                    >
                      <span className="ww-profile-radio" aria-hidden="true" />
                      <strong>{profile.name}</strong>
                      <span>{profile.short}</span>
                      <small>{profile.size}</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="ww-surface-card" aria-labelledby="confidence-title">
              <div className="ww-slider-heading">
                <div>
                  <span className="ww-eyebrow">Review threshold</span>
                  <h2 id="confidence-title">Minimum confidence</h2>
                  <p>Lower-scoring images wait for you in Review instead of being organized automatically.</p>
                </div>
                <output>{confidencePercent}%</output>
              </div>
              <MdSlider
                min={10}
                max={90}
                value={confidencePercent}
                disabled={busy}
                aria-label="Minimum confidence threshold"
                onInput={(event) => {
                  const value = Number((event.currentTarget as unknown as { value: number }).value);
                  onSettingsChange({ visionMinConfidence: value / 100 });
                }}
              />

              <div className="ww-switch-row">
                <div>
                  <strong>Local-only model loading</strong>
                  <span>Use packaged or cached model files without network requests.</span>
                </div>
                <MdSwitch
                  selected={settings.visionLocalOnly}
                  disabled={busy}
                  aria-label="Local-only model loading"
                  onChange={(event) => {
                    const selected = Boolean((event.currentTarget as unknown as { selected: boolean }).selected);
                    onSettingsChange({ visionLocalOnly: selected });
                  }}
                />
              </div>
            </section>
          </div>

          <aside className="ww-settings-side">
            <section className="ww-run-card">
              <div className="ww-run-card-icon"><MaterialSymbol fill opticalSize={40}>auto_awesome</MaterialSymbol></div>
              <span className="ww-eyebrow">Ready to analyze</span>
              <h2>{currentProfile.name}</h2>
              <p>{settings.visionProfile === 'off' ? 'Filename, OLED, and grouping rules' : `${currentProfile.size} local vision profile`}</p>
              <MdFilledButton disabled={busy} onClick={onRunPlan}>
                <MaterialSymbol slot="icon" fill>{busy ? 'progress_activity' : 'play_arrow'}</MaterialSymbol>
                {busy ? 'Working…' : 'Run categorization'}
              </MdFilledButton>
            </section>

            <section className="ww-results-card" aria-labelledby="results-title">
              <div className="ww-section-heading ww-section-heading--compact">
                <div>
                  <span className="ww-eyebrow">Current plan</span>
                  <h2 id="results-title">At a glance</h2>
                </div>
              </div>
              <div className="ww-stat-list">
                <ResultRow icon="photo_library" label="Library" count={stats.library} />
                <ResultRow icon="folder_copy" label="Categories" count={stats.categories} />
                <ResultRow icon="rate_review" label="Needs review" count={stats.reviewQueue} attention />
                <ResultRow icon="content_copy" label="Duplicates" count={stats.duplicates} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ResultRow({
  icon,
  label,
  count,
  attention = false,
}: {
  icon: string;
  label: string;
  count: number;
  attention?: boolean;
}) {
  return (
    <div className={`ww-stat-row${attention && count ? ' has-attention' : ''}`}>
      <span><MaterialSymbol>{icon}</MaterialSymbol></span>
      <p>{label}</p>
      <strong>{count}</strong>
    </div>
  );
}
