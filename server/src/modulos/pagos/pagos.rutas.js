import { Router } from 'express';
import { config } from '../../config.js';
import { enTransaccion } from '../../db.js';
import { conflicto, manejar, noEncontrado, verificarCampos } from '../../utils/errores.js';
import { idValido } from '../../utils/validacion.js';
import { generarCodigoEntrada } from '../../utils/codigos.js';
import { requerirRol, ROLES } from '../../middlewares/sesion.js';
import { solicitarCobro, CUENTAS_MERCADO_PAGO } from '../../servicios/pasarelaPago.js';
import { cancelarReservasPendientes } from '../reservas/reservas.servicio.js';

export const rutasPagos = Router();
const soloEspectador = requerirRol(ROLES.ESPECTADOR);

/** Algoritmo de Luhn para validar el número de tarjeta. */
function pasaLuhn(numero) {
  let suma = 0;
  let doble = false;
  for (let i = numero.length - 1; i >= 0; i -= 1) {
    let d = Number(numero[i]);
    if (doble) { d *= 2; if (d > 9) d -= 9; }
    suma += d;
    doble = !doble;
  }
  return suma % 10 === 0;
}

function validarTarjeta(tarjeta = {}) {
  const errores = {};
  const numero = String(tarjeta.numero ?? '').replace(/\D/g, '');
  if (!numero) errores.numero = 'Completá el número de la tarjeta.';
  else if (numero.length < 13 || numero.length > 19 || !pasaLuhn(numero)) errores.numero = 'El número de tarjeta no es válido. Revisalo.';

  if (!String(tarjeta.titular ?? '').trim()) errores.titular = 'Completá el nombre como figura en la tarjeta.';

  const venc = String(tarjeta.vencimiento ?? '').match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!venc) errores.vencimiento = 'Ingresá el vencimiento con el formato MM/AA.';
  else {
    const mes = Number(venc[1]);
    const anio = 2000 + Number(venc[2]);
    const finDeMes = new Date(anio, mes, 0, 23, 59, 59);
    if (mes < 1 || mes > 12) errores.vencimiento = 'El mes del vencimiento no es válido.';
    else if (finDeMes < new Date()) errores.vencimiento = 'La tarjeta está vencida.';
  }

  const largoCvv = numero.startsWith('34') || numero.startsWith('37') ? 4 : 3;
  if (!new RegExp(`^\\d{${largoCvv}}$`).test(String(tarjeta.cvv ?? ''))) errores.cvv = `El código de seguridad tiene ${largoCvv} dígitos.`;
  return errores;
}

async function bloquearReservaPropia(cx, idReserva, idUsuario) {
  const [[reserva]] = await cx.query(
    `SELECT r.id_reserva, r.estado, r.total, r.id_funcion, r.vence_pago,
            r.vence_pago IS NOT NULL AND r.vence_pago < NOW() AS vencido,
            TIMESTAMPDIFF(SECOND, NOW(), r.vence_pago) AS segundos,
            f.fecha_hora_inicio > NOW() AS no_iniciada, f.estado AS estado_funcion
       FROM reserva r JOIN funcion f USING (id_funcion)
      WHERE r.id_reserva = ? AND r.id_usuario = ? FOR UPDATE`,
    [idReserva, idUsuario],
  );
  if (!reserva) throw noEncontrado('No encontramos esta reserva.');
  return reserva;
}

/** Inicia (o reinicia al reintentar) el temporizador de pago de 5 minutos (RN-02). */
rutasPagos.post('/reservas/:id/iniciar-pago', soloEspectador, manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const resultado = await enTransaccion(async (cx) => {
    const reserva = await bloquearReservaPropia(cx, id, req.usuario.id_usuario);
    if (reserva.estado !== 'PENDIENTE_PAGO') throw conflicto('Esta reserva ya no está pendiente de pago.', { codigo: 'NO_PENDIENTE', datos: { estado: reserva.estado } });
    const reiniciar = req.body?.reiniciar === true || !reserva.vence_pago || reserva.vencido;
    if (reiniciar) {
      await cx.query('UPDATE reserva SET vence_pago = NOW() + INTERVAL ? SECOND WHERE id_reserva = ?', [config.reglas.segundosPago, id]);
      return { segundosRestantes: config.reglas.segundosPago };
    }
    return { segundosRestantes: Math.max(0, reserva.segundos) };
  });
  res.json({ ...resultado, segundosTotales: config.reglas.segundosPago });
}));

