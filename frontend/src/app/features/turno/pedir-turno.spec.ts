import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, throwError } from 'rxjs';
import { RELOJ, TURNO_API } from '../../core/turno-api';
import { TurnoMock } from '../../core/turno-mock';
import { Turno, TurnoError } from '../../core/turno.model';
import { CLAVE_STORAGE, PedirTurno } from './pedir-turno';

describe('PedirTurno', () => {
  let mock: TurnoMock;
  let fixture: ComponentFixture<PedirTurno>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [PedirTurno],
      providers: [
        { provide: TURNO_API, useExisting: TurnoMock },
        { provide: RELOJ, useValue: () => new Date(2026, 9, 29, 9, 0) },
      ],
    });
    mock = TestBed.inject(TurnoMock);
  });

  afterEach(() => vi.restoreAllMocks());

  async function crear() {
    fixture = TestBed.createComponent(PedirTurno);
    await fixture.whenStable();
  }

  const el = (testid: string) =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${testid}"]`);
  const texto = (testid: string) => el(testid)?.textContent?.replace(/\s+/g, ' ').trim();

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

  it('pedir asigna 011 con 4 personas delante y ~49 min de espera', async () => {
    await crear();
    expect(texto('pedir')).toBe('Pedir turno');

    await click('pedir');

    expect(texto('mi-turno')).toMatch(/^Tu turno es\s*011$/);
    expect(texto('delante')).toBe('Personas delante: 4');
    expect(texto('espera')).toBe('Espera estimada: ~49 min');
    expect(el('pedir')).toBeNull();
  });

  it('doble pedir mientras se asigna solo hace una petición', async () => {
    const enVuelo = new Subject<Turno>();
    const pedirTurno = vi.spyOn(mock, 'pedirTurno').mockReturnValue(enVuelo);
    await crear();

    await click('pedir');
    expect(texto('pedir')).toBe('Asignando…');
    expect(el('pedir')?.hasAttribute('disabled')).toBe(true);
    fixture.componentInstance.pedir();

    expect(pedirTurno).toHaveBeenCalledTimes(1);
  });

  it('mientras llega el primer refresco no muestra "Personas delante: 0"', async () => {
    await crear();
    const primero = new Subject<Turno>();
    vi.spyOn(mock, 'consultar').mockReturnValueOnce(primero);

    await click('pedir');
    expect(texto('mi-turno')).toMatch(/^Tu turno es\s*011$/);
    expect(el('delante')).toBeNull();
    expect(el('espera')).toBeNull();
    expect(texto('calculando')).toBe('Calculando tu lugar en la fila…');

    primero.next({
      numero: 11,
      horaSolicitud: '2026-10-29T09:00:00',
      horaAtencion: null,
      estado: 'PENDIENTE',
    });
    primero.complete();
    await fixture.whenStable();
    expect(texto('delante')).toBe('Personas delante: 4');
    expect(el('calculando')).toBeNull();
  });

  it('mientras cancela muestra "Cancelando…" y no manda otra cancelación', async () => {
    await crear();
    await click('pedir');
    const enVuelo = new Subject<Turno>();
    const cancelar = vi.spyOn(mock, 'cancelar').mockReturnValue(enVuelo);

    await click('cancelar');
    await click('confirmar-cancelar');
    expect(texto('cancelar')).toBe('Cancelando…');
    expect(el('cancelar')?.hasAttribute('disabled')).toBe(true);
    fixture.componentInstance.cancelar();

    expect(cancelar).toHaveBeenCalledTimes(1);
  });

  it('pasa a "¡Es tu turno!" cuando el asesor lo atiende', async () => {
    await crear();
    await click('pedir');
    for (let i = 0; i < 5; i++) ejecutar(mock.siguiente());

    await refrescar();

    expect(texto('llamado')).toBe('¡Es tu turno!');
    expect(el('cancelar')).toBeNull();
    expect(texto('otro')).toBe('Pedir otro turno');
  });

  it('cancelar con confirmación muestra "Tu turno 011 fue cancelado" y "Pedir otro turno"', async () => {
    await crear();
    await click('pedir');

    await click('cancelar');
    expect(texto('confirmacion')).toContain('¿Seguro? Perderás tu lugar en la fila');
    await click('descartar-cancelar');
    expect(texto('mi-turno')).toMatch(/^Tu turno es\s*011$/);

    await click('cancelar');
    await click('confirmar-cancelar');

    expect(texto('cancelado')).toBe('Tu turno 011 fue cancelado');
    await click('otro');
    expect(texto('pedir')).toBe('Pedir turno');
    expect(sessionStorage.getItem(CLAVE_STORAGE)).toBeNull();
  });

  it('si el asesor lo cancela, el kiosco muestra "cancelado" al refrescar', async () => {
    await crear();
    await click('pedir');
    ejecutar(mock.cancelar(11));

    await refrescar();

    expect(texto('cancelado')).toBe('Tu turno 011 fue cancelado');
  });

  it('al recrear el componente recupera el turno desde sessionStorage', async () => {
    await crear();
    await click('pedir');
    fixture.destroy();

    await crear();

    expect(texto('mi-turno')).toMatch(/^Tu turno es\s*011$/);
    expect(texto('delante')).toBe('Personas delante: 4');
  });

  it('un número guardado que da 404 vuelve al estado inicial y limpia el storage', async () => {
    sessionStorage.setItem(CLAVE_STORAGE, '99');

    await crear();

    expect(texto('pedir')).toBe('Pedir turno');
    expect(el('banner-error')).toBeNull();
    expect(sessionStorage.getItem(CLAVE_STORAGE)).toBeNull();
  });

  it('si pedir falla muestra "No se pudo asignar el turno, intenta de nuevo"', async () => {
    vi.spyOn(mock, 'pedirTurno').mockReturnValue(
      throwError(() => new TurnoError(0, 'Sin conexión con el servidor')),
    );
    await crear();

    await click('pedir');

    expect(texto('banner-error')).toBe('No se pudo asignar el turno, intenta de nuevo');
    expect(texto('pedir')).toBe('Pedir turno');
  });

  it('sin conexión al refrescar muestra el banner, conserva 011 y lo quita al reconectar', async () => {
    await crear();
    await click('pedir');
    vi.spyOn(mock, 'consultar').mockReturnValueOnce(
      throwError(() => new TurnoError(0, 'Sin conexión con el servidor')),
    );

    await refrescar();
    expect(texto('banner-error')).toBe('Sin conexión con el servidor');
    expect(texto('mi-turno')).toMatch(/^Tu turno es\s*011$/);
    expect(texto('delante')).toBe('Personas delante: 4');

    await refrescar();
    expect(el('banner-error')).toBeNull();
  });

  it('cancelar cuando ya lo llamaron muestra el 409 del back y pasa a "¡Es tu turno!"', async () => {
    await crear();
    await click('pedir');
    for (let i = 0; i < 5; i++) ejecutar(mock.siguiente());

    await click('cancelar');
    await click('confirmar-cancelar');

    expect(texto('banner-error')).toBe('El turno 11 no está pendiente');
    expect(texto('llamado')).toBe('¡Es tu turno!');
  });

  it('con sessionStorage que lanza excepción, pedir sigue funcionando', async () => {
    const bloqueado = () => {
      throw new DOMException('bloqueado', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(bloqueado);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(bloqueado);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(bloqueado);

    await crear();
    await click('pedir');

    expect(texto('mi-turno')).toMatch(/^Tu turno es\s*011$/);
    await click('cancelar');
    await click('confirmar-cancelar');
    await click('otro');
    expect(texto('pedir')).toBe('Pedir turno');
  });

  describe('revisión final', () => {
    const pendiente = (numero: number): Turno => ({
      numero,
      horaSolicitud: '2026-10-29T09:00:00',
      horaAtencion: null,
      estado: 'PENDIENTE',
    });

    it('una respuesta vieja del refresco no pisa el turno nuevo', async () => {
      await crear();
      await click('pedir');
      const lento = new Subject<Turno>();
      vi.spyOn(mock, 'consultar').mockReturnValueOnce(lento);
      fixture.componentInstance.refrescar();

      await click('cancelar');
      await click('confirmar-cancelar');
      await click('otro');
      await click('pedir');
      lento.next(pendiente(11));
      lento.complete();
      await fixture.whenStable();

      expect(texto('mi-turno')).toMatch(/^Tu turno es\s*012$/);
      expect(texto('delante')).toBe('Personas delante: 4');
    });

    it('una respuesta vieja PENDIENTE no deshace la cancelación', async () => {
      await crear();
      await click('pedir');
      const lento = new Subject<Turno>();
      vi.spyOn(mock, 'consultar').mockReturnValueOnce(lento);
      fixture.componentInstance.refrescar();

      await click('cancelar');
      await click('confirmar-cancelar');
      lento.next(pendiente(11));
      lento.complete();
      await fixture.whenStable();

      expect(texto('cancelado')).toBe('Tu turno 011 fue cancelado');
    });

    it('un 404 en en-espera no reinicia el kiosco', async () => {
      await crear();
      await click('pedir');
      vi.spyOn(mock, 'enEspera').mockReturnValueOnce(
        throwError(() => new TurnoError(404, 'No encontrado')),
      );

      await refrescar();

      expect(texto('mi-turno')).toMatch(/^Tu turno es\s*011$/);
      expect(texto('banner-error')).toBe('No encontrado');
      expect(sessionStorage.getItem(CLAVE_STORAGE)).toBe('11');
    });

    it('"sin conexión" al cancelar se quita cuando vuelve la conexión', async () => {
      await crear();
      await click('pedir');
      const sinConexion = () => throwError(() => new TurnoError(0, 'Sin conexión con el servidor'));
      vi.spyOn(mock, 'cancelar').mockReturnValueOnce(sinConexion());
      vi.spyOn(mock, 'consultar').mockReturnValueOnce(sinConexion());

      await click('cancelar');
      await click('confirmar-cancelar');
      expect(texto('banner-error')).toBe('Sin conexión con el servidor');

      await refrescar();
      expect(el('banner-error')).toBeNull();
      expect(texto('mi-turno')).toMatch(/^Tu turno es\s*011$/);
    });
  });
});
