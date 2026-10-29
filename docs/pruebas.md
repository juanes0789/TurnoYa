# Reporte de pruebas — TurnoYa · Equipo 5

Generado el 2026-10-29 sobre la rama `integracion/demo` (la misma que está en `main`).

## Resumen

| | Resultado |
|---|---|
| Front (Angular · Vitest) | **54/54 pruebas automáticas en verde** |
| Cobertura del front | **95.9 % sentencias · 93.8 % ramas · 98.2 % líneas** |
| Back (Spring Boot · JUnit) | 1/1 en verde: la aplicación arranca (`contextLoads`) |
| Flujo completo back + front | Verificado **manualmente** (ver abajo) |

## Pruebas automáticas del front

### Regla del caso (mock con los datos del Excel)

`frontend/src/app/core/turno-mock.spec.ts`

- ✅ arranca con el estado de la carga
- ✅ atiende en orden 6 → 8 → 9 → 10 y luego responde 409
- ✅ asigna 11, 12 sin repetir y los pone al final de la fila
- ✅ cancelar(8) lo saca de la fila y no reutiliza el número
- ✅ cancelar un atendido, un cancelado o uno inexistente falla sin cambiar nada
- ✅ consultar(7) devuelve el 7 cancelado y consultar(99) responde 404
- ✅ el promedio incluye al recién atendido (6: 08:25 → 09:00 = 35 min)
- ✅ devuelve copias: modificar un turno recibido no altera el mock

### Contrato de la API (cliente HTTP)

`frontend/src/app/core/turno-http.spec.ts`

- ✅ pedirTurno() hace () => api.pedirTurno() POST y devuelve el body
- ✅ siguiente() hace () => api.siguiente() POST y devuelve el body
- ✅ cancelar(8) hace () => api.cancelar(8) PATCH y devuelve el body
- ✅ consultar(8) hace () => api.consultar(8) GET y devuelve el body
- ✅ enEspera() hace () => api.enEspera() GET y devuelve el body
- ✅ actual() hace () => api.actual() GET y devuelve el body
- ✅ esperaPromedio() hace () => api.esperaPromedio() GET y devuelve el body
- ✅ actual() devuelve null con 204
- ✅ un 409 se convierte en TurnoError con el mensaje del back
- ✅ sin conexión (status 0) da "Sin conexión con el servidor"
- ✅ un error sin mensaje del back da "Error inesperado del servidor"
- ✅ si el back no responde en TIEMPO_MAXIMO_MS cancela la petición y da "Sin conexión con el servidor"

### Kiosco del cliente `/turno`

`frontend/src/app/features/turno/pedir-turno.spec.ts`

- ✅ pedir asigna 011 con 4 personas delante y ~49 min de espera
- ✅ doble pedir mientras se asigna solo hace una petición
- ✅ mientras llega el primer refresco no muestra "Personas delante: 0"
- ✅ mientras cancela muestra "Cancelando…" y no manda otra cancelación
- ✅ pasa a "¡Es tu turno!" cuando el asesor lo atiende
- ✅ cancelar con confirmación muestra "Tu turno 011 fue cancelado" y "Pedir otro turno"
- ✅ si el asesor lo cancela, el kiosco muestra "cancelado" al refrescar
- ✅ al recrear el componente recupera el turno desde sessionStorage
- ✅ un número guardado que da 404 vuelve al estado inicial y limpia el storage
- ✅ si pedir falla muestra "No se pudo asignar el turno, intenta de nuevo"
- ✅ sin conexión al refrescar muestra el banner, conserva 011 y lo quita al reconectar
- ✅ cancelar cuando ya lo llamaron muestra el 409 del back y pasa a "¡Es tu turno!"
- ✅ con sessionStorage que lanza excepción, pedir sigue funcionando
- ✅ una respuesta vieja del refresco no pisa el turno nuevo
- ✅ una respuesta vieja PENDIENTE no deshace la cancelación
- ✅ un 404 en en-espera no reinicia el kiosco
- ✅ "sin conexión" al cancelar se quita cuando vuelve la conexión

### Kiosco con respuestas reales del back

`frontend/src/app/features/turno/pedir-turno.http.spec.ts`

- ✅ pedir muestra 011 con 4 personas delante y ~49 min
- ✅ un 404 sin cuerpo del back (número guardado que ya no existe) vuelve al inicio

