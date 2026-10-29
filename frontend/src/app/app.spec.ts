import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('renderiza el header con el logo y la navegación', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const header = (fixture.nativeElement as HTMLElement).querySelector('app-header');
    expect(header?.textContent).toContain('TurnoYa');
    expect(header?.textContent).toContain('Pedir turno');
    expect(header?.textContent).toContain('Asesor');
  });
});
