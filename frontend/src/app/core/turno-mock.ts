import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { RELOJ, TurnoApi } from './turno-api';
import { EsperaPromedio, EstadoTurno, Turno, TurnoError } from './turno.model';

/** Estado esperado después de cargar data/turnos_hoy.xlsx (sin la fila 10, el 7 duplicado). */
const SEMILLA: [numero: number, solicitud: string, atencion: string | null, estado: EstadoTurno][] = [
  [1, '08:02', '08:05', 'ATENDIDO'],
  [2, '08:06', '08:15', 'ATENDIDO'],
  [3, '08:10', '08:24', 'ATENDIDO'],
  [4, '08:15', '08:31', 'ATENDIDO'],
  [5, '08:21', '08:40', 'ATENDIDO'],
  [6, '08:25', null, 'PENDIENTE'],
  [9, '08:41', null, 'PENDIENTE'],
  [7, '08:30', null, 'CANCELADO'],
  [8, '08:38', null, 'PENDIENTE'],
  [10, '08:45', null, 'PENDIENTE'],
];

function isoLocal(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return (
    `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}` +
    `T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`
  );
}

function aHoy(hoy: Date, hora: string): string {
  const [h, m] = hora.split(':').map(Number);
  return isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), h, m));
}

const ms = (iso: string) => new Date(iso).getTime();

/** Implementación en memoria del contrato, con la misma regla del caso que el back. */
@Injectable({ providedIn: 'root' })
export class TurnoMock implements TurnoApi {
  private readonly reloj = inject(RELOJ);
  private readonly turnos: Turno[];

  constructor() {
    const hoy = this.reloj();
    this.turnos = SEMILLA.map(([numero, solicitud, atencion, estado]) => ({
      numero,
      horaSolicitud: aHoy(hoy, solicitud),
      horaAtencion: atencion ? aHoy(hoy, atencion) : null,
      estado,
    }));
  }

  pedirTurno(): Observable<Turno> {
    const turno: Turno = {
      numero: Math.max(0, ...this.turnos.map((t) => t.numero)) + 1,
      horaSolicitud: isoLocal(this.reloj()),
      horaAtencion: null,
      estado: 'PENDIENTE',
    };
    this.turnos.push(turno);
    return of({ ...turno });
  }

  siguiente(): Observable<Turno> {
    const [primero] = this.pendientes();
    if (!primero) return this.fallar(409, 'No hay turnos en espera');
    primero.estado = 'ATENDIDO';
    primero.horaAtencion = isoLocal(this.reloj());
    return of({ ...primero });
  }

  cancelar(numero: number): Observable<Turno> {
    const turno = this.buscar(numero);
    if (!turno) return this.fallar(404, `El turno ${numero} no existe`);
    if (turno.estado !== 'PENDIENTE') return this.fallar(409, `El turno ${numero} no está pendiente`);
    turno.estado = 'CANCELADO';
    return of({ ...turno });
  }

  consultar(numero: number): Observable<Turno> {
    const turno = this.buscar(numero);
    return turno ? of({ ...turno }) : this.fallar(404, `El turno ${numero} no existe`);
  }

  enEspera(): Observable<Turno[]> {
    return of(this.pendientes().map((t) => ({ ...t })));
  }

  actual(): Observable<Turno | null> {
    // Empates en horaAtencion (mismo segundo): la fila es FIFO, así que el último atendido es el que llegó después.
    const atendidos = this.atendidos().sort(
      (a, b) =>
        ms(b.horaAtencion!) - ms(a.horaAtencion!) ||
        ms(b.horaSolicitud) - ms(a.horaSolicitud) ||
        b.numero - a.numero,
    );
    return of(atendidos[0] ? { ...atendidos[0] } : null);
  }

  esperaPromedio(): Observable<EsperaPromedio> {
    const atendidos = this.atendidos();
    if (atendidos.length === 0) return of({ minutos: 0 });
    const totalMin = atendidos.reduce((s, t) => s + (ms(t.horaAtencion!) - ms(t.horaSolicitud)) / 60_000, 0);
    return of({ minutos: Math.round((totalMin / atendidos.length) * 10) / 10 });
  }

  private pendientes(): Turno[] {
    return this.turnos
      .filter((t) => t.estado === 'PENDIENTE')
      .sort((a, b) => ms(a.horaSolicitud) - ms(b.horaSolicitud) || a.numero - b.numero);
  }

  private atendidos(): Turno[] {
    return this.turnos.filter((t) => t.estado === 'ATENDIDO');
  }

  private buscar(numero: number): Turno | undefined {
    return this.turnos.find((t) => t.numero === numero);
  }

  private fallar(status: number, mensaje: string): Observable<never> {
    return throwError(() => new TurnoError(status, mensaje));
  }
}
