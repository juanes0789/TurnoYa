# TurnoYa · Front

Angular 21 (standalone, zoneless, signals) · pruebas con Vitest.

- `/turno`: kiosco del cliente (pedir, consultar y cancelar turno).
- `/asesor`: panel del asesor (a cargo de Juan Felipe).

Diseño: [`docs/specs/2026-10-29-front-interfaz-design.md`](../docs/specs/2026-10-29-front-interfaz-design.md) · Contrato: [`docs/api.md`](../docs/api.md)

## Correr

```bash
npm install          # .npmrc trae legacy-peer-deps (bug de npm 10 con jsdom/vitest)
npm start            # con el back: http://localhost:4200, /api → http://localhost:8080
npm run start:mock   # sin back: datos en memoria
```

### Con el back

Levantar el back (rama `backend`) y luego `npm start`:

```bash
cd backend/Backend && ./mvnw spring-boot:run     # Java 17, puerto 8080, H2 en memoria con data/turnos_hoy.xlsx
```

`ng serve` redirige `/api` a `http://localhost:8080` (`proxy.conf.json`). Si el 8080 está ocupado: `PORT=8090 ./mvnw spring-boot:run` y `npx ng serve --proxy-config <archivo con target http://localhost:8090>`.

### Sin back (mock)

`npm run start:mock` usa `src/environments/environment.mock.ts` (`useMock: true`): `TurnoMock` arranca con el estado esperado después de cargar `data/turnos_hoy.xlsx` (atendidos 1–5, en espera 6, 8, 9, 10, promedio 12.2 min, próximo número 11). Vive en memoria **por pestaña**: al recargar se reinicia.

## Pruebas

```bash
npx ng test --watch=false                                               # todas
npx ng test --watch=false --include src/app/core/turno-mock.spec.ts     # un archivo
```

## Estructura

```
src/app/
├── core/          # Turno, TurnoApi (token TURNO_API), TurnoMock, TurnoHttp
├── shared/        # header, numero-turno (006)
└── features/
    ├── turno/     # /turno — PedirTurno
    └── asesor/    # /asesor — PanelAsesor (Juan Felipe)
```

Las vistas solo inyectan `TURNO_API`; nunca `TurnoMock` ni `TurnoHttp` directamente.

### `data-testid` del kiosco (para el equipo de pruebas)

`pedir`, `mi-turno`, `calculando`, `delante`, `espera`, `cancelar`, `confirmacion`, `confirmar-cancelar`, `descartar-cancelar`, `llamado`, `cancelado`, `otro`, `banner-error`.
