import { Brain, Copy, FolderOpen, Grid3x3, ListChecks, Settings, type LucideIcon } from 'lucide-react';
import { ActiveView } from '../types';

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  stats: {
    library: number;
    reviewQueue: number;
    categories: number;
    duplicates: number;
  };
}

export function Sidebar({ activeView, onViewChange, stats }: SidebarProps) {
  const navItems: Array<{
    id: ActiveView;
    label: string;
    icon: LucideIcon;
    count?: number;
  }> = [
    { id: 'library',    label: 'Library',      icon: FolderOpen,  count: stats.library },
    { id: 'review',     label: 'Review Queue', icon: ListChecks,  count: stats.reviewQueue },
    { id: 'categories', label: 'Categories',   icon: Grid3x3,     count: stats.categories },
    { id: 'duplicates', label: 'Duplicates',   icon: Copy,        count: stats.duplicates },
    { id: 'ai',         label: 'AI Analysis',  icon: Brain },
    { id: 'settings',   label: 'Settings',     icon: Settings },
  ];

  return (
    <div
      className="flex w-[220px] shrink-0 flex-col"
      style={{
        background: 'var(--w-bg-surface)',
        borderRight: '1px solid var(--w-border-default)',
      }}
    >
      <nav className="flex-1 space-y-[2px] px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`ww-nav-item w-full flex items-center justify-between px-3 py-[7px] text-left ${
                isActive ? 'ww-nav-active' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`ww-nav-icon size-[17px] shrink-0 transition-colors ${
                    isActive ? '' : 'opacity-75'
                  }`}
                  style={isActive ? { color: 'var(--w-iris-bright)' } : undefined}
                />
                <span className="text-[13px] font-medium">{item.label}</span>
              </div>

              {item.count !== undefined && item.count > 0 && (
                <span
                  className="rounded-full px-2 py-px text-[11px] font-semibold tabular-nums"
                  style={{
                    background: isActive ? 'var(--w-iris-tint)' : 'var(--w-bg-interactive)',
                    color: isActive ? 'var(--w-iris-bright)' : 'var(--w-text-40)',
                    border: '1px solid',
                    borderColor: isActive ? 'rgba(99,102,241,0.2)' : 'var(--w-border-default)',
                  }}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer status */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid var(--w-border-faint)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="size-[7px] rounded-full"
            style={{ background: 'var(--w-emerald)', boxShadow: '0 0 4px var(--w-emerald)' }}
          />
          <span className="text-[11px] font-medium" style={{ color: 'var(--w-text-70)' }}>
            Local processing only
          </span>
        </div>
        <div className="text-[11px]" style={{ color: 'var(--w-text-40)' }}>
          v0.8.0 · Privacy-first
        </div>
      </div>
    </div>
  );
}
