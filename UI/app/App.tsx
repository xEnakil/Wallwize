import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { springs } from './material/motion';
import { Sidebar } from './components/Sidebar';
import { LibraryView } from './components/LibraryView';
import { ReviewQueueView } from './components/ReviewQueueView';
import { CategoriesView } from './components/CategoriesView';
import { DuplicatesView } from './components/DuplicatesView';
import { AIAnalysisView } from './components/AIAnalysisView';
import { SettingsView } from './components/SettingsView';
import { TaskStatus } from './components/TaskStatus';
import { TitleBar } from './components/TitleBar';
import { ActiveView, BusyTask, WallwizeAppState, WallwizeSettings } from './types';

const fallbackState: WallwizeAppState = {
  settings: {
    sourceFolder: '',
    outputFolder: '',
    mode: 'copy',
    conflict: 'skip',
    oledBlackThreshold: 35,
    discoveryMinCount: 2,
    visionProfile: 'off',
    visionMinConfidence: 0.72,
    visionLocalOnly: false,
  },
  stats: {
    library: 0,
    reviewQueue: 0,
    categories: 0,
    duplicates: 0,
    oled: 0,
  },
  wallpapers: [],
  categories: [],
  status: 'Starting Wallwize...',
};

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('library');
  const [state, setState] = useState<WallwizeAppState>(fallbackState);
  const [busyTask, setBusyTask] = useState<BusyTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => {
    try {
      return window.localStorage.getItem('wallwize-color-scheme') !== 'light';
    } catch {
      return true;
    }
  });
  const busy = busyTask !== null;

  const toggleTheme = useCallback(() => {
    setIsDark((current) => {
      const next = !current;
      try {
        window.localStorage.setItem('wallwize-color-scheme', next ? 'dark' : 'light');
      } catch {
        // Theme persistence is optional when storage is unavailable.
      }
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!window.wallwize) {
      setError('Desktop bridge is unavailable. Launch with Electron, not only the browser.');
      return;
    }
    setState(await window.wallwize.getState());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = useCallback(async (action: () => Promise<WallwizeAppState>, task: BusyTask) => {
    setBusyTask(task);
    setError(null);
    try {
      setState(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyTask(null);
    }
  }, []);

  const updateSettings = useCallback(async (settings: Partial<WallwizeSettings>) => {
    if (!window.wallwize) return;
    setError(null);
    try {
      setState(await window.wallwize.updateSettings(settings));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const actions = useMemo(() => ({
    chooseSource: () =>
      runAction(() => window.wallwize!.chooseFolder('source'), {
        label: 'Choosing wallpaper folder',
        hint: 'Wallwize will scan the folder automatically',
      }),
    chooseOutput: () =>
      runAction(() => window.wallwize!.chooseFolder('output'), {
        label: 'Opening folder picker',
        hint: 'Choose where organized wallpapers will go',
      }),
    scan: () =>
      runAction(() => window.wallwize!.scan(), {
        label: 'Scanning wallpapers',
        hint: 'Reading files, colors, dimensions, and OLED signals',
      }),
    plan: () =>
      runAction(() => window.wallwize!.plan(), {
        label: state.settings.visionProfile === 'off' ? 'Categorizing wallpapers' : 'Running local AI vision',
        hint:
          state.settings.visionProfile === 'off'
            ? 'Using filenames, OLED rules, and discovered folder patterns'
            : `Using the ${state.settings.visionProfile} model with local image signals`,
      }),
    apply: () =>
      runAction(() => window.wallwize!.apply(), {
        label: 'Organizing wallpapers',
        hint: `${state.settings.mode === 'move' ? 'Moving' : 'Copying'} wallpapers into destination folders`,
      }),
    setDesktopWallpaper: (path: string, fallbackPath?: string) =>
      runAction(() => window.wallwize!.setDesktopWallpaper(path, fallbackPath), {
        label: 'Applying desktop wallpaper',
        hint: 'Setting the original image with Windows fill mode',
      }),
    approveWallpaper: (path: string, fallbackPath?: string, destination?: string, operation?: string) =>
      runAction(() => window.wallwize!.approveWallpaper(path, fallbackPath, destination, operation), {
        label: 'Approving wallpaper',
        hint: 'Organizing the selected wallpaper',
      }),
    approveWallpapers: (paths: string[]) =>
      runAction(() => window.wallwize!.approveWallpapers(paths), {
        label: 'Approving selected wallpapers',
        hint: 'Organizing selected wallpapers into their destination folders',
      }),
    addCategory: (categoryName: string) =>
      runAction(() => window.wallwize!.addCategory(categoryName), {
        label: 'Adding category',
        hint: 'Creating a manual destination category',
      }),
    assignCategory: (paths: string[], categoryName: string) =>
      runAction(() => window.wallwize!.assignCategory(paths, categoryName), {
        label: 'Changing category',
        hint: `Sending selected wallpapers to ${categoryName}`,
      }),
    ignoreWallpapers: (paths: string[]) =>
      runAction(() => window.wallwize!.ignoreWallpapers(paths), {
        label: 'Ignoring selected wallpapers',
        hint: 'Removing selected wallpapers from the review queue',
      }),
    updateSettings,
  }), [runAction, state.settings.mode, state.settings.visionProfile, updateSettings]);

  const renderView = () => {
    switch (activeView) {
      case 'library':
        return (
          <LibraryView
            wallpapers={state.wallpapers}
            settings={state.settings}
            status={state.status}
            error={error}
            busy={busy}
            busyTask={busyTask}
            hasPlan={Boolean(state.planPath)}
            actions={actions}
          />
        );
      case 'review':
        return (
          <ReviewQueueView
            wallpapers={state.wallpapers}
            categories={state.categories}
            busy={busy}
            onApproveWallpapers={actions.approveWallpapers}
            onAssignCategory={actions.assignCategory}
            onIgnoreWallpapers={actions.ignoreWallpapers}
          />
        );
      case 'categories':
        return (
          <CategoriesView
            categories={state.categories}
            wallpapers={state.wallpapers}
            busy={busy}
            onAddCategory={actions.addCategory}
            onSetDesktopWallpaper={actions.setDesktopWallpaper}
            onApproveWallpaper={actions.approveWallpaper}
          />
        );
      case 'duplicates':
        return <DuplicatesView skippedCount={state.stats.duplicates} />;
      case 'ai':
        return (
          <AIAnalysisView
            settings={state.settings}
            stats={state.stats}
            busy={busy}
            busyTask={busyTask}
            onSettingsChange={updateSettings}
            onRunPlan={actions.plan}
          />
        );
      case 'settings':
        return (
          <SettingsView
            settings={state.settings}
            onChooseSource={actions.chooseSource}
            onChooseOutput={actions.chooseOutput}
            onSettingsChange={updateSettings}
          />
        );
      default:
        return (
          <LibraryView
            wallpapers={state.wallpapers}
            settings={state.settings}
            status={state.status}
            error={error}
            busy={busy}
            busyTask={busyTask}
            hasPlan={Boolean(state.planPath)}
            actions={actions}
          />
        );
    }
  };

  return (
    <div
      className={`wallwize-window-shell relative size-full overflow-hidden ${isDark ? 'dark' : 'ww-light'}`}
      style={{
        color: 'var(--md-sys-color-on-surface)',
        background: 'var(--md-sys-color-surface)',
      }}
      aria-busy={busy}
    >
      <TitleBar isDark={isDark} onToggleTheme={toggleTheme} />
      <div
        className="flex min-h-0 flex-1"
        style={{ background: 'var(--md-sys-color-surface)' }}
      >
        <Sidebar activeView={activeView} onViewChange={setActiveView} stats={state.stats} />
        <motion.div
          key={activeView}
          className="flex min-w-0 flex-1"
          initial={{ opacity: 0, x: 22, scale: 0.995 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={springs.spatialDefault}
        >
          {renderView()}
        </motion.div>
      </div>
      {busyTask && (
        <div className="pointer-events-none absolute bottom-5 left-[calc(50%+52px)] z-50 w-[390px] max-w-[calc(100%-2rem)] -translate-x-1/2">
          <TaskStatus task={busyTask} />
        </div>
      )}
    </div>
  );
}
