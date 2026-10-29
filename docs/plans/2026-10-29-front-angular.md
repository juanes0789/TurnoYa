# Front TurnoYa (Angular) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Base compartida del front (proyecto, sistema visual, `TurnoApi`, mock y cliente HTTP) y la vista del cliente `/turno` (kiosco), funcionando desde ya con un mock en memoria sembrado con los datos del archivo.

**Alcance:** este plan es del cliente. La vista `/asesor` la implementa **Juan Felipe** sobre la base compartida (Tasks 1–3); aquí solo queda su ruta con un placeholder.

**Architecture:** Las vistas dependen solo de la interfaz `TurnoApi` (token `TURNO_API`). Dos implementaciones: `TurnoMock` (en memoria, aplica la regla del caso) y `TurnoHttp` (contra `/api`, con proxy a `localhost:8080`). `environment.useMock` decide cuál se inyecta. Estado con signals; refresco por polling cada 3 s.

**Tech Stack:** Angular 21 (standalone, zoneless, signals, control flow, guía de nombres 2025), SCSS, RxJS, Vitest (`ng test`), Node 22. Consultar las skills `angular-core` y `angular-architecture` al implementar.

**Spec:** [`docs/specs/2026-10-29-front-interfaz-design.md`](../specs/2026-10-29-front-interfaz-design.md) · Contrato: [`docs/api.md`](../api.md)

## Global Constraints

- Todo el código del front vive en `frontend/`. No tocar `backend/`, `data/` ni `docs/api.md` desde la rama del front.
- Ramas: Tasks 1–3 en `feature/front-base` (desde `front`), PR → `front` apenas terminen para que Juan Felipe parta de ahí. Tasks 4–5 en `feature/front-pedir-turno` (desde `front` ya con la base), PR → `front`.
- No tocar `frontend/src/app/features/asesor/` después de la Task 1 (es de Juan Felipe).
- Colores: `--bg #FAFAFA`, `--surface #FFFFFF` + borde `#E6E6E6` radio 12px, `--text #1A1A1A`, `--muted #6B6B6B`, `--accent #A100FF` (hover `#7B00C2`), `--warning #B26A00` sobre `#FFF4E0`, `--success #1E7F4F`.
- Tipografía: Inter (interfaz) y JetBrains Mono (números de turno), desde Google Fonts.
- Número de turno: `006` en grande (3 dígitos con ceros), `Turno 6` en texto.
- Polling: `INTERVALO_REFRESCO_MS = 3000`.
- Mensajes de error al usuario: siempre el `mensaje` del back si viene; si no hay conexión, `Sin conexión con el servidor`.
- Responsive: columnas apiladas por debajo de 768px.
- Botones con `data-testid` (listados en cada tarea) para las pruebas del front y del equipo de testing.

## Review Focus

1. **Back caído mientras el cliente espera (status 0 al refrescar)** → banner "Sin conexión con el servidor", se conserva el último estado visible y el polling sigue; al volver la conexión el banner desaparece. Test en Task 3 (mapeo) y Task 4.
2. **`sessionStorage` con un número que el back ya no conoce (404, p. ej. back reiniciado)** → el kiosco vuelve al estado inicial y limpia el storage. Test en Task 4.
3. **El asesor cancela el turno que el cliente está mirando** → el kiosco pasa a "cancelado" en el siguiente refresco. Test en Task 4.
4. **El cliente cancela justo cuando el asesor lo llamó (409)** → banner con el `mensaje` del back y la vista se refresca a "¡Es tu turno!". Test en Task 4.
5. **`sessionStorage` inaccesible (navegación privada o bloqueado: lanza excepción)** → el kiosco funciona igual, solo que sin recuperar el turno al recargar. Test en Task 4.

---

### Task 1: Proyecto Angular, sistema visual y layout

