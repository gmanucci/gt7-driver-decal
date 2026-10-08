import { TestBed } from '@angular/core/testing';
import { DecalGeneratorPage } from './decal-generator-page';

function setup() {
  const fixture = TestBed.createComponent(DecalGeneratorPage);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

function type(el: HTMLElement, testId: string, value: string) {
  const input = el.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('DecalGeneratorPage', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [DecalGeneratorPage] }));

  it('renders a preview and an enabled download for the default decal', () => {
    const { el } = setup();
    expect(el.querySelector('[data-testid="preview"]')).toBeTruthy();
    expect(el.querySelector<HTMLButtonElement>('[data-testid="download"]')!.disabled).toBe(false);
    expect(el.querySelector('[data-testid="size-label"]')?.textContent).toContain('/ 15 KB');
  });

  it('updates the size when the name changes', async () => {
    const { fixture, el } = setup();
    const before = el.querySelector('[data-testid="size-label"]')!.textContent;
    type(el, 'name', 'Alexander Zvyagintsev-Quixote');
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="size-label"]')!.textContent).not.toBe(before);
  });

  it('lists the available countries', () => {
    const { el } = setup();
    const options = el.querySelectorAll('[data-testid="country"] option');
    expect(options.length).toBeGreaterThan(150);
  });

  it('reports characters the font cannot draw', () => {
    const { fixture, el } = setup();
    type(el, 'name', 'Max ☃');
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="missing"]')?.textContent).toContain('☃');
  });
});
