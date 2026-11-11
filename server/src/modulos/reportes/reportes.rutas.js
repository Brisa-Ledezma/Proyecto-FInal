import { Router } from 'express';
import { consultar, consultarUno } from '../../db.js';
import { manejar, solicitudInvalida } from '../../utils/errores.js';
import { idValido } from '../../utils/validacion.js';
import { aTextoSql, desdeTextoSql, esFechaValida } from '../../utils/fechas.js';

export const rutasReportes = Router();

const hoy = () => aTextoSql(new Date()).slice(0, 10);
const sumarDias = (dia, n) => { const f = desdeTextoSql(dia); f.setDate(f.getDate() + n); return aTextoSql(f).slice(0, 10); };

/** Filtros comunes: rango de fechas, sala y película (CU-13 y CU-14, paso 2). */
function leerFiltros(q) {
  const hasta = esFechaValida(q.hasta ?? '') ? q.hasta : hoy();
  const desde = esFechaValida(q.desde ?? '') ? q.desde : sumarDias(hasta, -6);
  if (desde > hasta) throw solicitudInvalida('La fecha inicial no puede ser posterior a la final.', { campos: { desde: 'Tiene que ser anterior o igual a la fecha final.' } }); // A2
  return { desde, hasta, idSala: idValido(q.sala), idPelicula: idValido(q.pelicula) };
}

function filtroFuncion({ idSala, idPelicula }) {
  const sql = [];
  const params = [];
  if (idSala) { sql.push('f.id_sala = ?'); params.push(idSala); }
  if (idPelicula) { sql.push('f.id_pelicula = ?'); params.push(idPelicula); }
  return { sql: sql.length ? ` AND ${sql.join(' AND ')}` : '', params };
}

async function opcionesFiltro() {
  const [salas, peliculas] = await Promise.all([
    consultar('SELECT id_sala AS id, nombre FROM sala ORDER BY nombre'),
    consultar('SELECT id_pelicula AS id, titulo FROM pelicula ORDER BY titulo'),
  ]);
  return { salas, peliculas };
}

/** RF-15 · CU-13: recaudación por día y por función a partir de los pagos aprobados. */
rutasReportes.get('/ingresos', manejar(async (req, res) => {
  const filtros = leerFiltros(req.query);
  const extra = filtroFuncion(filtros);
  const base = [filtros.desde, filtros.hasta, ...extra.params];
  const DESDE_INGRESOS = `
    FROM ingreso i JOIN funcion f ON f.id_funcion = i.id_funcion
   WHERE DATE(i.fecha_hora) BETWEEN ? AND ? ${extra.sql}`;

  const [totales, porDia, porFuncion] = await Promise.all([
    consultarUno(`SELECT COALESCE(SUM(i.monto), 0) AS total, COUNT(*) AS pagos,
                         (SELECT COUNT(*) FROM entrada e JOIN pago pa ON pa.id_reserva = e.id_reserva JOIN ingreso i2 ON i2.id_pago = pa.id_pago
                           JOIN funcion f ON f.id_funcion = i2.id_funcion
                          WHERE DATE(i2.fecha_hora) BETWEEN ? AND ? ${extra.sql}) AS entradas
                  ${DESDE_INGRESOS}`, [...base, ...base]),
    consultar(`SELECT DATE_FORMAT(i.fecha_hora, '%Y-%m-%d') AS dia, SUM(i.monto) AS total, COUNT(*) AS pagos
                 ${DESDE_INGRESOS} GROUP BY dia ORDER BY dia`, base),
    consultar(`SELECT f.id_funcion, f.fecha_hora_inicio, f.estado, p.titulo, s.nombre AS sala,
                      SUM(i.monto) AS total, COUNT(*) AS pagos,
                      (SELECT COUNT(*) FROM entrada e JOIN reserva r ON r.id_reserva = e.id_reserva JOIN pago pa ON pa.id_reserva = r.id_reserva
                        JOIN ingreso i3 ON i3.id_pago = pa.id_pago
                       WHERE i3.id_funcion = f.id_funcion AND DATE(i3.fecha_hora) BETWEEN ? AND ?) AS entradas
                 ${DESDE_INGRESOS.replace('FROM ingreso i JOIN funcion f ON f.id_funcion = i.id_funcion', 'FROM ingreso i JOIN funcion f ON f.id_funcion = i.id_funcion JOIN pelicula p ON p.id_pelicula = f.id_pelicula JOIN sala s ON s.id_sala = f.id_sala')}
                GROUP BY f.id_funcion ORDER BY f.fecha_hora_inicio`, [filtros.desde, filtros.hasta, ...base]),
  ]);

  // Todos los días del rango, aunque no tengan ingresos.
  const mapa = new Map(porDia.map((d) => [d.dia, d]));
  const dias = [];
  for (let d = filtros.desde; d <= filtros.hasta && dias.length < 366; d = sumarDias(d, 1)) {
    dias.push({ dia: d, total: Number(mapa.get(d)?.total ?? 0), pagos: mapa.get(d)?.pagos ?? 0 });
  }

  res.json({
    filtros,
    total: Number(totales.total),
    pagos: totales.pagos,
    entradas: totales.entradas,
    porDia: dias,
    porFuncion: porFuncion.map((f) => ({
      id: f.id_funcion, inicio: f.fecha_hora_inicio, estado: f.estado, pelicula: f.titulo, sala: f.sala,
      total: Number(f.total), pagos: f.pagos, entradas: f.entradas,
    })),
    opciones: await opcionesFiltro(),
  });
}));

