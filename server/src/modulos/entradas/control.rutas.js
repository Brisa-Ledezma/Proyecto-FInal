import { Router } from 'express';
import { config } from '../../config.js';
import { consultar, consultarUno } from '../../db.js';
import { manejar, noEncontrado } from '../../utils/errores.js';
import { idValido } from '../../utils/validacion.js';
import { normalizarCodigoEntrada } from '../../utils/codigos.js';
import { requerirRol, ROLES } from '../../middlewares/sesion.js';

export const rutasControl = Router();

const { minutosAntesValidacion } = config.reglas;

/**
 * Lo que ve cualquiera que escanee el QR con la cámara del celular: solo confirma que el
 * código es de una entrada emitida por Golden Screen. No se entrega ningún dato del titular
 * ni de la función a terceros (RNF-14); la entrada completa la ve el titular en «Mis entradas»
 * y la valida el encargado de sala (RF-10).
 */
rutasControl.get('/entradas/:codigo/publica', manejar(async (req, res) => {
  const codigo = normalizarCodigoEntrada(req.params.codigo);
  const entrada = codigo && await consultarUno('SELECT 1 FROM entrada WHERE codigo_qr = ?', [codigo]);
  if (!entrada) throw noEncontrado('Este código no corresponde a ninguna entrada de Golden Screen.');
  res.json({ autentica: true });
}));

rutasControl.use('/control', requerirRol(ROLES.ENCARGADO));

const CONSULTA_FUNCION = `
  SELECT f.id_funcion, f.fecha_hora_inicio, f.fecha_hora_fin, f.estado, s.nombre AS sala,
         p.titulo, p.clasificacion, p.afiche, p.genero, p.duracion_min,
         (SELECT COUNT(*) FROM entrada e WHERE e.id_funcion = f.id_funcion AND e.estado IN ('VALIDA','UTILIZADA')) AS vendidas,
         (SELECT COUNT(*) FROM entrada e WHERE e.id_funcion = f.id_funcion AND e.estado = 'UTILIZADA') AS ingresados,
         NOW() >= f.fecha_hora_inicio - INTERVAL ${minutosAntesValidacion} MINUTE AND NOW() <= f.fecha_hora_fin AS ventana_abierta,
         DATE_FORMAT(f.fecha_hora_inicio - INTERVAL ${minutosAntesValidacion} MINUTE, '%H:%i') AS abre_a_las
    FROM funcion f JOIN sala s USING (id_sala) JOIN pelicula p USING (id_pelicula)`;

const aFuncionControl = (f) => ({
  id: f.id_funcion,
  inicio: f.fecha_hora_inicio,
  fin: f.fecha_hora_fin,
  estado: f.estado,
  sala: f.sala,
  pelicula: { titulo: f.titulo, clasificacion: f.clasificacion, afiche: f.afiche, genero: f.genero, duracionMin: f.duracion_min },
  vendidas: f.vendidas,
  ingresados: f.ingresados,
  ventanaAbierta: Boolean(f.ventana_abierta),
  abreALas: f.abre_a_las,
});

/** Funciones del día para elegir en el control de ingreso (CU-08, paso 1). */
rutasControl.get('/control/funciones', manejar(async (req, res) => {
  const filas = await consultar(
    `${CONSULTA_FUNCION} WHERE DATE(f.fecha_hora_inicio) = CURDATE() AND f.estado <> 'CANCELADA' ORDER BY f.fecha_hora_inicio`,
  );
  res.json(filas.map(aFuncionControl));
}));

/** Función con el contador de ingresos y las últimas validaciones. */
rutasControl.get('/control/funciones/:id', manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const funcion = id && await consultarUno(`${CONSULTA_FUNCION} WHERE f.id_funcion = ?`, [id]);
  if (!funcion) throw noEncontrado('No encontramos esta función.');
  const ultimos = await consultar(
    `SELECT e.codigo_qr, e.fecha_hora_ingreso, fi.letra, b.numero, u.nombre AS encargado
       FROM entrada e JOIN butaca b ON b.id_butaca = e.id_butaca JOIN fila fi ON fi.id_fila = b.id_fila
       LEFT JOIN usuario u ON u.id_usuario = e.id_usuario_valida
      WHERE e.id_funcion = ? AND e.estado = 'UTILIZADA'
      ORDER BY e.fecha_hora_ingreso DESC LIMIT 8`,
    [id],
  );
  res.json({
    ...aFuncionControl(funcion),
    ultimos: ultimos.map((u) => ({ codigo: u.codigo_qr, hora: u.fecha_hora_ingreso, fila: u.letra, numero: u.numero, encargado: u.encargado })),
  });
}));

