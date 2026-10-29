import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  catchError,
  forkJoin,
  interval,
  map,
  merge,
  of,
  switchMap,
} from 'rxjs';
import { INTERVALO_REFRESCO_MS, TURNO_API } from '../../core/turno-api';
import { EsperaPromedio, Turno, TurnoError } from '../../core/turno.model';
import { NumeroTurno, formatearNumero } from '../../shared/numero-turno/numero-turno';

@Component({
  selector: 'app-panel-asesor',
  imports: [DatePipe, NumeroTurno],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-asesor.html',
  styleUrl: './panel-asesor.scss',
})
export class PanelAsesor {
  private readonly api = inject(TURNO_API);

  protected readonly enEspera = signal<Turno[]>([]);
  protected readonly actual = signal<Turno | null>(null);
  protected readonly promedio = signal(0);
  protected readonly llamando = signal(false);
  /** Número cuya cancelación se está confirmando. */
  protected readonly confirmandoCancelar = signal<number | null>(null);
  /** Número cuya cancelación está en vuelo. */
  protected readonly cancelando = signal<number | null>(null);
  /** Error de una acción del asesor (llamar, cancelar); se limpia con la siguiente acción. */
  protected readonly error = signal<string | null>(null);
  /** Error al refrescar; se limpia en cuanto un refresco sale bien. */
  protected readonly errorRefresco = signal<string | null>(null);

  protected readonly mensajeError = computed(() => this.error() ?? this.errorRefresco());
  protected readonly filaVacia = computed(() => this.enEspera().length === 0);
  protected readonly formatear = formatearNumero;

  /** Refrescos pedidos a mano; se mezclan con el polling en un solo flujo. */
  private readonly refrescos = new Subject<void>();
  /** Sube con cada acción: una respuesta de un refresco anterior ya no se aplica. */
  private version = 0;

  constructor() {
    merge(interval(INTERVALO_REFRESCO_MS), this.refrescos)
      .pipe(
        // switchMap cancela el refresco anterior si sigue en vuelo (back lento).
        switchMap(() => this.consultarFila()),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => this.aplicar(resultado));
    this.refrescar();
  }

  refrescar(): void {
    this.refrescos.next();
  }

  llamar(): void {
    if (this.llamando() || this.filaVacia()) return;
    this.version++;
    this.llamando.set(true);
    this.error.set(null);
    this.api.siguiente().subscribe({
      next: (turno) => {
        this.llamando.set(false);
        this.actual.set(turno);
        this.refrescar();
      },
      error: (err: TurnoError) => this.fallo(err, () => this.llamando.set(false)),
    });
  }

  pedirCancelar(numero: number): void {
    this.confirmandoCancelar.set(numero);
  }

  descartarCancelar(): void {
    this.confirmandoCancelar.set(null);
  }

  confirmarCancelar(): void {
    const numero = this.confirmandoCancelar();
    if (numero === null || this.cancelando() !== null) return;
    this.version++;
    this.confirmandoCancelar.set(null);
    this.cancelando.set(numero);
    this.error.set(null);
    this.api.cancelar(numero).subscribe({
      next: () => {
        this.cancelando.set(null);
        this.refrescar();
      },
      error: (err: TurnoError) => this.fallo(err, () => this.cancelando.set(null)),
    });
  }

  private fallo(err: TurnoError, liberar: () => void): void {
    liberar();
    // Sin conexión es transitorio: va al error de refresco para que se quite al reconectar.
    if (err.status === 0) this.errorRefresco.set(err.message);
    else this.error.set(err.message);
    this.refrescar();
  }

  private consultarFila(): Observable<ResultadoRefresco> {
    const version = this.version;
    return forkJoin({
      enEspera: this.api.enEspera(),
      actual: this.api.actual(),
      promedio: this.api.esperaPromedio(),
    }).pipe(
      map((datos) => ({ version, ...datos })),
      catchError((err: TurnoError) => of({ version, error: err })),
    );
  }

  private aplicar(resultado: ResultadoRefresco): void {
    if (resultado.version !== this.version) return;
    if ('error' in resultado) {
      this.errorRefresco.set(resultado.error.message);
      return;
    }
    this.enEspera.set(resultado.enEspera);
    this.actual.set(resultado.actual);
    this.promedio.set(resultado.promedio.minutos);
    this.errorRefresco.set(null);
  }
}

type ResultadoRefresco =
  | { version: number; enEspera: Turno[]; actual: Turno | null; promedio: EsperaPromedio }
  | { version: number; error: TurnoError };
