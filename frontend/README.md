# TurnoYa · Front

Angular 21 (standalone, zoneless, signals) · pruebas con Vitest.

- `/turno`: kiosco del cliente (pedir, consultar y cancelar turno).
- `/asesor`: panel del asesor (a cargo de Juan Felipe).

Diseño: [`docs/specs/2026-10-29-front-interfaz-design.md`](../docs/specs/2026-10-29-front-interfaz-design.md) · Contrato: [`docs/api.md`](../docs/api.md)

## Correr

```bash
npm install          # .npmrc trae legacy-peer-deps (bug de npm 10 con jsdom/vitest)
npx ng serve         # http://localhost:4200
```

### Mock o back real

`src/environments/environment.ts`:

```ts
export const environment = {
  useMock: true,   // true: datos en memoria · false: back en localhost:8080
  apiUrl: '/api',
};
```

- **`useMock: true`** — `TurnoMock` arranca con el estado esperado después de cargar `data/turnos_hoy.xlsx`: atendidos 1–5, en espera 6, 8, 9, 10, promedio 12.2 min, próximo número 11. Vive en memoria **por pestaña**: al recargar se reinicia.
- **`useMock: false`** — `TurnoHttp` llama a `/api/...`; `ng serve` lo redirige a `http://localhost:8080` (`proxy.conf.json`).

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

`pedir`, `mi-turno`, `delante`, `espera`, `cancelar`, `confirmacion`, `confirmar-cancelar`, `descartar-cancelar`, `llamado`, `cancelado`, `otro`, `banner-error`.
