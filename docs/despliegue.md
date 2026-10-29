# Despliegue de TurnoYa

## Arquitectura recomendada

- Frontend Angular: Vercel.
- API Spring Boot: Render mediante `render.yaml`.
- Base de datos: PostgreSQL administrado, por ejemplo Supabase.

Vercel no incluye Java entre los runtimes oficiales de sus Functions, por lo que la API se ejecuta como un servicio Docker persistente en Render.

## Base de datos PostgreSQL

1. Crea un proyecto PostgreSQL en Supabase.
2. En **Connect**, selecciona **Session pooler** y copia host, puerto, usuario y contraseña.
3. En Render, al crear el Blueprint, configura estos secretos:

```text
DB_URL=jdbc:postgresql://HOST:5432/postgres?sslmode=require
DB_USERNAME=USUARIO_DEL_POOLER
DB_PASSWORD=CONTRASENA
CORS_ALLOWED_ORIGINS=https://TU-FRONT.vercel.app
```

No subas estas credenciales a Git ni las guardes en `application.properties`.

## API en Render

1. Haz commit y push de `render.yaml`, `backend/Backend/Dockerfile` y `data/turnos_hoy.xlsx`.
2. En Render selecciona **New > Blueprint** y conecta el repositorio.
3. Render detectará `render.yaml`, pedirá los secretos y creará el servicio `turnoya-api`.
4. Cuando termine, copia la URL `https://turnoya-api.onrender.com` que muestra Render.
5. Verifica `https://turnoya-api.onrender.com/swagger-ui/index.html`.

## Frontend en Vercel

1. Importa el repositorio como proyecto de Vercel, usando `frontend/` como directorio raíz.
2. Define la variable de entorno del frontend que use tu proyecto para la API con la URL de Render, por ejemplo:

```text
API_URL=https://turnoya-api.onrender.com/api
```

3. Despliega el frontend y copia su URL en `CORS_ALLOWED_ORIGINS` de Render.
4. Redespiega la API después de actualizar esa variable.

## Variables de entorno

| Variable | Uso |
|---|---|
| `SPRING_PROFILES_ACTIVE` | Debe ser `prod` en Render. |
| `PORT` | Render la asigna automáticamente. |
| `DB_URL` | URL JDBC de PostgreSQL con `sslmode=require`. |
| `DB_USERNAME` | Usuario de PostgreSQL/Supabase. |
| `DB_PASSWORD` | Contraseña de PostgreSQL/Supabase. |
| `CORS_ALLOWED_ORIGINS` | URL exacta del frontend en Vercel. |
| `TURNOYA_DATA_FILE` | Archivo inicial de turnos dentro del contenedor. |
