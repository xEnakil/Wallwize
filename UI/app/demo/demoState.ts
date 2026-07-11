import type {
  CategorySummary,
  ClassificationSource,
  WallpaperItem,
  WallwizeAppState,
} from '../types';

const image = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?w=960&h=540&fit=crop&auto=format&q=85`;

const DEMO_IMAGES = [
  image('photo-1601042879364-f3947d3f9c16'),
  image('photo-1502134249126-9f3755a50d78'),
  image('photo-1462331940025-496dfbfc7564'),
  image('photo-1506905925346-21bda4d32df4'),
  image('photo-1441974231531-c6227db76b6e'),
  image('photo-1567016376408-0226e4d0c1ea'),
  image('photo-1604871000636-074fa5117945'),
  image('photo-1557683316-973673baf926'),
  image('photo-1557515126-1bf9ada5cb93'),
  image('photo-1676594037920-a12bab344687'),
  image('photo-1470071459604-3b5ec3a7fe05'),
  image('photo-1483366774565-c783b9f70e2c'),
  image('photo-1563863251222-11d3e3bd3b62'),
  image('photo-1594972648683-4482b577ff9a'),
  image('photo-1419242902214-272b3f66ee7a'),
  image('photo-1683221704109-acdeb0883037'),
] as const;

interface DemoWallpaperOptions {
  id: number;
  filename: string;
  category: string;
  confidence: number;
  source: ClassificationSource;
  colors: string[];
  blackPixels: number;
  darkScore: number;
  tags: string[];
  reason: string;
  candidates?: WallpaperItem['aiCandidates'];
  warnings?: string[];
}

function demoWallpaper(options: DemoWallpaperOptions): WallpaperItem {
  const sourcePath = `D:\\Wallpapers\\${options.filename}`;
  const categoryFolder = options.category === 'Needs Review' ? 'Review' : options.category;

  return {
    id: `demo-${options.id}`,
    preview: DEMO_IMAGES[options.id - 1],
    thumbnailKey: `demo-thumbnail-${options.id}`,
    absolutePath: sourcePath,
    destination: `D:\\Wallwize Organized\\${categoryFolder}\\${options.filename}`,
    operation: 'copy',
    category: options.category,
    confidence: options.confidence,
    source: options.source,
    resolution: options.id % 5 === 0 ? '5120 x 2880' : '3840 x 2160',
    aspectRatio: 'Widescreen 16:9',
    dominantColors: options.colors,
    blackPixels: options.blackPixels,
    darkScore: options.darkScore,
    aiCandidates: options.candidates ?? [],
    filename: options.filename,
    relativePath: options.filename,
    sizeBytes: (2_450_000 + options.id * 173_000),
    reason: options.reason,
    warnings: options.warnings ?? [],
    tags: options.tags,
  };
}

export const demoWallpapers: WallpaperItem[] = [
  demoWallpaper({
    id: 1,
    filename: 'cyberpunk_tokyo_rain_4k.png',
    category: 'Cyberpunk',
    confidence: 94,
    source: 'AI Vision',
    colors: ['#080C18', '#284B78', '#F04462'],
    blackPixels: 41,
    darkScore: 88,
    tags: ['cyberpunk', 'rain', 'city', 'neon'],
    reason: 'Local AI and the filename both match Cyberpunk.',
    candidates: [
      { category: 'Cyberpunk', confidence: 94 },
      { category: 'Cities', confidence: 71 },
      { category: 'Sci-Fi', confidence: 62 },
    ],
  }),
  demoWallpaper({
    id: 2,
    filename: 'orion_dust_cloud.jpg',
    category: 'Space',
    confidence: 92,
    source: 'AI Vision',
    colors: ['#050A12', '#334C63', '#E9B45F'],
    blackPixels: 33,
    darkScore: 81,
    tags: ['space', 'nebula', 'stars'],
    reason: 'The local model found a nebula and star field.',
  }),
  demoWallpaper({
    id: 3,
    filename: 'deep_space_blue_5k.png',
    category: 'Space',
    confidence: 88,
    source: 'Filename',
    colors: ['#02040B', '#142B57', '#8D9FE9'],
    blackPixels: 46,
    darkScore: 91,
    tags: ['space', 'blue', 'oled'],
    reason: 'The filename strongly matches the Space rule.',
  }),
  demoWallpaper({
    id: 4,
    filename: 'alpine_morning_mist.jpg',
    category: 'Nature',
    confidence: 93,
    source: 'AI Vision',
    colors: ['#E0E4DB', '#6C7C65', '#304B40'],
    blackPixels: 2,
    darkScore: 27,
    tags: ['nature', 'mountains', 'mist'],
    reason: 'Mountains, trees, and fog all match Nature.',
  }),
  demoWallpaper({
    id: 5,
    filename: 'forest_trail_soft_light.jpg',
    category: 'Nature',
    confidence: 86,
    source: 'Filename',
    colors: ['#17281C', '#45633C', '#B1BA83'],
    blackPixels: 18,
    darkScore: 61,
    tags: ['nature', 'forest', 'green'],
    reason: 'The filename matches the Forest and Nature rules.',
  }),
  demoWallpaper({
    id: 6,
    filename: 'white_architecture_curves.png',
    category: 'Minimalism',
    confidence: 89,
    source: 'AI Vision',
    colors: ['#F2F0EC', '#D2D0CB', '#7C7D7A'],
    blackPixels: 0,
    darkScore: 8,
    tags: ['minimal', 'architecture', 'white'],
    reason: 'Clean geometry and a limited palette match Minimalism.',
  }),
  demoWallpaper({
    id: 7,
    filename: 'liquid_marble_orange_blue.jpg',
    category: 'Abstract',
    confidence: 84,
    source: 'Discovery',
    colors: ['#E76C3D', '#183B67', '#EAC8A4'],
    blackPixels: 4,
    darkScore: 45,
    tags: ['abstract', 'liquid', 'marble'],
    reason: 'This matches a discovered Abstract grouping in the source folder.',
  }),
  demoWallpaper({
    id: 8,
    filename: 'black_violet_flow_oled.png',
    category: 'OLED',
    confidence: 99,
    source: 'OLED Rule',
    colors: ['#000000', '#27105B', '#8C5CFF'],
    blackPixels: 62,
    darkScore: 97,
    tags: ['oled', 'black', 'violet', 'abstract'],
    reason: 'Pure-black pixels exceed the 35% OLED threshold.',
  }),
  demoWallpaper({
    id: 9,
    filename: 'neon_alley_night.jpg',
    category: 'Cyberpunk',
    confidence: 82,
    source: 'Filename',
    colors: ['#070B1D', '#182B67', '#B72894'],
    blackPixels: 37,
    darkScore: 84,
    tags: ['city', 'neon', 'night'],
    reason: 'Filename and dark-neon image signals agree.',
  }),
  demoWallpaper({
    id: 10,
    filename: 'aurora_gradient_fold.png',
    category: 'Abstract',
    confidence: 78,
    source: 'AI Vision',
    colors: ['#0B214E', '#6F44D5', '#F44E8A'],
    blackPixels: 12,
    darkScore: 54,
    tags: ['abstract', 'gradient', 'color'],
    reason: 'The local model found a non-representational gradient composition.',
  }),
  demoWallpaper({
    id: 11,
    filename: 'green_valley_clouds.jpg',
    category: 'Nature',
    confidence: 76,
    source: 'AI Vision',
    colors: ['#AFCCD0', '#617B4D', '#273F2B'],
    blackPixels: 7,
    darkScore: 39,
    tags: ['nature', 'valley', 'clouds'],
    reason: 'Landscape features match Nature.',
  }),
  demoWallpaper({
    id: 12,
    filename: 'concrete_gallery_room.jpg',
    category: 'Minimalism',
    confidence: 74,
    source: 'Filename',
    colors: ['#E5DED5', '#B3AAA0', '#3D3A37'],
    blackPixels: 5,
    darkScore: 31,
    tags: ['minimal', 'interior', 'neutral'],
    reason: 'The source folder and filename suggest Minimalism.',
  }),
  demoWallpaper({
    id: 13,
    filename: 'city_reflections_07.png',
    category: 'Needs Review',
    confidence: 63,
    source: 'AI Suggestion',
    colors: ['#090A13', '#684162', '#EF5468'],
    blackPixels: 31,
    darkScore: 76,
    tags: ['city', 'reflections', 'night'],
    reason: 'Cyberpunk and Cities are too close to decide automatically.',
    candidates: [
      { category: 'Cyberpunk', confidence: 68 },
      { category: 'Cities', confidence: 64 },
    ],
  }),
  demoWallpaper({
    id: 14,
    filename: 'untitled_color_study.png',
    category: 'Needs Review',
    confidence: 57,
    source: 'AI Suggestion',
    colors: ['#09110D', '#345D55', '#C05B61'],
    blackPixels: 38,
    darkScore: 73,
    tags: ['color', 'dark', 'texture'],
    reason: 'The image may be Abstract or OLED, but neither clears the confidence threshold.',
    candidates: [
      { category: 'Abstract', confidence: 61 },
      { category: 'OLED', confidence: 52 },
    ],
  }),
  demoWallpaper({
    id: 15,
    filename: 'stars_variant_copy.jpg',
    category: 'Needs Review',
    confidence: 46,
    source: 'AI Suggestion',
    colors: ['#03050C', '#1C2544', '#9EA7C0'],
    blackPixels: 52,
    darkScore: 94,
    tags: ['stars', 'dark', 'night'],
    reason: 'Space is likely, but this file also resembles another scanned image.',
    candidates: [
      { category: 'Space', confidence: 55 },
      { category: 'Abstract', confidence: 49 },
    ],
    warnings: ['Possible duplicate of deep_space_blue_5k.png'],
  }),
  demoWallpaper({
    id: 16,
    filename: 'fog_shapes_unknown.jpg',
    category: 'Needs Review',
    confidence: 39,
    source: 'AI Suggestion',
    colors: ['#CACCC6', '#747C74', '#3C423E'],
    blackPixels: 3,
    darkScore: 34,
    tags: ['fog', 'soft', 'monochrome'],
    reason: 'Nature and Minimalism candidates are both below the automatic threshold.',
    candidates: [
      { category: 'Nature', confidence: 48 },
      { category: 'Minimalism', confidence: 44 },
    ],
    warnings: ['Visually similar to alpine_morning_mist.jpg'],
  }),
];

export function summarizeDemoCategories(wallpapers: WallpaperItem[]): CategorySummary[] {
  const groups = new Map<string, WallpaperItem[]>();

  for (const wallpaper of wallpapers) {
    if (wallpaper.category === 'Ignored') continue;
    const group = groups.get(wallpaper.category) ?? [];
    group.push(wallpaper);
    groups.set(wallpaper.category, group);
  }

  return [...groups.entries()].map(([name, items]) => ({
    name,
    count: items.length,
    avgConfidence: Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / items.length),
    samples: items.slice(0, 3).map((item) => item.preview),
  }));
}

export function createDemoState(): WallwizeAppState {
  const wallpapers = demoWallpapers.map((wallpaper) => ({ ...wallpaper }));

  return {
    settings: {
      sourceFolder: 'D:\\Wallpapers',
      outputFolder: 'D:\\Wallwize Organized',
      mode: 'copy',
      conflict: 'skip',
      oledBlackThreshold: 35,
      discoveryMinCount: 2,
      visionProfile: 'balanced',
      visionMinConfidence: 0.72,
      visionLocalOnly: true,
    },
    stats: {
      library: wallpapers.length,
      reviewQueue: wallpapers.filter((item) => item.category === 'Needs Review' || item.confidence < 70).length,
      categories: 6,
      duplicates: 2,
      oled: wallpapers.filter((item) => item.category === 'OLED').length,
    },
    wallpapers,
    categories: summarizeDemoCategories(wallpapers),
    status: 'Plan ready · 4 wallpapers need review',
    indexPath: 'D:\\Wallpapers\\.wallwize\\index.json',
    planPath: 'D:\\Wallpapers\\.wallwize\\plan.json',
  };
}

export const demoState = createDemoState();
