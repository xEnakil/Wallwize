import { ActiveView, WallwizeStats } from '../types';

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  stats: WallwizeStats;
}

interface NavItem {
  id: ActiveView;
  label: string;
  icon: string;
  badgeKey?: 'reviewQueue' | 'duplicates';
}

const wallwizeSymbolSrc = './assets/icons/wallwize-symbol-transparent-consistent.svg';

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'library', label: 'Library', icon: 'photo_library' },
  { id: 'review', label: 'Review', icon: 'assignment_turned_in', badgeKey: 'reviewQueue' },
  { id: 'categories', label: 'Collections', icon: 'folder' },
  { id: 'duplicates', label: 'Duplicates', icon: 'filter_none', badgeKey: 'duplicates' },
  { id: 'ai', label: 'Rules & AI', icon: 'shield_with_heart' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
] as const;

// Item box height + vertical gap between items (gap-1.5 = 6px) -> slide stride.
const ITEM_HEIGHT = 62;
const ITEM_GAP = 6;
const ITEM_STRIDE = ITEM_HEIGHT + ITEM_GAP;

function formatBadge(count: number) {
  return count > 99 ? '99+' : String(count);
}

export function Sidebar({ activeView, onViewChange, stats }: SidebarProps) {
  const activeIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((item) => item.id === activeView),
  );

  return (
    <aside
      className="ww-navigation-rail flex w-[108px] shrink-0 flex-col items-center"
      style={{ background: 'var(--md-sys-color-surface-container-low)' }}
      aria-label="Primary navigation"
    >
      <div className="grid h-[92px] shrink-0 place-items-center" aria-label="Wallwize">
        <div
          className="ww-brand-mark grid size-14 place-items-center"
          style={{
            background: 'var(--md-sys-color-primary-container)',
            color: 'var(--md-sys-color-on-primary-container)',
            borderRadius: 'var(--md-sys-shape-corner-large-increased)',
            boxShadow: 'var(--md-sys-elevation-level1)',
          }}
        >
          <img src={wallwizeSymbolSrc} alt="" aria-hidden="true" draggable={false} className="size-9" />
        </div>
      </div>

      <nav className="relative flex min-h-0 flex-1 flex-col items-stretch gap-1.5 self-stretch px-3 py-1">
        {/* Sliding active pill — a transform-translated element with a spring
            transition. Avoids Framer layout projection (keeps the main thread free). */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 right-3 rounded-[22px]"
          style={{
            top: 4,
            height: ITEM_HEIGHT,
            background: 'var(--md-sys-color-secondary-container)',
            transform: `translateY(${activeIndex * ITEM_STRIDE}px)`,
            transition: `transform var(--md-sys-motion-spring-bouncy-soft-duration) var(--md-sys-motion-spring-bouncy-soft)`,
          }}
        />

        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          const count = item.badgeKey ? stats[item.badgeKey] : 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className="ww-nav-item-btn relative grid h-[62px] w-full place-items-center rounded-[22px] outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)]"
              style={{ color: isActive ? 'var(--md-sys-color-on-secondary-container)' : 'var(--md-sys-color-on-surface-variant)' }}
            >
              {!isActive && <span className="ww-nav-hover pointer-events-none absolute inset-0 rounded-[22px]" />}

              <span className="relative z-[1] grid place-items-center gap-1">
                <span
                  className="material-symbols-rounded leading-none"
                  aria-hidden="true"
                  style={{
                    fontSize: '25px',
                    transform: isActive ? 'scale(1.06)' : 'scale(1)',
                    transition: 'transform var(--md-sys-motion-spring-bouncy-duration) var(--md-sys-motion-spring-bouncy), font-variation-settings var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard)',
                    fontVariationSettings: `'FILL' ${isActive ? 1 : 0}, 'wght' ${isActive ? 500 : 400}, 'GRAD' 0, 'opsz' 24`,
                  }}
                >
                  {item.icon}
                </span>
                <span
                  className="max-w-full truncate text-[11px] leading-none tracking-[0.01em]"
                  style={{ fontWeight: isActive ? 700 : 500 }}
                >
                  {item.label}
                </span>
              </span>

              {count > 0 && (
                <span
                  className="ww-pop absolute right-2 top-1.5 z-[2] grid min-h-[19px] min-w-[19px] place-items-center rounded-full px-1 text-[10px] font-bold leading-none tabular-nums"
                  style={{
                    background: 'var(--md-sys-color-error)',
                    color: 'var(--md-sys-color-on-error)',
                    border: '2px solid var(--md-sys-color-surface-container-low)',
                  }}
                  aria-label={`${count} ${item.label.toLowerCase()} items`}
                >
                  {formatBadge(count)}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="grid h-[82px] shrink-0 place-items-center">
        <div
          className="ww-brand-mark relative grid size-12 place-items-center rounded-full"
          style={{
            background: 'var(--md-sys-color-tertiary-container)',
            color: 'var(--md-sys-color-on-tertiary-container)',
          }}
          title="Your images stay on this device"
          aria-label="Local processing only"
        >
          <span className="material-symbols-rounded text-[22px] leading-none" aria-hidden="true">
            shield_lock
          </span>
          <span
            className="absolute bottom-0 right-0 size-3 rounded-full"
            style={{
              background: 'var(--md-sys-color-tertiary)',
              border: '3px solid var(--md-sys-color-surface-container-low)',
            }}
            aria-hidden="true"
          />
        </div>
      </div>
    </aside>
  );
}
