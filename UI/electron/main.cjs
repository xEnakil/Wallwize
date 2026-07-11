const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell } = require('electron');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const isDev = !app.isPackaged;
const PORTABLE_MARKER_FILE = 'wallwize-portable.json';

function resolvePortableRoot() {
  if (isDev) return null;

  const portableExecutableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableExecutableDir) {
    return path.join(portableExecutableDir, 'Wallwize Portable');
  }

  const exeDir = path.dirname(process.execPath);
  const markerPath = path.join(exeDir, PORTABLE_MARKER_FILE);
  return fs.existsSync(markerPath) ? exeDir : null;
}

const portableRoot = resolvePortableRoot();
const isPortable = portableRoot !== null;
const runtimeDataRoot = isPortable ? path.join(portableRoot, 'Data') : app.getPath('userData');

if (isPortable) {
  const portableUserDataDir = path.join(runtimeDataRoot, 'user-data');
  fs.mkdirSync(portableUserDataDir, { recursive: true });
  app.setPath('userData', portableUserDataDir);
}

function resolveProjectRoot() {
  if (isDev) {
    return path.resolve(__dirname, '..', '..');
  }
  return path.join(process.resourcesPath, 'backend');
}

const projectRoot = resolveProjectRoot();
const appDataDir = path.join(runtimeDataRoot, 'wallwize');
const thumbnailDir = path.join(appDataDir, 'thumbnails');
const modelCacheDir = path.join(appDataDir, 'models');
const statePath = path.join(appDataDir, 'state.json');
const indexPath = path.join(appDataDir, 'index.json');
const planPath = path.join(appDataDir, 'plan.json');
const thumbnailJobs = new Map();
const thumbnailQueue = [];
const MAX_ACTIVE_THUMBNAILS = 3;
let activeThumbnailJobs = 0;

const defaultSettings = {
  sourceFolder: '',
  outputFolder: isPortable
    ? path.join(portableRoot, 'Organized Wallpapers')
    : isDev
    ? path.join(projectRoot, 'sorted_wallpapers')
    : path.join(os.homedir(), 'Pictures', 'Wallwize Organized'),
  mode: 'copy',
  conflict: 'skip',
  oledBlackThreshold: 35,
  discoveryMinCount: 2,
  visionProfile: 'off',
  visionMinConfidence: 0.72,
  visionLocalOnly: false,
};

