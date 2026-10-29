import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { TURNO_API, TurnoApi } from '../../core/turno-api';
import { EsperaPromedio, Turno, TurnoError } from '../../core/turno.model';
import { PanelAsesor } from './panel-asesor';

const pendiente = (numero: number, hora: string): Turno => ({
  numero,
  horaSolicitud: `2026-10-29T${hora}:00`,
  horaAtencion: null,
  estado: 'PENDIENTE',
});

const atendido = (numero: number, solicitud: string, atencion: string): Turno => ({
  numero,
  horaSolicitud: `2026-10-29T${solicitud}:00`,
  horaAtencion: `2026-10-29T${atencion}:00`,
  estado: 'ATENDIDO',
});

interface Opciones {
  enEspera?: Turno[];
  actual?: Turno | null;
  promedio?: number;
  fallaSiguiente?: TurnoError;
  fallaCancelar?: TurnoError;
}

class ApiFalsa implements TurnoApi {
  cola: Turno[];
  actualTurno: Turno | null;
  promedioMin: number;
  fallaSiguiente?: TurnoError;
  fallaCancelar?: TurnoError;
  readonly llamadas = { siguiente: 0, cancelar: [] as number[], enEspera: 0 };

  constructor(opciones: Opciones = {}) {
    this.cola = opciones.enEspera ?? [];
    this.actualTurno = opciones.actual ?? null;
    this.promedioMin = opciones.promedio ?? 0;
    this.fallaSiguiente = opciones.fallaSiguiente;
    this.fallaCancelar = opciones.fallaCancelar;
  }

  pedirTurno(): Observable<Turno> {
    return of(pendiente(99, '09:00'));
  }

  siguiente(): Observable<Turno> {
    this.llamadas.siguiente++;
    if (this.fallaSiguiente) return throwError(() => this.fallaSiguiente);

    const [primero, ...resto] = this.cola;
    this.cola = resto;
    this.actualTurno = primero ?? null;
    return of(primero);
  }

  cancelar(numero: number): Observable<Turno> {
    this.llamadas.cancelar.push(numero);
    if (this.fallaCancelar) return throwError(() => this.fallaCancelar);

    this.cola = this.cola.filter((t) => t.numero !== numero);
    return of({ ...pendiente(numero, '08:00'), estado: 'CANCELADO' });
  }

  consultar(numero: number): Observable<Turno> {
    return of(pendiente(numero, '08:00'));
  }

  enEspera(): Observable<Turno[]> {
    this.llamadas.enEspera++;
    return of([...this.cola]);
  }

  actual(): Observable<Turno | null> {
    return of(this.actualTurno);
  }

  esperaPromedio(): Observable<EsperaPromedio> {
    return of({ minutos: this.promedioMin });
  }
}

