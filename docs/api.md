# Contrato de la API

Base URL: `http://localhost:8080/api`

Front y back ajustan este contrato aquí antes de programar cualquier cambio.

## Modelo `Turno`

```json
{
  "numero": 6,
  "horaSolicitud": "2026-10-29T08:25:00",
  "horaAtencion": null,
  "estado": "PENDIENTE"
}
```

- `numero`: entero, único, nunca se repite ni se reutiliza (aunque el turno esté cancelado).
- `estado`: `PENDIENTE` | `ATENDIDO` | `CANCELADO`.
- Fechas en ISO-8601, hora local. El archivo solo trae horas: se asume la fecha de hoy.

## Endpoints

| Método | Ruta | Respuesta |
|--------|------|-----------|
| `POST` | `/turnos` | `201` con el `Turno` creado (`numero` = máximo existente + 1) |
| `POST` | `/turnos/siguiente` | `200` con el `Turno` atendido · `409` si no hay turnos `PENDIENTE` |
| `PATCH` | `/turnos/{numero}/cancelar` | `200` con el `Turno` en `CANCELADO` · `404` si el número no existe · `409` si no está `PENDIENTE` |
| `GET`  | `/turnos/en-espera` | `200` con `Turno[]` en `PENDIENTE`, ordenados por `horaSolicitud` (desempate por `numero`) |
| `GET`  | `/turnos/actual` | `200` con el último `Turno` atendido · `204` si aún no se ha atendido ninguno |
| `GET`  | `/turnos/espera-promedio` | `200` con `{ "minutos": 12.2 }` |

### Errores

```json
{ "mensaje": "No hay turnos en espera" }
```

## Reglas

- **Orden de llegada:** se atiende por `horaSolicitud`, nunca por la posición en el archivo ni por el número.
- **Números únicos:** un número que ya existe no se vuelve a asignar ni a cargar.
- **Fila vacía:** `POST /turnos/siguiente` sin turnos `PENDIENTE` responde `409` y no cambia nada.
- **Cancelar:** solo un turno `PENDIENTE` se puede cancelar. Sale de la fila, no cuenta para el promedio y su número no se vuelve a asignar. Cancelar un turno `ATENDIDO` o ya `CANCELADO` responde `409` y no cambia nada.
- **Espera promedio:** promedio de `horaAtencion - horaSolicitud` de los turnos `ATENDIDO`, en minutos con un decimal. `CANCELADO` y `PENDIENTE` no cuentan. Sin atendidos: `0`.

## Carga del archivo (`data/turnos_hoy.xlsx`)

Hoja `in`, columnas `numero | hora_solicitud | hora_atencion | estado` (estados en minúscula: `atendido`, `pendiente`, `cancelado`).

El archivo trae casos a propósito; la carga debe:

| Caso en el archivo | Qué hacer |
|---|---|
| Filas fuera de orden (el 9 aparece antes que el 7 y el 8) | Cargar todas; el orden lo da `horaSolicitud`. |
| Número 7 repetido (fila 9 `cancelado` 08:30, fila 10 `pendiente` 08:34) | Conservar la primera; rechazar la fila 10 y reportarla (número duplicado). |
| Turno `cancelado` | Cargarlo, pero no entra a la fila ni al promedio. |

### Estado esperado después de la carga

| Dato | Valor |
|---|---|
| Atendidos | 1, 2, 3, 4, 5 |
| Turno actual | 5 |
| En espera (en orden) | 6, 8, 9, 10 |
| Siguiente en ser llamado | 6 |
| Espera promedio | 12.2 min ((3 + 9 + 14 + 16 + 19) / 5) |
| Próximo número nuevo | 11 |
| Filas rechazadas | 1 (fila 10, número 7 duplicado) |
