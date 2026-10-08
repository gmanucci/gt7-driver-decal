import {
  DefaultFlagService,
  DefaultFontService,
  InMemoryFlagRepository,
  parseFontDefinition,
  type Flag,
  type FontDefinition,
} from '@gt7/core';
import flagData from '../data/flags/flags.json';
import orbitron from '../data/fonts/orbitron/font.json';
import rajdhani from '../data/fonts/rajdhani/font.json';
import saira from '../data/fonts/saira/font.json';

export const builtInFlags: readonly Flag[] = flagData as unknown as Flag[];

export const builtInFonts: readonly FontDefinition[] = [orbitron, rajdhani, saira].map((font) =>
  parseFontDefinition(font),
);

export const createFlagService = () => new DefaultFlagService(new InMemoryFlagRepository(builtInFlags));

export const createFontService = () => new DefaultFontService(builtInFonts);
