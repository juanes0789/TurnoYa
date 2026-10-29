import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { TURNO_API } from './core/turno-api';
import { TurnoHttp } from './core/turno-http';

describe('appConfig', () => {
  it('por defecto (useMock: false) inyecta TurnoHttp como TURNO_API', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
    expect(TestBed.inject(TURNO_API)).toBe(TestBed.inject(TurnoHttp));
  });
});
