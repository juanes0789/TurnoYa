import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { EsperaPromedio, Turno } from './turno.model';

/** Operaciones del contrato de turnos. Las vistas solo dependen de esta interfaz. */
export interface TurnoApi {
  pedirTurno(): Observable<Turno>;
  siguiente(): Observable<Turno>;
  cancelar(numero: number): Observable<Turno>;
  consultar(numero: number): Observable<Turno>;
  enEspera(): Observable<Turno[]>;
  /** Último turno atendido, o null si aún no se ha atendido ninguno. */
  actual(): Observable<Turno | null>;
  esperaPromedio(): Observable<EsperaPromedio>;
}

export const TURNO_API = new InjectionToken<TurnoApi>('TURNO_API');

/** Hora actual; se reemplaza en las pruebas para que sean deterministas. */
export const RELOJ = new InjectionToken<() => Date>('RELOJ', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

export const INTERVALO_REFRESCO_MS = 3000;
