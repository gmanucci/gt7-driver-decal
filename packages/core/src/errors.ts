export class UnknownFlagError extends Error {
  constructor(readonly countryCode: string) {
    super(`Unknown country code: "${countryCode}"`);
    this.name = 'UnknownFlagError';
  }
}

export class UnknownFontError extends Error {
  constructor(readonly fontId: string) {
    super(`Unknown font: "${fontId}"`);
    this.name = 'UnknownFontError';
  }
}

export class UnknownLayoutError extends Error {
  constructor(readonly layoutId: string) {
    super(`Unknown layout: "${layoutId}"`);
    this.name = 'UnknownLayoutError';
  }
}

export class InvalidFontError extends Error {
  constructor(message: string) {
    super(`Invalid font definition: ${message}`);
    this.name = 'InvalidFontError';
  }
}
