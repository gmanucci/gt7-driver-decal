import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type PaperItem = any;

export interface PaperEnv {
  paper: any;
  PaperOffset: any;
  /** Parses SVG text into a DOM element Paper.js can import. */
  parseSvg(svg: string): Element;
}

/**
 * Paper.js's Node bootstrap needs the native `canvas` package. Providing a jsdom window as
 * `self` before it loads makes it use the browser code path, which is enough for pure geometry.
 */
export function createPaperEnv(): PaperEnv {
  const window = new JSDOM('<!doctype html>').window;
  (globalThis as any).self = window;

  const require = createRequire(import.meta.url);
  // Same module instance as paperjs-offset's `require('paper')`; separate instances break its instanceof checks.
  const paper = require('paper');
  paper.setup(new paper.Size(1, 1));
  const { PaperOffset } = require('paperjs-offset');

  return {
    paper,
    PaperOffset,
    parseSvg: (svg) =>
      new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document.documentElement,
  };
}
