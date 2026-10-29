import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TURNO_API } from '../../core/turno-api';
import { TurnoHttp } from '../../core/turno-http';
import { PedirTurno } from './pedir-turno';

// Respuestas copiadas del back real (rama backend): traen `id` y fechas con microsegundos.
const turno11 = {
  id: 11,
  numero: 11,
  horaSolicitud: '2026-10-29T16:43:14.356048',
  horaAtencion: null,
  estado: 'PENDIENTE',
};
const enEspera = [6, 8, 9, 10, 11].map((numero) => ({ ...turno11, id: numero, numero }));

describe('PedirTurno contra el back (HTTP)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [PedirTurno],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TURNO_API, useExisting: TurnoHttp },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const texto = (raiz: HTMLElement, testid: string) =>
    raiz.querySelector(`[data-testid="${testid}"]`)?.textContent?.replace(/\s+/g, ' ').trim();

  it('pedir muestra 011 con 4 personas delante y ~49 min', async () => {
    const fixture = TestBed.createComponent(PedirTurno);
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;

    raiz.querySelector<HTMLElement>('[data-testid="pedir"]')!.click();
    http
      .expectOne({ method: 'POST', url: '/api/turnos' })
      .flush(turno11, { status: 201, statusText: 'Created' });
    http.expectOne('/api/turnos/11').flush(turno11);
    http.expectOne('/api/turnos/en-espera').flush(enEspera);
    http.expectOne('/api/turnos/espera-promedio').flush({ minutos: 12.2 });
    await fixture.whenStable();

    expect(texto(raiz, 'mi-turno')).toMatch(/^Tu turno es\s*011$/);
    expect(texto(raiz, 'delante')).toBe('Personas delante: 4');
    expect(texto(raiz, 'espera')).toBe('Espera estimada: ~49 min');
  });

  it('un 404 sin cuerpo del back (número guardado que ya no existe) vuelve al inicio', async () => {
    sessionStorage.setItem('turnoya.miTurno', '99');
    const fixture = TestBed.createComponent(PedirTurno);

    http.expectOne('/api/turnos/99').flush(null, { status: 404, statusText: 'Not Found' });
    http.match('/api/turnos/en-espera').forEach((r) => r.flush([]));
    http.match('/api/turnos/espera-promedio').forEach((r) => r.flush({ minutos: 0 }));
    await fixture.whenStable();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(texto(raiz, 'pedir')).toBe('Pedir turno');
    expect(sessionStorage.getItem('turnoya.miTurno')).toBeNull();
  });
});
