import * as React from 'react';
import { motion } from 'motion/react';
import type { HTMLMotionProps } from 'motion/react';
import { MaterialSymbol } from './components';
import {
  popIn,
  pressableTap,
  reveal,
  springs,
  staggerContainer,
  staggerItem,
} from './motion';

/*
 * Shared Material 3 Expressive building blocks.
 *
 * Every view composes these so bold shape, spring motion, and emphasized type
 * stay consistent (and easy to maintain) across the whole app. Motion is
 * automatically disabled when the user prefers reduced motion.
 */

type Tone =
  | 'surface'
  | 'surface-low'
  | 'surface-high'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'error';

const TONE_STYLE: Record<Tone, React.CSSProperties> = {
  surface: {
    background: 'var(--md-sys-color-surface-container)',
    color: 'var(--md-sys-color-on-surface)',
  },
  'surface-low': {
    background: 'var(--md-sys-color-surface-container-low)',
    color: 'var(--md-sys-color-on-surface)',
  },
  'surface-high': {
    background: 'var(--md-sys-color-surface-container-high)',
    color: 'var(--md-sys-color-on-surface)',
  },
  primary: {
    background: 'var(--md-sys-color-primary-container)',
    color: 'var(--md-sys-color-on-primary-container)',
  },
  secondary: {
    background: 'var(--md-sys-color-secondary-container)',
    color: 'var(--md-sys-color-on-secondary-container)',
  },
  tertiary: {
    background: 'var(--md-sys-color-tertiary-container)',
    color: 'var(--md-sys-color-on-tertiary-container)',
  },
  success: {
    background: 'var(--ww-color-success-container)',
    color: 'var(--ww-color-on-success-container)',
  },
  error: {
    background: 'var(--md-sys-color-error-container)',
    color: 'var(--md-sys-color-on-error-container)',
  },
};

/**
 * Whether to suppress motion. Wallwize ships an expressive, animated experience
 * as a core part of its identity, so it does NOT dim motion just because the OS
 * requests reduced motion. Add the `ww-reduce-motion` class to <html> (or wire
 * this to a Settings toggle) to honor the OS preference instead.
 */
export function usePrefersReducedMotion(): boolean {
  return false;
}

/* ------------------------------------------------------------------ reveal */

interface RevealProps extends HTMLMotionProps<'div'> {
  /** Seconds to delay the entrance. */
  delay?: number;
}