**Files:**
- Delete: `frontend/.gitkeep`
- Create (CLI): `frontend/` con `ng new`
- Create: `frontend/proxy.conf.json`, `frontend/src/environments/environment.ts`
- Modify: `frontend/angular.json` (proxy en `serve.options.proxyConfig`), `frontend/src/index.html` (fuentes, `lang="es"`, título `TurnoYa`), `frontend/src/styles.scss` (tokens), `frontend/src/app/app.ts|html|scss`, `frontend/src/app/app.routes.ts`
- Create: `frontend/src/app/shared/header/header.ts|html|scss`, `frontend/src/app/shared/numero-turno/numero-turno.ts` + `numero-turno.spec.ts`
- Create (placeholders): `frontend/src/app/features/turno/pedir-turno.ts`, `frontend/src/app/features/asesor/panel-asesor.ts`

**Interfaces:**
- Produces: `NumeroTurno` (selector `app-numero-turno`, `numero = input.required<number>()`, `tamano = input<'grande' | 'normal'>('normal')`), `formatearNumero(numero: number): string` exportada desde `numero-turno.ts`; `environment: { useMock: boolean; apiUrl: string }`; rutas `''` → redirect `turno`, `turno` → `PedirTurno`, `asesor` → `PanelAsesor` (lazy `loadComponent`), `**` → redirect `turno`.

- [ ] **Step 1: Crear rama y proyecto**

```bash
git checkout front && git pull && git checkout -b feature/front-base
rm frontend/.gitkeep
ng new turnoya --directory frontend --skip-git --style=scss --routing --ssr=false --zoneless --ai-config=none --package-manager=npm
```
Expected: `frontend/package.json` existe y `cd frontend && npx ng test --watch=false` pasa con el test por defecto.

- [ ] **Step 2: Proxy y environment**

`proxy.conf.json`: `{ "/api": { "target": "http://localhost:8080", "secure": false } }`. `environment.ts`: `{ useMock: true, apiUrl: '/api' }` (se pasa a `false` cuando el back esté arriba).

- [ ] **Step 3: Test fallido de `formatearNumero`**

```ts
it('rellena con ceros a 3 dígitos', () => {
  expect(formatearNumero(6)).toBe('006');
  expect(formatearNumero(11)).toBe('011');
  expect(formatearNumero(1234)).toBe('1234');
});
```
Run: `cd frontend && npx ng test --watch=false --include src/app/shared/numero-turno/numero-turno.spec.ts` → FAIL.

- [ ] **Step 4: Implementar `NumeroTurno` y `formatearNumero`** (`String(n).padStart(3, '0')`; mono, color `--accent`; `grande` ≈ 6rem). Run el mismo comando → PASS.

- [ ] **Step 5: Tokens, fuentes, header y layout**

Tokens de Global Constraints como custom properties en `:root` de `styles.scss`. `Header`: logo "TurnoYa" + `routerLink` a `Pedir turno` y `Asesor` con `routerLinkActive`. `App` = header + `<main><router-outlet/></main>`. Borrar el template de ejemplo del CLI y su test asociado en `app.spec.ts` (dejar un test que verifique que se renderiza el header con el texto `TurnoYa`). Placeholders `PedirTurno` y `PanelAsesor` con un `<h1>` cada uno.

- [ ] **Step 6: Verificar**

Run: `cd frontend && npx ng test --watch=false && npx ng build` → todo PASS, build sin errores.

- [ ] **Step 7: Commit**

```bash
git add frontend && git commit -m "feat(front): proyecto Angular con sistema visual, header y rutas"
```

---

### Task 2: Modelo, `TurnoApi` y `TurnoMock` (la regla del caso)

**Files:**
- Create: `frontend/src/app/core/turno.model.ts`, `frontend/src/app/core/turno-api.ts`, `frontend/src/app/core/turno-mock.ts`
- Test: `frontend/src/app/core/turno-mock.spec.ts`

**Interfaces:**
- Produces (`turno.model.ts`):
  ```ts
  export type EstadoTurno = 'PENDIENTE' | 'ATENDIDO' | 'CANCELADO';
  export interface Turno { numero: number; horaSolicitud: string; horaAtencion: string | null; estado: EstadoTurno; }
  export interface EsperaPromedio { minutos: number; }
  export class TurnoError extends Error { constructor(readonly status: number, mensaje: string) }
  ```
