import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export function formatearNumero(numero: number): string {
  return String(numero).padStart(3, '0');
}

@Component({
  selector: 'app-numero-turno',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.grande]': "tamano() === 'grande'" },
  template: `{{ texto() }}`,
  styles: `
    :host {
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 0.04em;
      line-height: 1;
    }
    :host(.grande) {
      font-size: clamp(4rem, 18vw, 6rem);
    }
  `,
})
export class NumeroTurno {
  readonly numero = input.required<number>();
  readonly tamano = input<'grande' | 'normal'>('normal');

  protected readonly texto = computed(() => formatearNumero(this.numero()));
}