const validModes = new Set(['copy', 'move']);
const validConflicts = new Set(['skip', 'rename']);
const validVisionProfiles = new Set(['off', 'small', 'balanced', 'large']);
const invalidCategoryChars = /[<>:"/\\|?*\x00-\x1F]/g;
const reservedWindowsNames = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

function ensureDirs() {
  fs.mkdirSync(appDataDir, { recursive: true });
  fs.mkdirSync(thumbnailDir, { recursive: true });
  fs.mkdirSync(modelCacheDir, { recursive: true });
}

function numberInRange(value, fallback, min, max) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function integerInRange(value, fallback, min, max) {
  return Math.round(numberInRange(value, fallback, min, max));
}

function stringSetting(value, fallback) {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeCategoryName(value) {
  const cleaned = String(value || '')
    .replace(invalidCategoryChars, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 80);

  if (!cleaned) {
    throw new Error('Category name is required.');
  }
  if (reservedWindowsNames.has(cleaned.toUpperCase())) {
    throw new Error(`"${cleaned}" is reserved by Windows. Choose another category name.`);
  }
  return cleaned;
}

function normalizeCategoryList(value) {
  const categories = Array.isArray(value) ? value : [];
  const seen = new Set();
  const normalized = [];
  for (const category of categories) {
    try {
      const clean = sanitizeCategoryName(category);
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        normalized.push(clean);
      }
    } catch {
      // Ignore stale or invalid persisted category names.
    }
  }
  return normalized;
}

function sanitizeSettings(settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  return {
    sourceFolder: stringSetting(source.sourceFolder, defaultSettings.sourceFolder),
    outputFolder: stringSetting(source.outputFolder, defaultSettings.outputFolder),
    mode: validModes.has(source.mode) ? source.mode : defaultSettings.mode,
    conflict: validConflicts.has(source.conflict) ? source.conflict : defaultSettings.conflict,
    oledBlackThreshold: numberInRange(
      source.oledBlackThreshold,
      defaultSettings.oledBlackThreshold,
      0,
      100
    ),
    discoveryMinCount: integerInRange(
      source.discoveryMinCount,
      defaultSettings.discoveryMinCount,
      1,
      50
    ),
    visionProfile: validVisionProfiles.has(source.visionProfile)
      ? source.visionProfile
      : defaultSettings.visionProfile,
    visionMinConfidence: numberInRange(
      source.visionMinConfidence,
      defaultSettings.visionMinConfidence,
      0,
      1
    ),
    visionLocalOnly:
      typeof source.visionLocalOnly === 'boolean'
        ? source.visionLocalOnly
        : defaultSettings.visionLocalOnly,
  };
}

function sanitizeSettingsPatch(settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  const patch = {};
  if ('sourceFolder' in source) patch.sourceFolder = stringSetting(source.sourceFolder, '');
  if ('outputFolder' in source) patch.outputFolder = stringSetting(source.outputFolder, '');
  if ('mode' in source && validModes.has(source.mode)) patch.mode = source.mode;
  if ('conflict' in source && validConflicts.has(source.conflict)) patch.conflict = source.conflict;
  if ('oledBlackThreshold' in source) {
    patch.oledBlackThreshold = numberInRange(
      source.oledBlackThreshold,
      defaultSettings.oledBlackThreshold,
      0,
      100
    );
  }
  if ('discoveryMinCount' in source) {
    patch.discoveryMinCount = integerInRange(
      source.discoveryMinCount,
      defaultSettings.discoveryMinCount,
      1,
      50
    );
  }
  if ('visionProfile' in source && validVisionProfiles.has(source.visionProfile)) {
    patch.visionProfile = source.visionProfile;
  }
  if ('visionMinConfidence' in source) {
    patch.visionMinConfidence = numberInRange(
      source.visionMinConfidence,
      defaultSettings.visionMinConfidence,
      0,
      1
    );
  }
  if ('visionLocalOnly' in source && typeof source.visionLocalOnly === 'boolean') {
    patch.visionLocalOnly = source.visionLocalOnly;
  }
  return patch;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDirs();
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function readPersistedState() {
  const stored = readJson(statePath, {});
  const settings = sanitizeSettings({ ...defaultSettings, ...(stored.settings || {}) });
  return {
    settings,
    status: stored.status || 'Choose a wallpaper folder to begin.',
    lastCommandOutput: stored.lastCommandOutput || '',
    manualCategories: normalizeCategoryList(stored.manualCategories),
  };
}

function persistPartial(partial) {
  const current = readPersistedState();
  const next = {
    ...current,
    ...partial,
    settings: { ...current.settings, ...(partial.settings || {}) },
  };
  writeJson(statePath, next);
  return next;
}

function colorNameToHex(name) {
  return {
    black: '#050505',
    white: '#f3f3f3',
    gray: '#858585',
    red: '#dc3f4f',
    orange: '#f08a3c',
    yellow: '#e8c547',
    green: '#36b37e',
    cyan: '#2dd4bf',
    blue: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899',
    brown: '#8b5e3c',
  }[name] || '#666666';
}

function sourceLabel(source) {
  if (source === 'manual-category') return 'Manual';
  if (source === 'user-approved') return 'Approved';
  if (source === 'user-ignored') return 'Ignored';
  if (source === 'oled-policy') return 'OLED Rule';
  if (source === 'known-taxonomy') return 'Filename';
  if (source === 'local-discovery') return 'Discovery';
  if (source === 'local-vision-suggestion') return 'AI Suggestion';
  if (source === 'fallback' || source === 'vision-low-confidence') return 'Needs Review';
  if (String(source).includes('local-vision')) return 'AI Vision';
  return 'Mixed';
}

function existingWallpaperPath(primaryPath, fallbackPath) {
  const candidates = [primaryPath, fallbackPath].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function normalizeExistingFile(filePath, description) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new Error(`${description} path is missing.`);
  }
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`${description} does not exist: ${resolvedPath}`);
  }
  return resolvedPath;
}

function fileUrl(filePath) {
  return pathToFileURL(filePath).toString();
}

function thumbnailUrlFromRecord(record) {
  return record?.thumbnail_path && fs.existsSync(record.thumbnail_path)
    ? fileUrl(record.thumbnail_path)
    : '';
}

function safeCacheKey(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 180);
}

function hashValue(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex');
}

function cacheKeyForPath(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return hashValue(`${filePath}|${stats.size}|${Math.round(stats.mtimeMs)}`);
  } catch {
    return hashValue(filePath);
  }
}

function thumbnailPathForKey(key) {
  return path.join(thumbnailDir, `${safeCacheKey(key)}.jpg`);
}

function cachedThumbnailUrl(key) {
  const thumbnailPath = thumbnailPathForKey(key);
  return fs.existsSync(thumbnailPath) ? fileUrl(thumbnailPath) : '';
}

function scheduleThumbnailWork(task) {
  return new Promise((resolve, reject) => {
    thumbnailQueue.push({ task, resolve, reject });
    pumpThumbnailQueue();
  });
}

