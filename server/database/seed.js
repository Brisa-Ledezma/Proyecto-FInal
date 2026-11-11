// Datos de ejemplo de Golden Screen.
// La programación se genera a partir de la fecha de ejecución: 6 días de historial
// con ventas e ingresos validados, y 7 días de funciones futuras.
import bcrypt from 'bcryptjs';
import { config } from '../src/config.js';
import { aTextoSql } from '../src/utils/fechas.js';
import { generarCodigoEntrada } from '../src/utils/codigos.js';
import { generarPlano } from '../src/utils/plano.js';

// Generador pseudoaleatorio con semilla fija: cada ejecución produce los mismos datos.
let semilla = 20261113;
const azar = () => {
  semilla = (semilla * 1103515245 + 12345) % 2147483648;
  return semilla / 2147483648;
};
const entero = (min, max) => min + Math.floor(azar() * (max - min + 1));
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
const minutos = (n) => n * 60000;

// Películas en cartel en Argentina (fuente: cinesargentinos.com.ar, noviembre de 2026).
// "cartel": se exhiben desde hace una semana. "estreno": se estrenan mañana.
const PELICULAS = [
  { titulo: 'El Gato con Sombrero', genero: 'Animación', clasificacion: 'ATP', duracion_min: 90, grupo: 'cartel',
    sinopsis: 'Una agencia que administra la imaginación envía al Gato a ayudar a dos hermanos que acaban de mudarse a un pueblo nuevo. La misión se complica cuando su sombrero mágico corre peligro.' },
  { titulo: 'Godzilla Minus Zero', genero: 'Ciencia ficción', clasificacion: '+13', duracion_min: 125, grupo: 'cartel',
    sinopsis: 'Dos años después de la guerra, Japón empieza a reconstruirse cuando una nueva amenaza surge del mar y lo obliga a enfrentar otra vez a Godzilla.' },
  { titulo: 'Sacrificio: Los elegidos', genero: 'Acción', clasificacion: '+13', duracion_min: 103, grupo: 'cartel',
    sinopsis: 'Un grupo radical irrumpe en una gala benéfica en busca de un objeto ligado a una antigua profecía. Entre los rehenes, un actor en decadencia ve su última oportunidad de redimirse.' },
  { titulo: 'Entrega al límite', genero: 'Thriller', clasificacion: '+13', duracion_min: 98, grupo: 'cartel',
    sinopsis: 'Un mensajero tiene pocas horas para llevar un órgano a un paciente joven, mientras un jefe criminal hace todo lo posible por quedarse con él.' },
  { titulo: 'Babystar', genero: 'Drama', clasificacion: '+13', duracion_min: 98, grupo: 'cartel',
    sinopsis: 'Una influencer de 16 años, cuya familia convierte cada momento de su vida en contenido, se rebela cuando le anuncian la llegada de un nuevo hermano.' },
  { titulo: 'Caballo Salvaje Nueve', genero: 'Thriller', clasificacion: '+16', duracion_min: 118, grupo: 'estreno',
    sinopsis: 'En 1973, dos agentes de la CIA enviados a la Isla de Pascua deben lidiar con los secretos de viejos compañeros, mientras uno de ellos se involucra con un grupo de estudiantes rebeldes.' },
  { titulo: 'Ebenezer: Los fantasmas de Navidad', genero: 'Fantasía', clasificacion: 'ATP', duracion_min: 116, grupo: 'estreno',
    sinopsis: 'Una nueva versión del clásico de Charles Dickens, contada desde la mirada de Ebenezer Scrooge en el Londres victoriano.' },
  { titulo: 'Cómo robar un banco', genero: 'Acción', clasificacion: '+16', duracion_min: 122, grupo: 'estreno',
    sinopsis: 'Una banda de ladrones que transmite sus asaltos en vivo por internet es perseguida por un agente del FBI y un ingeniero de software.' },
  { titulo: 'Aniquilación', genero: 'Terror', clasificacion: '+16', duracion_min: 92, grupo: 'estreno',
    sinopsis: 'Un grupo de supersoldados modificados genéticamente escapa de un complejo en el desierto, y una soldado veterana debe detenerlos para proteger a su hija.' },
];

