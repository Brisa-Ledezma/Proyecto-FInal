import { CheckCircle, Clock, Prohibit, XCircle, Ticket, Play, Flag, UserCircleCheck } from '@phosphor-icons/react';
import './Estado.css';

// Cada estado del dominio con su texto, tono e ícono (nunca solo color, RNF-08).
const ESTADOS = {
  PENDIENTE_PAGO: { texto: 'Pendiente de pago', tono: 'pendiente', Icono: Clock },
  CONFIRMADA: { texto: 'Confirmada', tono: 'ok', Icono: CheckCircle },
  CANCELADA: { texto: 'Cancelada', tono: 'neutro', Icono: XCircle },
  ANULADA: { texto: 'Anulada', tono: 'error', Icono: Prohibit },
  VALIDA: { texto: 'Válida', tono: 'ok', Icono: Ticket },
  UTILIZADA: { texto: 'Utilizada', tono: 'neutro', Icono: UserCircleCheck },
  PROGRAMADA: { texto: 'Programada', tono: 'oro', Icono: Play },
  FINALIZADA: { texto: 'Finalizada', tono: 'neutro', Icono: Flag },
  APROBADO: { texto: 'Aprobado', tono: 'ok', Icono: CheckCircle },
  RECHAZADO: { texto: 'Rechazado', tono: 'error', Icono: XCircle },
  ACTIVA: { texto: 'Activa', tono: 'ok', Icono: CheckCircle },
  INACTIVA: { texto: 'Desactivada', tono: 'neutro', Icono: Prohibit },
};

export default function Estado({ estado, texto }) {
  const datos = ESTADOS[estado] ?? { texto: estado, tono: 'neutro', Icono: Clock };
  const { Icono } = datos;
  return (
    <span className={`estado estado--${datos.tono}`}>
      <Icono weight="bold" aria-hidden="true" />
      {texto ?? datos.texto}
    </span>
  );
}
