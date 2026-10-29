import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  MonoTypeOperatorFunction,
  Observable,
  TimeoutError,
  catchError,
  throwError,
  timeout,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { TurnoApi } from './turno-api';
import { EsperaPromedio, Turno, TurnoError } from './turno.model';

/** Si el back no responde en este tiempo, se trata como sin conexión. */
export const TIEMPO_MAXIMO_MS = 8000;

function aTurnoError<T>(): MonoTypeOperatorFunction<T> {
  return (fuente) =>
    fuente.pipe(
      // Un back colgado no responde nunca: tras TIEMPO_MAXIMO_MS se cancela la petición.
      timeout(TIEMPO_MAXIMO_MS),
      catchError((err: HttpErrorResponse | TimeoutError) => {
        const mensaje =
          err instanceof TimeoutError || err.status === 0
            ? 'Sin conexión con el servidor'
            : (err.error?.mensaje ?? 'Error inesperado del servidor');
        return throwError(
          () => new TurnoError(err instanceof TimeoutError ? 0 : err.status, mensaje),
        );
      }),
    );
}

/** Implementación del contrato (docs/api.md) contra el back. */
@Injectable({ providedIn: 'root' })
export class TurnoHttp implements TurnoApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/turnos`;

  pedirTurno(): Observable<Turno> {
    return this.http.post<Turno>(this.url, {}).pipe(aTurnoError());
  }

  siguiente(): Observable<Turno> {
    return this.http.post<Turno>(`${this.url}/siguiente`, {}).pipe(aTurnoError());
  }

  cancelar(numero: number): Observable<Turno> {
    return this.http.patch<Turno>(`${this.url}/${numero}/cancelar`, {}).pipe(aTurnoError());
  }

  consultar(numero: number): Observable<Turno> {
    return this.http.get<Turno>(`${this.url}/${numero}`).pipe(aTurnoError());
  }

  enEspera(): Observable<Turno[]> {
    return this.http.get<Turno[]>(`${this.url}/en-espera`).pipe(aTurnoError());
  }

  /** 204 llega como body null. */
  actual(): Observable<Turno | null> {
    return this.http.get<Turno | null>(`${this.url}/actual`).pipe(aTurnoError());
  }

  esperaPromedio(): Observable<EsperaPromedio> {
    return this.http.get<EsperaPromedio>(`${this.url}/espera-promedio`).pipe(aTurnoError());
  }
}
