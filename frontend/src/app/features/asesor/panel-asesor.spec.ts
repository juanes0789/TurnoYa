import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { RELOJ, TURNO_API } from '../../core/turno-api';
import { TurnoMock } from '../../core/turno-mock';
import { Turno, TurnoError } from '../../core/turno.model';
import { PanelAsesor } from './panel-asesor';

describe('PanelAsesor', () => {
  let mock: TurnoMock;
  let fixture: ComponentFixture<PanelAsesor>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PanelAsesor],
      providers: [
        { provide: TURNO_API, useExisting: TurnoMock },
        { provide: RELOJ, useValue: () => new Date(2026, 9, 29, 9, 0) },
      ],
    });
    mock = TestBed.inject(TurnoMock);
  });

  afterEach(() => vi.restoreAllMocks());

  async function crear() {
    fixture = TestBed.createComponent(PanelAsesor);
    await fixture.whenStable();
  }

  const raiz = () => fixture.nativeElement as HTMLElement;
  const el = (testid: string) => raiz().querySelector<HTMLElement>(`[data-testid="${testid}"]`);
  const texto = (testid: string) => el(testid)?.textContent?.replace(/\s+/g, ' ').trim();
  const filas = () =>
    Array.from(raiz().querySelectorAll<HTMLElement>('[data-testid^="fila-"]')).map((f) =>
      Number(f.dataset['testid']!.replace('fila-', '')),
    );

  async function click(testid: string) {
    const boton = el(testid);
    if (!boton) throw new Error(`no existe [data-testid="${testid}"]`);
    boton.click();
    await fixture.whenStable();
  }

  async function refrescar() {
    fixture.componentInstance.refrescar();
    await fixture.whenStable();
  }

  const ejecutar = <T>(obs: Observable<T>) => obs.subscribe({ error: () => undefined });

  it('muestra el estado inicial: atendiendo 005, 4 en espera, 006 como siguiente y 12.2 min', async () => {
    await crear();

    expect(texto('actual')).toBe('005');
    expect(texto('titulo-espera')).toBe('En espera (4)');
    expect(filas()).toEqual([6, 8, 9, 10]);
    expect(texto('fila-6')).toContain('08:25');
    expect(texto('fila-6')).toContain('siguiente');
    expect(texto('fila-8')).not.toContain('siguiente');
    expect(texto('promedio')).toMatch(/^Espera promedio\s*12\.2 min$/);
  });

  it('llamar siguiente atiende el 006 y deja 3 en espera', async () => {
    await crear();

    await click('llamar');

    expect(texto('actual')).toBe('006');
    expect(texto('titulo-espera')).toBe('En espera (3)');
    expect(filas()).toEqual([8, 9, 10]);
    expect(texto('fila-8')).toContain('siguiente');
  });

  it('doble clic mientras llama solo atiende un turno', async () => {
    await crear();
    const enVuelo = new Subject<Turno>();
    const siguiente = vi.spyOn(mock, 'siguiente').mockReturnValue(enVuelo);

    await click('llamar');
    expect(texto('llamar')).toBe('Llamando…');
    expect(el('llamar')?.hasAttribute('disabled')).toBe(true);
    fixture.componentInstance.llamar();

    expect(siguiente).toHaveBeenCalledTimes(1);
  });

  it('con la fila vacía el botón queda deshabilitado y se ve "No hay turnos en espera"', async () => {
    await crear();

    for (let i = 0; i < 4; i++) await click('llamar');

    expect(texto('actual')).toBe('010');
    expect(el('llamar')?.hasAttribute('disabled')).toBe(true);
    expect(texto('vacia')).toBe('No hay turnos en espera');
    expect(texto('titulo-espera')).toBe('En espera (0)');
  });

  it('un 409 al llamar muestra el banner con el mensaje del back', async () => {
    await crear();
    vi.spyOn(mock, 'siguiente').mockReturnValue(
      throwError(() => new TurnoError(409, 'No hay turnos en espera')),
    );

    await click('llamar');

    expect(texto('banner-error')).toBe('No hay turnos en espera');
    expect(el('llamar')?.hasAttribute('disabled')).toBe(false);
  });

  it('cancelar el 008 pide confirmación; "No" no cambia nada y "Sí" lo quita de la fila', async () => {
    await crear();
    expect(el('cancelar-8')?.getAttribute('aria-label')).toBe(
      'No se presentó: cancelar el turno 008',
    );

    await click('cancelar-8');
    expect(texto('confirmacion')).toContain('¿Cancelar el turno 008?');
    await click('descartar-cancelar');
    expect(filas()).toEqual([6, 8, 9, 10]);
    expect(el('confirmacion')).toBeNull();

    await click('cancelar-8');
    await click('confirmar-cancelar');

    expect(filas()).toEqual([6, 9, 10]);
    expect(texto('titulo-espera')).toBe('En espera (3)');
  });

  it('cancelar uno que ya fue atendido muestra el 409 del back y refresca la lista', async () => {
    await crear();
    ejecutar(mock.siguiente());

    await click('cancelar-6');
    await click('confirmar-cancelar');

    expect(texto('banner-error')).toBe('El turno 6 no está pendiente');
    expect(filas()).toEqual([8, 9, 10]);
    expect(texto('actual')).toBe('006');
  });

  it('sin conexión muestra el banner, conserva la fila y lo quita al reconectar', async () => {
    await crear();
    vi.spyOn(mock, 'enEspera').mockReturnValueOnce(
      throwError(() => new TurnoError(0, 'Sin conexión con el servidor')),
    );

    await refrescar();
    expect(texto('banner-error')).toBe('Sin conexión con el servidor');
    expect(filas()).toEqual([6, 8, 9, 10]);

    await refrescar();
    expect(el('banner-error')).toBeNull();
  });

  it('sin turnos atendidos muestra "Aún no se ha atendido ningún turno"', async () => {
    vi.spyOn(mock, 'actual').mockReturnValue(of(null));

    await crear();

    expect(texto('sin-actual')).toBe('Aún no se ha atendido ningún turno');
    expect(el('actual')).toBeNull();
  });

  it('una respuesta vieja del refresco no pisa la fila después de llamar', async () => {
    await crear();
    const lenta = new Subject<Turno[]>();
    vi.spyOn(mock, 'enEspera').mockReturnValueOnce(lenta);
    fixture.componentInstance.refrescar();

    await click('llamar');
    lenta.next(
      [6, 8, 9, 10].map((numero) => ({
        numero,
        horaSolicitud: '2026-10-29T08:25:00',
        horaAtencion: null,
        estado: 'PENDIENTE' as const,
      })),
    );
    lenta.complete();
    await fixture.whenStable();

    expect(texto('actual')).toBe('006');
    expect(filas()).toEqual([8, 9, 10]);
  });
});
