import { Router } from 'express';
import { config } from '../../config.js';
import { consultar, consultarUno, enTransaccion } from '../../db.js';
import { conflicto, manejar, noEncontrado, solicitudInvalida } from '../../utils/errores.js';
import { idValido } from '../../utils/validacion.js';
import { requerirRol, ROLES } from '../../middlewares/sesion.js';
import { cancelarReservasPendientes } from './reservas.servicio.js';

export const rutasReservas = Router();
const { maxButacasPorReserva } = config.reglas;

async function datosFuncion(idFuncion) {
  return consultarUno(
    `SELECT f.id_funcion, f.fecha_hora_inicio, f.fecha_hora_fin, f.precio, f.estado, f.id_sala,
            f.fecha_hora_inicio > NOW() AS no_iniciada,
            p.id_pelicula, p.titulo, p.clasificacion, p.duracion_min, p.afiche, p.genero,
            s.nombre AS sala
       FROM funcion f JOIN pelicula p USING (id_pelicula) JOIN sala s USING (id_sala)
      WHERE f.id_funcion = ?`,
    [idFuncion],
  );
}

const resumenFuncion = (f) => ({
  id: f.id_funcion,
  inicio: f.fecha_hora_inicio,
  fin: f.fecha_hora_fin,
  precio: Number(f.precio),
  estado: f.estado,
  reservable: f.estado === 'PROGRAMADA' && Boolean(f.no_iniciada),
  pelicula: { id: f.id_pelicula, titulo: f.titulo, clasificacion: f.clasificacion, duracionMin: f.duracion_min, afiche: f.afiche, genero: f.genero },
  sala: { id: f.id_sala, nombre: f.sala },
});

/** RF-04 · CU-04, paso 2: mapa de butacas por filas con el estado de cada una. */
rutasReservas.get('/funciones/:id/butacas', requerirRol(ROLES.ESPECTADOR), manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const funcion = id && await datosFuncion(id);
  if (!funcion) throw noEncontrado('No encontramos esta función.');

  const butacas = await consultar(
    `SELECT b.id_butaca, fi.letra, fi.orden, b.numero, b.habilitada,
            r.estado AS estado_reserva, r.id_usuario
       FROM butaca b
       JOIN fila fi ON fi.id_fila = b.id_fila
       LEFT JOIN reserva_butaca rb ON rb.id_butaca = b.id_butaca AND rb.id_funcion = ? AND rb.bloqueo = 1
       LEFT JOIN reserva r ON r.id_reserva = rb.id_reserva
      WHERE fi.id_sala = ?
      ORDER BY fi.orden, b.numero`,
    [id, funcion.id_sala],
  );

  const filas = [];
  for (const b of butacas) {
    let estado = 'libre';
    if (!b.habilitada) estado = 'inhabilitada';
    else if (b.estado_reserva === 'CONFIRMADA') estado = 'ocupada';
    else if (b.estado_reserva === 'PENDIENTE_PAGO') estado = b.id_usuario === req.usuario.id_usuario ? 'propia' : 'bloqueada';
    let fila = filas[filas.length - 1];
    if (!fila || fila.letra !== b.letra) { fila = { letra: b.letra, butacas: [] }; filas.push(fila); }
    fila.butacas.push({ id: b.id_butaca, numero: b.numero, estado });
  }

  const pendiente = await consultarUno(
    "SELECT id_reserva, id_funcion FROM reserva WHERE id_usuario = ? AND estado = 'PENDIENTE_PAGO' ORDER BY id_reserva DESC LIMIT 1",
    [req.usuario.id_usuario],
  );

  res.json({
    funcion: resumenFuncion(funcion),
    filas,
    maxPorReserva: maxButacasPorReserva,
    reservaPendiente: pendiente ? { id: pendiente.id_reserva, idFuncion: pendiente.id_funcion } : null,
  });
}));

