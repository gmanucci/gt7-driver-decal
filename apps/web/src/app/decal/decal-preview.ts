import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import type { GeneratedDecal } from '@gt7/core';

type Background = 'checker' | 'dark' | 'light';

@Component({
  selector: 'app-decal-preview',
  host: { class: 'panel block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between pb-3">
      <h2 class="panel-title">Preview</h2>
      <div class="flex gap-1" role="group" aria-label="Preview background">
        @for (option of backgrounds; track option) {
          <button
            type="button"
            class="font-display cursor-pointer rounded px-2 py-1 text-[0.65rem] uppercase tracking-widest transition-colors"
            [class]="
              background() === option
                ? 'bg-accent text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            "
            [attr.aria-pressed]="background() === option"
            (click)="background.set(option)"
          >
            {{ option }}
          </button>
        }
      </div>
    </div>
    <div
      class="flex min-h-44 items-center justify-center overflow-hidden rounded border border-zinc-800 p-4 transition-colors duration-300 md:min-h-56 md:p-8"
      [class]="backgroundClass()"
      [style.background-image]="background() === 'checker' ? checker : null"
      [style.background-size]="background() === 'checker' ? '20px 20px' : null"
    >
      <!-- Re-keyed on each new SVG so the entry animation replays. -->
      @for (src of [url()]; track src) {
        <img [src]="src" alt="Decal preview" class="max-h-56 w-full animate-decal-in object-contain" data-testid="preview" />
      }
    </div>
  `,
})
export class DecalPreview {
  readonly decal = input.required<GeneratedDecal>();

  private readonly sanitizer = inject(DomSanitizer);
  protected readonly backgrounds: Background[] = ['checker', 'dark', 'light'];
  protected readonly background = signal<Background>('checker');
  protected readonly checker = 'conic-gradient(#e4e4e7 25%, #fafafa 0 50%, #e4e4e7 0 75%, #fafafa 0)';

  protected readonly backgroundClass = computed(
    () => ({ checker: 'bg-zinc-100', dark: 'bg-zinc-950', light: 'bg-zinc-100' })[this.background()],
  );

  // The SVG is produced by our own engine from numeric path data only, never raw user text.
  protected readonly url = computed(() =>
    this.sanitizer.bypassSecurityTrustUrl(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(this.decal().svg)}`,
    ),
  );
}