// Cuatro salas de entre 80 y 150 butacas, como el caso analizado.
const SALAS = [
  { nombre: 'Sala 1', filas: 10, porFila: 14, inhabilitadas: ['A1', 'A14'], precio: 10500, primeraHora: [14, 0] },
  { nombre: 'Sala 2', filas: 9, porFila: 12, inhabilitadas: ['A1', 'A12'], precio: 10500, primeraHora: [14, 30] },
  { nombre: 'Sala 3', filas: 10, porFila: 15, inhabilitadas: ['A1', 'A15', 'F8'], precio: 12000, primeraHora: [15, 0] },
  { nombre: 'Sala 4', filas: 8, porFila: 11, inhabilitadas: ['A1', 'A11'], precio: 9500, primeraHora: [15, 15] },
];

const NOMBRES = ['Lucía', 'Martín', 'Sofía', 'Joaquín', 'Valentina', 'Tomás', 'Camila', 'Federico', 'Agustina', 'Nicolás',
  'Florencia', 'Matías', 'Micaela', 'Santiago', 'Julieta', 'Facundo', 'Rocío', 'Gonzalo', 'Paula', 'Ignacio',
  'Carolina', 'Leandro', 'Antonella', 'Diego', 'Brenda', 'Lautaro', 'Milagros', 'Franco', 'Daniela', 'Emiliano'];
const APELLIDOS = ['González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Pérez', 'Gómez', 'Díaz', 'Romero', 'Sosa',
  'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Benítez', 'Acosta', 'Medina', 'Herrera', 'Suárez', 'Aguirre'];

const sinAcentos = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function redondearArriba15(fecha) {
  const f = new Date(fecha);
  const resto = f.getMinutes() % 15;
  if (resto !== 0 || f.getSeconds() !== 0) f.setMinutes(f.getMinutes() + (15 - resto), 0, 0);
  return f;
}

async function insertarEnLotes(cx, tabla, columnas, filas) {
  for (let i = 0; i < filas.length; i += 1000) {
    const lote = filas.slice(i, i + 1000);
    if (lote.length) await cx.query(`INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES ?`, [lote]);
  }
}

