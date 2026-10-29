import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TURNO_API } from '../../core/turno-api';
import { TurnoHttp } from '../../core/turno-http';
import { PanelAsesor } from './panel-asesor';

// Formato real del back (rama backend): `id` extra y fechas con microsegundos.
const turno = (numero: number, horaSolicitud: string) => ({
  id: numero,
  numero,
  horaSolicitud,
  horaAtencion: null,
  estado: 'PENDIENTE',
});

describe('PanelAsesor contra el back (HTTP)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PanelAsesor],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TURNO_API, useExisting: TurnoHttp },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('muestra la hora HH:mm de fechas con microsegundos y "sin atendidos" con 204', async () => {
    const fixture = TestBed.createComponent(PanelAsesor);
    http.expectOne('/api/turnos/en-espera').flush([turno(11, '2026-10-29T16:43:14.356048')]);
    http.expectOne('/api/turnos/actual').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/turnos/espera-promedio').flush({ minutos: 0 });
    await fixture.whenStable();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('[data-testid="fila-11"]')?.textContent).toContain('16:43');
    expect(raiz.querySelector('[data-testid="sin-actual"]')?.textContent?.trim()).toBe(
      'Aún no se ha atendido ningún turno',
    );
  });
});
