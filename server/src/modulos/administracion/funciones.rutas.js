import { Router } from 'express';
import { consultar, consultarUno, enTransaccion, pool } from '../../db.js';
import { conflicto, manejar, noEncontrado, verificarCampos } from '../../utils/errores.js';
import { idValido } from '../../utils/validacion.js';
import { aTextoSql, calcularFin, desdeTextoSql, esFechaValida } from '../../utils/fechas.js';
import { cancelarFunciones, enviarAvisos } from './funciones.servicio.js';

export const rutasFunciones = Router();

const CONSULTA = `
  SELECT f.id_funcion, f.id_pelicula, f.id_sala, f.fecha_hora_inicio, f.fecha_hora_fin, f.precio, f.estado,
         p.titulo, p.duracion_min, p.clasificacion, p.afiche, p.genero, s.nombre AS sala,
         (SELECT COUNT(*) FROM entrada e WHERE e.id_funcion = f.id_funcion AND e.estado IN ('VALIDA','UTILIZADA')) AS vendidas,
         (SELECT COUNT(*) FROM reserva r WHERE r.id_funcion = f.id_funcion AND r.estado IN ('PENDIENTE_PAGO','CONFIRMADA')) AS reservas_activas,
         (SELECT SUM(b.habilitada) FROM butaca b JOIN fila fi ON fi.id_fila = b.id_fila WHERE fi.id_sala = f.id_sala) AS capacidad
    FROM funcion f JOIN pelicula p USING (id_pelicula) JOIN sala s USING (id_sala)`;

const aFuncion = (f) => ({
  id: f.id_funcion,
  inicio: f.fecha_hora_inicio,
  fin: f.fecha_hora_fin,
  precio: Number(f.precio),
  estado: f.estado,
  pelicula: { id: f.id_pelicula, titulo: f.titulo, duracionMin: f.duracion_min, clasificacion: f.clasificacion, afiche: f.afiche, genero: f.genero },
  sala: { id: f.id_sala, nombre: f.sala },
  vendidas: f.vendidas,
  capacidad: Number(f.capacidad ?? 0),
  conVentas: f.reservas_activas > 0,
});

/** Valida los datos y calcula inicio y fin (RN-12). */
async function prepararFuncion(cuerpo) {
  const errores = {};
  const idPelicula = idValido(cuerpo.idPelicula);
  const idSala = idValido(cuerpo.idSala);
  const pelicula = idPelicula && await consultarUno('SELECT id_pelicula, titulo, duracion_min, activa FROM pelicula WHERE id_pelicula = ?', [idPelicula]);
  const sala = idSala && await consultarUno('SELECT id_sala FROM sala WHERE id_sala = ?', [idSala]);
  if (!pelicula) errores.idPelicula = 'Elegí una película.';
  else if (!pelicula.activa) errores.idPelicula = 'La película está desactivada: activala para programar funciones.';
  if (!sala) errores.idSala = 'Elegí una sala.';
  if (!esFechaValida(String(cuerpo.fecha ?? ''))) errores.fecha = 'Elegí la fecha.';
  if (!/^\d{2}:\d{2}$/.test(String(cuerpo.hora ?? ''))) errores.hora = 'Elegí la hora de inicio.';
  const precio = Number(cuerpo.precio);
  if (cuerpo.precio === '' || cuerpo.precio === undefined || Number.isNaN(precio) || precio <= 0) errores.precio = 'El precio tiene que ser mayor a 0.'; // CU-11 A2
  else if (precio > 1000000) errores.precio = 'Revisá el precio.';

  let inicio = null;
  let fin = null;
  if (!errores.fecha && !errores.hora) {
    inicio = `${cuerpo.fecha} ${cuerpo.hora}:00`;
    if (desdeTextoSql(inicio) <= new Date()) errores.hora = 'La fecha y la hora ya pasaron. Elegí un horario futuro.'; // CU-11 A2
  }
  if (inicio && pelicula) fin = calcularFin(inicio, pelicula.duracion_min);
  return { errores, datos: { idPelicula, idSala, inicio, fin, precio, duracion: pelicula?.duracion_min } };
}

