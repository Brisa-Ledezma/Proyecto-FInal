// Servicio de pago simulado (S-03): aprueba o rechaza sin realizar ningún cobro.
// Sigue la convención del entorno de pruebas de Mercado Pago: el nombre del titular
// de la tarjeta indica el resultado.
import { generarIdTransaccion } from '../utils/codigos.js';

const DEMORA_MS = 1500;

const RESULTADOS_TITULAR = {
  APRO: null,
  OTHE: 'El pago fue rechazado por un error general del procesamiento.',
  FUND: 'El pago fue rechazado por fondos insuficientes.',
  SECU: 'El pago fue rechazado: el código de seguridad no es válido.',
  EXPI: 'El pago fue rechazado: la tarjeta está vencida.',
  CALL: 'El banco emisor pidió autorizar el pago. Probá con otra tarjeta.',
};

export const CUENTAS_MERCADO_PAGO = {
  'con-saldo': { nombre: 'Cuenta de prueba con saldo', motivo: null },
  'sin-saldo': { nombre: 'Cuenta de prueba sin saldo', motivo: 'El pago fue rechazado: la cuenta de Mercado Pago no tiene saldo suficiente.' },
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Solicita el cobro. Devuelve { aprobado, idTransaccion, motivo }.
 * Para tarjetas, cualquier titular que no sea un código de prueba se aprueba.
 */
export async function solicitarCobro({ monto, medio, titular, cuenta }) {
  await esperar(DEMORA_MS);
  let motivo = null;
  if (medio === 'TARJETA') {
    motivo = RESULTADOS_TITULAR[String(titular ?? '').trim().toUpperCase()] ?? null;
  } else {
    motivo = CUENTAS_MERCADO_PAGO[cuenta]?.motivo ?? null;
  }
  return { aprobado: !motivo && monto > 0, idTransaccion: generarIdTransaccion(), motivo };
}
