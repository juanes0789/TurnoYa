import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { TURNO_API } from './core/turno-api';
import { TurnoMock } from './core/turno-mock';

describe('appConfig', () => {
  it('con useMock: true inyecta TurnoMock como TURNO_API', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
    expect(TestBed.inject(TURNO_API)).toBe(TestBed.inject(TurnoMock));
  });
});