/** RF-08 · CU-05: pago simulado; si se aprueba, confirma la reserva y emite las entradas. */
rutasPagos.post('/reservas/:id/pago', soloEspectador, manejar(async (req, res) => {
  const id = idValido(req.params.id);
  const medio = req.body?.medio;
  if (!['TARJETA', 'MERCADO_PAGO'].includes(medio)) verificarCampos({ medio: 'Elegí un medio de pago.' }, 'Elegí un medio de pago.');
  if (medio === 'TARJETA') verificarCampos(validarTarjeta(req.body?.tarjeta));
  if (medio === 'MERCADO_PAGO' && !CUENTAS_MERCADO_PAGO[req.body?.cuenta]) verificarCampos({ cuenta: 'Elegí la cuenta de Mercado Pago.' });

  const idUsuario = req.usuario.id_usuario;
  const resultado = await enTransaccion(async (cx) => {
    const reserva = await bloquearReservaPropia(cx, id, idUsuario);
    if (reserva.estado === 'CONFIRMADA') throw conflicto('Esta reserva ya está pagada.', { codigo: 'YA_CONFIRMADA' });
    if (reserva.estado !== 'PENDIENTE_PAGO') throw conflicto('Esta reserva fue cancelada y ya no se puede pagar.', { codigo: 'NO_PENDIENTE', datos: { estado: reserva.estado } });
    if (reserva.estado_funcion !== 'PROGRAMADA' || !reserva.no_iniciada) {
      await cancelarReservasPendientes(cx, [id]);
      return { tipo: 'funcion' };
    }
    if (!reserva.vence_pago || reserva.vencido) return { tipo: 'tiempo' };

    const cobro = await solicitarCobro({
      monto: Number(reserva.total), medio, titular: req.body?.tarjeta?.titular, cuenta: req.body?.cuenta,
    });

    // Solo se registran medio, monto, estado e identificador: nunca datos de la tarjeta (RNF-05).
    const [pago] = await cx.query(
      'INSERT INTO pago (id_reserva, medio, monto, estado, id_transaccion, motivo_rechazo) VALUES (?, ?, ?, ?, ?, ?)',
      [id, medio, reserva.total, cobro.aprobado ? 'APROBADO' : 'RECHAZADO', cobro.idTransaccion, cobro.motivo],
    );
    if (!cobro.aprobado) return { tipo: 'rechazado', motivo: cobro.motivo }; // RN-06: las butacas siguen bloqueadas

    await cx.query("UPDATE reserva SET estado = 'CONFIRMADA', fecha_hora_cierre = NOW(), vence_pago = NULL WHERE id_reserva = ?", [id]);
    await cx.query(
      'INSERT INTO ingreso (id_pago, id_funcion, id_usuario, monto) VALUES (?, ?, ?, ?)', // RN-07
      [pago.insertId, reserva.id_funcion, idUsuario, reserva.total],
    );
    const [butacas] = await cx.query('SELECT id_butaca FROM reserva_butaca WHERE id_reserva = ?', [id]);
    for (const { id_butaca: idButaca } of butacas) { // RN-08: una entrada con código único por butaca
      for (let intento = 0; intento < 5; intento += 1) {
        try {
          await cx.query(
            'INSERT INTO entrada (id_reserva, id_funcion, id_butaca, codigo_qr) VALUES (?, ?, ?, ?)',
            [id, reserva.id_funcion, idButaca, generarCodigoEntrada()],
          );
          break;
        } catch (error) {
          if (error.code !== 'ER_DUP_ENTRY' || intento === 4) throw error;
        }
      }
    }
    return { tipo: 'aprobado', transaccion: cobro.idTransaccion };
  });

  if (resultado.tipo === 'funcion') throw conflicto('La función ya comenzó o fue cancelada. Cancelamos la reserva y liberamos las butacas.', { codigo: 'FUNCION_NO_DISPONIBLE' });
  if (resultado.tipo === 'tiempo') throw conflicto('Se terminó el tiempo para pagar. Tus butacas siguen bloqueadas: podés reintentar o cancelar la reserva.', { codigo: 'TIEMPO_AGOTADO' });
  if (resultado.tipo === 'rechazado') throw conflicto(resultado.motivo, { codigo: 'PAGO_RECHAZADO' });
  res.json({ estado: 'CONFIRMADA', transaccion: resultado.transaccion });
}));