/** RF-16 · CU-14: entradas vendidas, ingresos validados, capacidad y ocupación por función. */
rutasReportes.get('/asistencia', manejar(async (req, res) => {
  const filtros = leerFiltros(req.query);
  const extra = filtroFuncion(filtros);
  const filas = await consultar(
    `SELECT f.id_funcion, f.fecha_hora_inicio, f.estado, p.titulo, s.nombre AS sala,
            (SELECT SUM(b.habilitada) FROM butaca b JOIN fila fi ON fi.id_fila = b.id_fila WHERE fi.id_sala = f.id_sala) AS capacidad,
            (SELECT COUNT(*) FROM entrada e WHERE e.id_funcion = f.id_funcion AND e.estado IN ('VALIDA','UTILIZADA')) AS vendidas,
            (SELECT COUNT(*) FROM entrada e WHERE e.id_funcion = f.id_funcion AND e.estado = 'UTILIZADA') AS validados
       FROM funcion f JOIN pelicula p ON p.id_pelicula = f.id_pelicula JOIN sala s ON s.id_sala = f.id_sala
      WHERE DATE(f.fecha_hora_inicio) BETWEEN ? AND ? AND f.estado <> 'CANCELADA' ${extra.sql}
      ORDER BY f.fecha_hora_inicio`,
    [filtros.desde, filtros.hasta, ...extra.params],
  );
  const funciones = filas.map((f) => {
    const capacidad = Number(f.capacidad ?? 0);
    return {
      id: f.id_funcion, inicio: f.fecha_hora_inicio, estado: f.estado, pelicula: f.titulo, sala: f.sala,
      capacidad, vendidas: f.vendidas, validados: f.validados,
      ocupacion: capacidad ? Math.round((f.vendidas / capacidad) * 1000) / 10 : 0, // vendidas / capacidad × 100
    };
  });
  const promedio = funciones.length ? Math.round((funciones.reduce((a, f) => a + f.ocupacion, 0) / funciones.length) * 10) / 10 : 0;
  res.json({
    filtros,
    funciones,
    promedioOcupacion: promedio,
    totalVendidas: funciones.reduce((a, f) => a + f.vendidas, 0),
    totalValidados: funciones.reduce((a, f) => a + f.validados, 0),
    opciones: await opcionesFiltro(),
  });
}));

