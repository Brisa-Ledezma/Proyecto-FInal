# Golden Screen

Sistema web de venta y reserva de entradas para un cine multisala. Versión 1 (producto mínimo viable).

Trabajo final de Prácticas Profesionalizantes III · Tecnicatura Superior en Análisis de Sistemas.
Integrantes: Regina Bak y Brisa Ledezma.

## Qué hace

| Rol | Funcionalidades |
|---|---|
| **Espectador** | Registrarse con verificación de correo, consultar la cartelera por fecha, elegir de 1 a 6 butacas en el mapa de la sala, pagar (pago simulado) y obtener entradas digitales con código QR. Consultar y cancelar reservas en «Mis entradas». |
| **Encargado de sala** | Validar entradas escaneando el QR con la cámara o tipeando el código impreso, con contador de asistencia por función. |
| **Administrador** | Tablero del día, películas (con afiche), salas con filas y butacas, programación de funciones sin superposición, reportes de ingresos y asistencia, cuentas del personal. |

## Tecnologías

- **Front-end:** React 18 + Vite, React Router, CSS propio con tema claro y oscuro.
- **API REST:** Node.js + Express, sesiones con cookie HttpOnly guardadas en MySQL.
- **Base de datos:** MySQL 8.
- **Otros:** bcrypt para contraseñas, nodemailer para correos, multer para afiches, qrcode y html5-qrcode para las entradas.

## Requisitos

- Node.js 20 o superior.
- MySQL 8 en ejecución.

## Instalación

```bash
git clone https://github.com/Brisa-Ledezma/Proyecto-FInal.git
cd Proyecto-FInal
npm install
```

Crear el archivo `server/.env` a partir de `server/.env.example` y completar al menos:

```env
DB_USER=root
DB_PASSWORD=tu-contraseña-de-mysql
ADMIN_EMAIL=correo-del-administrador
ADMIN_PASSWORD=contraseña-del-administrador
```

Crear la base de datos con datos de ejemplo (borra la base `golden_screen` si ya existe):

```bash
npm run db:setup
```

Levantar la API y el sitio:

```bash
npm run dev
```

Abrir **http://localhost:5173**.

## Probarlo en el celular

```bash
npm run dev:movil
```

Con la computadora y el celular en la misma red Wi-Fi, abrir en el celular la dirección **Network** que muestra la consola (por ejemplo `https://192.168.0.10:5173`). El navegador avisa que el certificado no es de confianza porque es local: hay que aceptarlo una vez. HTTPS es necesario para que el encargado de sala pueda usar la cámara.

## Cuentas de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | el de `ADMIN_EMAIL` | el de `ADMIN_PASSWORD` |
| Encargado de sala | `encargadoSala@gmail.com` | `encargado123` |
| Espectador | `marina.espectadora@gmail.com` | `marina123` |

`npm run db:setup` carga 9 películas en cartel, 4 salas y la programación de 14 días (6 de historial con ventas y asistencia, y 7 hacia adelante) calculada a partir del día en que se ejecuta.

## Pago simulado

No se realiza ningún cobro. El servicio de pago sigue la convención del entorno de pruebas de Mercado Pago:

- Tarjeta Visa `4509 9535 6623 3704`, vencimiento `11/30`, código `123`.
- Titular `APRO` (o cualquier nombre): pago aprobado.
- Titular `FUND`: fondos insuficientes · `SECU`: código de seguridad inválido · `OTHE`: error general.
- Mercado Pago: la cuenta de prueba sin saldo rechaza el pago.

Solo se guardan el medio, el monto, el estado y el número de operación; nunca los datos de la tarjeta.

## Correos

Si `MAIL_HOST` está vacío, la API crea una bandeja de prueba en Ethereal y muestra en la consola el enlace para ver cada correo enviado (confirmación de cuenta y avisos de función cancelada). Para usar Mailtrap, completar `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER` y `MAIL_PASS` con los datos SMTP de la bandeja.

## Pantallas del prototipo

| Pantalla | Ruta | Rol |
|---|---|---|
| P-01 Acceso (iniciar sesión / registrarse) | `/acceso` | Todos |
| P-02 Cartelera | `/` | Público |
| P-03 Detalle de película y funciones | `/pelicula/:id` | Público |
| P-04 Selección de butacas | `/funcion/:id` | Espectador |
| P-05 Pago (simulado) | `/reserva/:id/pago` | Espectador |
| P-06 Confirmación y entrada digital | `/reserva/:id/confirmacion` | Espectador |
| P-07 Mis entradas | `/mis-entradas` | Espectador |
| P-08 Control de ingreso | `/control` | Encargado de sala |
| P-09 Tablero de administración | `/admin` | Administrador |
| P-10 Películas | `/admin/peliculas` | Administrador |
| P-11 Salas y butacas | `/admin/salas` | Administrador |
| P-12 Funciones | `/admin/funciones` | Administrador |
| P-13 Reportes | `/admin/reportes` | Administrador |
| P-14 Personal | `/admin/personal` | Administrador |
| P-15 Mensajes de error y validación | Componentes `Aviso`, `Campo` y notificaciones | Todos |

Además: `/verificar/:token` (confirmación de cuenta), `/privacidad` (política de privacidad) y `/guia-de-estilos` (componentes de la interfaz).

## Reglas de negocio destacadas

- La doble venta se impide en la base de datos: una clave única sobre función, butaca y bloqueo activo rechaza la segunda reserva de la misma butaca (RN-03, RNF-10).
- El fin de cada función es inicio + duración + 15 minutos de limpieza, y dos funciones de la misma sala no pueden superponerse (RN-12, RN-13).
- La sesión vence a los 30 minutos sin actividad y una tarea programada cancela cada minuto las reservas pendientes de sesiones vencidas (RN-02, RF-06).
- Los registros de ingreso y las entradas validadas no pueden modificarse ni eliminarse: lo impiden triggers de la base de datos (RNF-16).
- El control de acceso por rol se aplica en la API: una ruta de administración con sesión de espectador responde 403 (RNF-03).

## Estructura

```
client/                 Front-end (React + Vite)
  src/api/              Cliente de la API REST
  src/componentes/      Componentes de interfaz, compra, administración y marca
  src/contexto/         Sesión, tema y notificaciones
  src/paginas/          Pantallas por rol (publico, espectador, encargado, admin)
  src/estilos/          Tokens de diseño y estilos base
server/                 API REST (Node.js + Express)
  database/             Esquema, triggers y datos de ejemplo
  src/modulos/          Módulos por responsabilidad (Tabla 11 de la documentación)
  src/middlewares/      Sesión, roles, subidas y errores
  src/servicios/        Correo y pasarela de pago simulada
  src/tareas/           Tarea programada de sesiones vencidas
```

## Ramas

- `main`: versiones entregadas, con etiqueta (`v1.0.0`).
- `develop`: integración.
- `feature/*`: una rama por implementación, unida a `develop` al terminarla.
- `release/*`: preparación de cada versión.
