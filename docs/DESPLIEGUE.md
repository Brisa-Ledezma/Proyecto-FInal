# Despliegue

## Cómo funciona

Subir la rama `test` publica el sistema en producción, sin pasos manuales ni confirmaciones:

```bash
npm run desplegar          # integra develop en test y la sube
```

```
push a test
   │
   ├─ 1. Verificar: npm ci → build del front → API contra un MySQL de prueba → consultas
   ├─ 2. Imagen:    docker build (etapa prod) ──► GitHub Container Registry
   └─ 3. Desplegar: deploy hook ──► Render descarga la imagen ──► espera la versión nueva
```

El avance se ve en la pestaña **Actions** del repositorio, workflow **Desplegar**. Si un paso falla (el build, la API no arranca, la imagen no se construye), los siguientes no corren y producción queda como estaba.

| Parte | Dónde vive | Dirección |
|---|---|---|
| Sitio y API (una sola imagen) | Render, plan gratuito | la que asigna Render, por ejemplo `https://golden-screen.onrender.com` |
| Imagen Docker | GitHub Container Registry | `ghcr.io/brisa-ledezma/golden-screen` (etiquetas `test` y el commit) |
| Base de datos | Aiven for MySQL, plan gratuito | la que asigna Aiven |

El front y la API van en la misma imagen y el mismo dominio: la sesión usa una cookie del propio sitio (HttpOnly, SameSite=Lax). Con el front en otro dominio, como GitHub Pages en el portfolio, esa cookie pasaría a ser de terceros y Safari la bloquea.

Workflows:

| Archivo | Qué hace |
|---|---|
| [.github/workflows/desplegar.yml](../.github/workflows/desplegar.yml) | Verifica, construye, publica y despliega en cada push a `test` |
| [.github/workflows/mantener-despierta.yml](../.github/workflows/mantener-despierta.yml) | Consulta el sitio cada 10 minutos para que Render no lo duerma |

## Configuración inicial (una sola vez)

### 1. Base de datos (Aiven for MySQL)

1. Crear una cuenta en [aiven.io](https://aiven.io) y un servicio **MySQL** con el plan **Free**.
2. Cuando el servicio esté en **Running**, copiar de **Connection information**: Host, Port, User (`avnadmin`) y Password.
3. Descargar el **CA certificate** (archivo `ca.pem`).

No hace falta crear tablas: la primera vez que arranca, la API crea la base `golden_screen`, las tablas, los triggers y los datos de ejemplo. En los arranques siguientes no borra nada; solo aplica cambios de esquema pendientes.

### 2. Primer push a `test`

```bash
npm run desplegar
```

El workflow publica la imagen aunque Render todavía no exista (avisa que falta el deploy hook). Después, en GitHub: **perfil → Packages → golden-screen → Package settings → Change visibility → Public**, para que Render pueda descargarla sin credenciales.

### 3. Servicio en Render

1. Crear una cuenta en [render.com](https://render.com) entrando con GitHub.
2. **New → Web Service → Existing image**, imagen `ghcr.io/brisa-ledezma/golden-screen:test`, plan **Free**.
3. **Settings → Health Check Path**: `/api/salud`.
4. **Environment**: cargar estas variables.

| Variable | Valor |
|---|---|
| `APP_URL` | La dirección del servicio, sin barra final (`https://golden-screen.onrender.com`). Se usa en los enlaces de los correos. |
| `SESSION_SECRET` | Una frase larga y aleatoria (Render la puede generar: **Generate**) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | Los datos de Aiven |
| `DB_NAME` | `golden_screen` |
| `DB_SSL` | `true` |
| `DB_SSL_CA` | El contenido completo de `ca.pem` (pegar el texto, con sus saltos de línea) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | La cuenta del administrador que se crea al sembrar la base |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` | Correo saliente (ver punto 5) |

`PORT`, `NODE_ENV` y la zona horaria ya vienen en la imagen.

5. **Settings → Deploy Hook**: copiar la URL.

### 4. Datos para el pipeline

En GitHub, **Settings → Secrets and variables → Actions**:

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `RENDER_DEPLOY_HOOK_URL` | La URL del deploy hook de Render |
| Variable | `APP_URL` | La dirección pública del sitio, sin barra final |

Desde ese momento cada `npm run desplegar` publica solo.

### 5. Correo

El plan gratuito de Render bloquea la salida por los puertos SMTP 25, 465 y 587 ([aviso de Render](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports)). El **2525** sí funciona, así que el servidor de correo tiene que aceptar ese puerto:

| Opción | `MAIL_HOST` | `MAIL_PORT` | Resultado |
|---|---|---|---|
| Brevo (gratis, 300 correos por día) | `smtp-relay.brevo.com` | `2525` | Los correos llegan de verdad. `MAIL_USER` es el login SMTP, `MAIL_PASS` una **SMTP key** y `MAIL_FROM` un remitente verificado en Brevo. |
| Mailtrap Sandbox | `sandbox.smtp.mailtrap.io` | `2525` | Los correos quedan en la bandeja de pruebas de Mailtrap y no llegan a nadie. |

Sin `MAIL_HOST`, la API intenta usar Ethereal, que en Render no funciona: el registro se completa pero el correo de confirmación no sale, y la cuenta no puede iniciar sesión hasta confirmarse.

## Por qué el sitio casi no se duerme

El plan gratuito de Render apaga el servicio tras 15 minutos sin tráfico y tarda cerca de un minuto en despertarlo. `mantener-despierta.yml` lo consulta cada 10 minutos; con un solo servicio, las 750 horas mensuales gratuitas alcanzan para todo el mes. La consulta a `/api/salud` también toca la base, así que Aiven no la ve inactiva.

Límites:

- GitHub ejecuta los workflows programados solo desde la rama por defecto (`main`): el keep-alive empieza a funcionar cuando ese archivo llega a `main`.
- GitHub puede demorar algunos minutos las ejecuciones programadas.

## Datos de ejemplo en producción

La siembra genera la programación a partir del día del primer arranque (6 días de historial y 7 hacia adelante). Pasada una semana, el administrador programa funciones nuevas desde **Funciones**. Las cuentas de prueba del README (encargado y espectadora) también existen en producción, con las contraseñas publicadas: si el sitio queda abierto al público, conviene cambiarlas o desactivarlas desde **Personal**.

Para volver a sembrar la base de producción desde cero (**borra todos los datos**), correr en la propia computadora `npm run db:setup` con las variables `DB_*`, `DB_SSL`, `DB_SSL_CA`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` de Render en `server/.env`.

## Probar la imagen de producción en la computadora

```bash
cp .env.example .env               # completar las claves
npm run docker:prod                # http://localhost:8080
```

Es la misma imagen que corre en Render, conectada a un MySQL en Docker.