### Panel del asesor `/asesor`

`frontend/src/app/features/asesor/panel-asesor.spec.ts`

- ✅ muestra el estado inicial: atendiendo 005, 4 en espera, 006 como siguiente y 12.2 min
- ✅ llamar siguiente atiende el 006 y deja 3 en espera
- ✅ doble clic mientras llama solo atiende un turno
- ✅ con la fila vacía el botón queda deshabilitado y se ve "No hay turnos en espera"
- ✅ un 409 al llamar muestra el banner con el mensaje del back
- ✅ cancelar el 008 pide confirmación; "No" no cambia nada y "Sí" lo quita de la fila
- ✅ cancelar uno que ya fue atendido muestra el 409 del back y refresca la lista
- ✅ sin conexión muestra el banner, conserva la fila y lo quita al reconectar
- ✅ sin turnos atendidos muestra "Aún no se ha atendido ningún turno"
- ✅ una respuesta vieja del refresco no pisa la fila después de llamar

### Panel con respuestas reales del back

`frontend/src/app/features/asesor/panel-asesor.http.spec.ts`

- ✅ muestra la hora HH:mm de fechas con microsegundos y "sin atendidos" con 204

### Formato del número de turno

`frontend/src/app/shared/numero-turno/numero-turno.spec.ts`

- ✅ rellena con ceros a 3 dígitos
- ✅ muestra el número formateado

### Aplicación

`frontend/src/app/app.spec.ts`

- ✅ renderiza el header con el logo y la navegación

### Configuración (mock / back real)

`frontend/src/app/app.config.spec.ts`

- ✅ por defecto (useMock: false) inyecta TurnoHttp como TURNO_API

## Cobertura del front

```text
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   95.89 |    93.81 |    91.5 |   98.21 |                   
 app               |   73.33 |    91.66 |      20 |   77.77 |                   
  app.config.ts    |     100 |       50 |     100 |     100 | 16                
  app.routes.ts    |      20 |      100 |       0 |   33.33 | 8-13              
 app/core          |   96.38 |    91.89 |      95 |   98.43 |                   
  turno-api.ts     |      60 |      100 |       0 |      75 | 22                
  turno-mock.ts    |   98.18 |     87.5 |     100 |     100 | 91-100            
 ...eatures/asesor |   97.87 |       94 |     100 |     100 |                   
  panel-asesor.ts  |   95.65 |    91.66 |     100 |     100 | 91-126            
 ...features/turno |   95.38 |    93.05 |   90.32 |   97.97 |                   
  pedir-turno.html |   94.25 |      100 |   83.33 |   98.14 | 91                
  pedir-turno.ts   |   96.29 |    91.07 |      92 |   97.87 | 155-157           
-------------------|---------|----------|---------|---------|-------------------
```

Las líneas sin cubrir son la carga diferida de rutas (`app.routes.ts`), la fábrica del reloj real (`turno-api.ts`) y ramas de error poco probables.

## Back

`backend/Backend/src/test/java/com/turnoYa/Backend/BackendApplicationTests.java`: 1 prueba (`contextLoads`), en verde. Verifica que la aplicación arranca con su configuración. **El back no tiene pruebas automáticas de la regla del caso.**

## Verificación manual del flujo completo

Con el back (rama `backend`, H2 en memoria cargada desde `data/turnos_hoy.xlsx`) y el front corriendo juntos, a través del proxy de `ng serve`:

| Paso | Resultado |
|---|---|
| Estado inicial | Actual 5 · en espera 6, 8, 9, 10 · promedio 12.2 min |
| Cliente pide turno | 201, número 11 |
| Consultar el turno 11 | PENDIENTE |
| Cancelar el 8 | 200, CANCELADO |
| Llamar siguiente ×4 | 6 → 9 → 10 → 11 (orden de llegada) |
| Consultar el turno 11 | ATENDIDO |
| Llamar con la fila vacía | 409 "No hay turnos en espera" |
| Cancelar 5 (atendido), 7 (cancelado), 99 (no existe) | 409, 409, 404 |
| Consultar el 7 | CANCELADO (se conservó el primero del archivo; el duplicado se rechazó) |

## Cómo reproducirlo

```bash
cd frontend && npx ng test --watch=false --reporters=verbose --coverage --coverage-reporters=text
cd backend/Backend && ./mvnw test
```