function pumpThumbnailQueue() {
  while (activeThumbnailJobs < MAX_ACTIVE_THUMBNAILS && thumbnailQueue.length) {
    const item = thumbnailQueue.shift();
    activeThumbnailJobs += 1;
    item.task()
      .then(item.resolve, item.reject)
      .finally(() => {
        activeThumbnailJobs -= 1;
        pumpThumbnailQueue();
      });
  }
}

async function thumbnailForImage(primaryPath, fallbackPath, providedKey) {
  const targetPath = existingWallpaperPath(primaryPath, fallbackPath);
  if (!targetPath) {
    throw new Error('Wallpaper file was not found. If files were moved, rescan and categorize again.');
  }

  const key = providedKey || cacheKeyForPath(targetPath);
  const thumbnailPath = thumbnailPathForKey(key);
  if (fs.existsSync(thumbnailPath)) return fileUrl(thumbnailPath);
  if (thumbnailJobs.has(key)) return thumbnailJobs.get(key);

  const job = scheduleThumbnailWork(async () => {
    ensureDirs();
    const image = await nativeImage.createThumbnailFromPath(targetPath, {
      width: 520,
      height: 300,
    });

    if (image.isEmpty()) {
      throw new Error(`Could not create thumbnail for ${path.basename(targetPath)}`);
    }

    await fs.promises.writeFile(thumbnailPath, image.toJPEG(76));
    return fileUrl(thumbnailPath);
  }).finally(() => {
    thumbnailJobs.delete(key);
  });

  thumbnailJobs.set(key, job);
  return job;
}

function loadComputedState() {
  const persisted = readPersistedState();
  const index = readJson(indexPath, null);
  let plan = readJson(planPath, null);
  const records = new Map((index?.records || []).map((record) => [record.absolute_path, record]));
  if (plan && hasInvalidOledPlanItems(plan, records, persisted.settings.oledBlackThreshold)) {
    removePlanFile();
    plan = null;
    persistPartial({
      status: 'Categories were cleared because OLED rules changed. Categorize again.',
    });
  }
  const planItems = plan?.items || [];

  const wallpapers = planItems.length
    ? planItems.map((item) => wallpaperFromPlanItem(item, records.get(item.source)))
    : Array.from(records.values()).map((record) => wallpaperFromRecord(record));

  const categories = buildCategories(wallpapers, persisted.manualCategories);
  const stats = {
    library: index?.image_count || wallpapers.length,
    reviewQueue: wallpapers.filter((item) => item.category === 'Needs Review' || item.confidence < 70).length,
    categories: categories.length,
    duplicates: plan?.skipped?.length || 0,
    oled: wallpapers.filter((item) => item.category === 'OLED').length,
  };

  return {
    settings: persisted.settings,
    status: persisted.status,
    lastCommandOutput: persisted.lastCommandOutput,
    indexPath: fs.existsSync(indexPath) ? indexPath : undefined,
    planPath: fs.existsSync(planPath) ? planPath : undefined,
    wallpapers,
    categories,
    stats,
  };
}

function hasInvalidOledPlanItems(plan, records, blackThreshold) {
  return (plan?.items || []).some((item) => {
    if (item.category !== 'OLED') return false;
    const record = records.get(item.source);
    return record && Number(record.black_percent || 0) < blackThreshold;
  });
}

function wallpaperFromPlanItem(item, record) {
  const visionCandidates = item.signals?.vision?.candidates || [];
  const previewKey = record?.sha256 || cacheKeyForPath(existingWallpaperPath(item.source, item.destination) || item.source);
  return {
    id: item.source,
    preview: thumbnailUrlFromRecord(record) || cachedThumbnailUrl(previewKey),
    thumbnailKey: previewKey,
    absolutePath: item.source,
    destination: item.destination,
    operation: item.operation,
    category: item.category,
    confidence: Math.round((item.confidence || 0) * 100),
    source: sourceLabel(item.classification_source),
    resolution: record ? `${record.width}x${record.height}` : 'Unknown',
    aspectRatio: record?.aspect_label || 'unknown',
    dominantColors: (record?.dominant_colors || []).slice(0, 3).map(colorNameToHex),
    blackPixels: Math.round(record?.black_percent || 0),
    darkScore: Math.round(record?.oled_score || 0),
    aiCandidates: visionCandidates.map((candidate) => ({
      category: candidate.category,
      confidence: Math.round((candidate.score || 0) * 100),
      prompt: candidate.prompt,
    })),
    filename: path.basename(item.source),
    relativePath: record?.relative_path || path.basename(item.source),
    sizeBytes: Number(record?.size_bytes || 0),
    reason: item.reason || '',
    warnings: record?.warnings || [],
    tags: item.tags || record?.tags || [],
  };
}