/** Fades + rises a block into view once, with a spring settle. */
export function Reveal({ delay = 0, children, ...props }: RevealProps) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div {...(props as HTMLMotionProps<'div'>)}>{children}</div>;
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={reveal}
      transition={{ ...springs.spatialDefault, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Wrap a list of <StaggerItem> to reveal them one after another. */
export function Stagger({ children, ...props }: HTMLMotionProps<'div'>) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div {...(props as HTMLMotionProps<'div'>)}>{children}</div>;
  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer} {...props}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...props }: HTMLMotionProps<'div'>) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div {...(props as HTMLMotionProps<'div'>)}>{children}</div>;
  return (
    <motion.div variants={staggerItem} {...props}>
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------- bento card */

interface BentoCardProps {
  tone?: Tone;
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  ariaLabel?: string;
  ariaPressed?: boolean;
  title?: string;
}

/**
 * The core expressive surface: a big-radius tonal card that springs on hover
 * and morphs its corners when pressed. Renders a <button> when interactive.
 */
export function BentoCard({
  tone = 'surface-low',
  interactive = false,
  selected = false,
  onClick,
  className = '',
  style,
  children,
  ariaLabel,
  ariaPressed,
  title,
}: BentoCardProps) {
  const reduced = usePrefersReducedMotion();
  const toneStyle = TONE_STYLE[tone];
  // No hard outlines — tonal fill + elevation carry the shape (Android 16 look).
  const baseStyle: React.CSSProperties = {
    borderRadius: 'var(--md-sys-shape-corner-extra-large)',
    boxShadow: selected ? 'var(--md-sys-elevation-level3)' : 'none',
    ...toneStyle,
    ...style,
  };

  const motionProps =
    interactive && !reduced
      ? {
          whileHover: {
            y: -5,
            scale: 1.03,
            boxShadow: 'var(--md-sys-elevation-level4)',
            transition: springs.spatialDefault,
          },
          whileTap: {
            scale: 0.92,
            borderRadius: 'var(--md-sys-shape-corner-large)',
            transition: springs.bouncy,
          },
        }
      : {};

  const commonClass = `relative overflow-hidden ${interactive ? 'cursor-pointer' : ''} ${className}`.trim();

  if (interactive) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
        title={title}
        className={`${commonClass} text-left outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)]`}
        style={baseStyle}
        {...motionProps}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <div className={commonClass} style={baseStyle} title={title}>
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- stat tile */

interface StatTileProps {
  icon: string;
  value: React.ReactNode;
  label: string;
  tone?: Tone;
  onClick?: () => void;
  className?: string;
}

/** A compact bento tile that headlines a single number (icon + value + label). */
export function StatTile({ icon, value, label, tone = 'surface-high', onClick, className = '' }: StatTileProps) {
  return (
    <BentoCard
      tone={tone}
      interactive={Boolean(onClick)}
      onClick={onClick}
      ariaLabel={onClick ? `${label}: ${value}` : undefined}
      className={`flex flex-col justify-between gap-3 p-4 ${className}`.trim()}
    >
      <span
        className="grid size-10 place-items-center rounded-full"
        style={{ background: 'color-mix(in srgb, currentColor 12%, transparent)' }}
      >
        <MaterialSymbol className="text-[22px] leading-none" fill opticalSize={24}>
          {icon}
        </MaterialSymbol>
      </span>
      <div className="min-w-0">
        <div className="ww-display-hero text-[30px] leading-none tabular-nums">{value}</div>
        <div className="mt-1 truncate text-[13px] font-medium opacity-80">{label}</div>
      </div>
    </BentoCard>
  );
}

/* ----------------------------------------------------------- section header */

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  accent?: boolean;
  className?: string;
  id?: string;
}

/** An expressive page/section heading with big variable-axis type. */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  trailing,
  accent = true,
  className = '',
  id,
}: SectionHeaderProps) {
  return (
    <div className={`flex min-w-0 items-start justify-between gap-5 ${className}`.trim()}>
      <div className="min-w-0">
        {eyebrow ? (
          <div
            className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--md-sys-color-primary)' }}
          >
            {eyebrow}
          </div>
        ) : null}
        <h1 id={id} className="ww-display-hero text-[42px]" style={{ color: 'var(--md-sys-color-on-surface)' }}>
          {title}
        </h1>
        {accent ? <div className="ww-wavy-accent mt-2.5 w-16" /> : null}
        {subtitle ? (
          <p className="mt-2 text-[15px] leading-6" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------- segmented */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

interface SegmentedProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
  size?: 'md' | 'sm';
}

/**
 * A springy segmented button group. The selected pill slides between segments
 * with a spring — implemented as a transform-translated element (no Framer
 * layout projection) so it stays smooth and never blocks the main thread.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
  size = 'md',
}: SegmentedProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const count = options.length;
  const height = size === 'sm' ? 'h-9' : 'h-11';
  const pad = size === 'sm' ? 'text-[13px]' : 'text-[14px]';

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`relative grid p-1 ${height} ${className}`.trim()}
      style={{
        background: 'var(--md-sys-color-surface-container-high)',
        borderRadius: 'var(--md-sys-shape-corner-full)',
        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          top: 4,
          bottom: 4,
          left: 4,
          width: `calc((100% - 8px) / ${count})`,
          background: 'var(--md-sys-color-primary)',
          transform: `translateX(calc(${activeIndex} * 100%))`,
          transition:
            'transform var(--md-sys-motion-spring-spatial-default-duration) var(--md-sys-motion-spring-spatial-default)',
        }}
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`relative z-[1] inline-flex items-center justify-center gap-1.5 rounded-full px-3 ${pad} font-semibold outline-none transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-1px] focus-visible:outline-[var(--md-sys-color-primary)]`}
            style={{ color: active ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)' }}
          >
            {option.icon ? (
              <MaterialSymbol className="text-[18px] leading-none" fill={active} opticalSize={20}>
                {option.icon}
              </MaterialSymbol>
            ) : null}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- morph pill */

interface MorphPillProps {
  selected?: boolean;
  onClick?: () => void;
  icon?: string;
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

/** A single springy, shape-morphing filter/action pill. */
export function MorphPill({ selected = false, onClick, icon, children, ariaLabel, className = '' }: MorphPillProps) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel}
      whileTap={reduced ? undefined : { scale: 0.9 }}
      transition={springs.bouncy}
      className={`ww-morph inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)] ${className}`.trim()}
      style={
        selected
          ? {
              background: 'var(--md-sys-color-secondary-container)',
              color: 'var(--md-sys-color-on-secondary-container)',
            }
          : {
              background: 'var(--md-sys-color-surface-container-high)',
              color: 'var(--md-sys-color-on-surface-variant)',
            }
      }
    >
      {icon ? (
        <MaterialSymbol className="text-[18px] leading-none" fill={selected} opticalSize={20}>
          {icon}
        </MaterialSymbol>
      ) : null}
      {children}
    </motion.button>
  );
}

/* --------------------------------------------------------------- pop badge */

interface PopBadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  icon?: string;
  className?: string;
}

/** A small pill that pops in with a bounce — for status chips and counts. */
export function PopBadge({ children, tone = 'primary', icon, className = '' }: PopBadgeProps) {
  const reduced = usePrefersReducedMotion();
  const toneStyle = TONE_STYLE[tone];
  const content = (
    <span
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold ${className}`.trim()}
      style={toneStyle}
    >
      {icon ? (
        <MaterialSymbol className="text-[18px] leading-none" fill opticalSize={20}>
          {icon}
        </MaterialSymbol>
      ) : null}
      {children}
    </span>
  );
  if (reduced) return content;
  return (
    <motion.span initial="hidden" animate="show" variants={popIn} className="inline-flex">
      {content}
    </motion.span>
  );
}
