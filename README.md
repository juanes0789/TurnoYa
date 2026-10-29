# TurnoYa

Fila virtual de turnos — Reto técnico Assessment ChangeMakers · Accenture.

## Qué debe hacer la solución

| Parte    | Alcance |
|----------|---------|
| **Front**   | Una vista para pedir turno y otra para que el asesor llame al siguiente, con los turnos en espera y la espera promedio. |
| **Back**    | Un servicio que asigne los turnos, lleve el orden de la fila y calcule la espera promedio. |
| **Datos**   | Los turnos de la mañana, cargados desde el archivo a una base de datos. |
| **Pruebas** | Pruebas que demuestren que el orden se respeta en todos los casos. |

> **Regla del caso:** los turnos se atienden en orden de llegada, los números no se repiten y no se puede llamar al siguiente si la fila está vacía.

## Stack

- **Front:** Angular (`frontend/`)
- **Back:** Spring Boot (`backend/`)
- **Datos:** archivo de turnos de la mañana (`data/`)
- **Docs:** contrato de la API y decisiones (`docs/`)

## Estructura

```
TurnoYa/
├── frontend/   # App Angular
├── backend/    # API Spring Boot
├── data/       # Archivo de turnos de la mañana
└── docs/       # Contrato de la API (docs/api.md)
```

## Flujo de ramas

```
main                  ← entrega estable (solo recibe merges desde develop)
 └─ develop           ← integración de los equipos
     ├─ front         ← equipo front
     │   └─ feature/front-*
     ├─ back          ← equipo back
     │   └─ feature/back-*
     └─ testing       ← equipo pruebas
         └─ feature/test-*
```

1. Cada persona crea su `feature/*` desde la rama de su equipo:
   ```bash
   git checkout front && git pull
   git checkout -b feature/front-pedir-turno
   ```
2. Al terminar, PR de `feature/*` → rama del equipo (`front`, `back` o `testing`).
3. Cuando la parte del equipo funciona, PR de la rama del equipo → `develop`.
4. Cuando todo integra y las pruebas pasan, PR de `develop` → `main`.

**Reglas:** nadie hace push directo a `main` ni a `develop`; cada equipo trabaja solo dentro de su carpeta; los cambios al contrato de la API se acuerdan en `docs/api.md` antes de programarlos.

## Correr la demo

Requisitos: Java 17 y Node 22.

```bash
# 1. Back (puerto 8080, H2 en memoria, carga data/turnos_hoy.xlsx al arrancar)
cd backend/Backend
./mvnw spring-boot:run

# 2. Front (otra terminal) → http://localhost:4200
cd frontend
npm install
npm start
```

- **Cliente:** http://localhost:4200/turno
- **Asesor:** http://localhost:4200/asesor
- **Swagger del back:** http://localhost:8080/swagger-ui/index.html

Estado al arrancar (lo que debe verse): atendiendo **005**, en espera **006, 008, 009, 010**, espera promedio **12.2 min**, el próximo turno nuevo es el **011**. Reiniciar el back vuelve a este estado.

Sin back: `cd frontend && npm run start:mock` (mismos datos, en memoria).

Pruebas: `cd backend/Backend && ./mvnw test` · `cd frontend && npx ng test --watch=false`.