function wallpaperFromRecord(record) {
  const previewKey = record.sha256 || cacheKeyForPath(record.absolute_path);
  return {
    id: record.absolute_path,
    preview: thumbnailUrlFromRecord(record) || cachedThumbnailUrl(previewKey),
    thumbnailKey: previewKey,
    absolutePath: record.absolute_path,
    category: 'Needs Review',
    confidence: 0,
    source: 'Needs Review',
    resolution: `${record.width}x${record.height}`,
    aspectRatio: record.aspect_label,
    dominantColors: (record.dominant_colors || []).slice(0, 3).map(colorNameToHex),
    blackPixels: Math.round(record.black_percent || 0),
    darkScore: Math.round(record.oled_score || 0),
    aiCandidates: [],
    filename: record.file_name,
    relativePath: record.relative_path || record.file_name,
    sizeBytes: Number(record.size_bytes || 0),
    reason: 'Waiting for categorization',
    warnings: record.warnings || [],
    tags: record.tags || [],
  };
}

function buildCategories(wallpapers, manualCategories = []) {
  const grouped = new Map();
  for (const wallpaper of wallpapers) {
    if (!grouped.has(wallpaper.category)) grouped.set(wallpaper.category, []);
    grouped.get(wallpaper.category).push(wallpaper);
  }
  for (const category of manualCategories) {
    if (!grouped.has(category)) grouped.set(category, []);
  }
  return Array.from(grouped.entries())
    .map(([name, items]) => ({
      name,
      count: items.length,
      avgConfidence: items.length
        ? Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / items.length)
        : 0,
      samples: items.map((item) => item.preview).filter(Boolean).slice(0, 4),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function resolvePythonCommand() {
  if (process.env.WALLWIZE_BACKEND_EXE) return { command: process.env.WALLWIZE_BACKEND_EXE, prefix: [] };

  const backendName = process.platform === 'win32' ? 'wallwize-backend.exe' : 'wallwize-backend';
  const bundledBackends = [
    path.join(projectRoot, 'bin', backendName),
    // Compatibility with Windows packages created before the cross-platform layout.
    path.join(projectRoot, backendName),
  ];
  const devBackend = path.join(projectRoot, 'build', 'backend-dist', backendName);
  const bundledBackend = bundledBackends.find((candidate) => fs.existsSync(candidate));
  if (bundledBackend) return { command: bundledBackend, prefix: [] };
  if (fs.existsSync(devBackend)) return { command: devBackend, prefix: [] };

  const candidates = [
    process.env.WALLWIZE_PYTHON,
    ...(process.platform === 'win32'
      ? [
          path.join(
            os.homedir(),
            '.cache',
            'codex-runtimes',
            'codex-primary-runtime',
            'dependencies',
            'python',
            'python.exe'
          ),
          'python',
          'py',
        ]
      : ['python3', 'python']),
  ].filter(Boolean);

  return { command: candidates[0], prefix: ['-m', 'wallwize'] };
}

function backendEnv() {
  const env = {
    ...process.env,
    PYTHONPATH: path.join(projectRoot, 'src'),
    WALLWIZE_APP_DATA_DIR: appDataDir,
    WALLWIZE_MODEL_CACHE_DIR: modelCacheDir,
    WALLWIZE_THUMBNAIL_DIR: thumbnailDir,
    TRANSFORMERS_CACHE: modelCacheDir,
    HF_HOME: modelCacheDir,
    XDG_CACHE_HOME: modelCacheDir,
  };

  if (isPortable) {
    env.WALLWIZE_PORTABLE = '1';
    env.WALLWIZE_PORTABLE_ROOT = portableRoot;
  }

  if (app.isPackaged) {
    env.ELECTRON_RUN_AS_NODE = '1';
    env.WALLWIZE_NODE_BIN = process.execPath;
    env.WALLWIZE_NODE_MODULES = path.join(process.resourcesPath, 'app.asar', 'node_modules');
    env.NODE_PATH = env.WALLWIZE_NODE_MODULES;
  } else {
    const uiNodeModules = path.join(projectRoot, 'UI', 'node_modules');
    const rootNodeModules = path.join(projectRoot, 'node_modules');
    env.WALLWIZE_NODE_MODULES = fs.existsSync(uiNodeModules) ? uiNodeModules : rootNodeModules;
    env.NODE_PATH = env.WALLWIZE_NODE_MODULES;
  }

  return env;
}

function runWallwize(args) {
  const { command, prefix } = resolvePythonCommand();
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...prefix, ...args], {
      cwd: projectRoot,
      env: backendEnv(),
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
      if (code === 0) resolve(output);
      else reject(new Error(output || `Wallwize exited with code ${code}`));
    });
  });
}

