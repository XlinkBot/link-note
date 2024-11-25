import { Placement } from 'tippy.js';

export type { Placement } from 'tippy.js'
export interface TippyOptions {
  duration: number;
  placement: Placement;
  interactive: boolean;
  offset: [number, number];
  getReferenceClientRect: () => ClientRect;
}