/** RN-13: busca una función de la misma sala que se superponga con el intervalo. */
async function buscarSuperposicion(cx, { idSala, inicio, fin, excluir = 0 }) {
  const [filas] = await cx.query(
    `SELECT f.id_funcion, p.titulo, s.nombre AS sala,
            DATE_FORMAT(f.fecha_hora_inicio, '%H:%i') AS desde, DATE_FORMAT(f.fecha_hora_fin, '%H:%i') AS hasta,
            DATE_FORMAT(f.fecha_hora_inicio, '%d/%m') AS dia
       FROM funcion f JOIN pelicula p USING (id_pelicula) JOIN sala s USING (id_sala)
      WHERE f.id_sala = ? AND f.estado <> 'CANCELADA' AND f.id_funcion <> ?
        AND f.fecha_hora_inicio < ? AND f.fecha_hora_fin > ?
      ORDER BY f.fecha_hora_inicio LIMIT 1`,
    [idSala, excluir, fin, inicio],
  );
  return filas[0] ?? null;
}

const mensajeConflicto = (c) => `Se superpone con «${c.titulo}» en la ${c.sala}, el ${c.dia} de ${c.desde} a ${c.hasta} (incluye 15 minutos de limpieza).`;

/** CU-11 y CU-12: listado de funciones de una fecha. */
rutasFunciones.get('/', manejar(async (req, res) => {
  const fecha = esFechaValida(req.query.fecha ?? '') ? req.query.fecha : aTextoSql(new Date()).slice(0, 10);
  const idSala = idValido(req.query.sala);
  const funciones = await consultar(
    `${CONSULTA} WHERE DATE(f.fecha_hora_inicio) = ? ${idSala ? 'AND f.id_sala = ?' : ''} ORDER BY s.nombre, f.fecha_hora_inicio`,
    idSala ? [fecha, idSala] : [fecha],
  );
  const salas = await consultar('SELECT id_sala AS id, nombre FROM sala ORDER BY nombre');
  const peliculas = await consultar('SELECT id_pelicula AS id, titulo, duracion_min AS duracionMin FROM pelicula WHERE activa = 1 ORDER BY titulo');
  // Días con funciones alrededor de la fecha, para marcarlos en el calendario.
  const dias = await consultar(
    `SELECT DATE_FORMAT(fecha_hora_inicio, '%Y-%m-%d') AS dia, COUNT(*) AS cantidad FROM funcion
      WHERE estado <> 'CANCELADA' AND fecha_hora_inicio BETWEEN DATE_SUB(?, INTERVAL 62 DAY) AND DATE_ADD(?, INTERVAL 62 DAY)
      GROUP BY dia`,
    [fecha, fecha],
  );
  res.json({ fecha, funciones: funciones.map(aFuncion), salas, peliculas, diasConFunciones: Object.fromEntries(dias.map((d) => [d.dia, d.cantidad])) });
}));

/** Verificación previa para mostrar el fin calculado y el conflicto mientras se completa el formulario. */
rutasFunciones.post('/verificar', manejar(async (req, res) => {
  const { errores, datos } = await prepararFuncion(req.body ?? {});
  if (!datos.inicio || !datos.fin || !datos.idSala) return res.json({ fin: datos.fin, conflicto: null, errores });
  const c = await buscarSuperposicion(pool, { idSala: datos.idSala, inicio: datos.inicio, fin: datos.fin, excluir: idValido(req.body?.excluir) ?? 0 });
  res.json({ fin: datos.fin, conflicto: c && mensajeConflicto(c), errores });
}));

