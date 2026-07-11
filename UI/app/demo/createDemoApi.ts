import type {
  CategorySummary,
  WallpaperItem,
  WallwizeAppState,
  WallwizeDesktopApi,
  WallwizeSettings,
} from '../types';
import { createDemoState, summarizeDemoCategories } from './demoState';

const DEMO_ACTION_DELAY = 220;

function wait(ms = DEMO_ACTION_DELAY) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function cloneState(state: WallwizeAppState): WallwizeAppState {
  return structuredClone(state);
}

export function createDemoApi(): WallwizeDesktopApi {
  let state = createDemoState();
  const manualCategories = new Set<string>();

  const refreshDerivedState = (next: WallwizeAppState): WallwizeAppState => {
    const categories = summarizeDemoCategories(next.wallpapers);
    const categoryNames = new Set(categories.map((category) => category.name));

    for (const name of manualCategories) {
      if (!categoryNames.has(name)) {
        categories.push({ name, count: 0, avgConfidence: 100, samples: [] });
      }
    }

    const reviewQueue = next.wallpapers.filter(
      (item) => item.category !== 'Ignored' && (item.category === 'Needs Review' || item.confidence < 70),
    ).length;
    const duplicates = next.wallpapers.filter((item) =>
      item.warnings.some((warning) => warning.toLowerCase().includes('duplicate') || warning.toLowerCase().includes('similar')),
    ).length;

    return {
      ...next,
      categories,
      stats: {
        library: next.wallpapers.filter((item) => item.category !== 'Ignored').length,
        reviewQueue,
        categories: categories.filter((category) => !['Needs Review', 'Ignored'].includes(category.name)).length,
        duplicates,
        oled: next.wallpapers.filter((item) => item.category === 'OLED').length,
      },
    };
  };

  const commit = (next: WallwizeAppState) => {
    state = refreshDerivedState(next);
    return cloneState(state);
  };

  const updateWallpapers = (
    paths: readonly string[],
    update: (wallpaper: WallpaperItem) => WallpaperItem,
    status: string,
  ) => {
    const selected = new Set(paths);
    return commit({
      ...state,
      wallpapers: state.wallpapers.map((wallpaper) =>
        selected.has(wallpaper.absolutePath) ? update(wallpaper) : wallpaper,
      ),
      status,
    });
  };

  const approve = (wallpaper: WallpaperItem): WallpaperItem => {
    const suggestion = wallpaper.aiCandidates?.[0];
    const category = wallpaper.category === 'Needs Review'
      ? suggestion?.category ?? 'Abstract'
      : wallpaper.category;

    return {
      ...wallpaper,
      category,
      confidence: Math.max(wallpaper.confidence, Math.round(suggestion?.confidence ?? 86)),
      source: 'Approved',
      reason: 'Approved manually in the Wallwize demo.',
      destination: `D:\\Wallwize Organized\\${category}\\${wallpaper.filename}`,
    };
  };

  return {
    async getState() {
      return cloneState(state);
    },

    async chooseFolder(kind) {
      await wait();
      const folder = kind === 'source' ? 'D:\\Wallpapers' : 'D:\\Wallwize Organized';
      const settings: WallwizeSettings = {
        ...state.settings,
        [kind === 'source' ? 'sourceFolder' : 'outputFolder']: folder,
      };
      return commit({
        ...state,
        settings,
        status: kind === 'source' ? 'Source selected · ready to scan' : 'Output folder updated',
      });
    },

    async updateSettings(settings) {
      await wait(120);
      return commit({
        ...state,
        settings: { ...state.settings, ...settings },
        status: 'Settings updated · review your plan before organizing',
      });
    },

    async scan() {
      await wait(520);
      return commit({
        ...state,
        planPath: undefined,
        status: `${state.wallpapers.length} wallpapers scanned · ready to categorize`,
      });
    },

    async plan() {
      await wait(620);
      const reviewCount = state.stats.reviewQueue;
      return commit({
        ...state,
        planPath: 'D:\\Wallpapers\\.wallwize\\plan.json',
        status: `Plan ready · ${reviewCount} wallpaper${reviewCount === 1 ? '' : 's'} need review`,
      });
    },

    async apply() {
      await wait(650);
      return commit({
        ...state,
        status: `${state.stats.library - state.stats.reviewQueue} wallpapers copied · originals kept`,
        lastCommandOutput: 'Demo organization completed successfully.',
      });
    },

    async openPath() {
      await wait(80);
    },

    async getThumbnail(path, fallbackPath) {
      return state.wallpapers.find(
        (wallpaper) => wallpaper.absolutePath === path || wallpaper.destination === fallbackPath,
      )?.preview ?? '';
    },

    async setDesktopWallpaper(path) {
      await wait();
      const selected = state.wallpapers.find((wallpaper) => wallpaper.absolutePath === path);
      return commit({
        ...state,
        status: selected ? `${selected.filename} set as desktop wallpaper` : 'Desktop wallpaper updated',
      });
    },

    async approveWallpaper(path) {
      await wait();
      return updateWallpapers([path], approve, 'Wallpaper approved and added to the plan');
    },

    async approveWallpapers(paths) {
      await wait();
      return updateWallpapers(
        paths,
        approve,
        `${paths.length} wallpaper${paths.length === 1 ? '' : 's'} approved`,
      );
    },

    async addCategory(categoryName) {
      await wait(120);
      const name = categoryName.trim();
      if (name) manualCategories.add(name);
      const categories: CategorySummary[] = [...state.categories];
      if (name && !categories.some((category) => category.name === name)) {
        categories.push({ name, count: 0, avgConfidence: 100, samples: [] });
      }
      state = { ...state, categories, status: name ? `${name} collection created` : state.status };
      return cloneState(state);
    },

    async assignCategory(paths, categoryName) {
      await wait();
      manualCategories.add(categoryName);
      return updateWallpapers(
        paths,
        (wallpaper) => ({
          ...wallpaper,
          category: categoryName,
          confidence: 100,
          source: 'Manual',
          reason: `Assigned to ${categoryName} manually.`,
          destination: `D:\\Wallwize Organized\\${categoryName}\\${wallpaper.filename}`,
        }),
        `${paths.length} wallpaper${paths.length === 1 ? '' : 's'} assigned to ${categoryName}`,
      );
    },

    async ignoreWallpapers(paths) {
      await wait();
      return updateWallpapers(
        paths,
        (wallpaper) => ({
          ...wallpaper,
          category: 'Ignored',
          confidence: 100,
          source: 'Ignored',
          reason: 'Ignored manually.',
          destination: undefined,
        }),
        `${paths.length} wallpaper${paths.length === 1 ? '' : 's'} ignored`,
      );
    },

    async retargetPlan() {
      await wait();
      return commit({ ...state, status: 'Planned destinations updated' });
    },

    async windowCommand() {
      // Browser demo: native window commands intentionally do nothing.
    },
  };
}