- Produces (`turno-api.ts`):
  ```ts
  export interface TurnoApi {
    pedirTurno(): Observable<Turno>;
    siguiente(): Observable<Turno>;
    cancelar(numero: number): Observable<Turno>;
    consultar(numero: number): Observable<Turno>;
    enEspera(): Observable<Turno[]>;
    actual(): Observable<Turno | null>;
    esperaPromedio(): Observable<EsperaPromedio>;
  }
  export const TURNO_API = new InjectionToken<TurnoApi>('TURNO_API');
  export const RELOJ = new InjectionToken<() => Date>('RELOJ', { providedIn: 'root', factory: () => () => new Date() });
  export const INTERVALO_REFRESCO_MS = 3000;
  ```
- Produces: `@Injectable({ providedIn: 'root' }) export class TurnoMock implements TurnoApi`. Errores siempre como `throwError(() => new TurnoError(status, mensaje))`; observables síncronos (`of`) con copias de los turnos.

**Datos semilla** (fecha = día de `RELOJ()`, horas locales; es el "estado esperado después de la carga" de `docs/api.md`, sin la fila 10 duplicada):

| numero | horaSolicitud | horaAtencion | estado |
|---|---|---|---|
| 1 | 08:02 | 08:05 | ATENDIDO |
| 2 | 08:06 | 08:15 | ATENDIDO |
| 3 | 08:10 | 08:24 | ATENDIDO |
| 4 | 08:15 | 08:31 | ATENDIDO |
| 5 | 08:21 | 08:40 | ATENDIDO |
| 6 | 08:25 | — | PENDIENTE |
| 9 | 08:41 | — | PENDIENTE |
| 7 | 08:30 | — | CANCELADO |
| 8 | 08:38 | — | PENDIENTE |
| 10 | 08:45 | — | PENDIENTE |

Fechas como ISO local sin zona (`2026-10-29T08:25:00`).

**Reglas del mock:**
- `enEspera`: `PENDIENTE` ordenados por `horaSolicitud`, desempate por `numero`.
- `siguiente`: primero de `enEspera` → `ATENDIDO`, `horaAtencion = RELOJ()`. Vacía → `TurnoError(409, 'No hay turnos en espera')`.
- `cancelar(n)`: no existe → `TurnoError(404, 'El turno ${n} no existe')`; no `PENDIENTE` → `TurnoError(409, 'El turno ${n} no está pendiente')`.
- `consultar(n)`: cualquier estado; no existe → 404 con el mismo mensaje.
- `pedirTurno`: `numero = max(todos) + 1`, `horaSolicitud = RELOJ()`, `PENDIENTE`.
- `actual`: el `ATENDIDO` con mayor `horaAtencion`; ninguno → `null`.
- `esperaPromedio`: media de `horaAtencion - horaSolicitud` en minutos de los `ATENDIDO`, redondeada a 1 decimal; ninguno → `0`.

- [ ] **Step 1: Tests fallidos** (TestBed con `{ provide: RELOJ, useValue: () => new Date(2026, 9, 29, 9, 0) }`)

