import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { Alignment, DecalRequest, NameMode } from '@gt7/core';
import { DecalPreview } from './decal-preview';
import { DecalService } from './decal.service';
import { SizeIndicator } from './size-indicator';

const NAME_MODE_LABELS: Record<NameMode, string> = {
  full: 'Full name',
  'initial-last': 'Initial + last name',
  last: 'Last name',
  initial: 'Initials',
};

const ALIGNMENTS: readonly Alignment[] = ['left', 'center', 'right'];

@Component({
  selector: 'app-decal-generator-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecalPreview, SizeIndicator],
  template: `
    <main class="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:p-8">
      <form class="panel space-y-4 md:self-start" (submit)="$event.preventDefault()" aria-label="Decal settings">
        <h2 class="panel-title">Configuration</h2>

        <label class="block">
          <span class="field-label">Driver name</span>
          <input
            type="text"
            maxlength="40"
            autocomplete="off"
            class="field"
            [value]="name()"
            (input)="name.set($any($event.target).value)"
            data-testid="name"
          />
        </label>

        <label class="block">
          <span class="field-label">Name format</span>
          <select class="field" (change)="nameMode.set($any($event.target).value)">
            @for (mode of nameModes; track mode.id) {
              <option [value]="mode.id" [selected]="mode.id === nameMode()">{{ mode.label }}</option>
            }
          </select>
        </label>

        <label class="block">
          <span class="field-label">Country</span>
          <select class="field" (change)="country.set($any($event.target).value)" data-testid="country">
            <option value="" [selected]="country() === ''">No flag</option>
            @for (flag of service.flags; track flag.countryCode) {
              <option [value]="flag.countryCode" [selected]="flag.countryCode === country()">
                {{ flag.name }}
              </option>
            }
          </select>
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="field-label">Font</span>
            <select class="field" (change)="font.set($any($event.target).value)">
              @for (item of service.fonts; track item.id) {
                <option [value]="item.id" [selected]="item.id === font()">{{ item.name }}</option>
              }
            </select>
          </label>

          <label class="block">
            <span class="field-label">Align</span>
            <select class="field capitalize" (change)="alignment.set($any($event.target).value)">
              @for (item of alignments; track item) {
                <option [value]="item" [selected]="item === alignment()">{{ item }}</option>
              }
            </select>
          </label>
        </div>

        <label class="block">
          <span class="field-label">Layout</span>
          <select class="field" (change)="layout.set($any($event.target).value)">
            @for (item of service.layouts; track item.id) {
              <option [value]="item.id" [selected]="item.id === layout()">{{ item.name }}</option>
            }
          </select>
        </label>
      </form>

      <section class="order-first space-y-4 md:order-none">
        @if (result(); as r) {
          @if (r.decal; as decal) {
            <app-decal-preview [decal]="decal" />
            <app-size-indicator [decal]="decal" />

            @if (decal.missingCharacters.length > 0) {
              <p class="text-sm text-amber-400" role="status" data-testid="missing">
                This font can't draw: {{ decal.missingCharacters.join(' ') }}
              </p>
            }

            <div class="flex flex-wrap gap-3">
              <button type="button" class="btn-primary" [disabled]="!decal.valid" (click)="download(decal.svg)" data-testid="download">
                Download SVG
              </button>
              <button type="button" class="btn-secondary" [disabled]="!decal.valid" (click)="copy(decal.svg)">
                {{ copied() ? 'Copied!' : 'Copy SVG' }}
              </button>
            </div>
          } @else {
            <p class="text-red-400" role="alert">{{ r.error }}</p>
          }
        }
      </section>
    </main>
  `,
})
export class DecalGeneratorPage {
  protected readonly service = inject(DecalService);
  protected readonly alignments = ALIGNMENTS;
  protected readonly nameModes = (Object.keys(NAME_MODE_LABELS) as NameMode[]).map((id) => ({
    id,
    label: NAME_MODE_LABELS[id],
  }));

  protected readonly name = signal('Max Verstappen');
  protected readonly nameMode = signal<NameMode>('full');
  protected readonly country = signal('NL');
  protected readonly font = signal(this.service.fonts[0]?.id ?? '');
  protected readonly layout = signal(this.service.layouts[0]?.id ?? '');
  protected readonly alignment = signal<Alignment>('center');
  protected readonly copied = signal(false);

  private readonly request = computed<DecalRequest>(() => ({
    country: this.country() || undefined,
    name: this.name(),
    nameMode: this.nameMode(),
    font: this.font(),
    layout: this.layout(),
    alignment: this.alignment(),
  }));

  protected readonly result = computed(() => {
    try {
      return { decal: this.service.generate(this.request()), error: '' };
    } catch (error) {
      return { decal: null, error: error instanceof Error ? error.message : 'Could not generate the decal.' };
    }
  });

  protected download(svg: string): void {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `gt7-decal-${this.slug()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected async copy(svg: string): Promise<void> {
    await navigator.clipboard.writeText(svg);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }

  private slug(): string {
    return (
      this.name()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'driver'
    );
  }
}
