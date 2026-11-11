import { Router } from 'express';
import { config } from '../../config.js';
import { consultar, consultarUno, enTransaccion } from '../../db.js';
import { conflicto, manejar, noEncontrado, verificarCampos } from '../../utils/errores.js';
import { enteroEnRango, idValido, limpiar } from '../../utils/validacion.js';
import { generarPlano, letraDeFila } from '../../utils/plano.js';

export const rutasSalas = Router();
const { maxFilas, maxButacasPorFila } = config.reglas;

function validarSala(cuerpo) {
  const errores = {};
  const nombre = limpiar(cuerpo.nombre);
  if (!nombre) errores.nombre = 'Completá el nombre de la sala.';
  else if (nombre.length > 40) errores.nombre = 'El nombre puede tener hasta 40 caracteres.';
  const filas = enteroEnRango(errores, 'filas', cuerpo.filas, { min: 1, max: maxFilas, mensaje: `La cantidad de filas tiene que ser un número entre 1 y ${maxFilas}.` });
  const porFila = enteroEnRango(errores, 'butacasPorFila', cuerpo.butacasPorFila, { min: 1, max: maxButacasPorFila, mensaje: `Las butacas por fila tienen que ser un número entre 1 y ${maxButacasPorFila}.` });
  const inhabilitadas = Array.isArray(cuerpo.inhabilitadas)
    ? [...new Set(cuerpo.inhabilitadas.map((x) => String(x).toUpperCase()))].filter((x) => /^[A-T]\d{1,2}$/.test(x))
    : [];
  if (filas && porFila && inhabilitadas.length >= filas * porFila) errores.inhabilitadas = 'La sala tiene que tener al menos una butaca habilitada.';
  return { errores, datos: { nombre, filas, porFila, inhabilitadas } };
}

async function resumenSalas(idSala) {
  return consultar(
    `SELECT s.id_sala, s.nombre,
            (SELECT COUNT(*) FROM fila fi WHERE fi.id_sala = s.id_sala) AS filas,
            (SELECT MAX(b.numero) FROM butaca b JOIN fila fi ON fi.id_fila = b.id_fila WHERE fi.id_sala = s.id_sala) AS por_fila,
            (SELECT SUM(b.habilitada) FROM butaca b JOIN fila fi ON fi.id_fila = b.id_fila WHERE fi.id_sala = s.id_sala) AS capacidad,
            (SELECT COUNT(*) FROM funcion f WHERE f.id_sala = s.id_sala AND f.estado = 'PROGRAMADA' AND f.fecha_hora_inicio > NOW()) AS funciones_futuras,
            (SELECT COUNT(DISTINCT f.id_funcion) FROM funcion f JOIN reserva_butaca rb ON rb.id_funcion = f.id_funcion AND rb.bloqueo = 1
              WHERE f.id_sala = s.id_sala AND f.estado = 'PROGRAMADA' AND f.fecha_hora_inicio > NOW()) AS funciones_con_ventas
       FROM sala s ${idSala ? 'WHERE s.id_sala = ?' : ''} ORDER BY s.nombre`,
    idSala ? [idSala] : [],
  );
}

const aSala = (s) => ({
  id: s.id_sala,
  nombre: s.nombre,
  filas: s.filas,
  butacasPorFila: s.por_fila ?? 0,
  capacidad: Number(s.capacidad ?? 0), // RN-11: butacas habilitadas
  funcionesFuturas: s.funciones_futuras,
  funcionesConVentas: s.funciones_con_ventas,
});

rutasSalas.get('/', manejar(async (req, res) => {
  res.json({ salas: (await resumenSalas()).map(aSala), limites: { maxFilas, maxButacasPorFila } });
}));

/** Plano de la sala (CU-10, paso 4). */
rutasSalas.get('/:id', manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const [sala] = id ? await resumenSalas(id) : [];
  if (!sala) throw noEncontrado('No encontramos esta sala.');
  const butacas = await consultar(
    `SELECT fi.letra, b.numero, b.habilitada FROM butaca b JOIN fila fi ON fi.id_fila = b.id_fila
      WHERE fi.id_sala = ? ORDER BY fi.orden, b.numero`,
    [id],
  );
  res.json({ ...aSala(sala), inhabilitadas: butacas.filter((b) => !b.habilitada).map((b) => `${b.letra}${b.numero}`) });
}));

/** RF-12 · CU-10: alta de sala con su plano. */
rutasSalas.post('/', manejar(async (req, res) => {
  const { errores, datos } = validarSala(req.body ?? {});
  verificarCampos(errores);
  const existe = await consultarUno('SELECT id_sala FROM sala WHERE nombre = ?', [datos.nombre]);
  if (existe) verificarCampos({ nombre: 'Ya existe una sala con ese nombre.' });
  const id = await enTransaccion(async (cx) => {
    const [r] = await cx.query('INSERT INTO sala (nombre) VALUES (?)', [datos.nombre]);
    await generarPlano(cx, r.insertId, datos.filas, datos.porFila, datos.inhabilitadas);
    return r.insertId;
  });
  const [sala] = await resumenSalas(id);
  res.status(201).json(aSala(sala));
}));

