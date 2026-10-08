export interface SvgRect {
  type: 'rect';
  x?: number;
  y?: number;
  width: number;
  height: number;
  fill: string;
}

export interface SvgCircle {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
  fill: string;
}

export interface SvgPath {
  type: 'path';
  d: string;
  fill: string;
}

/** Minimal vector primitives a flag may be built from. Fill-only: GT7 imports solid shapes. */
export type SvgElement = SvgRect | SvgCircle | SvgPath;
