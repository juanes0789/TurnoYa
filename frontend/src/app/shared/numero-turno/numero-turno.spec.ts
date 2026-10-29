import { TestBed } from '@angular/core/testing';
import { NumeroTurno, formatearNumero } from './numero-turno';

describe('formatearNumero', () => {
  it('rellena con ceros a 3 dígitos', () => {
    expect(formatearNumero(6)).toBe('006');
    expect(formatearNumero(11)).toBe('011');
    expect(formatearNumero(1234)).toBe('1234');
  });
});

describe('NumeroTurno', () => {
  it('muestra el número formateado', async () => {
    const fixture = TestBed.createComponent(NumeroTurno);
    fixture.componentRef.setInput('numero', 6);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('006');
  });
});
