import { motion } from 'motion/react';
import { springs } from '../material/motion';
import { usePrefersReducedMotion } from '../material/expressive';

interface TitleBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

type WindowCommand = 'minimize' | 'maximize' | 'close';

interface WindowControlProps {
  command: WindowCommand;
  icon: string;
  label: string;
  destructive?: boolean;
}

function WindowControl({ command, icon, label, destructive = false }: WindowControlProps) {
  const runCommand = () => {
    void window.wallwize?.windowCommand(command);
  };

  return (
    <button
      type="button"
      onClick={runCommand}
      aria-label={label}
      title={label}
      className={`grid h-full w-11 place-items-center text-[var(--md-sys-color-on-surface-variant)] transition-colors duration-150 ${
        destructive
          ? 'hover:bg-[var(--md-sys-color-error)] hover:text-[var(--md-sys-color-on-error)]'
          : 'hover:bg-[var(--md-sys-color-surface-container-highest)]'
      }`}
    >
      <span className="material-symbols-rounded text-[17px] leading-none" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}

export function TitleBar({ isDark, onToggleTheme }: TitleBarProps) {
  const reduced = usePrefersReducedMotion();

  return (
    <header
      className="wallwize-titlebar grid h-10 shrink-0 grid-cols-[auto_1fr_auto] items-center"
      style={{ background: 'transparent', color: 'var(--md-sys-color-on-surface)' }}
    >
      <div className="wallwize-titlebar-drag flex h-full items-center pl-5 pr-4">
        <span className="ww-wordmark select-none" aria-label="Wallwize">
          Wallwize
        </span>
      </div>

      <div className="wallwize-titlebar-drag h-full min-w-0" aria-hidden="true" />

      <div className="wallwize-window-controls flex h-full items-center">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Use light theme' : 'Use dark theme'}
          title={isDark ? 'Use light theme' : 'Use dark theme'}
          className="ww-icon-button mr-1 grid size-8 place-items-center overflow-hidden rounded-full"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          <motion.span
            key={isDark ? 'dark' : 'light'}
            initial={reduced ? false : { rotate: -90, scale: 0.4, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={springs.bouncy}
            className="material-symbols-rounded text-[18px] leading-none"
            aria-hidden="true"
          >
            {isDark ? 'light_mode' : 'dark_mode'}
          </motion.span>
        </button>

        <div className="mx-1 h-4 w-px" style={{ background: 'var(--md-sys-color-outline-variant)' }} aria-hidden="true" />

        <WindowControl command="minimize" icon="remove" label="Minimize" />
        <WindowControl command="maximize" icon="crop_square" label="Maximize or restore" />
        <WindowControl command="close" icon="close" label="Close" destructive />
      </div>
    </header>
  );
}
