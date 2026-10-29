import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { TURNO_API } from './core/turno-api';
import { TurnoHttp } from './core/turno-http';
import { TurnoMock } from './core/turno-mock';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    { provide: TURNO_API, useExisting: environment.useMock ? TurnoMock : TurnoHttp },
  ],
};
