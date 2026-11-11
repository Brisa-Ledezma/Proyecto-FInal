import { Router } from 'express';
import { consultar, consultarUno } from '../../db.js';
import { manejar, noEncontrado, solicitudInvalida } from '../../utils/errores.js';
import { aTextoSql, esFechaValida } from '../../utils/fechas.js';
import { idValido } from '../../utils/validacion.js';

export const rutasCartelera = Router();

const hoyTexto = () => aTextoSql(new Date()).slice(0, 10);

// Funciones visibles en la cartelera: programadas, no iniciadas y de películas activas (RF-03, RN-04).
const FUNCIONES_VIGENTES = `
  SELECT f.id_funcion, f.id_pelicula, f.fecha_hora_inicio, f.fecha_hora_fin, f.precio,
         s.id_sala, s.nombre AS sala,
         (SELECT COUNT(*) FROM butaca b JOIN fila fi ON fi.id_fila = b.id_fila
           WHERE fi.id_sala = f.id_sala AND b.habilitada = 1) AS capacidad,
         (SELECT COUNT(*) FROM reserva_butaca rb WHERE rb.id_funcion = f.id_funcion AND rb.bloqueo = 1) AS tomadas
    FROM funcion f
    JOIN sala s ON s.id_sala = f.id_sala
    JOIN pelicula p ON p.id_pelicula = f.id_pelicula
   WHERE f.estado = 'PROGRAMADA' AND f.fecha_hora_inicio > NOW() AND p.activa = 1`;

const aFuncion = (f) => {
  const libres = Math.max(0, f.capacidad - f.tomadas);
  return {
    id: f.id_funcion,
    inicio: f.fecha_hora_inicio,
    fin: f.fecha_hora_fin,
    precio: Number(f.precio),
    sala: { id: f.id_sala, nombre: f.sala },
    capacidad: f.capacidad,
    libres,
    agotada: libres === 0,
  };
};

export const aPelicula = (p) => ({
  id: p.id_pelicula,
  titulo: p.titulo,
  sinopsis: p.sinopsis,
  genero: p.genero,
  clasificacion: p.clasificacion,
  duracionMin: p.duracion_min,
  afiche: p.afiche,
  activa: Boolean(p.activa),
});

/** Próximas fechas (desde hoy) que tienen funciones vigentes. */
async function fechasConFunciones(idPelicula) {
  const filas = await consultar(
    `SELECT DISTINCT DATE_FORMAT(x.fecha_hora_inicio, '%Y-%m-%d') AS dia FROM (${FUNCIONES_VIGENTES}) x
      ${idPelicula ? 'WHERE x.id_pelicula = ?' : ''} ORDER BY dia LIMIT 14`,
    idPelicula ? [idPelicula] : [],
  );
  return filas.map((f) => f.dia);
}

/** RF-03 · CU-03: cartelera de una fecha. */
rutasCartelera.get('/cartelera', manejar(async (req, res) => {
  const fecha = req.query.fecha ?? hoyTexto();
  if (!esFechaValida(fecha)) throw solicitudInvalida('La fecha no es válida.');

  const funciones = await consultar(
    `${FUNCIONES_VIGENTES} AND DATE(f.fecha_hora_inicio) = ? ORDER BY f.fecha_hora_inicio`,
    [fecha],
  );
  const idsPeliculas = [...new Set(funciones.map((f) => f.id_pelicula))];
  const peliculas = idsPeliculas.length
    ? await consultar('SELECT * FROM pelicula WHERE id_pelicula IN (?) ORDER BY titulo', [idsPeliculas])
    : [];

  res.json({
    fecha,
    hoy: hoyTexto(),
    peliculas: peliculas.map((p) => ({
      ...aPelicula(p),
      funciones: funciones.filter((f) => f.id_pelicula === p.id_pelicula).map(aFuncion),
    })),
    proximasFechas: await fechasConFunciones(),
  });
}));

/** CU-03, paso 4: detalle de la película con sus funciones de la fecha elegida. */
rutasCartelera.get('/peliculas/:id', manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const pelicula = id && await consultarUno('SELECT * FROM pelicula WHERE id_pelicula = ? AND activa = 1', [id]);
  if (!pelicula) throw noEncontrado('Esta película no está en cartelera.');

  const fechas = await fechasConFunciones(id);
  const fecha = esFechaValida(req.query.fecha ?? '') ? req.query.fecha : (fechas[0] ?? hoyTexto());
  const funciones = await consultar(
    `${FUNCIONES_VIGENTES} AND f.id_pelicula = ? AND DATE(f.fecha_hora_inicio) = ? ORDER BY f.fecha_hora_inicio`,
    [id, fecha],
  );
  res.json({ ...aPelicula(pelicula), fecha, fechas, funciones: funciones.map(aFuncion) });
}));