export async function sembrar(cx) {
  if (!config.admin.email || !config.admin.password) {
    throw new Error('Completá ADMIN_EMAIL y ADMIN_PASSWORD en server/.env antes de crear la base.');
  }
  const ahora = new Date();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const hace = (dias) => aTextoSql(new Date(hoy.getTime() - dias * 86400000 + minutos(entero(540, 1260))));

  // ---------- Usuarios ----------
  const crearUsuario = async (datos) => {
    const [r] = await cx.query('INSERT INTO usuario SET ?', [{ correo_verificado: 1, activo: 1, ...datos }]);
    return r.insertId;
  };
  const idAdmin = await crearUsuario({
    nombre: 'Administración', apellido: 'Golden Screen', email: config.admin.email,
    hash_contrasena: await bcrypt.hash(config.admin.password, 10), rol: 'ADMINISTRADOR', creado_en: hace(30),
  });
  const idEncargado = await crearUsuario({
    nombre: 'Julián', apellido: 'Ferreyra', email: 'encargadoSala@gmail.com',
    hash_contrasena: await bcrypt.hash('encargado123', 10), rol: 'ENCARGADO_SALA', creado_en: hace(28),
  });
  await crearUsuario({
    nombre: 'Romina', apellido: 'Castro', email: 'romina.castro.cine@gmail.com',
    hash_contrasena: await bcrypt.hash('encargada123', 10), rol: 'ENCARGADO_SALA', activo: 0, creado_en: hace(25),
  });
  const idMarina = await crearUsuario({
    nombre: 'Marina', apellido: 'Sosa', email: 'marina.espectadora@gmail.com', fecha_nacimiento: '1999-05-14',
    hash_contrasena: await bcrypt.hash('marina123', 10), rol: 'ESPECTADOR', acepto_privacidad_en: hace(20), creado_en: hace(20),
  });

  const hashDemo = await bcrypt.hash('Clave-demo-2026', 10);
  const compradores = [];
  const correosUsados = new Set();
  for (let i = 0; i < 70; i += 1) {
    const nombre = elegir(NOMBRES);
    const apellido = elegir(APELLIDOS);
    let email = `${sinAcentos(nombre)}.${sinAcentos(apellido)}@example.com`;
    let n = 2;
    while (correosUsados.has(email)) { email = `${sinAcentos(nombre)}.${sinAcentos(apellido)}${n}@example.com`; n += 1; }
    correosUsados.add(email);
    const fechaAlta = hace(entero(8, 60));
    compradores.push(await crearUsuario({
      nombre, apellido, email, rol: 'ESPECTADOR', hash_contrasena: hashDemo,
      fecha_nacimiento: `${entero(1962, 2008)}-${String(entero(1, 12)).padStart(2, '0')}-${String(entero(1, 28)).padStart(2, '0')}`,
      acepto_privacidad_en: fechaAlta, creado_en: fechaAlta,
    }));
  }

  // ---------- Películas ----------
  const peliculas = [];
  for (const { grupo, ...pelicula } of PELICULAS) {
    const [r] = await cx.query('INSERT INTO pelicula SET ?', [pelicula]);
    peliculas.push({ id: r.insertId, grupo, duracion: pelicula.duracion_min });
  }

  // ---------- Salas, filas y butacas ----------
  const salas = [];
  for (const sala of SALAS) {
    const [r] = await cx.query('INSERT INTO sala SET ?', [{ nombre: sala.nombre }]);
    await generarPlano(cx, r.insertId, sala.filas, sala.porFila, sala.inhabilitadas);
    const butacas = await cx.query(
      `SELECT b.id_butaca AS id, f.orden, b.numero, b.habilitada
         FROM butaca b JOIN fila f ON f.id_fila = b.id_fila
        WHERE f.id_sala = ? ORDER BY f.orden, b.numero`, [r.insertId],
    ).then(([filas]) => filas);
    const porFila = [];
    for (const b of butacas) (porFila[b.orden - 1] ??= []).push(b);
    salas.push({ ...sala, id: r.insertId, porFilaButacas: porFila, capacidad: butacas.filter((b) => b.habilitada).length });
  }

  // ---------- Funciones (sin superposición, RN-12 y RN-13) ----------
  const funciones = [];
  for (let d = -6; d <= 7; d += 1) {
    const dia = new Date(hoy.getTime() + d * 86400000);
    const disponibles = peliculas.filter((p) => p.grupo === 'cartel' || d >= 1);
    salas.forEach((sala, s) => {
      let inicio = new Date(dia);
      inicio.setHours(sala.primeraHora[0], sala.primeraHora[1], 0, 0);
      let k = 0;
      while (inicio.getDate() === dia.getDate() && (inicio.getHours() < 23 || (inicio.getHours() === 23 && inicio.getMinutes() <= 15))) {
        const indice = (((d + 6) * 5 + s * 3 + k) % disponibles.length + disponibles.length) % disponibles.length;
        const pelicula = disponibles[indice];
        const fin = new Date(inicio.getTime() + minutos(pelicula.duracion + config.reglas.minutosLimpieza));
        funciones.push({
          id: funciones.length + 1, pelicula, sala, inicio, fin,
          estado: fin < ahora ? 'FINALIZADA' : 'PROGRAMADA',
        });
        inicio = redondearArriba15(new Date(fin.getTime() + minutos(10)));
        k += 1;
      }
    });
  }
  await insertarEnLotes(cx, 'funcion',
    ['id_funcion', 'id_pelicula', 'id_sala', 'fecha_hora_inicio', 'fecha_hora_fin', 'precio', 'estado'],
    funciones.map((f) => [f.id, f.pelicula.id, f.sala.id, aTextoSql(f.inicio), aTextoSql(f.fin), f.sala.precio, f.estado]));

  // ---------- Reservas, pagos, ingresos y entradas ----------
  const reservas = []; const reservaButacas = []; const pagos = []; const ingresos = []; const entradas = [];
  const codigos = new Set();
  const nuevoCodigo = () => { let c; do { c = generarCodigoEntrada(); } while (codigos.has(c)); codigos.add(c); return c; };
  let idPago = 0; let transaccion = 100000;
  const historiaDesde = new Date(hoy.getTime() - 7 * 86400000);

  const buscarBloque = (sala, ocupadas, cantidad) => {
    for (let intento = 0; intento < 40; intento += 1) {
      const fila = sala.porFilaButacas[entero(1, sala.porFilaButacas.length - 1)];
      const desde = entero(0, fila.length - cantidad);
      const bloque = fila.slice(desde, desde + cantidad);
      if (bloque.length === cantidad && bloque.every((b) => b.habilitada && !ocupadas.has(b.id))) return bloque;
    }
    return null;
  };

  const registrarCompra = (funcion, idUsuario, bloque, { conRechazo = false } = {}) => {
    const total = funcion.sala.precio * bloque.length;
    let momentoPago = new Date(funcion.inicio.getTime() - minutos(entero(15, 4320)));
    if (momentoPago > ahora) momentoPago = new Date(ahora.getTime() - minutos(entero(5, 2880)));
    if (momentoPago < historiaDesde) momentoPago = new Date(historiaDesde.getTime() + minutos(entero(600, 1300)));
    const idReserva = reservas.length + 1;
    reservas.push([idReserva, idUsuario, funcion.id, aTextoSql(new Date(momentoPago.getTime() - minutos(3))),
      'CONFIRMADA', total, aTextoSql(momentoPago)]);
    const medio = azar() < 0.7 ? 'TARJETA' : 'MERCADO_PAGO';
    if (conRechazo) {
      idPago += 1; transaccion += 1;
      pagos.push([idPago, idReserva, medio, total, aTextoSql(new Date(momentoPago.getTime() - minutos(1))),
        'RECHAZADO', `TX-SIM-${transaccion}`, elegir(['Fondos insuficientes', 'Código de seguridad inválido'])]);
    }
    idPago += 1; transaccion += 1;
    pagos.push([idPago, idReserva, medio, total, aTextoSql(momentoPago), 'APROBADO', `TX-SIM-${transaccion}`, null]);
    ingresos.push([idPago, funcion.id, idUsuario, total, aTextoSql(momentoPago)]);
    for (const butaca of bloque) {
      reservaButacas.push([idReserva, funcion.id, butaca.id, 1]);
      const ingreso = new Date(funcion.inicio.getTime() - minutos(entero(1, 28)));
      const asistio = ingreso <= ahora && azar() < 0.9;
      entradas.push([idReserva, funcion.id, butaca.id, nuevoCodigo(), asistio ? 'UTILIZADA' : 'VALIDA',
        asistio ? aTextoSql(ingreso) : null, asistio ? idEncargado : null]);
    }
  };

  // Compras de Marina para que "Mis entradas" tenga historial y una próxima función.
  const ocupadasPorFuncion = new Map(funciones.map((f) => [f.id, new Set()]));
  const funcionDeMarinaPasada = funciones.find((f) => f.estado === 'FINALIZADA' && f.inicio.getHours() >= 19);
  const funcionDeMarinaFutura = funciones.filter((f) => f.inicio > new Date(ahora.getTime() + 2 * 86400000) && f.inicio.getHours() >= 18)[0];
  for (const f of [funcionDeMarinaPasada, funcionDeMarinaFutura].filter(Boolean)) {
    const fila = f.sala.porFilaButacas[Math.floor(f.sala.porFilaButacas.length * 0.6)];
    const centro = Math.floor(fila.length / 2);
    const bloque = fila.slice(centro - 1, centro + 1);
    bloque.forEach((b) => ocupadasPorFuncion.get(f.id).add(b.id));
    registrarCompra(f, idMarina, bloque);
  }

  for (const funcion of funciones) {
    const ocupadas = ocupadasPorFuncion.get(funcion.id);
    const empezo = funcion.inicio <= ahora;
    const finDeSemana = [0, 5, 6].includes(funcion.inicio.getDay());
    const noche = funcion.inicio.getHours() >= 19;
    let ocupacion;
    if (empezo) {
      ocupacion = 0.22 + azar() * 0.35 + (finDeSemana ? 0.15 : 0) + (noche ? 0.1 : 0);
    } else {
      const diasHasta = (funcion.inicio - ahora) / 86400000;
      ocupacion = Math.max(0.03, 0.32 - diasHasta * 0.04) * (0.5 + azar()) + (finDeSemana ? 0.06 : 0);
    }
    const objetivo = Math.round(funcion.sala.capacidad * Math.min(ocupacion, 0.92));
    let fallos = 0;
    while (ocupadas.size < objetivo && fallos < 8) {
      const cantidad = Math.min(elegir([1, 2, 2, 2, 2, 3, 3, 4, 4, 5, 6]), objetivo - ocupadas.size);
      const bloque = buscarBloque(funcion.sala, ocupadas, Math.max(cantidad, 1));
      if (!bloque) { fallos += 1; continue; }
      bloque.forEach((b) => ocupadas.add(b.id));
      registrarCompra(funcion, elegir(compradores), bloque, { conRechazo: azar() < 0.08 });

      // Algunas reservas se abandonan sin pagar: quedan canceladas y no bloquean butacas.
      if (azar() < 0.05) {
        const idReserva = reservas.length + 1;
        const momento = new Date(Math.min(funcion.inicio.getTime(), ahora.getTime()) - minutos(entero(60, 2000)));
        reservas.push([idReserva, elegir(compradores), funcion.id, aTextoSql(momento), 'CANCELADA',
          funcion.sala.precio * 2, aTextoSql(new Date(momento.getTime() + minutos(entero(2, 30))))]);
        const libres = funcion.sala.porFilaButacas.flat().filter((b) => b.habilitada && !ocupadas.has(b.id)).slice(0, 2);
        libres.forEach((b) => reservaButacas.push([idReserva, funcion.id, b.id, null]));
      }
    }
  }

  await insertarEnLotes(cx, 'reserva',
    ['id_reserva', 'id_usuario', 'id_funcion', 'fecha_hora_creacion', 'estado', 'total', 'fecha_hora_cierre'], reservas);
  await insertarEnLotes(cx, 'reserva_butaca', ['id_reserva', 'id_funcion', 'id_butaca', 'bloqueo'], reservaButacas);
  await insertarEnLotes(cx, 'pago',
    ['id_pago', 'id_reserva', 'medio', 'monto', 'fecha_hora', 'estado', 'id_transaccion', 'motivo_rechazo'], pagos);
  await insertarEnLotes(cx, 'ingreso', ['id_pago', 'id_funcion', 'id_usuario', 'monto', 'fecha_hora'], ingresos);
  await insertarEnLotes(cx, 'entrada',
    ['id_reserva', 'id_funcion', 'id_butaca', 'codigo_qr', 'estado', 'fecha_hora_ingreso', 'id_usuario_valida'], entradas);

  return {
    totales: {
      usuarios: 4 + compradores.length,
      peliculas: peliculas.length,
      salas: salas.length,
      funciones: funciones.length,
      reservas: reservas.length,
      entradas: entradas.length,
      ingresos: ingresos.length,
    },
    cuentas: [
      { rol: 'Administrador', correo: config.admin.email, contrasena: '(la de ADMIN_PASSWORD en .env)' },
      { rol: 'Encargado de sala', correo: 'encargadoSala@gmail.com', contrasena: 'encargado123' },
      { rol: 'Espectador', correo: 'marina.espectadora@gmail.com', contrasena: 'marina123' },
    ],
    idAdmin,
  };
}
