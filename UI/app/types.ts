export type ActiveView = 'library' | 'review' | 'categories' | 'duplicates' | 'ai' | 'settings';

export type ClassificationSource =
  | 'AI Vision'
  | 'AI Suggestion'
  | 'Filename'
  | 'Discovery'
  | 'OLED Rule'
  | 'Needs Review'
  | 'Manual'
  | 'Approved'
  | 'Ignored'
  | 'Mixed';

export interface WallpaperItem {
  id: string;
  preview: string;
  thumbnailKey?: string;
  absolutePath: string;
  destination?: string;
  operation?: string;
  category: string;
  confidence: number;
  source: ClassificationSource;
  resolution: string;
  aspectRatio: string;
  dominantColors: string[];
  blackPixels: number;
  darkScore: number;
  aiCandidates?: Array<{ category: string; confidence: number; prompt?: string }>;
  filename: string;
  relativePath?: string;
  sizeBytes?: number;
  reason?: string;
  warnings: string[];
  tags: string[];
}

export interface WallwizeStats {
  library: number;
  reviewQueue: number;
  categories: number;
  duplicates: number;
  oled: number;
}

export interface WallwizeSettings {
  sourceFolder: string;
  outputFolder: string;
  mode: 'copy' | 'move';
  conflict: 'skip' | 'rename';
  oledBlackThreshold: number;
  discoveryMinCount: number;
  visionProfile: 'off' | 'small' | 'balanced' | 'large';
  visionMinConfidence: number;
  visionLocalOnly: boolean;
}

export interface CategorySummary {
  name: string;
  count: number;
  avgConfidence: number;
  samples: string[];
}

export interface WallwizeAppState {
  settings: WallwizeSettings;
  stats: WallwizeStats;
  wallpapers: WallpaperItem[];
  categories: CategorySummary[];
  status: string;
  indexPath?: string;
  planPath?: string;
  lastCommandOutput?: string;
}

export interface BusyTask {
  label: string;
  hint: string;
}

export interface WallwizeDesktopApi {
  platform: 'win32' | 'darwin' | 'linux';
  getState(): Promise<WallwizeAppState>;
  chooseFolder(kind: 'source' | 'output'): Promise<WallwizeAppState>;
  updateSettings(settings: Partial<WallwizeSettings>): Promise<WallwizeAppState>;
  scan(): Promise<WallwizeAppState>;
  plan(): Promise<WallwizeAppState>;
  apply(): Promise<WallwizeAppState>;
  openPath(path: string): Promise<void>;
  getThumbnail(path: string, fallbackPath?: string, thumbnailKey?: string): Promise<string>;
  setDesktopWallpaper(path: string, fallbackPath?: string): Promise<WallwizeAppState>;
  approveWallpaper(
    path: string,
    fallbackPath?: string,
    destination?: string,
    operation?: string,
  ): Promise<WallwizeAppState>;
  approveWallpapers(paths: string[]): Promise<WallwizeAppState>;
  addCategory(categoryName: string): Promise<WallwizeAppState>;
  assignCategory(paths: string[], categoryName: string): Promise<WallwizeAppState>;
  ignoreWallpapers(paths: string[]): Promise<WallwizeAppState>;
  retargetPlan(): Promise<WallwizeAppState>;
  windowCommand(command: 'minimize' | 'maximize' | 'close'): Promise<void>;
}

declare global {
  interface Window {
    wallwize?: WallwizeDesktopApi;
  }
}