/**
 * RF-10 · CU-08: valida una entrada por su código QR o el código impreso.
 * Responde siempre con { aceptada, motivo } para que la pantalla muestre el resultado.
 */
rutasControl.post('/control/funciones/:id/validar', manejar(async (req, res) => {
  const idFuncion = idValido(req.params.id);
  const funcion = idFuncion && await consultarUno(`${CONSULTA_FUNCION} WHERE f.id_funcion = ?`, [idFuncion]);
  if (!funcion) throw noEncontrado('No encontramos esta función.');

  const codigo = normalizarCodigoEntrada(req.body?.codigo);
  const rechazo = (motivo, extra = {}) => res.json({ aceptada: false, motivo, codigo, ...extra });
  if (!codigo) return rechazo('El código no tiene el formato de una entrada de Golden Screen (GS-XXXX-XXXX).');

  const entrada = await consultarUno(
    `SELECT e.id_entrada, e.id_funcion, e.estado, e.fecha_hora_ingreso, fi.letra, b.numero,
            p.titulo, s.nombre AS sala, DATE_FORMAT(f.fecha_hora_inicio, '%d/%m %H:%i') AS cuando,
            DATE_FORMAT(e.fecha_hora_ingreso, '%H:%i') AS hora_ingreso, u.nombre, u.apellido
       FROM entrada e
       JOIN reserva r ON r.id_reserva = e.id_reserva JOIN usuario u ON u.id_usuario = r.id_usuario
       JOIN butaca b ON b.id_butaca = e.id_butaca JOIN fila fi ON fi.id_fila = b.id_fila
       JOIN funcion f ON f.id_funcion = e.id_funcion JOIN pelicula p ON p.id_pelicula = f.id_pelicula
       JOIN sala s ON s.id_sala = f.id_sala
      WHERE e.codigo_qr = ?`,
    [codigo],
  );

  // CU-08, A1: código inexistente o de otra función
  if (!entrada) return rechazo('El código no corresponde a ninguna entrada.');
  // La entrada es intransferible: el encargado ve el titular para poder pedir el documento.
  const butaca = { fila: entrada.letra, numero: entrada.numero, titular: `${entrada.nombre} ${entrada.apellido}`, pelicula: entrada.titulo };
  if (entrada.id_funcion !== idFuncion) {
    return rechazo(`La entrada es para otra función: ${entrada.titulo}, ${entrada.cuando}, ${entrada.sala}.`, { butaca });
  }
  // CU-08, A2: entrada ya utilizada o anulada
  if (entrada.estado === 'UTILIZADA') return rechazo(`La entrada ya se usó a las ${entrada.hora_ingreso}.`, { butaca, estado: 'UTILIZADA' });
  if (entrada.estado === 'ANULADA') return rechazo('La entrada está anulada porque la función se canceló.', { butaca, estado: 'ANULADA' });
  // RN-09: desde 30 minutos antes del inicio y hasta el horario de finalización
  if (!funcion.ventana_abierta) {
    const terminada = new Date(funcion.fecha_hora_fin.replace(' ', 'T')) < new Date();
    return rechazo(terminada ? 'La función ya terminó: la entrada no se puede validar.' : `Todavía no se puede validar: el ingreso se habilita a las ${funcion.abre_a_las}.`, { butaca });
  }

  const resultado = await consultar(
    "UPDATE entrada SET estado = 'UTILIZADA', fecha_hora_ingreso = NOW(), id_usuario_valida = ? WHERE id_entrada = ? AND estado = 'VALIDA'",
    [req.usuario.id_usuario, entrada.id_entrada],
  );
  if (resultado.affectedRows === 0) return rechazo('La entrada acaba de validarse en otro dispositivo.', { butaca });

  const contador = await consultarUno(
    "SELECT SUM(estado = 'UTILIZADA') AS ingresados, SUM(estado IN ('VALIDA','UTILIZADA')) AS vendidas FROM entrada WHERE id_funcion = ?",
    [idFuncion],
  );
  res.json({ aceptada: true, codigo, butaca, ingresados: Number(contador.ingresados), vendidas: Number(contador.vendidas) });
}));