function runPowerShell(args, envPatch = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', args, {
      env: { ...process.env, ...envPatch },
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
      if (code === 0) resolve(output);
      else reject(new Error(output || `PowerShell exited with code ${code}`));
    });
  });
}

function runAppleScriptFile(scriptPath, scriptArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('osascript', [scriptPath, ...scriptArgs], {
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
      if (code === 0) resolve(output);
      else reject(new Error(output || `AppleScript exited with code ${code}`));
    });
  });
}

async function setWindowsDesktopWallpaper(targetPath) {
  const wallpaperPath = normalizeExistingFile(targetPath, 'Wallpaper file');
  const script = `
$ErrorActionPreference = 'Stop'
$rawWallpaperPath = $env:WALLWIZE_WALLPAPER_PATH
if ([string]::IsNullOrWhiteSpace($rawWallpaperPath)) {
  throw "Wallpaper path was not provided."
}
$wallpaperPath = [System.IO.Path]::GetFullPath($rawWallpaperPath)
if (-not [System.IO.File]::Exists($wallpaperPath)) {
  throw "Wallpaper file does not exist: $wallpaperPath"
}
Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name WallpaperStyle -Value '10'
Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name TileWallpaper -Value '0'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class WallwizeWallpaperApi {
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@
$ok = [WallwizeWallpaperApi]::SystemParametersInfo(20, 0, $wallpaperPath, 3)
if (-not $ok) {
  $errorCode = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  throw "Windows rejected the wallpaper change. Error code: $errorCode"
}
Write-Output "Desktop wallpaper applied: $wallpaperPath"
`;
  return runPowerShell([
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    script,
  ], { WALLWIZE_WALLPAPER_PATH: wallpaperPath });
}

async function setMacDesktopWallpaper(targetPath) {
  const wallpaperPath = normalizeExistingFile(targetPath, 'Wallpaper file');
  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, 'scripts', 'set-wallpaper.applescript')
    : path.join(__dirname, 'set-wallpaper.applescript');
  try {
    return await runAppleScriptFile(scriptPath, [wallpaperPath]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not authorized|not allowed|-1743/i.test(message)) {
      throw new Error(
        'macOS blocked the wallpaper change. Allow Wallwize in System Settings > Privacy & Security > Automation, then try again.'
      );
    }
    throw error;
  }
}

async function setDesktopWallpaper(targetPath) {
  if (process.platform === 'win32') return setWindowsDesktopWallpaper(targetPath);
  if (process.platform === 'darwin') return setMacDesktopWallpaper(targetPath);
  throw new Error('Setting the desktop wallpaper is currently supported on Windows and macOS.');
}

