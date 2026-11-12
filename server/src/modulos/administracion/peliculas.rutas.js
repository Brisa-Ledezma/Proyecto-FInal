import { Router } from 'express';
import { consultar, consultarUno, enTransaccion } from '../../db.js';
import { manejar, noEncontrado, verificarCampos } from '../../utils/errores.js';
import { idValido, limpiar } from '../../utils/validacion.js';
import { borrarUpload, guardarUpload, subirAfiche } from '../../middlewares/subidas.js';
import { cancelarFunciones, enviarAvisos } from './funciones.servicio.js';

export const rutasPeliculas = Router();

export const GENEROS = ['Acción', 'Animación', 'Aventura', 'Ciencia ficción', 'Comedia', 'Documental', 'Drama', 'Fantasía', 'Musical', 'Romance', 'Suspenso', 'Terror', 'Thriller'];
const CLASIFICACIONES = ['ATP', '+13', '+16', '+18'];

const aPeliculaAdmin = (p) => ({
  id: p.id_pelicula,
  titulo: p.titulo,
  sinopsis: p.sinopsis,
  genero: p.genero,
  clasificacion: p.clasificacion,
  duracionMin: p.duracion_min,
  afiche: p.afiche,
  activa: Boolean(p.activa),
  funcionesProximas: p.funciones_proximas ?? 0,
});

/** RN-10 y RF-11: validación de los datos de la película. */
function validarPelicula(cuerpo) {
  const errores = {};
  const titulo = limpiar(cuerpo.titulo);
  const sinopsis = limpiar(cuerpo.sinopsis);
  const genero = limpiar(cuerpo.genero);
  const clasificacion = limpiar(cuerpo.clasificacion);
  const duracionTexto = limpiar(cuerpo.duracionMin);
  const duracion = Number(duracionTexto);

  if (!titulo) errores.titulo = 'Completá el título.';
  else if (titulo.length > 150) errores.titulo = 'El título puede tener hasta 150 caracteres.';
  if (!sinopsis) errores.sinopsis = 'Completá la sinopsis.';
  else if (sinopsis.length > 1200) errores.sinopsis = 'La sinopsis puede tener hasta 1200 caracteres.';
  if (!GENEROS.includes(genero)) errores.genero = 'Elegí un género.';
  if (!CLASIFICACIONES.includes(clasificacion)) errores.clasificacion = 'Elegí la clasificación.';
  if (!duracionTexto) errores.duracionMin = 'Completá la duración en minutos.';
  else if (!Number.isInteger(duracion) || duracion <= 0) errores.duracionMin = 'La duración tiene que ser un número entero mayor a 0.';
  else if (duracion > 600) errores.duracionMin = 'Revisá la duración: no puede superar los 600 minutos.';

  return { errores, datos: { titulo, sinopsis, genero, clasificacion, duracion_min: duracion } };
}

const CONSULTA_LISTADO = `
  SELECT p.*,
         (SELECT COUNT(*) FROM funcion f WHERE f.id_pelicula = p.id_pelicula AND f.estado = 'PROGRAMADA' AND f.fecha_hora_inicio > NOW()) AS funciones_proximas
    FROM pelicula p`;

/** CU-09, paso 2: listado de películas. */
rutasPeliculas.get('/', manejar(async (req, res) => {
  const filas = await consultar(`${CONSULTA_LISTADO} ORDER BY p.activa DESC, p.titulo`);
  res.json({ peliculas: filas.map(aPeliculaAdmin), generos: GENEROS, clasificaciones: CLASIFICACIONES });
}));

/** Alta de película con afiche opcional. */
rutasPeliculas.post('/', subirAfiche, manejar(async (req, res) => {
  const { errores, datos } = validarPelicula(req.body ?? {});
  verificarCampos(errores);
  const resultado = await consultar('INSERT INTO pelicula SET ?', [{ ...datos, afiche: await guardarUpload(req.file) }]);
  const pelicula = await consultarUno(`${CONSULTA_LISTADO} WHERE p.id_pelicula = ?`, [resultado.insertId]);
  res.status(201).json(aPeliculaAdmin(pelicula));
}));

/** Modificación de película; permite reemplazar o quitar el afiche. */
rutasPeliculas.put('/:id', subirAfiche, manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const actual = id && await consultarUno('SELECT * FROM pelicula WHERE id_pelicula = ?', [id]);
  if (!actual) throw noEncontrado('No encontramos esta película.');
  const { errores, datos } = validarPelicula(req.body ?? {});
  verificarCampos(errores);

  let afiche = actual.afiche;
  if (req.file) afiche = await guardarUpload(req.file);
  else if (req.body?.quitarAfiche === 'true') afiche = null;

  await consultar('UPDATE pelicula SET ? WHERE id_pelicula = ?', [{ ...datos, afiche }, id]);
  if (afiche !== actual.afiche) await borrarUpload(actual.afiche);
  const pelicula = await consultarUno(`${CONSULTA_LISTADO} WHERE p.id_pelicula = ?`, [id]);
  res.json(aPeliculaAdmin(pelicula));
}));

/** CU-09, A2: qué se ve afectado si se desactiva la película. */
rutasPeliculas.get('/:id/impacto', manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const datos = await consultarUno(
    `SELECT COUNT(DISTINCT f.id_funcion) AS funciones,
            COUNT(e.id_entrada) AS entradas,
            COUNT(DISTINCT r.id_usuario) AS compradores
       FROM funcion f
       LEFT JOIN entrada e ON e.id_funcion = f.id_funcion AND e.estado = 'VALIDA'
       LEFT JOIN reserva r ON r.id_reserva = e.id_reserva
      WHERE f.id_pelicula = ? AND f.estado = 'PROGRAMADA' AND f.fecha_hora_inicio > NOW()`,
    [id],
  );
  res.json({ funciones: datos.funciones, entradas: datos.entradas, compradores: datos.compradores });
}));

/** RN-15: desactiva la película y cancela sus funciones futuras avisando a los compradores. */
rutasPeliculas.post('/:id/desactivar', manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const resultado = await enTransaccion(async (cx) => {
    const [[pelicula]] = await cx.query('SELECT id_pelicula FROM pelicula WHERE id_pelicula = ? FOR UPDATE', [id]);
    if (!pelicula) throw noEncontrado('No encontramos esta película.');
    await cx.query('UPDATE pelicula SET activa = 0 WHERE id_pelicula = ?', [id]);
    const [futuras] = await cx.query(
      "SELECT id_funcion FROM funcion WHERE id_pelicula = ? AND estado = 'PROGRAMADA' AND fecha_hora_inicio > NOW() FOR UPDATE",
      [id],
    );
    return cancelarFunciones(cx, futuras.map((f) => f.id_funcion));
  });
  enviarAvisos(resultado.avisos);
  res.json({ funcionesCanceladas: resultado.funciones, entradasAnuladas: resultado.entradas, avisosEnviados: resultado.avisos.length });
}));

rutasPeliculas.post('/:id/activar', manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const r = await consultar('UPDATE pelicula SET activa = 1 WHERE id_pelicula = ?', [id]);
  if (!r.affectedRows) throw noEncontrado('No encontramos esta película.');
  res.json({ activa: true });
}));
