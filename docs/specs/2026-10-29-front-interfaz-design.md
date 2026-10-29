# Front TurnoYa — Diseño de la interfaz

Equipo front · 2026-10-29 · Contrato: [`docs/api.md`](../api.md)

## Objetivo

Dos vistas en Angular que cumplan el reto: una para **pedir turno** y otra para que el **asesor llame al siguiente**, mostrando los turnos en espera y la espera promedio, sin romper nunca la regla del caso (orden de llegada, números únicos, no llamar con la fila vacía).

## Sistema visual

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#FAFAFA` | Fondo de la app |
| `--surface` | `#FFFFFF` + borde `#E6E6E6`, radio 12px | Tarjetas |
| `--text` | `#1A1A1A` | Texto principal |
| `--muted` | `#6B6B6B` | Texto secundario, estado vacío |
| `--accent` | `#A100FF` (hover `#7B00C2`) | Botones primarios, número de turno, "siguiente" |
| `--warning` | `#B26A00` sobre `#FFF4E0` | Banner de error (409, sin conexión) |
| `--success` | `#1E7F4F` | "¡Es tu turno!" |

- Tipografía: **Inter** para la interfaz; **JetBrains Mono** para los números de turno.
- Número de turno: entero mostrado como `Turno 6` (texto) y `006` en grande (3 dígitos con ceros).
- Header compartido: logo "TurnoYa" + navegación `Pedir turno · Asesor`.
- Responsive: en pantallas < 768px las columnas se apilan.

## Vista `/turno` — Kiosco del cliente

```
┌──────────────────────────────┐
│  TurnoYa   Pedir turno·Asesor│
├──────────────────────────────┤
│                              │
│      [   PEDIR TURNO   ]     │
│                              │
└──────────────────────────────┘
          ↓ al pedir
┌──────────────────────────────┐
│        Tu turno es           │
│           011                │
│  Personas delante:  4        │
│  Espera estimada:  ~49 min   │
│                              │
│     [ Cancelar mi turno ]    │
└──────────────────────────────┘
```

| Estado | Qué se ve |
|---|---|
| Inicial | Botón grande "Pedir turno". |
| Pidiendo | Botón deshabilitado con "Asignando…" (evita doble clic = doble turno). |
| Con turno | Número grande, personas delante y espera estimada. Se refresca cada 3 s. |
| Le llamaron | La tarjeta cambia a "¡Es tu turno!" en verde; ya no se puede cancelar. |
| Confirmar cancelación | "Cancelar mi turno" pide confirmación ("¿Seguro? Perderás tu lugar en la fila"). |
| Cancelado | "Tu turno 011 fue cancelado" + botón "Pedir otro turno". |
| Error | Banner ámbar "No se pudo asignar el turno, intenta de nuevo" (o el `mensaje` del 409 al cancelar). |

- **Personas delante** = cantidad de turnos en `GET /turnos/en-espera` que están antes del mío.
- **Espera estimada** = personas delante × espera promedio (redondeado a minutos). Es una estimación del front, no la calcula el back.
- **Estado de mi turno** = `GET /turnos/{numero}` cada 3 s: `ATENDIDO` → "¡Es tu turno!"; `CANCELADO` → "Tu turno fue cancelado" (también si lo canceló el asesor).
- El número del cliente se guarda en `sessionStorage`; al recargar la página el kiosco vuelve a consultarlo con `GET /turnos/{numero}` en vez de perderlo. Si responde `404`, vuelve al estado inicial.

## Vista `/asesor` — Panel del asesor

```
┌───────────────────┬──────────────────────┐
│ Atendiendo ahora  │ En espera (4)            │
│                   │ ▸ 006  08:25 siguiente ✕ │
│       005         │   008  08:38           ✕ │
│                   │   009  08:41           ✕ │
│ [LLAMAR SIGUIENTE]│   010  08:45           ✕ │
│                   │                      │
│ Espera promedio   │                      │
│   12.2 min        │                      │
└───────────────────┴──────────────────────┘
```

