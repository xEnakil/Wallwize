import { useEffect, useMemo, useState } from 'react';
import { MaterialSymbol } from '../material/components';
import { WallpaperItem } from '../types';

const thumbnailCache = new Map<string, string>();
const thumbnailRequests = new Map<string, Promise<string>>();

function thumbnailId(wallpaper: WallpaperItem) {
  return wallpaper.thumbnailKey || wallpaper.absolutePath;
}

function getKnownThumbnail(wallpaper: WallpaperItem) {
  const id = thumbnailId(wallpaper);
  return thumbnailCache.get(id) || wallpaper.preview || '';
}

function requestThumbnail(wallpaper: WallpaperItem) {
  const id = thumbnailId(wallpaper);
  const known = getKnownThumbnail(wallpaper);
  if (known) return Promise.resolve(known);
  if (thumbnailRequests.has(id)) return thumbnailRequests.get(id)!;

  const request = window.wallwize!
    .getThumbnail(wallpaper.absolutePath, wallpaper.destination, wallpaper.thumbnailKey)
    .then((url) => {
      if (url) thumbnailCache.set(id, url);
      return url;
    })
    .finally(() => {
      thumbnailRequests.delete(id);
    });

  thumbnailRequests.set(id, request);
  return request;
}

interface WallpaperThumbnailProps {
  wallpaper: WallpaperItem;
  className?: string;
  defer?: boolean;
}

export function WallpaperThumbnail({
  wallpaper,
  className = '',
  defer = false,
}: WallpaperThumbnailProps) {
  const id = useMemo(() => thumbnailId(wallpaper), [wallpaper]);
  const [url, setUrl] = useState(() => getKnownThumbnail(wallpaper));

  useEffect(() => {
    const known = getKnownThumbnail(wallpaper);
    if (known) {
      setUrl(known);
      return;
    }

    setUrl('');
    if (defer || !window.wallwize) return;

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      requestThumbnail(wallpaper)
        .then((nextUrl) => {
          if (!cancelled) setUrl(nextUrl);
        })
        .catch(() => {
          if (!cancelled) setUrl('');
        });
    }, 40);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [defer, id, wallpaper]);

  if (!url) {
    return (
      <div
        className={`grid place-items-center ${className}`}
        style={{
          background: 'var(--md-sys-color-surface-container-highest)',
          color: 'var(--md-sys-color-outline)',
        }}
      >
        <MaterialSymbol opticalSize={40}>broken_image</MaterialSymbol>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={wallpaper.category}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={className}
    />
  );
}
