import { Injectable } from '@angular/core';
import {
  DefaultDecalGenerator,
  type DecalLayout,
  type DecalRequest,
  type Flag,
  type FontDefinition,
  type GeneratedDecal,
} from '@gt7/core';
import { createFlagService, createFontService } from '@gt7/assets';

/** Thin Angular wrapper: all decal logic lives in @gt7/core. */
@Injectable({ providedIn: 'root' })
export class DecalService {
  private readonly flagService = createFlagService();
  private readonly fontService = createFontService();
  private readonly generator = new DefaultDecalGenerator({
    flags: this.flagService,
    fonts: this.fontService,
  });

  readonly flags: readonly Flag[] = this.flagService
    .getAll()
    .sort((a, b) => a.name.localeCompare(b.name));
  readonly fonts: readonly FontDefinition[] = this.fontService.getFonts();
  readonly layouts: readonly DecalLayout[] = this.generator.getLayouts();

  generate(request: DecalRequest): GeneratedDecal {
    return this.generator.generate(request);
  }
}
