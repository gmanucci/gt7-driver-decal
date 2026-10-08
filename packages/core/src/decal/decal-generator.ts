import { DefaultDecalComposer, type DecalComposer } from '../composition/decal-composer';
import type { DecalLayout } from '../composition/decal-layout';
import { builtInLayouts } from '../composition/layouts';
import { UnknownLayoutError } from '../errors';
import type { FlagService } from '../flags/flag-service';
import type { FontService } from '../fonts/font-service';
import { DefaultNameFormatter, type NameFormatter } from '../names/name-formatter';
import { DefaultSvgOptimizer, type SvgOptimizer } from '../svg/svg-optimizer';
import { DefaultSvgRenderer, type SvgRenderer } from '../svg/svg-renderer';
import { DefaultSvgSizeValidator, type SvgSizeValidator } from '../svg/svg-size-validator';
import type { DecalRequest, GeneratedDecal } from './decal';

export const DEFAULT_CANVAS_WIDTH = 500;
export const DEFAULT_CANVAS_HEIGHT = 120;
const DEFAULT_PADDING = 8;
const DEFAULT_GAP = 20;

export interface DecalGenerator {
  generate(request: DecalRequest): GeneratedDecal;
}

export interface DecalGeneratorDependencies {
  flags: FlagService;
  fonts: FontService;
  layouts?: readonly DecalLayout[];
  nameFormatter?: NameFormatter;
  composer?: DecalComposer;
  renderer?: SvgRenderer;
  optimizer?: SvgOptimizer;
  validator?: SvgSizeValidator;
}

/**
 * The single entry point UIs should depend on. Pure and deterministic:
 * the same request always yields the same SVG.
 */
export class DefaultDecalGenerator implements DecalGenerator {
  private readonly flags: FlagService;
  private readonly fonts: FontService;
  private readonly layouts: Map<string, DecalLayout>;
  private readonly nameFormatter: NameFormatter;
  private readonly composer: DecalComposer;
  private readonly renderer: SvgRenderer;
  private readonly optimizer: SvgOptimizer;
  private readonly validator: SvgSizeValidator;

  constructor(dependencies: DecalGeneratorDependencies) {
    this.flags = dependencies.flags;
    this.fonts = dependencies.fonts;
    this.layouts = new Map(
      (dependencies.layouts ?? builtInLayouts).map((layout) => [layout.id, layout]),
    );
    this.nameFormatter = dependencies.nameFormatter ?? new DefaultNameFormatter();
    this.composer = dependencies.composer ?? new DefaultDecalComposer();
    this.renderer = dependencies.renderer ?? new DefaultSvgRenderer();
    this.optimizer = dependencies.optimizer ?? new DefaultSvgOptimizer();
    this.validator = dependencies.validator ?? new DefaultSvgSizeValidator();
  }

  getLayouts(): DecalLayout[] {
    return [...this.layouts.values()];
  }

  generate(request: DecalRequest): GeneratedDecal {
    const layout = this.layouts.get(request.layout);
    if (!layout) {
      throw new UnknownLayoutError(request.layout);
    }

    const font = this.fonts.get(request.font);
    const flag = request.country ? this.flags.get(request.country) : undefined;
    const text = this.nameFormatter.format(request.name, request.nameMode);
    const glyphs = this.fonts.generate(text, font);

    const composed = this.composer.compose({
      flag,
      glyphs,
      layout,
      width: request.width ?? DEFAULT_CANVAS_WIDTH,
      height: request.height ?? DEFAULT_CANVAS_HEIGHT,
      gap: request.gap ?? DEFAULT_GAP,
      alignment: request.alignment ?? 'center',
      padding: DEFAULT_PADDING,
    });

    const svg = this.optimizer.optimize(this.renderer.render(composed));
    const report = this.validator.validate(svg);

    return {
      svg,
      width: composed.width,
      height: composed.height,
      sizeBytes: report.bytes,
      valid: report.valid,
      status: report.status,
      maxBytes: report.maxBytes,
      targetBytes: report.targetBytes,
      text,
      missingCharacters: glyphs.missing,
    };
  }
}