```ts
it('arranca con el estado de la carga', () => {
  expect(numeros(enEspera())).toEqual([6, 8, 9, 10]);
  expect(promedio()).toBe(12.2);
  expect(actual()?.numero).toBe(5);
});
it('atiende en orden 6 → 8 → 9 → 10 y luego responde 409', () => {
  expect([1, 2, 3, 4].map(() => siguiente().numero)).toEqual([6, 8, 9, 10]);
  expect(error(() => mock.siguiente())).toMatchObject({ status: 409, message: 'No hay turnos en espera' });
  expect(actual()?.numero).toBe(10);
});
it('asigna 11, 12 sin repetir y los pone al final de la fila', () => {
  expect(pedir().numero).toBe(11);
  expect(pedir().numero).toBe(12);
  expect(numeros(enEspera())).toEqual([6, 8, 9, 10, 11, 12]);
});
it('cancelar(8) lo saca de la fila y no reutiliza el número', () => {
  expect(cancelar(8).estado).toBe('CANCELADO');
  expect(numeros(enEspera())).toEqual([6, 9, 10]);
  expect(pedir().numero).toBe(11);
});
it('cancelar un atendido, un cancelado o uno inexistente falla sin cambiar nada', () => {
  expect(error(() => mock.cancelar(5))).toMatchObject({ status: 409 });
  expect(error(() => mock.cancelar(7))).toMatchObject({ status: 409 });
  expect(error(() => mock.cancelar(99))).toMatchObject({ status: 404 });
  expect(numeros(enEspera())).toEqual([6, 8, 9, 10]);
});
it('consultar(7) devuelve el 7 cancelado y consultar(99) responde 404', () => {
  expect(consultar(7).estado).toBe('CANCELADO');
  expect(error(() => mock.consultar(99))).toMatchObject({ status: 404 });
});
it('el promedio incluye al recién atendido (6: 08:25 → 09:00 = 35 min)', () => {
  siguiente();
  expect(promedio()).toBe(16);   // (61 + 35) / 6
});
```
Los helpers (`enEspera()`, `siguiente()`, `error(fn)`, `numeros()`…) se suscriben al observable síncrono y devuelven el valor o el `TurnoError`.

Run: `cd frontend && npx ng test --watch=false --include src/app/core/turno-mock.spec.ts` → FAIL.

- [ ] **Step 2: Implementar `turno.model.ts`, `turno-api.ts` y `TurnoMock`** según las reglas de arriba.

- [ ] **Step 3: Verificar** — mismo comando → 7 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/core && git commit -m "feat(front): modelo, TurnoApi y mock con los datos del archivo"
```

---

### Task 3: `TurnoHttp` y selección de implementación

**Files:**
- Create: `frontend/src/app/core/turno-http.ts`
- Test: `frontend/src/app/core/turno-http.spec.ts`
- Modify: `frontend/src/app/app.config.ts`

**Interfaces:**
- Consumes: `TurnoApi`, `TurnoError`, `Turno`, `EsperaPromedio`, `TURNO_API` (Task 2); `environment` (Task 1).
- Produces: `@Injectable({ providedIn: 'root' }) export class TurnoHttp implements TurnoApi`. En `app.config.ts`: `provideHttpClient()` y `{ provide: TURNO_API, useExisting: environment.useMock ? TurnoMock : TurnoHttp }`.

| Método | Petición |
|---|---|
| `pedirTurno()` | `POST {apiUrl}/turnos` (body `{}`) |
| `siguiente()` | `POST {apiUrl}/turnos/siguiente` (body `{}`) |
| `cancelar(n)` | `PATCH {apiUrl}/turnos/{n}/cancelar` (body `{}`) |
| `consultar(n)` | `GET {apiUrl}/turnos/{n}` |
| `enEspera()` | `GET {apiUrl}/turnos/en-espera` |
| `actual()` | `GET {apiUrl}/turnos/actual` — `204`/body vacío → `null` |
| `esperaPromedio()` | `GET {apiUrl}/turnos/espera-promedio` |

Errores: `HttpErrorResponse` → `TurnoError(err.status, err.error?.mensaje ?? (err.status === 0 ? 'Sin conexión con el servidor' : 'Error inesperado del servidor'))`.

- [ ] **Step 1: Tests fallidos** (`provideHttpClient()`, `provideHttpClientTesting()`, `HttpTestingController`)

```ts
it('cancelar(8) hace PATCH /api/turnos/8/cancelar', () => { … expectOne({ method: 'PATCH', url: '/api/turnos/8/cancelar' }) … });
it('actual() devuelve null con 204', () => { … req.flush(null, { status: 204, statusText: 'No Content' }); expect(valor).toBeNull(); });
it('un 409 se convierte en TurnoError con el mensaje del back', () => {
  … req.flush({ mensaje: 'No hay turnos en espera' }, { status: 409, statusText: 'Conflict' });
  expect(err).toMatchObject({ status: 409, message: 'No hay turnos en espera' });
});
it('sin conexión (status 0) da "Sin conexión con el servidor"', () => {
  … req.error(new ProgressEvent('error'));
  expect(err).toMatchObject({ status: 0, message: 'Sin conexión con el servidor' });
});
```
Más un test por cada fila restante de la tabla (método + URL).

Run: `cd frontend && npx ng test --watch=false --include src/app/core/turno-http.spec.ts` → FAIL.

- [ ] **Step 2: Implementar `TurnoHttp`** (un `catchError` común que mapea a `TurnoError`) y el provider en `app.config.ts`.

- [ ] **Step 3: Verificar** — mismo comando → PASS; `npx ng test --watch=false` → todo PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src && git commit -m "feat(front): cliente HTTP del contrato y selección mock/http"
```

