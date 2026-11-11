import { cancelarPendientesPorInactividad, finalizarFuncionesTerminadas } from '../modulos/reservas/reservas.servicio.js';

const INTERVALO_MS = 60 * 1000; // cada 1 minuto (Figura 6)

async function ejecutar() {
  try {
    const canceladas = await cancelarPendientesPorInactividad();
    const finalizadas = await finalizarFuncionesTerminadas();
    if (canceladas) console.log(`[tarea] ${canceladas} reserva(s) pendiente(s) cancelada(s) por sesión vencida.`);
    if (finalizadas) console.log(`[tarea] ${finalizadas} función(es) finalizada(s).`);
  } catch (error) {
    console.error('[tarea] Error en la tarea programada:', error.message);
  }
}

export function iniciarTareasProgramadas() {
  ejecutar();
  return setInterval(ejecutar, INTERVALO_MS);
}
