import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, forkJoin, map, merge, of, scan, switchMap, timer } from 'rxjs';
import { INTERVALO_REFRESCO_MS, TURNO_API } from '../../core/turno-api';
import { Turno, TurnoError } from '../../core/turno.model';
import { NumeroTurno } from '../../shared/numero-turno/numero-turno';

/** Lo que necesita el panel en cada refresco. */
interface Fila {
  enEspera: Turno[];
  actual: Turno | null;
  promedio: number;
}

/** Último estado bueno + el error del último refresco (se conserva la fila si falla). */
interface Estado {
  fila: Fila | null;
  error: string | null;
}

const ESTADO_INICIAL: Estado = { fila: null, error: null };

@Component({
  selector: 'app-panel-asesor',
  imports: [NumeroTurno],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-asesor.html',
  styleUrl: './panel-asesor.scss',
})
export class PanelAsesor {
  private readonly api = inject(TURNO_API);
  private readonly destroyRef = inject(DestroyRef);

  /** Dispara un refresco inmediato después de llamar o cancelar. */
  private readonly refrescar$ = new Subject<void>();

  protected readonly llamando = signal(false);
  protected readonly cancelando = signal<number | null>(null);
  protected readonly confirmando = signal<number | null>(null);
  protected readonly errorAccion = signal<string | null>(null);

  private readonly estado$ = merge(
    of(void 0),
    timer(INTERVALO_REFRESCO_MS, INTERVALO_REFRESCO_MS),
    this.refrescar$,
  ).pipe(
    switchMap(() =>
      forkJoin({
        enEspera: this.api.enEspera(),
        actual: this.api.actual(),
        promedio: this.api.esperaPromedio(),
      }).pipe(
        map(
          ({ enEspera, actual, promedio }): Estado => ({
            fila: { enEspera, actual, promedio: promedio.minutos },
            error: null,
          }),
        ),
        catchError((error: unknown) => of<Estado>({ fila: null, error: this.mensajeDe(error) })),
      ),
    ),
    scan(
      (previo: Estado, nuevo: Estado): Estado =>
        nuevo.fila ? nuevo : { fila: previo.fila, error: nuevo.error },
      ESTADO_INICIAL,
    ),
  );

  protected readonly estado = toSignal(this.estado$, { initialValue: ESTADO_INICIAL });

  protected readonly enEspera = computed(() => this.estado().fila?.enEspera ?? []);
  protected readonly actual = computed(() => this.estado().fila?.actual ?? null);
  protected readonly promedio = computed(() => this.estado().fila?.promedio ?? 0);
  protected readonly cargando = computed(() => this.estado().fila === null && !this.error());
  protected readonly error = computed(() => this.errorAccion() ?? this.estado().error);

  /** Regla del caso: no se llama al siguiente con la fila vacía. */
  protected readonly puedeLlamar = computed(() => this.enEspera().length > 0 && !this.llamando());

  protected llamarSiguiente(): void {
    if (!this.puedeLlamar()) return;

    this.llamando.set(true);
    this.errorAccion.set(null);

    this.api
      .siguiente()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.llamando.set(false);
          this.refrescar$.next();
        },
        error: (error: unknown) => {
          this.llamando.set(false);
          this.errorAccion.set(this.mensajeDe(error));
          this.refrescar$.next();
        },
      });
  }

  protected pedirConfirmacion(numero: number): void {
    this.confirmando.set(numero);
  }

  protected descartarConfirmacion(): void {
    this.confirmando.set(null);
  }

  protected cancelar(numero: number): void {
    if (this.cancelando() !== null) return;

    this.cancelando.set(numero);
    this.errorAccion.set(null);

    this.api
      .cancelar(numero)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelando.set(null);
          this.confirmando.set(null);
          this.refrescar$.next();
        },
        error: (error: unknown) => {
          this.cancelando.set(null);
          this.confirmando.set(null);
          this.errorAccion.set(this.mensajeDe(error));
          this.refrescar$.next();
        },
      });
  }

  protected descartarError(): void {
    this.errorAccion.set(null);
  }

  /** HH:MM del ISO local que manda la API. */
  protected hora(iso: string | null): string {
    return iso ? iso.slice(11, 16) : '';
  }

  private mensajeDe(error: unknown): string {
    return error instanceof TurnoError ? error.mensaje : 'Sin conexión con el servidor';
  }
}
