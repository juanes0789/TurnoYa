import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { RELOJ } from './turno-api';
import { TurnoMock } from './turno-mock';
import { Turno, TurnoError } from './turno.model';

/** Los observables del mock son síncronos: devuelve el valor emitido o lanza el error. */
function valor<T>(obs: Observable<T>): T {
  let resultado: { ok: true; v: T } | { ok: false; e: unknown } | undefined;
  obs.subscribe({ next: (v) => (resultado = { ok: true, v }), error: (e) => (resultado = { ok: false, e }) });
  if (!resultado) throw new Error('el observable no emitió de forma síncrona');
  if (!resultado.ok) throw resultado.e;
  return resultado.v;
}

function error(fn: () => Observable<unknown>): TurnoError {
  try {
    valor(fn());
  } catch (e) {
    return e as TurnoError;
  }
  throw new Error('se esperaba un error');
}

const numeros = (turnos: Turno[]) => turnos.map((t) => t.numero);

describe('TurnoMock', () => {
  let mock: TurnoMock;
  const enEspera = () => valor(mock.enEspera());
  const siguiente = () => valor(mock.siguiente());
  const pedir = () => valor(mock.pedirTurno());
  const cancelar = (n: number) => valor(mock.cancelar(n));
  const consultar = (n: number) => valor(mock.consultar(n));
  const actual = () => valor(mock.actual());
  const promedio = () => valor(mock.esperaPromedio()).minutos;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: RELOJ, useValue: () => new Date(2026, 9, 29, 9, 0) }],
    });
    mock = TestBed.inject(TurnoMock);
  });

  it('arranca con el estado de la carga', () => {
    expect(numeros(enEspera())).toEqual([6, 8, 9, 10]);
    expect(promedio()).toBe(12.2);
    expect(actual()?.numero).toBe(5);
  });

  it('atiende en orden 6 → 8 → 9 → 10 y luego responde 409', () => {
    expect([1, 2, 3, 4].map(() => siguiente().numero)).toEqual([6, 8, 9, 10]);
    expect(error(() => mock.siguiente())).toMatchObject({ status: 409, message: 'No hay turnos en espera' });
    expect(actual()?.numero).toBe(10);
  });

  it('asigna 11, 12 sin repetir y los pone al final de la fila', () => {
    expect(pedir().numero).toBe(11);
    expect(pedir().numero).toBe(12);
    expect(numeros(enEspera())).toEqual([6, 8, 9, 10, 11, 12]);
  });

  it('cancelar(8) lo saca de la fila y no reutiliza el número', () => {
    expect(cancelar(8).estado).toBe('CANCELADO');
    expect(numeros(enEspera())).toEqual([6, 9, 10]);
    expect(pedir().numero).toBe(11);
  });

  it('cancelar un atendido, un cancelado o uno inexistente falla sin cambiar nada', () => {
    expect(error(() => mock.cancelar(5))).toMatchObject({ status: 409 });
    expect(error(() => mock.cancelar(7))).toMatchObject({ status: 409 });
    expect(error(() => mock.cancelar(99))).toMatchObject({ status: 404 });
    expect(numeros(enEspera())).toEqual([6, 8, 9, 10]);
  });

  it('consultar(7) devuelve el 7 cancelado y consultar(99) responde 404', () => {
    expect(consultar(7).estado).toBe('CANCELADO');
    expect(error(() => mock.consultar(99))).toMatchObject({ status: 404 });
  });

  it('el promedio incluye al recién atendido (6: 08:25 → 09:00 = 35 min)', () => {
    siguiente();
    expect(promedio()).toBe(16);
  });

  it('devuelve copias: modificar un turno recibido no altera el mock', () => {
    enEspera()[0].estado = 'ATENDIDO';
    expect(numeros(enEspera())).toEqual([6, 8, 9, 10]);
  });
});
