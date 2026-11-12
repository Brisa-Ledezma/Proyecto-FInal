import './Estado.css';

// Cada estado del dominio con su texto y su tono. El texto siempre está visible:
// el color nunca es la única señal (RNF-08). Los estados "vivos" laten suavemente.
const ESTADOS = {
  PENDIENTE_PAGO: { texto: 'Pendiente de pago', tono: 'pendiente', vivo: true },
  CONFIRMADA: { texto: 'Confirmada', tono: 'ok' },
  CANCELADA: { texto: 'Cancelada', tono: 'neutro' },
  ANULADA: { texto: 'Anulada', tono: 'error' },
  VALIDA: { texto: 'Válida', tono: 'ok' },
  UTILIZADA: { texto: 'Utilizada', tono: 'neutro' },
  PROGRAMADA: { texto: 'Programada', tono: 'oro', vivo: true },
  FINALIZADA: { texto: 'Finalizada', tono: 'neutro' },
  APROBADO: { texto: 'Aprobado', tono: 'ok' },
  RECHAZADO: { texto: 'Rechazado', tono: 'error' },
  ACTIVA: { texto: 'Activa', tono: 'ok', vivo: true },
  INACTIVA: { texto: 'Desactivada', tono: 'neutro' },
};

export default function Estado({ estado, texto }) {
  const datos = ESTADOS[estado] ?? { texto: estado, tono: 'neutro' };
  return (
    <span className={`estado estado--${datos.tono} ${datos.vivo ? 'estado--vivo' : ''}`}>
      <span className="estado__punto" aria-hidden="true" />
      {texto ?? datos.texto}
    </span>
  );
}
