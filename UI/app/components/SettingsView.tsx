import {
  MaterialSymbol,
  MdFilledTonalButton,
  MdSlider,
} from '../material/components';
import { WallwizeSettings } from '../types';

interface SettingsViewProps {
  settings: WallwizeSettings;
  onChooseSource: () => void;
  onChooseOutput: () => void;
  onSettingsChange: (settings: Partial<WallwizeSettings>) => void;
}

export function SettingsView({
  settings,
  onChooseSource,
  onChooseOutput,
  onSettingsChange,
}: SettingsViewProps) {
  return (
    <section className="ww-page" aria-labelledby="settings-title">
      <header className="ww-page-header">
        <div className="ww-page-copy">
          <span className="ww-eyebrow">Preferences</span>
          <h1 id="settings-title" className="ww-page-title">Settings</h1>
          <p className="ww-page-support">Decide where files go and how Wallwize handles them.</p>
        </div>
      </header>

      <div className="ww-page-scroll">
        <div className="ww-page-width ww-settings-grid">
          <div className="ww-settings-main">
            <section className="ww-surface-card" aria-labelledby="folders-title">
              <div className="ww-section-heading">
                <div>
                  <span className="ww-eyebrow">Locations</span>
                  <h2 id="folders-title">Wallpaper folders</h2>
                  <p>Your originals and organized output stay separate.</p>
                </div>
                <div className="ww-model-mark"><MaterialSymbol opticalSize={40}>folder_open</MaterialSymbol></div>
              </div>
              <div className="ww-folder-list">
                <FolderRow
                  icon="imagesmode"
                  label="Source"
                  value={settings.sourceFolder || 'Choose the folder containing your wallpapers'}
                  empty={!settings.sourceFolder}
                  onBrowse={onChooseSource}
                />
                <FolderRow
                  icon="drive_file_move"
                  label="Organized output"
                  value={settings.outputFolder || 'Choose where categorized folders are created'}
                  empty={!settings.outputFolder}
                  onBrowse={onChooseOutput}
                />
              </div>
            </section>

            <section className="ww-surface-card" aria-labelledby="file-handling-title">
              <div className="ww-section-heading ww-section-heading--compact">
                <div>
                  <span className="ww-eyebrow">File handling</span>
                  <h2 id="file-handling-title">Copy or move</h2>
                  <p>Choose what happens only when you approve or organize a plan.</p>
                </div>
              </div>

              <div className="ww-mode-picker" role="radiogroup" aria-label="File operation mode">
                <ModeOption
                  icon="file_copy"
                  title="Copy files"
                  description="Keep every original in the source folder."
                  selected={settings.mode === 'copy'}
                  onClick={() => onSettingsChange({ mode: 'copy' })}
                />
                <ModeOption
                  icon="drive_file_move"
                  title="Move files"
                  description="Remove originals after they reach the output folder."
                  selected={settings.mode === 'move'}
                  onClick={() => onSettingsChange({ mode: 'move' })}
                />
              </div>

              <div className="ww-setting-row">
                <div>
                  <strong>If a file already exists</strong>
                  <span>Protect the destination from accidental overwrites.</span>
                </div>
                <div className="ww-segmented-control" role="radiogroup" aria-label="Conflict handling">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={settings.conflict === 'skip'}
                    className={settings.conflict === 'skip' ? 'is-selected' : ''}
                    onClick={() => onSettingsChange({ conflict: 'skip' })}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={settings.conflict === 'rename'}
                    className={settings.conflict === 'rename' ? 'is-selected' : ''}
                    onClick={() => onSettingsChange({ conflict: 'rename' })}
                  >
                    Rename
                  </button>
                </div>
              </div>
            </section>

            <section className="ww-surface-card" aria-labelledby="detection-title">
              <div className="ww-section-heading ww-section-heading--compact">
                <div>
                  <span className="ww-eyebrow">Detection</span>
                  <h2 id="detection-title">Fine tune the rules</h2>
                </div>
              </div>

              <div className="ww-slider-heading">
                <div>
                  <strong>OLED pure-black threshold</strong>
                  <p>Only near-neutral black pixels count; dark colored pixels are excluded.</p>
                </div>
                <output>{settings.oledBlackThreshold}%</output>
              </div>
              <MdSlider
                min={0}
                max={100}
                value={settings.oledBlackThreshold}
                aria-label="OLED pure black threshold"
                onInput={(event) => {
                  const value = Number((event.currentTarget as unknown as { value: number }).value);
                  onSettingsChange({ oledBlackThreshold: value });
                }}
              />

              <div className="ww-setting-row ww-setting-row--number">
                <div>
                  <strong>Discovery minimum</strong>
                  <span>Matching images required before a new category is proposed.</span>
                </div>
                <label className="ww-number-field">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={settings.discoveryMinCount}
                    aria-label="Discovery minimum count"
                    onChange={(event) => onSettingsChange({ discoveryMinCount: Number(event.target.value) })}
                  />
                  <span>images</span>
                </label>
              </div>
            </section>
          </div>

          <aside className="ww-settings-side">
            <section className="ww-privacy-card">
              <div className="ww-privacy-shield"><MaterialSymbol fill opticalSize={48}>shield_lock</MaterialSymbol></div>
              <span className="ww-eyebrow">Privacy</span>
              <h2>Your images stay here.</h2>
              <p>Scanning, thumbnails, rules, and AI analysis run locally on this computer.</p>
              <div className="ww-privacy-proof">
                <MaterialSymbol fill>check_circle</MaterialSymbol>
                No cloud upload
              </div>
            </section>

            <section className="ww-about-card">
              <div className="ww-about-brand">
                <span className="ww-about-mark"><MaterialSymbol fill>auto_awesome_mosaic</MaterialSymbol></span>
                <div>
                  <strong>Wallwize</strong>
                  <span>Desktop 0.8.0</span>
                </div>
              </div>
              <dl>
                <div><dt>Backend</dt><dd>Local CLI</dd></div>
                <div><dt>License</dt><dd>Local · free stack</dd></div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

function FolderRow({
  icon,
  label,
  value,
  empty,
  onBrowse,
}: {
  icon: string;
  label: string;
  value: string;
  empty: boolean;
  onBrowse: () => void;
}) {
  return (
    <div className="ww-folder-row">
      <span className="ww-folder-icon"><MaterialSymbol>{icon}</MaterialSymbol></span>
      <div>
        <strong>{label}</strong>
        <span className={empty ? 'is-placeholder' : ''} title={value}>{value}</span>
      </div>
      <MdFilledTonalButton onClick={onBrowse}>Choose</MdFilledTonalButton>
    </div>
  );
}

function ModeOption({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`ww-mode-option${selected ? ' is-selected' : ''}`}
      onClick={onClick}
    >
      <span><MaterialSymbol fill={selected}>{icon}</MaterialSymbol></span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <span className="ww-profile-radio" aria-hidden="true" />
    </button>
  );
}
