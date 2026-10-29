import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { TIEMPO_MAXIMO_MS, TurnoHttp } from './turno-http';
import { Turno, TurnoError } from './turno.model';

const turno = (numero: number): Turno => ({
  numero,
  horaSolicitud: '2026-10-29T08:25:00',
  horaAtencion: null,
  estado: 'PENDIENTE',
});

describe('TurnoHttp', () => {
  let api: TurnoHttp;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TurnoHttp);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function capturar<T>(obs: Observable<T>) {
    const r: { valor?: T; error?: TurnoError } = {};
    obs.subscribe({ next: (v) => (r.valor = v), error: (e) => (r.error = e) });
    return r;
  }

  it.each([
    ['pedirTurno()', () => api.pedirTurno(), 'POST', '/api/turnos', turno(11)],
    ['siguiente()', () => api.siguiente(), 'POST', '/api/turnos/siguiente', turno(6)],
    ['cancelar(8)', () => api.cancelar(8), 'PATCH', '/api/turnos/8/cancelar', turno(8)],
    ['consultar(8)', () => api.consultar(8), 'GET', '/api/turnos/8', turno(8)],
    ['enEspera()', () => api.enEspera(), 'GET', '/api/turnos/en-espera', [turno(6), turno(8)]],
    ['actual()', () => api.actual(), 'GET', '/api/turnos/actual', turno(5)],
    [
      'esperaPromedio()',
      () => api.esperaPromedio(),
      'GET',
      '/api/turnos/espera-promedio',
      { minutos: 12.2 },
    ],
  ] as const)('%s hace %s %s y devuelve el body', (_n, llamar, method, url, body) => {
    const r = capturar<unknown>((llamar as () => Observable<unknown>)());
    http.expectOne({ method, url }).flush(body);
    expect(r.valor).toEqual(body);
  });

  it('actual() devuelve null con 204', () => {
    const r = capturar(api.actual());
    http.expectOne('/api/turnos/actual').flush(null, { status: 204, statusText: 'No Content' });
    expect(r.valor).toBeNull();
  });

  it('un 409 se convierte en TurnoError con el mensaje del back', () => {
    const r = capturar(api.siguiente());
    http
      .expectOne('/api/turnos/siguiente')
      .flush({ mensaje: 'No hay turnos en espera' }, { status: 409, statusText: 'Conflict' });
    expect(r.error).toBeInstanceOf(TurnoError);
    expect(r.error).toMatchObject({ status: 409, message: 'No hay turnos en espera' });
  });

  it('sin conexión (status 0) da "Sin conexión con el servidor"', () => {
    const r = capturar(api.enEspera());
    http.expectOne('/api/turnos/en-espera').error(new ProgressEvent('error'));
    expect(r.error).toMatchObject({ status: 0, message: 'Sin conexión con el servidor' });
  });

  it('un error sin mensaje del back da "Error inesperado del servidor"', () => {
    const r = capturar(api.consultar(8));
    http.expectOne('/api/turnos/8').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(r.error).toMatchObject({ status: 500, message: 'Error inesperado del servidor' });
  });

  it('si el back no responde en TIEMPO_MAXIMO_MS cancela la petición y da "Sin conexión con el servidor"', () => {
    vi.useFakeTimers();
    try {
      const r = capturar(api.enEspera());
      const req = http.expectOne('/api/turnos/en-espera');

      vi.advanceTimersByTime(TIEMPO_MAXIMO_MS - 1);
      expect(r.error).toBeUndefined();
      vi.advanceTimersByTime(1);

      expect(r.error).toMatchObject({ status: 0, message: 'Sin conexión con el servidor' });
      expect(req.cancelled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