- [ ] **Step 5: Publicar la base para Juan Felipe**

```bash
git push -u origin feature/front-base
gh pr create --base front --title "Front: base compartida (proyecto, TurnoApi, mock, HTTP)" --body "Base para /turno y /asesor. /asesor queda como placeholder para Juan Felipe."
```
Expected: PR abierto; tras el merge, Juan Felipe crea su `feature/front-asesor` desde `front`.

---

### Task 4: Vista `/turno` — `PedirTurno`

**Files:**
- Modify: `frontend/src/app/features/turno/pedir-turno.ts` (+ `.html`, `.scss`)
- Test: `frontend/src/app/features/turno/pedir-turno.spec.ts`

**Interfaces:**
- Consumes: `TURNO_API`, `INTERVALO_REFRESCO_MS`, `TurnoError` (Task 2); `NumeroTurno` (Task 1).
- Produces: componente `PedirTurno` (selector `app-pedir-turno`) con métodos públicos `pedir()`, `refrescar()`, `cancelar()`, `reiniciar()`; constante `CLAVE_STORAGE = 'turnoya.miTurno'`.

**Signals:** `miTurno: Turno | null`, `pidiendo: boolean`, `confirmando: boolean`, `delante: number`, `promedio: number`, `error: string | null`; `esperaEstimada = computed(() => Math.round(delante() * promedio()))`.

**Comportamiento:**
- Al crearse: si `sessionStorage[CLAVE_STORAGE]` tiene un número → `consultar(n)`; 404 → borrar clave y estado inicial.
- `pedir()`: ignora si `pidiendo()` o ya hay `miTurno()`; guarda el número en `sessionStorage`.
- `refrescar()` (cada `INTERVALO_REFRESCO_MS` mientras `miTurno()?.estado === 'PENDIENTE'`): `consultar(mi número)`, `enEspera()` → `delante` = posición de mi número, `esperaPromedio()`. Si falla: `error = err.message` y se conserva el último `miTurno`/`delante`/`promedio`; el siguiente refresco exitoso limpia `error`.
- `cancelar()` (tras confirmar): éxito → `miTurno` pasa a `CANCELADO`; error (p. ej. 409 porque lo acaban de llamar) → `error = err.message` y `refrescar()`.
- `reiniciar()` ("Pedir otro turno"): borra `miTurno` y la clave.
- Todo acceso a `sessionStorage` va en `try/catch`: si lanza, el kiosco funciona sin persistencia.

**`data-testid` y textos:**
| testid | Estado | Texto |
|---|---|---|
| `pedir` | inicial | "Pedir turno" / "Asignando…" (disabled mientras `pidiendo`) |
| `mi-turno` | con turno | "Tu turno es" + `NumeroTurno` grande |
| `delante` | PENDIENTE | "Personas delante: 4" |
| `espera` | PENDIENTE | "Espera estimada: ~49 min" |
| `cancelar` | PENDIENTE | "Cancelar mi turno" |
| `confirmar-cancelar` / `descartar-cancelar` | confirmando | "¿Seguro? Perderás tu lugar en la fila" con "Sí, cancelar" / "No" |
| `llamado` | ATENDIDO | "¡Es tu turno!" (verde) |
| `cancelado` | CANCELADO | "Tu turno 011 fue cancelado" |
| `otro` | ATENDIDO o CANCELADO | "Pedir otro turno" |
| `banner-error` | error | "No se pudo asignar el turno, intenta de nuevo" al pedir; el `mensaje` del back al cancelar |

