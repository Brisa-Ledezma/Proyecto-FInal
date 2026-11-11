import 'dotenv/config';

function requerida(nombre, valorPorDefecto) {
  const valor = process.env[nombre] ?? valorPorDefecto;
  if (valor === undefined) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisá el archivo server/.env`);
  }
  return valor;
}

export const config = {
  puerto: Number(process.env.PORT ?? 3001),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  sessionSecret: requerida('SESSION_SECRET', 'golden-screen-desarrollo'),
  produccion: process.env.NODE_ENV === 'production',

  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'golden_screen',
  },

  admin: {
    email: process.env.ADMIN_EMAIL ?? '',
    password: process.env.ADMIN_PASSWORD ?? '',
  },

  correo: {
    host: process.env.MAIL_HOST ?? '',
    port: Number(process.env.MAIL_PORT ?? 2525),
    user: process.env.MAIL_USER ?? '',
    pass: process.env.MAIL_PASS ?? '',
    remitente: process.env.MAIL_FROM ?? 'Golden Screen Cinema <no-responder@goldenscreen.com.ar>',
  },

  // Reglas de negocio con valores fijos (ver Tabla 12 de la documentación)
  reglas: {
    minutosSesion: 30, // RN-02, RNF-04
    segundosPago: 300, // RN-02: temporizador de pago de 5 minutos
    maxButacasPorReserva: 6, // RN-01
    minutosLimpieza: 15, // RN-12, S-05
    minutosAntesValidacion: 30, // RN-09
    edadMinima: 16, // RN-16
    maxFilas: 20, // RN-11: filas identificadas con letras (A a T)
    maxButacasPorFila: 20,
  },
};