/** Modificación: nombre, estructura (con las restricciones de CU-10 A2) e inhabilitación de butacas. */
rutasSalas.put('/:id', manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const { errores, datos } = validarSala(req.body ?? {});
  verificarCampos(errores);
  const repetida = await consultarUno('SELECT id_sala FROM sala WHERE nombre = ? AND id_sala <> ?', [datos.nombre, id]);
  if (repetida) verificarCampos({ nombre: 'Ya existe una sala con ese nombre.' });

  await enTransaccion(async (cx) => {
    const [[sala]] = await cx.query('SELECT id_sala FROM sala WHERE id_sala = ? FOR UPDATE', [id]);
    if (!sala) throw noEncontrado('No encontramos esta sala.');
    const [filasActuales] = await cx.query('SELECT id_fila, letra, orden FROM fila WHERE id_sala = ? ORDER BY orden', [id]);
    const [[{ porFila: porFilaActual }]] = await cx.query(
      'SELECT MAX(b.numero) AS porFila FROM butaca b JOIN fila fi ON fi.id_fila = b.id_fila WHERE fi.id_sala = ?', [id],
    );
    const cambiaEstructura = filasActuales.length !== datos.filas || porFilaActual !== datos.porFila;

    if (cambiaEstructura) {
      const [[{ conVentas }]] = await cx.query(
        `SELECT COUNT(*) AS conVentas FROM funcion f JOIN reserva_butaca rb ON rb.id_funcion = f.id_funcion AND rb.bloqueo = 1
          WHERE f.id_sala = ? AND f.estado = 'PROGRAMADA' AND f.fecha_hora_inicio > NOW()`, [id],
      );
      if (conVentas > 0) {
        throw conflicto('La sala tiene funciones futuras con entradas vendidas: no se pueden cambiar las filas ni las butacas por fila. Sí podés inhabilitar butacas libres.', { codigo: 'SALA_CON_VENTAS' }); // CU-10 A2
      }
      // Butacas que sobrarían con la nueva estructura
      const [sobrantes] = await cx.query(
        `SELECT b.id_butaca FROM butaca b JOIN fila fi ON fi.id_fila = b.id_fila
          WHERE fi.id_sala = ? AND (fi.orden > ? OR b.numero > ?)`, [id, datos.filas, datos.porFila],
      );
      if (sobrantes.length) {
        const ids = sobrantes.map((b) => b.id_butaca);
        const [[{ usadas }]] = await cx.query('SELECT COUNT(*) AS usadas FROM reserva_butaca WHERE id_butaca IN (?)', [ids]);
        if (usadas > 0) {
          throw conflicto('No se pueden quitar filas ni butacas que ya figuran en reservas del historial. Inhabilitá esas butacas en lugar de quitarlas.', { codigo: 'BUTACAS_CON_HISTORIAL' });
        }
        await cx.query('DELETE FROM butaca WHERE id_butaca IN (?)', [ids]);
        await cx.query('DELETE FROM fila WHERE id_sala = ? AND orden > ?', [id, datos.filas]);
      }
      // Butacas nuevas en las filas existentes y filas nuevas
      for (const fila of filasActuales.filter((f) => f.orden <= datos.filas)) {
        const nuevas = [];
        for (let n = porFilaActual + 1; n <= datos.porFila; n += 1) nuevas.push([fila.id_fila, n, 1]);
        if (nuevas.length) await cx.query('INSERT INTO butaca (id_fila, numero, habilitada) VALUES ?', [nuevas]);
      }
      for (let f = filasActuales.length; f < datos.filas; f += 1) {
        const [r] = await cx.query('INSERT INTO fila (id_sala, letra, orden) VALUES (?, ?, ?)', [id, letraDeFila(f), f + 1]);
        const nuevas = Array.from({ length: datos.porFila }, (_, i) => [r.insertId, i + 1, 1]);
        await cx.query('INSERT INTO butaca (id_fila, numero, habilitada) VALUES ?', [nuevas]);
      }
    }

    // Inhabilitación: no se puede inhabilitar una butaca vendida o bloqueada en una función futura (RF-12).
    const [butacas] = await cx.query(
      `SELECT b.id_butaca, CONCAT(fi.letra, b.numero) AS clave, b.habilitada
         FROM butaca b JOIN fila fi ON fi.id_fila = b.id_fila WHERE fi.id_sala = ?`, [id],
    );
    const aInhabilitar = butacas.filter((b) => b.habilitada && datos.inhabilitadas.includes(b.clave));
    if (aInhabilitar.length) {
      const [ocupadas] = await cx.query(
        `SELECT DISTINCT CONCAT(fi.letra, b.numero) AS clave FROM reserva_butaca rb
           JOIN funcion f ON f.id_funcion = rb.id_funcion JOIN butaca b ON b.id_butaca = rb.id_butaca JOIN fila fi ON fi.id_fila = b.id_fila
          WHERE rb.id_butaca IN (?) AND rb.bloqueo = 1 AND f.estado = 'PROGRAMADA' AND f.fecha_hora_inicio > NOW()`,
        [aInhabilitar.map((b) => b.id_butaca)],
      );
      if (ocupadas.length) {
        throw conflicto(`No se pueden inhabilitar butacas vendidas para funciones futuras: ${ocupadas.map((o) => o.clave).join(', ')}.`, { codigo: 'BUTACAS_VENDIDAS' });
      }
    }
    for (const b of butacas) {
      const habilitada = datos.inhabilitadas.includes(b.clave) ? 0 : 1;
      if (habilitada !== b.habilitada) await cx.query('UPDATE butaca SET habilitada = ? WHERE id_butaca = ?', [habilitada, b.id_butaca]);
    }
    await cx.query('UPDATE sala SET nombre = ? WHERE id_sala = ?', [datos.nombre, id]);
  });

  const [sala] = await resumenSalas(id);
  res.json(aSala(sala));
}));