/** RF-13 · CU-11: programa una función sin superposición. */
rutasFunciones.post('/', manejar(async (req, res) => {
  const { errores, datos } = await prepararFuncion(req.body ?? {});
  verificarCampos(errores);
  const id = await enTransaccion(async (cx) => {
    await cx.query('SELECT id_sala FROM sala WHERE id_sala = ? FOR UPDATE', [datos.idSala]); // evita dos altas simultáneas en la misma sala
    const c = await buscarSuperposicion(cx, datos);
    if (c) throw conflicto(mensajeConflicto(c), { codigo: 'SUPERPOSICION', campos: { hora: 'El horario se superpone con otra función de la sala.' } }); // CU-11 A1
    const [r] = await cx.query(
      "INSERT INTO funcion (id_pelicula, id_sala, fecha_hora_inicio, fecha_hora_fin, precio, estado) VALUES (?, ?, ?, ?, ?, 'PROGRAMADA')",
      [datos.idPelicula, datos.idSala, datos.inicio, datos.fin, datos.precio],
    );
    return r.insertId;
  });
  res.status(201).json(aFuncion(await consultarUno(`${CONSULTA} WHERE f.id_funcion = ?`, [id])));
}));

/** RF-14 · CU-12: modifica una función sin ventas (con ventas solo puede cambiar el precio). */
rutasFunciones.put('/:id', manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const actual = id && await consultarUno(`${CONSULTA} WHERE f.id_funcion = ?`, [id]);
  if (!actual) throw noEncontrado('No encontramos esta función.');
  if (actual.estado !== 'PROGRAMADA') throw conflicto('Solo se pueden modificar funciones programadas.');

  const { errores, datos } = await prepararFuncion(req.body ?? {});
  const mismoHorario = datos.inicio === actual.fecha_hora_inicio;
  if (mismoHorario && errores.hora?.includes('ya pasaron')) delete errores.hora;
  verificarCampos(errores);

  const cambiaProgramacion = datos.idSala !== actual.id_sala || !mismoHorario || datos.idPelicula !== actual.id_pelicula;
  if (cambiaProgramacion && actual.reservas_activas > 0) {
    throw conflicto('La función tiene entradas vendidas: no se puede cambiar la película, la sala, la fecha ni el horario. Solo se puede cancelar.', { codigo: 'FUNCION_CON_VENTAS' }); // CU-12 A1, RN-14
  }

  await enTransaccion(async (cx) => {
    await cx.query('SELECT id_sala FROM sala WHERE id_sala = ? FOR UPDATE', [datos.idSala]);
    const c = await buscarSuperposicion(cx, { ...datos, excluir: id });
    if (c) throw conflicto(mensajeConflicto(c), { codigo: 'SUPERPOSICION', campos: { hora: 'El horario se superpone con otra función de la sala.' } }); // CU-12 A2
    await cx.query(
      'UPDATE funcion SET id_pelicula = ?, id_sala = ?, fecha_hora_inicio = ?, fecha_hora_fin = ?, precio = ? WHERE id_funcion = ?',
      [datos.idPelicula, datos.idSala, datos.inicio, datos.fin, datos.precio, id],
    );
  });
  res.json(aFuncion(await consultarUno(`${CONSULTA} WHERE f.id_funcion = ?`, [id])));
}));

/** RF-14 · RN-14: cancela la función, anula reservas y entradas y avisa a los compradores. */
rutasFunciones.post('/:id/cancelar', manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const resultado = await enTransaccion(async (cx) => {
    const [[f]] = await cx.query('SELECT estado FROM funcion WHERE id_funcion = ? FOR UPDATE', [id]);
    if (!f) throw noEncontrado('No encontramos esta función.');
    if (f.estado !== 'PROGRAMADA') throw conflicto('Solo se pueden cancelar funciones programadas.');
    return cancelarFunciones(cx, [id]);
  });
  enviarAvisos(resultado.avisos);
  res.json({ entradasAnuladas: resultado.entradas, avisosEnviados: resultado.avisos.length });
}));
