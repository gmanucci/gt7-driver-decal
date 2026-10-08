import { TestBed } from '@angular/core/testing';
import { DecalService } from './decal.service';
import { FEATURED_DRIVERS, pickRandomDriver } from './featured-drivers';

describe('featured drivers', () => {
  const service = () => TestBed.inject(DecalService);

  it('has a flag for every driver', () => {
    const codes = new Set(service().flags.map((flag) => flag.countryCode));
    const missing = FEATURED_DRIVERS.filter((driver) => !codes.has(driver.country)).map((d) => d.name);
    expect(missing).toEqual([]);
  });

  it('renders every driver in every font and layout within 15 KB without missing glyphs', () => {
    const problems: string[] = [];
    for (const driver of FEATURED_DRIVERS) {
      for (const font of service().fonts) {
        for (const layout of service().layouts) {
          const decal = service().generate({
            country: driver.country,
            name: driver.name,
            nameMode: 'full',
            font: font.id,
            layout: layout.id,
          });
          if (!decal.valid) problems.push(`${driver.name}/${font.id}/${layout.id}: ${decal.sizeBytes} B`);
          if (decal.missingCharacters.length > 0) {
            problems.push(`${driver.name}/${font.id}: missing ${decal.missingCharacters.join('')}`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('picks deterministically from the injected random source', () => {
    const all = new Set(FEATURED_DRIVERS.map((driver) => driver.country));
    expect(pickRandomDriver(all, () => 0)).toBe(FEATURED_DRIVERS[0]);
    expect(pickRandomDriver(all, () => 0.999999)).toBe(FEATURED_DRIVERS[FEATURED_DRIVERS.length - 1]);
  });

  it('skips drivers whose flag is unavailable', () => {
    for (let i = 0; i < 50; i++) {
      expect(pickRandomDriver(new Set(['NL']), Math.random).country).toBe('NL');
    }
  });
});
