import { TestBed } from '@angular/core/testing';
import { DecalPreview } from './decal-preview';
import { DecalService } from './decal.service';

function render() {
  const decal = TestBed.inject(DecalService).generate({
    country: 'NL',
    name: 'Max Verstappen',
    nameMode: 'full',
    font: 'orbitron',
    layout: 'horizontal',
  });
  const fixture = TestBed.createComponent(DecalPreview);
  fixture.componentRef.setInput('decal', decal);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const src = () => decodeURIComponent(el.querySelector('img')!.getAttribute('src')!);
  const choose = (label: string) => {
    [...el.querySelectorAll('button')].find((b) => b.textContent!.trim() === label)!.click();
    fixture.detectChanges();
  };
  return { src, choose };
}

describe('DecalPreview', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [DecalPreview] }));

  it('shows the plain SVG on light backgrounds', () => {
    const { src } = render();
    expect(src()).not.toContain('<svg fill="#fff"');
  });

  it('fills the text white on the dark background and restores it afterwards', () => {
    const { src, choose } = render();
    choose('dark');
    expect(src()).toContain('<svg fill="#fff" ');
    choose('light');
    expect(src()).not.toContain('<svg fill="#fff"');
  });
});
