# Contrato de la API

Base URL: `http://localhost:8080/api`

Propuesta inicial — front y back la ajustan aquí antes de programar cualquier cambio.

## Modelo `Turno`

```json
{
  "id": 1,
  "numero": "T-001",
  "horaLlegada": "2026-10-29T08:00:00",
  "horaLlamado": null,
  "estado": "EN_ESPERA"
}
```

- `numero`: único, nunca se repite.
- `estado`: `EN_ESPERA` | `LLAMADO`.
- Fechas en ISO-8601, hora local.

## Endpoints

| Método | Ruta | Respuesta |
|--------|------|-----------|
| `POST` | `/turnos` | `201` con el `Turno` creado |
| `POST` | `/turnos/siguiente` | `200` con el `Turno` llamado · `409` si la fila está vacía |
| `GET`  | `/turnos/en-espera` | `200` con `Turno[]` ordenados por `horaLlegada` (desempate por `id`) |
| `GET`  | `/turnos/espera-promedio` | `200` con `{ "minutos": 4.5 }` |

### Errores

```json
{ "mensaje": "No hay turnos en espera" }
```

## Espera promedio

Promedio de `horaLlamado - horaLlegada` de los turnos ya llamados, en minutos. Si no hay turnos llamados, `0`.
