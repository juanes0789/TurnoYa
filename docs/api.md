# Contrato de la API

Base URL: `http://localhost:8080/api`

Front y back ajustan este contrato antes de programar cambios.

## Modelo `Turno`

```json
{
  "numero": 6,
  "horaSolicitud": "2026-10-29T08:25:00",
  "horaAtencion": null,
  "estado": "PENDIENTE"
}
```

- `numero`: entero, único, nunca se repite ni se reutiliza aunque el turno esté cancelado.
- `estado`: `PENDIENTE` | `ATENDIDO` | `CANCELADO`.
- Fechas en ISO-8601, hora local.
- El archivo de datos contiene únicamente horas; se asume la fecha actual.

## Endpoints

| Método | Ruta | Respuesta |
|--------|------|-----------|
| `POST` | `/turnos` | `201` con el turno creado (`numero` = máximo existente + 1) |
| `POST` | `/turnos/siguiente` | `200` con el turno atendido; `409` si no hay turnos `PENDIENTE` |
| `PATCH` | `/turnos/{numero}/cancelar` | `200` con el turno cancelado; `404` si no existe; `409` si no está `PENDIENTE` |
| `GET` | `/turnos/en-espera` | `200` con turnos `PENDIENTE`, ordenados por `horaSolicitud` y luego `numero` |
| `GET` | `/turnos/actual` | `200` con el último turno atendido; `204` si aún no hay atendidos |
| `GET` | `/turnos/espera-promedio` | `200` con `{ "minutos": 12.2 }` |
| `GET` | `/turnos/{numero}` | `200` con el turno; `404` si no existe |

`{numero}` acepta únicamente dígitos para no entrar en conflicto con las rutas literales.

## Errores

```json
{ "mensaje": "No hay turnos en espera" }
```

## Reglas

- La atención respeta `horaSolicitud`, nunca la posición del archivo ni el número.
- Un número existente no vuelve a asignarse ni cargarse.
- La fila vacía responde `409` sin modificar datos.
- Solo se puede cancelar un turno `PENDIENTE`.
- Los turnos `CANCELADO` no participan en la fila ni en el promedio.
- El promedio es `horaAtencion - horaSolicitud` de turnos `ATENDIDO`, en minutos con un decimal. Sin atendidos devuelve `0`.

## Carga inicial

El archivo `data/turnos_hoy.xlsx` contiene la hoja `in` con las columnas:

```text
numero | hora_solicitud | hora_atencion | estado
```

Los estados del archivo están en minúscula. Las filas se cargan en el orden del archivo, pero la fila se ordena por `horaSolicitud`. Si un número aparece más de una vez, se conserva la primera fila y se reportan las siguientes como rechazadas.
