import { enviarAvisoFuncionCancelada } from '../../servicios/correo.js';

/**
 * RN-14: cancela funciones, anula sus reservas y entradas y libera las butacas.
 * Debe ejecutarse dentro de una transacción. Devuelve los avisos por correo
 * a enviar cuando la transacción se confirme.
 */
export async function cancelarFunciones(cx, idsFunciones) {
  if (!idsFunciones.length) return { funciones: 0, entradas: 0, avisos: [] };

  const [compradores] = await cx.query(
    `SELECT u.email, u.nombre, p.titulo, s.nombre AS sala,
            DATE_FORMAT(f.fecha_hora_inicio, '%d/%m/%Y a las %H:%i') AS fecha,
            COUNT(e.id_entrada) AS entradas
       FROM reserva r
       JOIN usuario u ON u.id_usuario = r.id_usuario
       JOIN funcion f ON f.id_funcion = r.id_funcion
       JOIN pelicula p ON p.id_pelicula = f.id_pelicula
       JOIN sala s ON s.id_sala = f.id_sala
       JOIN entrada e ON e.id_reserva = r.id_reserva AND e.estado = 'VALIDA'
      WHERE r.id_funcion IN (?) AND r.estado = 'CONFIRMADA'
      GROUP BY r.id_reserva`,
    [idsFunciones],
  );

  const [funciones] = await cx.query(
    "UPDATE funcion SET estado = 'CANCELADA' WHERE id_funcion IN (?) AND estado = 'PROGRAMADA'",
    [idsFunciones],
  );
  await cx.query(
    "UPDATE reserva SET estado = 'ANULADA', fecha_hora_cierre = NOW() WHERE id_funcion IN (?) AND estado IN ('PENDIENTE_PAGO','CONFIRMADA')",
    [idsFunciones],
  );
  await cx.query('UPDATE reserva_butaca SET bloqueo = NULL WHERE id_funcion IN (?)', [idsFunciones]);
  const [entradas] = await cx.query(
    "UPDATE entrada SET estado = 'ANULADA' WHERE id_funcion IN (?) AND estado = 'VALIDA'",
    [idsFunciones],
  );

  return { funciones: funciones.affectedRows, entradas: entradas.affectedRows, avisos: compradores };
}

/** Envía los avisos de cancelación (RN-14) sin frenar la respuesta. */
export function enviarAvisos(avisos) {
  for (const a of avisos) {
    enviarAvisoFuncionCancelada({ email: a.email, nombre: a.nombre, titulo: a.titulo, fecha: a.fecha, sala: a.sala, entradas: Number(a.entradas) });
  }
}