/** RF-05 · CU-04, paso 5: crea la reserva pendiente y bloquea las butacas. */
rutasReservas.post('/reservas', requerirRol(ROLES.ESPECTADOR), manejar(async (req, res) => {
  const idFuncion = idValido(req.body?.idFuncion);
  const ids = Array.isArray(req.body?.butacas) ? [...new Set(req.body.butacas.map(idValido))] : [];
  if (!idFuncion) throw solicitudInvalida('Elegí una función.');
  if (ids.length < 1 || ids.includes(null)) throw solicitudInvalida('Elegí al menos una butaca.');
  if (ids.length > maxButacasPorReserva) throw solicitudInvalida(`Podés elegir hasta ${maxButacasPorReserva} butacas por compra.`); // RN-01

  const idUsuario = req.usuario.id_usuario;

  const resultado = await enTransaccion(async (cx) => {
    const [[funcion]] = await cx.query(
      'SELECT id_funcion, id_sala, precio, estado, fecha_hora_inicio > NOW() AS no_iniciada FROM funcion WHERE id_funcion = ? FOR UPDATE',
      [idFuncion],
    );
    if (!funcion) throw noEncontrado('No encontramos esta función.');
    if (funcion.estado !== 'PROGRAMADA' || !funcion.no_iniciada) {
      throw conflicto('Esta función ya comenzó o no está disponible para reservar.', { codigo: 'FUNCION_NO_DISPONIBLE' }); // RN-04
    }

    const [[pendiente]] = await cx.query(
      "SELECT id_reserva, id_funcion FROM reserva WHERE id_usuario = ? AND estado = 'PENDIENTE_PAGO' FOR UPDATE",
      [idUsuario],
    );
    if (pendiente) {
      throw conflicto('Ya tenés una reserva pendiente de pago. Pagala o cancelala antes de hacer otra.', {
        codigo: 'RESERVA_PENDIENTE', datos: { idReserva: pendiente.id_reserva },
      });
    }

    // Las butacas deben ser de la sala de la función y estar habilitadas (RF-12).
    const [validas] = await cx.query(
      `SELECT b.id_butaca FROM butaca b JOIN fila fi ON fi.id_fila = b.id_fila
        WHERE b.id_butaca IN (?) AND fi.id_sala = ? AND b.habilitada = 1`,
      [ids, funcion.id_sala],
    );
    if (validas.length !== ids.length) throw solicitudInvalida('Alguna de las butacas elegidas no se puede reservar.');

    const total = Number(funcion.precio) * ids.length; // RN-05
    const [reserva] = await cx.query(
      "INSERT INTO reserva (id_usuario, id_funcion, estado, total) VALUES (?, ?, 'PENDIENTE_PAGO', ?)",
      [idUsuario, idFuncion, total],
    );

    try {
      // La clave única (función, butaca, bloqueo) rechaza butacas ya tomadas (RN-03, RNF-10).
      await cx.query(
        'INSERT INTO reserva_butaca (id_reserva, id_funcion, id_butaca, bloqueo) VALUES ?',
        [ids.map((idButaca) => [reserva.insertId, idFuncion, idButaca, 1])],
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
      const [tomadas] = await cx.query(
        'SELECT id_butaca FROM reserva_butaca WHERE id_funcion = ? AND id_butaca IN (?) AND bloqueo = 1 AND id_reserva <> ?',
        [idFuncion, ids, reserva.insertId],
      );
      throw conflicto('Otra persona tomó alguna de las butacas mientras elegías. Actualizamos el mapa: elegí otra.', {
        codigo: 'BUTACA_NO_DISPONIBLE', datos: { butacas: tomadas.map((t) => t.id_butaca) },
      });
    }
    return { id: reserva.insertId, total };
  });

  res.status(201).json({ ...resultado, minutosSesion: config.reglas.minutosSesion });
}));

/** RF-09 · CU-07: reservas del espectador, primero las próximas. */
rutasReservas.get('/reservas', requerirRol(ROLES.ESPECTADOR), manejar(async (req, res) => {
  const filas = await consultar(
    `SELECT r.id_reserva, r.estado, r.total, r.fecha_hora_creacion,
            f.id_funcion, f.fecha_hora_inicio, f.fecha_hora_fin, f.estado AS estado_funcion, f.precio,
            f.fecha_hora_fin > NOW() AS vigente,
            p.id_pelicula, p.titulo, p.clasificacion, p.duracion_min, p.afiche, p.genero,
            s.id_sala, s.nombre AS sala,
            (SELECT GROUP_CONCAT(CONCAT(fi.letra, b.numero) ORDER BY fi.orden, b.numero SEPARATOR ' · ')
               FROM reserva_butaca rb JOIN butaca b ON b.id_butaca = rb.id_butaca JOIN fila fi ON fi.id_fila = b.id_fila
              WHERE rb.id_reserva = r.id_reserva) AS butacas,
            (SELECT COUNT(*) FROM reserva_butaca rb WHERE rb.id_reserva = r.id_reserva) AS cantidad
       FROM reserva r
       JOIN funcion f ON f.id_funcion = r.id_funcion
       JOIN pelicula p ON p.id_pelicula = f.id_pelicula
       JOIN sala s ON s.id_sala = f.id_sala
      WHERE r.id_usuario = ?
      ORDER BY (f.fecha_hora_fin > NOW()) DESC,
               CASE WHEN f.fecha_hora_fin > NOW() THEN f.fecha_hora_inicio END ASC,
               f.fecha_hora_inicio DESC`,
    [req.usuario.id_usuario],
  );
  res.json(filas.map((r) => ({
    id: r.id_reserva,
    estado: r.estado,
    total: Number(r.total),
    creada: r.fecha_hora_creacion,
    proxima: Boolean(r.vigente),
    butacas: r.butacas ?? '',
    cantidad: r.cantidad,
    funcion: resumenFuncion({ ...r, sala: r.sala, no_iniciada: r.vigente, estado: r.estado_funcion }),
  })));
}));

/** Detalle de una reserva propia (pago, confirmación y Mis entradas). */
rutasReservas.get('/reservas/:id', requerirRol(ROLES.ESPECTADOR), manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const reserva = id && await consultarUno(
    'SELECT * FROM reserva WHERE id_reserva = ? AND id_usuario = ?',
    [id, req.usuario.id_usuario],
  );
  if (!reserva) throw noEncontrado('No encontramos esta reserva.');

  const funcion = await datosFuncion(reserva.id_funcion);
  const butacas = await consultar(
    `SELECT b.id_butaca, fi.letra, b.numero FROM reserva_butaca rb
       JOIN butaca b ON b.id_butaca = rb.id_butaca JOIN fila fi ON fi.id_fila = b.id_fila
      WHERE rb.id_reserva = ? ORDER BY fi.orden, b.numero`,
    [id],
  );
  const entradas = await consultar(
    `SELECT e.id_entrada, e.codigo_qr, e.estado, e.fecha_hora_ingreso, fi.letra, b.numero
       FROM entrada e JOIN butaca b ON b.id_butaca = e.id_butaca JOIN fila fi ON fi.id_fila = b.id_fila
      WHERE e.id_reserva = ? ORDER BY fi.orden, b.numero`,
    [id],
  );
  const ultimoPago = await consultarUno(
    'SELECT medio, estado, motivo_rechazo, fecha_hora, id_transaccion FROM pago WHERE id_reserva = ? ORDER BY id_pago DESC LIMIT 1',
    [id],
  );

  res.json({
    id: reserva.id_reserva,
    estado: reserva.estado,
    total: Number(reserva.total),
    creada: reserva.fecha_hora_creacion,
    cierre: reserva.fecha_hora_cierre,
    funcion: resumenFuncion(funcion),
    butacas: butacas.map((b) => ({ id: b.id_butaca, fila: b.letra, numero: b.numero })),
    entradas: entradas.map((e) => ({
      id: e.id_entrada, codigo: e.codigo_qr, estado: e.estado, ingreso: e.fecha_hora_ingreso, fila: e.letra, numero: e.numero,
    })),
    ultimoPago: ultimoPago && {
      medio: ultimoPago.medio, estado: ultimoPago.estado, motivo: ultimoPago.motivo_rechazo,
      fecha: ultimoPago.fecha_hora, transaccion: ultimoPago.id_transaccion,
    },
  });
}));

/** RF-07 · CU-06: el espectador cancela su reserva pendiente. */
rutasReservas.post('/reservas/:id/cancelar', requerirRol(ROLES.ESPECTADOR), manejar(async (req, res) => {
  const id = idValido(req.params.id);
  await enTransaccion(async (cx) => {
    const [[reserva]] = await cx.query(
      'SELECT id_reserva, estado FROM reserva WHERE id_reserva = ? AND id_usuario = ? FOR UPDATE',
      [id, req.usuario.id_usuario],
    );
    if (!reserva) throw noEncontrado('No encontramos esta reserva.');
    if (reserva.estado === 'CONFIRMADA') {
      throw conflicto('El pago ya fue aprobado, así que la reserva quedó confirmada y no se puede cancelar.', { codigo: 'YA_CONFIRMADA' }); // CU-06 A2
    }
    if (reserva.estado !== 'PENDIENTE_PAGO') throw conflicto('Esta reserva ya no está pendiente.');
    await cancelarReservasPendientes(cx, [id]);
  });
  res.json({ estado: 'CANCELADA' });
}));