function uniquePath(destination) {
  if (!fs.existsSync(destination)) return destination;

  const parsed = path.parse(destination);
  for (let index = 1; index < 10000; index += 1) {
    const candidate = path.join(parsed.dir, `${parsed.name} (${index})${parsed.ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`Could not find an available filename for ${path.basename(destination)}`);
}

function planPathKey(filePath) {
  return path.normalize(path.resolve(String(filePath || ''))).toLowerCase();
}

function selectedSourceKeys(paths) {
  if (!Array.isArray(paths)) {
    throw new Error('Select at least one wallpaper.');
  }
  const keys = new Set(paths.filter(Boolean).map(planPathKey));
  if (keys.size === 0) {
    throw new Error('Select at least one wallpaper.');
  }
  return keys;
}

function appendManualCategory(categoryName) {
  const clean = sanitizeCategoryName(categoryName);
  const persisted = readPersistedState();
  const exists = persisted.manualCategories.some(
    (category) => category.toLowerCase() === clean.toLowerCase()
  );
  if (!exists) {
    persistPartial({ manualCategories: [...persisted.manualCategories, clean] });
  }
  ensureCategoryOutputFolder(clean, persisted.settings.outputFolder);
  return clean;
}

function ensureCategoryOutputFolder(categoryName, targetRoot) {
  const clean = sanitizeCategoryName(categoryName);
  const root = targetRoot || readPersistedState().settings.outputFolder;
  if (!root) return;
  fs.mkdirSync(path.join(root, clean), { recursive: true });
}

function uniquePlanDestination(destination, used) {
  const parsed = path.parse(destination);
  let candidate = destination;
  let counter = 2;
  while (used.has(planPathKey(candidate))) {
    candidate = path.join(parsed.dir, `${parsed.name} (${counter})${parsed.ext}`);
    counter += 1;
  }
  used.add(planPathKey(candidate));
  return candidate;
}

function rebuildPlanDestinations(plan, targetRootOverride) {
  const { settings } = readPersistedState();
  const targetRoot = path.resolve(
    targetRootOverride || plan.target_root || settings.outputFolder || defaultSettings.outputFolder
  );
  const used = new Set();
  return {
    ...plan,
    target_root: targetRoot,
    mode: validModes.has(plan.mode) ? plan.mode : settings.mode,
    items: (plan.items || []).map((item) => {
      const category = sanitizeCategoryName(item.category || 'Needs Review');
      const fileName = path.basename(item.source || item.destination || 'wallpaper');
      return {
        ...item,
        category,
        operation: validModes.has(item.operation) ? item.operation : settings.mode,
        destination: uniquePlanDestination(path.join(targetRoot, category, fileName), used),
      };
    }),
  };
}

function createPlanFromIndex(index, settings) {
  const targetRoot = path.resolve(settings.outputFolder || defaultSettings.outputFolder);
  const plan = {
    version: 1,
    created_at: new Date().toISOString(),
    source_root: index.source_root || settings.sourceFolder || '',
    target_root: targetRoot,
    mode: settings.mode,
    oled_black_threshold: settings.oledBlackThreshold,
    discovery_min_count: settings.discoveryMinCount,
    vision_profile: settings.visionProfile,
    vision_min_confidence: settings.visionMinConfidence,
    items: (index.records || []).map((record) => ({
      source: record.absolute_path,
      destination: path.join(targetRoot, 'Needs Review', record.file_name || path.basename(record.absolute_path)),
      operation: settings.mode,
      category: 'Needs Review',
      reason: 'Waiting for manual review',
      tags: record.tags || [],
      classification_source: 'fallback',
      confidence: 0,
      signals: {},
    })),
    skipped: [],
  };
  return rebuildPlanDestinations(plan, targetRoot);
}

function ensureEditablePlan() {
  const { settings } = readPersistedState();
  const existingPlan = readJson(planPath, null);
  if (existingPlan) return existingPlan;

  const index = readJson(indexPath, null);
  if (!index) {
    throw new Error('Choose and scan a wallpaper folder before editing categories.');
  }
  const plan = createPlanFromIndex(index, settings);
  writeJson(planPath, plan);
  return plan;
}

function syncPlanWithSettings(settingsPatch) {
  if (!fs.existsSync(planPath)) return;
  const patch = settingsPatch || {};
  if (!('outputFolder' in patch) && !('mode' in patch)) return;
  const persisted = readPersistedState();
  const currentPlan = readJson(planPath, null);
  if (!currentPlan) return;
  const mode = validModes.has(patch.mode) ? patch.mode : persisted.settings.mode;
  const targetRoot = patch.outputFolder || currentPlan.target_root || persisted.settings.outputFolder;
  const nextPlan = rebuildPlanDestinations(
    {
      ...currentPlan,
      mode,
      items: (currentPlan.items || []).map((item) => ({
        ...item,
        operation: mode,
      })),
    },
    targetRoot
  );
  writeJson(planPath, nextPlan);
}

function updatePlanItems(selectedPaths, updater, options = {}) {
  const selectedKeys = selectedSourceKeys(selectedPaths);
  const plan = ensureEditablePlan();
  let changed = 0;
  const nextItems = (plan.items || []).map((item) => {
    if (!selectedKeys.has(planPathKey(item.source))) return item;
    changed += 1;
    return updater(item);
  });

  if (changed === 0) {
    throw new Error('Selected wallpapers are not in the current plan. Rescan and try again.');
  }

  const nextPlan = options.rebuildDestinations
    ? rebuildPlanDestinations({ ...plan, items: nextItems }, options.targetRoot)
    : { ...plan, items: nextItems };
  writeJson(planPath, nextPlan);
  return changed;
}

function assignCategoryToWallpapers(paths, categoryName) {
  const category = appendManualCategory(categoryName);
  const changed = updatePlanItems(
    paths,
    (item) => ({
      ...item,
      category,
      classification_source: 'manual-category',
      confidence: 1,
      reason: `Manually assigned to ${category}`,
    }),
    { rebuildDestinations: true }
  );
  persistPartial({ status: `Assigned ${changed} wallpaper${changed === 1 ? '' : 's'} to ${category}.` });
  return loadComputedState();
}

function ignoreWallpapers(paths) {
  const category = appendManualCategory('Ignored');
  const changed = updatePlanItems(
    paths,
    (item) => ({
      ...item,
      category,
      classification_source: 'user-ignored',
      confidence: 1,
      reason: 'Ignored from review queue',
    }),
    { rebuildDestinations: true }
  );
  persistPartial({ status: `Ignored ${changed} wallpaper${changed === 1 ? '' : 's'}.` });
  return loadComputedState();
}

function markWallpapersApproved(paths) {
  if (!fs.existsSync(planPath)) return 0;
  return updatePlanItems(paths, (item) => ({
    ...item,
    classification_source: 'user-approved',
    confidence: Math.max(Number(item.confidence || 0), 1),
    reason: `${item.reason || 'Approved'}; user approved`,
  }));
}

async function moveAcrossDevices(source, destination) {
  try {
    await fs.promises.rename(source, destination);
  } catch (error) {
    if (error && error.code === 'EXDEV') {
      await fs.promises.copyFile(source, destination);
      await fs.promises.unlink(source);
      return;
    }
    throw error;
  }
}

async function approveOneWallpaper(primaryPath, fallbackPath, destination, plannedOperation) {
  if (!destination) {
    throw new Error('Categorize wallpapers before approving individual items.');
  }

  const source = existingWallpaperPath(primaryPath, fallbackPath);
  if (!source) {
    throw new Error('Wallpaper file was not found. If files were moved, rescan and categorize again.');
  }

  const { settings } = readPersistedState();
  const operation = plannedOperation === 'move' || plannedOperation === 'copy'
    ? plannedOperation
    : settings.mode;
  const finalDestination = settings.conflict === 'rename' ? uniquePath(destination) : destination;

  if (fs.existsSync(destination) && settings.conflict === 'skip') {
    const message = `Skipped existing file: ${path.basename(destination)}`;
    persistPartial({ status: message, lastCommandOutput: message });
    return message;
  }

  await fs.promises.mkdir(path.dirname(finalDestination), { recursive: true });
  if (operation === 'move') {
    await moveAcrossDevices(source, finalDestination);
  } else {
    await fs.promises.copyFile(source, finalDestination);
  }

  const operationLabel = operation === 'move' ? 'Moved' : 'Copied';
  const message = `${operationLabel} approved wallpaper: ${path.basename(finalDestination)}`;
  persistPartial({ status: message, lastCommandOutput: message });
  return message;
}

async function approveSelectedWallpapers(paths) {
  const selectedKeys = selectedSourceKeys(paths);
  const plan = ensureEditablePlan();
  const selectedItems = (plan.items || []).filter((item) => selectedKeys.has(planPathKey(item.source)));
  if (selectedItems.length === 0) {
    throw new Error('Selected wallpapers are not in the current plan. Rescan and try again.');
  }
  const unresolved = selectedItems.filter((item) => item.category === 'Needs Review');
  if (unresolved.length > 0) {
    throw new Error('Choose a category before approving Needs Review wallpapers.');
  }

  const messages = [];
  for (const item of selectedItems) {
    messages.push(await approveOneWallpaper(item.source, item.destination, item.destination, item.operation));
  }
  markWallpapersApproved(selectedItems.map((item) => item.source));
  const message = `Approved ${selectedItems.length} wallpaper${selectedItems.length === 1 ? '' : 's'}.`;
  persistPartial({ status: message, lastCommandOutput: messages.join('\n') });
  return loadComputedState();
}

async function runAndRefresh(args, status) {
  persistPartial({ status });
  const output = await runWallwize(args);
  persistPartial({ status: output.split('\n')[0] || status, lastCommandOutput: output });
  return loadComputedState();
}

function removePlanFile() {
  removeFile(planPath);
}

function removeIndexFile() {
  removeFile(indexPath);
}

function removeFile(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // A stale file is less harmful than failing the user action.
  }
}

function resolveAppIconPath() {
  const candidates = [
    path.join(projectRoot, 'assets', 'icons', 'wallwize-windows-consistent.ico'),
    path.join(process.resourcesPath || '', 'assets', 'icons', 'wallwize-windows-consistent.ico'),
    path.join(__dirname, '..', 'public', 'assets', 'icons', 'wallwize-windows-consistent.ico'),
  ];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function createWindow() {
  const iconPath = resolveAppIconPath();
  const isMac = process.platform === 'darwin';
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    frame: isMac,
    ...(isMac ? { titleBarStyle: 'hiddenInset' } : {}),
    autoHideMenuBar: true,
    backgroundColor: '#141414',
    title: 'Wallwize 0.8',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

ipcMain.handle('wallwize:get-state', () => loadComputedState());

ipcMain.handle('wallwize:window-command', (event, command) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (command === 'minimize') win.minimize();
  if (command === 'maximize') {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
  if (command === 'close') win.close();
});

ipcMain.handle('wallwize:update-settings', (_event, settings) => {
  const patch = sanitizeSettingsPatch(settings);
  persistPartial({ settings: patch });
  syncPlanWithSettings(patch);
  return loadComputedState();
});

ipcMain.handle('wallwize:choose-folder', async (_event, kind) => {
  if (kind !== 'source' && kind !== 'output') {
    throw new Error('Unknown folder picker target.');
  }
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: kind === 'source' ? 'Choose wallpaper folder' : 'Choose output folder',
  });
  if (result.canceled || !result.filePaths[0]) return loadComputedState();
  const selectedFolder = result.filePaths[0];
  const patch = { [`${kind}Folder`]: selectedFolder };
  persistPartial({ settings: patch });
  if (kind === 'source') {
    removePlanFile();
    removeIndexFile();
    return runAndRefresh(
      ['scan', selectedFolder, '-o', indexPath],
      'Scanning selected wallpaper folder...'
    );
  }
  syncPlanWithSettings(patch);
  return loadComputedState();
});

ipcMain.handle('wallwize:scan', async () => {
  const { settings } = readPersistedState();
  if (!settings.sourceFolder) throw new Error('Choose a source folder first.');
  removePlanFile();
  removeIndexFile();
  return runAndRefresh(['scan', settings.sourceFolder, '-o', indexPath], 'Scanning wallpapers...');
});

ipcMain.handle('wallwize:plan', async () => {
  const { settings } = readPersistedState();
  if (!fs.existsSync(indexPath)) throw new Error('Choose a wallpaper folder before categorizing.');
  removePlanFile();
  const args = [
    'plan',
    indexPath,
    settings.outputFolder,
    '-o',
    planPath,
    '--mode',
    settings.mode,
    '--oled-black-threshold',
    String(settings.oledBlackThreshold),
    '--discovery-min-count',
    String(settings.discoveryMinCount),
    '--vision-profile',
    settings.visionProfile,
    '--vision-min-confidence',
    String(settings.visionMinConfidence),
    '--vision-cache-dir',
    modelCacheDir,
  ];
  if (settings.visionLocalOnly) args.push('--vision-local-only');
  return runAndRefresh(args, 'Categorizing wallpapers...');
});

ipcMain.handle('wallwize:apply', async () => {
  const { settings } = readPersistedState();
  if (!fs.existsSync(planPath)) throw new Error('Categorize wallpapers before organizing them.');
  return runAndRefresh(
    ['apply', planPath, '--execute', '--on-conflict', settings.conflict],
    'Organizing wallpapers...'
  );
});

ipcMain.handle('wallwize:open-path', async (_event, targetPath) => {
  if (typeof targetPath !== 'string' || !targetPath.trim()) return;
  const resolvedPath = path.resolve(targetPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Path does not exist: ${resolvedPath}`);
  }
  await shell.openPath(resolvedPath);
});

