import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { GeneratedDecal } from '@gt7/core';

@Component({
  selector: 'app-size-indicator',
  host: { class: 'panel block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-baseline justify-between">
      <h2 class="panel-title">Telemetry</h2>
      <span class="font-display text-sm font-bold tabular-nums" [class]="textClass()" data-testid="size-label">
        {{ kb() }} KB / {{ maxKb() }} KB
      </span>
    </div>

    <div
      class="relative mt-3 h-2.5 overflow-hidden rounded-sm bg-zinc-800"
      role="progressbar"
      aria-label="SVG size"
      [attr.aria-valuenow]="decal().sizeBytes"
      aria-valuemin="0"
      [attr.aria-valuemax]="decal().maxBytes"
    >
      <div class="h-full transition-[width,background-color] duration-500" [class]="barClass()" [style.width.%]="percent()"></div>
      <span class="absolute inset-y-0 w-px bg-zinc-500" [style.left.%]="targetPercent()" aria-hidden="true"></span>
    </div>
    <p class="mt-2 text-sm" [class]="textClass()" role="status" data-testid="size-message">{{ message() }}</p>

    <dl class="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded border border-zinc-800 bg-zinc-800 text-center">
      @for (stat of stats(); track stat.label) {
        <div class="bg-zinc-950 px-2 py-2">
          <dt class="font-display text-[0.6rem] uppercase tracking-[0.2em] text-zinc-500">{{ stat.label }}</dt>
          <dd class="mt-0.5 font-semibold tabular-nums text-zinc-200">{{ stat.value }}</dd>
        </div>
      }
    </dl>
  `,
})
export class SizeIndicator {
  readonly decal = input.required<GeneratedDecal>();

  protected readonly kb = computed(() => (this.decal().sizeBytes / 1024).toFixed(2));
  protected readonly maxKb = computed(() => (this.decal().maxBytes / 1024).toFixed(0));
  protected readonly percent = computed(() =>
    Math.min(100, (this.decal().sizeBytes / this.decal().maxBytes) * 100),
  );
  protected readonly targetPercent = computed(() => (this.decal().targetBytes / this.decal().maxBytes) * 100);

  protected readonly stats = computed(() => [
    { label: 'Canvas', value: `${this.decal().width} × ${this.decal().height}` },
    { label: 'Format', value: 'SVG 1.1' },
    { label: 'Status', value: { safe: 'Ready', warning: 'Tight', invalid: 'Too big' }[this.decal().status] },
  ]);

  protected readonly barClass = computed(
    () => ({ safe: 'bg-emerald-500', warning: 'bg-amber-500', invalid: 'bg-red-600' })[this.decal().status],
  );
  protected readonly textClass = computed(
    () => ({ safe: 'text-emerald-400', warning: 'text-amber-400', invalid: 'text-red-400' })[this.decal().status],
  );
  protected readonly message = computed(() => {
    switch (this.decal().status) {
      case 'safe':
        return 'Within the Gran Turismo 7 limit.';
      case 'warning':
        return 'Close to the 15 KB limit. Try a shorter name or another layout.';
      case 'invalid':
        return 'Too large for Gran Turismo 7. Shorten the name or pick another layout.';
    }
  });
}
