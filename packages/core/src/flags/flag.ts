import type { SvgElement } from '../svg/svg-element';

export interface Flag {
  /** ISO 3166-1 alpha-2 code, upper case. */
  countryCode: string;
  name: string;
  /** Native coordinate space of `elements`. */
  width: number;
  height: number;
  elements: SvgElement[];
}
