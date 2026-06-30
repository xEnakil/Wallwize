import { Maximize2, Minus, Moon, Sun, X } from 'lucide-react';

interface TitleBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

const wallwizeSymbolSrc = './assets/icons/wallwize-symbol-transparent-consistent.svg';

export function TitleBar({ isDark, onToggleTheme }: TitleBarProps) {
  const runCommand = (command: 'minimize' | 'maximize' | 'close') => {
    void window.wallwize?.windowCommand(command);
  };

  return (
    <div
      className="wallwize-titlebar grid h-11 shrink-0 grid-cols-[auto_1fr_auto] items-center"
      style={{
        background: 'var(--w-bg-surface)',
        borderBottom: '1px solid var(--w-border-default)',
      }}
    >
      {/* Logo & wordmark */}
      <div className="wallwize-titlebar-drag flex h-full min-w-0 items-center gap-3 px-4">
        <div
          className="grid size-[26px] shrink-0 place-items-center rounded-lg text-white"
          style={{
            background: 'linear-gradient(135deg, var(--w-iris-dim) 0%, var(--w-iris-bright) 100%)',
            boxShadow: '0 2px 8px var(--w-iris-glow)',
          }}
        >
          <img
            src={wallwizeSymbolSrc}
            alt=""
            aria-hidden="true"
            className="size-[18px]"
            draggable={false}
          />
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className="text-[13px] font-semibold tracking-tight"
            style={{ color: 'var(--w-text-100)' }}
          >
            Wallwize
          </span>
          <span
            className="rounded px-1.5 py-px text-[10px] font-semibold"
            style={{
              color: 'var(--w-text-40)',
              background: 'var(--w-bg-interactive)',
              border: '1px solid var(--w-border-default)',
              letterSpacing: '0.03em',
            }}
          >
            0.8
          </span>
        </div>
      </div>

      <div className="wallwize-titlebar-drag h-full min-w-0" aria-hidden="true" />

      {/* Right side controls */}
      <div className="wallwize-window-controls flex h-full items-center">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="grid h-full w-10 place-items-center transition-all"
          style={{ color: 'var(--w-text-40)', opacity: 0.8 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--w-text-70)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--w-text-40)'; }}
        >
          {isDark
            ? <Sun className="size-[15px]" />
            : <Moon className="size-[15px]" />
          }
        </button>

        {/* Divider */}
        <div
          className="mx-1"
          style={{ width: 1, height: 16, background: 'var(--w-border-default)' }}
        />

        {/* Minimize */}
        <button
          type="button"
          aria-label="Minimize"
          onClick={() => runCommand('minimize')}
          className="grid h-full w-11 place-items-center transition-colors"
          style={{ color: 'var(--w-text-70)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--w-bg-interactive)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <Minus className="size-3.5" />
        </button>

        {/* Maximize */}
        <button
          type="button"
          aria-label="Maximize"
          onClick={() => runCommand('maximize')}
          className="grid h-full w-11 place-items-center transition-colors"
          style={{ color: 'var(--w-text-70)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--w-bg-interactive)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <Maximize2 className="size-3" />
        </button>

        {/* Close */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => runCommand('close')}
          className="grid h-full w-11 place-items-center transition-all"
          style={{ color: 'var(--w-text-70)' }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = 'var(--w-rose)';
            btn.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = 'transparent';
            btn.style.color = 'var(--w-text-70)';
          }}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