- [ ] **Step 0: Rama** (con el PR de la base ya mergeado en `front`)

```bash
git checkout front && git pull && git checkout -b feature/front-pedir-turno
```

- [ ] **Step 1: Tests fallidos** (TestBed con `TurnoMock`, `RELOJ` fijo, `sessionStorage.clear()` en `beforeEach`)

```ts
it('pedir asigna 011 con 4 personas delante y ~49 min de espera');   // 4 × 12.2 = 48.8 → 49
it('doble pedir solo crea un turno');   // pedir() ×2 → mock.enEspera = [6,8,9,10,11]
it('pasa a "¡Es tu turno!" cuando el asesor lo atiende');   // pedir; mock.siguiente ×5; refrescar()
it('cancelar con confirmación muestra "Tu turno 011 fue cancelado" y "Pedir otro turno"');
it('si el asesor lo cancela, el kiosco muestra "cancelado" al refrescar');   // pedir; mock.cancelar(11); refrescar()
it('al recrear el componente recupera el turno desde sessionStorage');
it('un número guardado que da 404 vuelve al estado inicial y limpia el storage');   // sessionStorage 'turnoya.miTurno' = '99'
it('si pedir falla muestra "No se pudo asignar el turno, intenta de nuevo"');   // espiar pedirTurno → throwError
it('sin conexión al refrescar muestra el banner, conserva 011 y lo quita al reconectar');   // espiar consultar → TurnoError(0,…) una vez
it('cancelar cuando ya lo llamaron muestra el 409 del back y pasa a "¡Es tu turno!"');   // pedir; mock.siguiente ×5; cancelar()
it('con sessionStorage que lanza excepción, pedir sigue funcionando');   // vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw … })
```
Run: `cd frontend && npx ng test --watch=false --include src/app/features/turno/pedir-turno.spec.ts` → FAIL.

- [ ] **Step 2: Implementar `PedirTurno`** con la maqueta de la spec (tarjeta centrada).

- [ ] **Step 3: Verificar** — mismo comando → PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/features/turno && git commit -m "feat(front): kiosco para pedir, consultar y cancelar turno"
```

---

### Task 5: Verificación final y PR

**Files:**
- Modify: `frontend/README.md` (reemplazar el del CLI: cómo correr, `useMock`, proxy, pruebas)

- [ ] **Step 1: Suite y build completos**

Run: `cd frontend && npx ng test --watch=false && npx ng build`
Expected: todos los tests PASS, build sin errores ni warnings de presupuesto.

- [ ] **Step 2: Prueba manual con el mock** (`npx ng serve`)

En `/turno`: pedir → `011`, "Personas delante: 4", "~49 min"; recargar → vuelve al estado inicial (el mock en memoria se reinicia y `consultar(11)` da 404: es el comportamiento esperado; con el back real el 011 se recupera); cancelar → "Tu turno 011 fue cancelado". Capturas con la skill `webapp-testing` si hay tiempo. El flujo "¡Es tu turno!" de punta a punta se prueba con el back real o con el panel de Juan Felipe.

- [ ] **Step 3: README del front y commit**

```bash
git add frontend/README.md && git commit -m "docs(front): cómo correr y probar el front"
```

- [ ] **Step 4: Push y PR → `front`**

```bash
git push -u origin feature/front-pedir-turno
gh pr create --base front --title "Front: vista del cliente /turno" --body "Pedir, consultar y cancelar turno; polling cada 3 s; recupera el turno al recargar."
```
