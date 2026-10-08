import { DefaultNameFormatter } from '@gt7/core';

describe('@gt7/core workspace wiring', () => {
  it('is importable from the Angular app', () => {
    expect(new DefaultNameFormatter().format('Guilherme Manucci', 'initial-last')).toBe('G MANUCCI');
  });
});