| Estado | Qué se ve |
|---|---|
| Normal | Turno actual, botón activo, lista ordenada por `horaSolicitud`; el primero resaltado como "siguiente". |
| Llamando | Botón deshabilitado con "Llamando…" (evita llamar dos veces). |
| Fila vacía | Botón deshabilitado + "No hay turnos en espera" en la lista. |
| 409 del back | Banner ámbar con el `mensaje` del back; la vista se refresca. |
| Sin turno actual | "Aún no se ha atendido ningún turno" (`/turnos/actual` → 204). |
| Cancelar turno | Botón ✕ en cada fila ("No se presentó"), con confirmación. El turno sale de la lista. |
| 409/404 al cancelar | Banner ámbar con el `mensaje` del back (p. ej. lo atendieron mientras tanto); la vista se refresca. |

La lista y el promedio se refrescan cada 3 s y justo después de llamar al siguiente o cancelar.

## Estructura en Angular

```
frontend/src/app/
├── core/
│   ├── turno.model.ts          # Turno, EstadoTurno, EsperaPromedio
│   ├── turno-api.ts            # Interfaz común (token de inyección)
│   ├── turno-http.service.ts   # Implementación HTTP contra /api
│   └── turno-mock.service.ts   # Implementación en memoria con los datos del archivo
├── shared/
│   ├── header/                 # Logo + navegación
│   └── numero-turno/           # Número formateado 006 (reutilizado)
├── features/
│   ├── turno/                  # Vista /turno
│   └── asesor/                 # Vista /asesor
└── app.routes.ts               # '' → /turno, /turno, /asesor
```

- Componentes standalone, signals, zoneless, control flow `@if/@for`.
- `TurnoApi` es un token: `environment.useMock` decide si se inyecta `TurnoHttpService` o `TurnoMockService`. El front avanza sin esperar al back.
- Polling con `timer(0, 3000)` + `switchMap` → `toSignal`.
- Proxy `/api` → `http://localhost:8080` en desarrollo.

## Mock (mientras llega el back)

`TurnoMockService` arranca con el **estado esperado después de la carga** de `docs/api.md` y aplica la misma regla:

- Atendidos 1–5 (actual: 5), en espera 6, 8, 9, 10, promedio 12.2 min, próximo número 11.
- `siguiente()` con la fila vacía lanza el mismo error que el 409.
- `cancelar(numero)` solo sobre `PENDIENTE`; si no, el mismo error que el 409 (o 404 si no existe).
- `consultar(numero)` devuelve el turno en cualquier estado; error 404 si no existe (p. ej. `consultar(99)`).
- Números nuevos = máximo + 1; nunca reutiliza el 7 ni un número cancelado.

## Pruebas del front

| Caso | Dónde |
|---|---|
| El mock arranca con en espera = [6, 8, 9, 10] y promedio 12.2 | `turno-mock.service.spec` |
| `siguiente()` atiende en orden 6 → 8 → 9 → 10 y luego falla con fila vacía | `turno-mock.service.spec` |
| `pedirTurno()` asigna 11, 12… sin repetir | `turno-mock.service.spec` |
| `cancelar(8)` saca el 8 de la fila; el siguiente pedido sigue siendo un número nuevo | `turno-mock.service.spec` |
| `cancelar()` de un turno atendido o ya cancelado falla y no cambia nada | `turno-mock.service.spec` |
| Cancelar desde el panel quita el turno de la lista; desde el kiosco muestra "cancelado" | `asesor.component.spec`, `turno.component.spec` |
| `consultar(7)` devuelve el 7 `CANCELADO` (el primero del archivo); `consultar(99)` falla con 404 | `turno-mock.service.spec` |
| El kiosco pasa a "¡Es tu turno!" cuando `consultar()` devuelve `ATENDIDO` | `turno.component.spec` |
| Botón "Llamar siguiente" deshabilitado con fila vacía | `asesor.component.spec` |
| Banner visible ante 409 | `asesor.component.spec` |
| Doble clic en "Pedir turno" solo crea un turno | `turno.component.spec` |
| Personas delante y espera estimada correctas | `turno.component.spec` |

## Fuera de alcance

Login de asesores, varios servicios/módulos, pantalla TV, WebSocket/SSE (polling es suficiente para el reto).