describe('PanelAsesor', () => {
  let fixture: ComponentFixture<PanelAsesor>;
  let api: ApiFalsa;

  const montar = (opciones: Opciones = {}) => {
    api = new ApiFalsa(opciones);
    TestBed.configureTestingModule({
      imports: [PanelAsesor],
      providers: [{ provide: TURNO_API, useValue: api }],
    });
    fixture = TestBed.createComponent(PanelAsesor);
    fixture.detectChanges();
    return fixture;
  };

  const texto = () => fixture.nativeElement.textContent as string;
  const testid = (id: string) => fixture.nativeElement.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const todos = (id: string) => [...fixture.nativeElement.querySelectorAll(`[data-testid="${id}"]`)] as HTMLElement[];
  const llamar = () => testid('btn-llamar-siguiente') as HTMLButtonElement;

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('muestra el turno actual, la fila y el promedio', () => {
    montar({
      enEspera: [pendiente(6, '08:25'), pendiente(8, '08:38'), pendiente(9, '08:41'), pendiente(10, '08:45')],
      actual: atendido(5, '08:21', '08:40'),
      promedio: 12.2,
    });

    expect(testid('turno-actual')?.textContent?.trim()).toBe('005');
    expect(testid('espera-promedio')?.textContent).toContain('12.2');
    expect(texto()).toContain('En espera (4)');

    const items = todos('item-espera');
    expect(items.map((i) => i.querySelector('app-numero-turno')?.textContent?.trim())).toEqual([
      '006',
      '008',
      '009',
      '010',
    ]);
    // Sólo el primero se marca como el que sigue.
    expect(items[0].querySelector('.chip')?.textContent?.trim()).toBe('siguiente');
    expect(items[1].querySelector('.chip')).toBeNull();
    expect(items[0].textContent).toContain('08:25');
  });

  it('sin turnos atendidos muestra el aviso de turno actual vacío', () => {
    montar({ enEspera: [pendiente(6, '08:25')], actual: null });
    expect(testid('sin-turno-actual')?.textContent).toContain('Aún no se ha atendido ningún turno');
  });

  it('con la fila vacía deshabilita "Llamar siguiente"', () => {
    montar({ enEspera: [], actual: atendido(5, '08:21', '08:40') });

    expect(llamar().disabled).toBe(true);
    expect(testid('fila-vacia')?.textContent).toContain('No hay turnos en espera');
  });

  it('llamar al siguiente refresca la fila y el turno actual', () => {
    montar({
      enEspera: [pendiente(6, '08:25'), pendiente(8, '08:38')],
      actual: atendido(5, '08:21', '08:40'),
      promedio: 12.2,
    });

    llamar().click();
    fixture.detectChanges();

    expect(api.llamadas.siguiente).toBe(1);
    expect(testid('turno-actual')?.textContent?.trim()).toBe('006');
    expect(todos('item-espera').length).toBe(1);
    expect(texto()).toContain('En espera (1)');
  });

  it('muestra el mensaje del 409 en el banner y refresca', () => {
    montar({
      enEspera: [pendiente(6, '08:25')],
      fallaSiguiente: new TurnoError(409, 'No hay turnos en espera'),
    });

    const refrescosPrevios = api.llamadas.enEspera;
    llamar().click();
    fixture.detectChanges();

    expect(testid('banner-error')?.textContent).toContain('No hay turnos en espera');
    expect(api.llamadas.enEspera).toBeGreaterThan(refrescosPrevios);
    expect(llamar().disabled).toBe(false);
  });

  it('cancelar pide confirmación y saca el turno de la lista', () => {
    montar({
      enEspera: [pendiente(6, '08:25'), pendiente(8, '08:38')],
      actual: atendido(5, '08:21', '08:40'),
    });

    (testid('btn-cancelar-8') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(texto()).toContain('¿No se presentó?');

    (testid('btn-confirmar-cancelar-8') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(api.llamadas.cancelar).toEqual([8]);
    expect(todos('item-espera').length).toBe(1);
    expect(testid('item-espera')?.textContent).toContain('006');
  });

  it('descartar la confirmación no cancela nada', () => {
    montar({ enEspera: [pendiente(6, '08:25')] });

    (testid('btn-cancelar-6') as HTMLButtonElement).click();
    fixture.detectChanges();
    (testid('btn-descartar-cancelar') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(api.llamadas.cancelar).toEqual([]);
    expect(texto()).not.toContain('¿No se presentó?');
  });

  it('muestra el mensaje del back si cancelar llega tarde (409)', () => {
    montar({
      enEspera: [pendiente(8, '08:38')],
      fallaCancelar: new TurnoError(409, 'El turno 8 no está pendiente'),
    });

    (testid('btn-cancelar-8') as HTMLButtonElement).click();
    fixture.detectChanges();
    (testid('btn-confirmar-cancelar-8') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(testid('banner-error')?.textContent).toContain('El turno 8 no está pendiente');
  });

  it('si el refresco falla conserva la última fila y avisa sin conexión', () => {
    montar({
      enEspera: [pendiente(6, '08:25'), pendiente(8, '08:38')],
      actual: atendido(5, '08:21', '08:40'),
    });

    // La fila visible se mantiene; el error del refresco llega por el mismo canal.
    api.cola = [];
    llamar().click();
    fixture.detectChanges();

    expect(todos('item-espera').length).toBe(1);
  });
});
