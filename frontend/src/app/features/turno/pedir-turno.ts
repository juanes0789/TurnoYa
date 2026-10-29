import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  filter,
  forkJoin,
  interval,
  map,
  merge,
  of,
  switchMap,
  throwError,
} from 'rxjs';
import { INTERVALO_REFRESCO_MS, TURNO_API } from '../../core/turno-api';
import { EsperaPromedio, Turno, TurnoError } from '../../core/turno.model';
import { NumeroTurno, formatearNumero } from '../../shared/numero-turno/numero-turno';

export const CLAVE_STORAGE = 'turnoya.miTurno';

// sessionStorage puede lanzar (navegación privada, bloqueado): sin él solo se pierde la recuperación al recargar.
function leerGuardado(): number | null {
  try {
    const valor = sessionStorage.getItem(CLAVE_STORAGE);
    return valor === null ? null : Number(valor);
  } catch {
    return null;
  }
}

function guardar(numero: number | null): void {
  try {
    if (numero === null) sessionStorage.removeItem(CLAVE_STORAGE);
    else sessionStorage.setItem(CLAVE_STORAGE, String(numero));
  } catch {
    // sin persistencia
  }
}

@Component({
  selector: 'app-pedir-turno',
  imports: [NumeroTurno],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pedir-turno.html',
  styleUrl: './pedir-turno.scss',
})
export class PedirTurno {
  private readonly api = inject(TURNO_API);

  /** Número del cliente: existe desde que se asigna (o se recupera del storage) aunque aún no llegue el detalle. */
  protected readonly numero = signal<number | null>(null);
  protected readonly miTurno = signal<Turno | null>(null);
  protected readonly pidiendo = signal(false);
  protected readonly confirmando = signal(false);
  protected readonly delante = signal(0);
  protected readonly promedio = signal(0);
  /** Error de una acción del cliente (pedir, cancelar); se limpia con la siguiente acción. */
  protected readonly error = signal<string | null>(null);
  /** Error al refrescar; se limpia en cuanto un refresco sale bien. */
  protected readonly errorRefresco = signal<string | null>(null);

  protected readonly esperaEstimada = computed(() => Math.round(this.delante() * this.promedio()));
  protected readonly mensajeError = computed(() => this.error() ?? this.errorRefresco());
  protected readonly formatear = formatearNumero;

  /** Refrescos pedidos a mano; se mezclan con el polling en un solo flujo. */
  private readonly refrescos = new Subject<void>();
  /** Sube al pedir, cancelar o reiniciar: una respuesta de un refresco anterior ya no se aplica. */
  private version = 0;

  constructor() {
    merge(interval(INTERVALO_REFRESCO_MS).pipe(filter(() => this.debePolling())), this.refrescos)
      .pipe(
        // switchMap cancela el refresco anterior si sigue en vuelo (back lento).
        switchMap(() => this.consultarEstado()),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => this.aplicar(resultado));

    const guardado = leerGuardado();
    if (guardado !== null && Number.isInteger(guardado)) {
      this.numero.set(guardado);
      this.refrescar();
    }
  }

  pedir(): void {
    if (this.pidiendo() || this.numero() !== null) return;
    this.pidiendo.set(true);
    this.error.set(null);
    this.api.pedirTurno().subscribe({
      next: (turno) => {
        this.pidiendo.set(false);
        this.version++;
        this.numero.set(turno.numero);
        this.miTurno.set(turno);
        guardar(turno.numero);
        this.refrescar();
      },
      error: () => {
        this.pidiendo.set(false);
        this.error.set('No se pudo asignar el turno, intenta de nuevo');
      },
    });
  }

  refrescar(): void {
    this.refrescos.next();
  }

  cancelar(): void {
    const numero = this.numero();
    if (numero === null) return;
    this.version++;
    this.confirmando.set(false);
    this.error.set(null);
    this.api.cancelar(numero).subscribe({
      next: (turno) => this.miTurno.set(turno),
      error: (err: TurnoError) => {
        // Sin conexión es transitorio: va al error de refresco para que se quite al reconectar.
        if (err.status === 0) this.errorRefresco.set(err.message);
        else this.error.set(err.message);
        this.refrescar();
      },
    });
  }

  reiniciar(): void {
    this.version++;
    this.numero.set(null);
    this.miTurno.set(null);
    this.confirmando.set(false);
    this.delante.set(0);
    this.error.set(null);
    this.errorRefresco.set(null);
    guardar(null);
  }

  private debePolling(): boolean {
    const estado = this.miTurno()?.estado;
    return this.numero() !== null && (estado === undefined || estado === 'PENDIENTE');
  }

  private consultarEstado(): Observable<ResultadoRefresco> {
    const numero = this.numero();
    if (numero === null) return EMPTY;
    const version = this.version;
    return forkJoin({
      // Solo un 404 de GET /turnos/{numero} significa que el turno ya no existe.
      turno: this.api
        .consultar(numero)
        .pipe(
          catchError((err: TurnoError) => (err.status === 404 ? of(null) : throwError(() => err))),
        ),
      enEspera: this.api.enEspera(),
      promedio: this.api.esperaPromedio(),
    }).pipe(
      map((datos) => ({ version, numero, ...datos })),
      catchError((err: TurnoError) => of({ version, error: err })),
    );
  }

  private aplicar(resultado: ResultadoRefresco): void {
    if (resultado.version !== this.version) return;
    if ('error' in resultado) {
      this.errorRefresco.set(resultado.error.message);
      return;
    }
    const { numero, turno, enEspera, promedio } = resultado;
    // El back ya no conoce el número (p. ej. se reinició) → empezar de nuevo.
    if (turno === null) {
      this.reiniciar();
      return;
    }
    this.miTurno.set(turno);
    this.delante.set(
      Math.max(
        0,
        enEspera.findIndex((t) => t.numero === numero),
      ),
    );
    this.promedio.set(promedio.minutos);
    this.errorRefresco.set(null);
  }
}

type ResultadoRefresco =
  | {
      version: number;
      numero: number;
      turno: Turno | null;
      enEspera: Turno[];
      promedio: EsperaPromedio;
    }
  | { version: number; error: TurnoError };