/** P-09: resumen del día y de la última semana para el tablero. */
rutasReportes.get('/tablero', manejar(async (req, res) => {
  const dia = hoy();
  const desdeSemana = sumarDias(dia, -6);
  const [recaudacion, vendidasHoy, validadosHoy, semana, funcionesHoy, top] = await Promise.all([
    consultarUno('SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) AS pagos FROM ingreso WHERE DATE(fecha_hora) = ?', [dia]),
    consultarUno(`SELECT COUNT(*) AS n FROM entrada e JOIN pago pa ON pa.id_reserva = e.id_reserva JOIN ingreso i ON i.id_pago = pa.id_pago
                   WHERE DATE(i.fecha_hora) = ?`, [dia]),
    consultarUno('SELECT COUNT(*) AS n FROM entrada WHERE estado = \'UTILIZADA\' AND DATE(fecha_hora_ingreso) = ?', [dia]),
    consultar(`SELECT DATE_FORMAT(fecha_hora, '%Y-%m-%d') AS dia, SUM(monto) AS total FROM ingreso
                WHERE DATE(fecha_hora) BETWEEN ? AND ? GROUP BY dia ORDER BY dia`, [desdeSemana, dia]),
    consultar(`SELECT f.id_funcion, f.fecha_hora_inicio, f.fecha_hora_fin, f.estado, p.titulo, s.nombre AS sala,
                      (SELECT SUM(b.habilitada) FROM butaca b JOIN fila fi ON fi.id_fila = b.id_fila WHERE fi.id_sala = f.id_sala) AS capacidad,
                      (SELECT COUNT(*) FROM entrada e WHERE e.id_funcion = f.id_funcion AND e.estado IN ('VALIDA','UTILIZADA')) AS vendidas,
                      (SELECT COUNT(*) FROM entrada e WHERE e.id_funcion = f.id_funcion AND e.estado = 'UTILIZADA') AS validados
                 FROM funcion f JOIN pelicula p ON p.id_pelicula = f.id_pelicula JOIN sala s ON s.id_sala = f.id_sala
                WHERE DATE(f.fecha_hora_inicio) = ? AND f.estado <> 'CANCELADA' ORDER BY f.fecha_hora_inicio`, [dia]),
    consultar(`SELECT p.titulo, SUM(i.monto) AS total, COUNT(*) AS pagos FROM ingreso i
                 JOIN funcion f ON f.id_funcion = i.id_funcion JOIN pelicula p ON p.id_pelicula = f.id_pelicula
                WHERE DATE(i.fecha_hora) BETWEEN ? AND ? GROUP BY p.id_pelicula ORDER BY total DESC LIMIT 5`, [desdeSemana, dia]),
  ]);

  const mapa = new Map(semana.map((d) => [d.dia, Number(d.total)]));
  const funciones = funcionesHoy.map((f) => {
    const capacidad = Number(f.capacidad ?? 0);
    return {
      id: f.id_funcion, inicio: f.fecha_hora_inicio, fin: f.fecha_hora_fin, estado: f.estado, pelicula: f.titulo, sala: f.sala,
      capacidad, vendidas: f.vendidas, validados: f.validados, ocupacion: capacidad ? Math.round((f.vendidas / capacidad) * 1000) / 10 : 0,
    };
  });

  res.json({
    dia,
    recaudacionHoy: Number(recaudacion.total),
    pagosHoy: recaudacion.pagos,
    entradasVendidasHoy: vendidasHoy.n,
    validadosHoy: validadosHoy.n,
    ocupacionPromedioHoy: funciones.length ? Math.round((funciones.reduce((a, f) => a + f.ocupacion, 0) / funciones.length) * 10) / 10 : 0,
    ultimosDias: Array.from({ length: 7 }, (_, i) => { const d = sumarDias(desdeSemana, i); return { dia: d, total: mapa.get(d) ?? 0 }; }),
    funcionesHoy: funciones,
    peliculasSemana: top.map((t) => ({ titulo: t.titulo, total: Number(t.total), pagos: t.pagos })),
  });
}));