ipcMain.handle('wallwize:get-thumbnail', async (_event, primaryPath, fallbackPath, thumbnailKey) => {
  return thumbnailForImage(primaryPath, fallbackPath, thumbnailKey);
});

ipcMain.handle('wallwize:approve-wallpaper', async (_event, primaryPath, fallbackPath, destination, operation) => {
  await approveOneWallpaper(primaryPath, fallbackPath, destination, operation);
  markWallpapersApproved([primaryPath]);
  return loadComputedState();
});

ipcMain.handle('wallwize:approve-wallpapers', async (_event, paths) => {
  return approveSelectedWallpapers(paths);
});

ipcMain.handle('wallwize:add-category', (_event, categoryName) => {
  const category = appendManualCategory(categoryName);
  persistPartial({ status: `Added category ${category}.` });
  return loadComputedState();
});

ipcMain.handle('wallwize:assign-category', (_event, paths, categoryName) => {
  return assignCategoryToWallpapers(paths, categoryName);
});

ipcMain.handle('wallwize:ignore-wallpapers', (_event, paths) => {
  return ignoreWallpapers(paths);
});

ipcMain.handle('wallwize:retarget-plan', () => {
  const { settings } = readPersistedState();
  syncPlanWithSettings({ outputFolder: settings.outputFolder, mode: settings.mode });
  return loadComputedState();
});

ipcMain.handle('wallwize:set-desktop-wallpaper', async (_event, primaryPath, fallbackPath) => {
  const targetPath = existingWallpaperPath(primaryPath, fallbackPath);
  if (!targetPath) {
    throw new Error('Wallpaper file was not found. If you moved files, rescan and categorize again.');
  }
  const output = await setDesktopWallpaper(targetPath);
  persistPartial({
    status: `Desktop wallpaper applied: ${path.basename(targetPath)}`,
    lastCommandOutput: output,
  });
  return loadComputedState();
});

app.whenReady().then(() => {
  ensureDirs();
  if (process.platform === 'win32') {
    app.setAppUserModelId('app.wallwize.desktop');
    Menu.setApplicationMenu(null);
  } else if (process.platform === 'darwin') {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { role: 'appMenu' },
        { role: 'fileMenu' },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
      ])
    );
  }
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
