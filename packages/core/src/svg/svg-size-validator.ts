export const GT7_MAX_BYTES = 15 * 1024;
/** Internal safety margin; sizes at or above this are flagged as low-margin. */
export const TARGET_BYTES = 12 * 1024;

export type SizeStatus = 'safe' | 'warning' | 'invalid';

export interface SizeReport {
  bytes: number;
  maxBytes: number;
  targetBytes: number;
  status: SizeStatus;
  /** True when the SVG fits GT7's limit (status is 'safe' or 'warning'). */
  valid: boolean;
  /** bytes / maxBytes, useful for progress bars; may exceed 1. */
  ratio: number;
}

export interface SvgSizeValidatorOptions {
  maxBytes?: number;
  targetBytes?: number;
}

/** UTF-8 byte length, which is what GT7 limits (not the JS string length). */
export function utf8ByteLength(svg: string): number {
  return new TextEncoder().encode(svg).length;
}

export interface SvgSizeValidator {
  validate(svg: string): SizeReport;
}

export class DefaultSvgSizeValidator implements SvgSizeValidator {
  private readonly maxBytes: number;
  private readonly targetBytes: number;

  constructor(options: SvgSizeValidatorOptions = {}) {
    this.maxBytes = options.maxBytes ?? GT7_MAX_BYTES;
    this.targetBytes = options.targetBytes ?? TARGET_BYTES;
  }

  validate(svg: string): SizeReport {
    const bytes = utf8ByteLength(svg);
    const status: SizeStatus =
      bytes > this.maxBytes ? 'invalid' : bytes >= this.targetBytes ? 'warning' : 'safe';

    return {
      bytes,
      maxBytes: this.maxBytes,
      targetBytes: this.targetBytes,
      status,
      valid: status !== 'invalid',
      ratio: bytes / this.maxBytes,
    };
  }
}
