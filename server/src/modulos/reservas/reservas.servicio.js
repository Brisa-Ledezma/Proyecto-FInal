import { config } from '../../config.js';
import { consultar, enTransaccion } from '../../db.js';

/**
 * Pasa a CANCELADA las reservas pendientes indicadas y libera sus butacas.
 * Devuelve la cantidad de reservas canceladas.
 */
export async function cancelarReservasPendientes(conexion, idsReservas) {
  if (!idsReservas.length) return 0;
  const [resultado] = await conexion.query(
    `UPDATE reserva SET estado = 'CANCELADA', fecha_hora_cierre = NOW()
      WHERE id_reserva IN (?) AND estado = 'PENDIENTE_PAGO'`,
    [idsReservas],
  );
  await conexion.query('UPDATE reserva_butaca SET bloqueo = NULL WHERE id_reserva IN (?)', [idsReservas]);
  return resultado.affectedRows;
}

/** RF-06: al cerrar sesión se cancela la reserva pendiente del espectador. */
export async function cancelarPendientesDeUsuario(idUsuario) {
  return enTransaccion(async (cx) => {
    const [filas] = await cx.query(
      "SELECT id_reserva FROM reserva WHERE id_usuario = ? AND estado = 'PENDIENTE_PAGO' FOR UPDATE",
      [idUsuario],
    );
    return cancelarReservasPendientes(cx, filas.map((f) => f.id_reserva));
  });
}

/**
 * RF-06 · tarea programada: cancela las reservas pendientes de los espectadores
 * cuya sesión venció por 30 minutos de inactividad.
 */
export async function cancelarPendientesPorInactividad() {
  return enTransaccion(async (cx) => {
    const [filas] = await cx.query(
      `SELECT r.id_reserva
         FROM reserva r JOIN usuario u ON u.id_usuario = r.id_usuario
        WHERE r.estado = 'PENDIENTE_PAGO'
          AND (u.ultima_actividad IS NULL OR u.ultima_actividad < NOW() - INTERVAL ? MINUTE)
        FOR UPDATE`,
      [config.reglas.minutosSesion],
    );
    return cancelarReservasPendientes(cx, filas.map((f) => f.id_reserva));
  });
}

/** Marca como FINALIZADA las funciones programadas cuyo horario de fin ya pasó. */
export async function finalizarFuncionesTerminadas() {
  const resultado = await consultar(
    "UPDATE funcion SET estado = 'FINALIZADA' WHERE estado = 'PROGRAMADA' AND fecha_hora_fin < NOW()",
  );
  return resultado.affectedRows;
}
