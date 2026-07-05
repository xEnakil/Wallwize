import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { MdFilledButton as MdFilledButtonElement } from '@material/web/button/filled-button.js';
import { MdFilledTonalButton as MdFilledTonalButtonElement } from '@material/web/button/filled-tonal-button.js';
import { MdOutlinedButton as MdOutlinedButtonElement } from '@material/web/button/outlined-button.js';
import { MdTextButton as MdTextButtonElement } from '@material/web/button/text-button.js';
import { MdAssistChip as MdAssistChipElement } from '@material/web/chips/assist-chip.js';
import { MdFilterChip as MdFilterChipElement } from '@material/web/chips/filter-chip.js';
import { MdFilledTonalIconButton as MdFilledTonalIconButtonElement } from '@material/web/iconbutton/filled-tonal-icon-button.js';
import { MdIconButton as MdIconButtonElement } from '@material/web/iconbutton/icon-button.js';
import { MdLinearProgress as MdLinearProgressElement } from '@material/web/progress/linear-progress.js';
import { MdCheckbox as MdCheckboxElement } from '@material/web/checkbox/checkbox.js';
import { MdSwitch as MdSwitchElement } from '@material/web/switch/switch.js';
import { MdSlider as MdSliderElement } from '@material/web/slider/slider.js';

const clickEvents = {
  onClick: 'click' as EventName<MouseEvent>,
};

const selectionEvents = {
  onInput: 'input' as EventName<InputEvent>,
  onChange: 'change' as EventName<Event>,
};

/** High-emphasis action. Keep to one clear primary action per surface. */
export const MdFilledButton = createComponent({
  tagName: 'md-filled-button',
  elementClass: MdFilledButtonElement,
  react: React,
  events: clickEvents,
  displayName: 'MdFilledButton',
});

/** Medium-emphasis action on a secondary-container surface. */
export const MdFilledTonalButton = createComponent({
  tagName: 'md-filled-tonal-button',
  elementClass: MdFilledTonalButtonElement,
  react: React,
  events: clickEvents,
  displayName: 'MdFilledTonalButton',
});

/** Medium-emphasis action with a visible boundary. */
export const MdOutlinedButton = createComponent({
  tagName: 'md-outlined-button',
  elementClass: MdOutlinedButtonElement,
  react: React,
  events: clickEvents,
  displayName: 'MdOutlinedButton',
});

/** Low-emphasis inline action. */
export const MdTextButton = createComponent({
  tagName: 'md-text-button',
  elementClass: MdTextButtonElement,
  react: React,
  events: clickEvents,
  displayName: 'MdTextButton',
});

export const MdAssistChip = createComponent({
  tagName: 'md-assist-chip',
  elementClass: MdAssistChipElement,
  react: React,
  events: clickEvents,
  displayName: 'MdAssistChip',
});

export const MdFilterChip = createComponent({
  tagName: 'md-filter-chip',
  elementClass: MdFilterChipElement,
  react: React,
  events: {
    ...clickEvents,
    onRemove: 'remove' as EventName<Event>,
  },
  displayName: 'MdFilterChip',
});

export const MdIconButton = createComponent({
  tagName: 'md-icon-button',
  elementClass: MdIconButtonElement,
  react: React,
  events: {
    ...clickEvents,
    ...selectionEvents,
  },
  displayName: 'MdIconButton',
});

export const MdFilledTonalIconButton = createComponent({
  tagName: 'md-filled-tonal-icon-button',
  elementClass: MdFilledTonalIconButtonElement,
  react: React,
  events: {
    ...clickEvents,
    ...selectionEvents,
  },
  displayName: 'MdFilledTonalIconButton',
});

export const MdLinearProgress = createComponent({
  tagName: 'md-linear-progress',
  elementClass: MdLinearProgressElement,
  react: React,
  displayName: 'MdLinearProgress',
});

export const MdCheckbox = createComponent({
  tagName: 'md-checkbox',
  elementClass: MdCheckboxElement,
  react: React,
  events: selectionEvents,
  displayName: 'MdCheckbox',
});

export const MdSwitch = createComponent({
  tagName: 'md-switch',
  elementClass: MdSwitchElement,
  react: React,
  events: selectionEvents,
  displayName: 'MdSwitch',
});

export const MdSlider = createComponent({
  tagName: 'md-slider',
  elementClass: MdSliderElement,
  react: React,
  events: selectionEvents,
  displayName: 'MdSlider',
});

export type MaterialSymbolProps = Omit<React.ComponentPropsWithoutRef<'span'>, 'children'> & {
  /** Material Symbols ligature, for example `folder_open`. */
  children: string;
  fill?: boolean;
  grade?: -25 | 0 | 200;
  opticalSize?: 20 | 24 | 40 | 48;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
};

/** Locally bundled Material Symbols Rounded glyph with variable-axis controls. */
export const MaterialSymbol = React.forwardRef<HTMLSpanElement, MaterialSymbolProps>(
  function MaterialSymbol(
    {
      children,
      className = '',
      fill = false,
      grade = 0,
      opticalSize = 24,
      style,
      weight = 400,
      ...props
    },
    ref,
  ) {
    return (
      <span
        {...props}
        ref={ref}
        className={`material-symbols-rounded ${className}`.trim()}
        style={{
          fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`,
          ...style,
        }}
      >
        {children}
      </span>
    );
  },
);
