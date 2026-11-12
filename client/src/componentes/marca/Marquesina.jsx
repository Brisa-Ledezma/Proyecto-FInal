import { diaCorto, fechaISO, numeroDia, sumarDias } from '../../utiles/formato.js';
import './Marquesina.css';

function rotulo(fecha) {
  const hoy = fechaISO();
  if (fecha === hoy) return 'Hoy';
  if (fecha === sumarDias(hoy, 1)) return 'Mañana';
  return diaCorto(fecha);
}

/** Selector de fechas en píldoras: la elegida se enciende (RF-03). */
export default function Marquesina({ fechas, seleccionada, alElegir, etiqueta = 'Elegí la fecha' }) {
  return (
    <div className="marquesina" role="group" aria-label={etiqueta}>
      {fechas.map((fecha) => {
        const activa = fecha === seleccionada;
        return (
          <button
            key={fecha}
            type="button"
            className={`marquesina__fecha ${activa ? 'marquesina__fecha--activa' : ''}`}
            aria-pressed={activa}
            onClick={() => alElegir(fecha)}
          >
            <span className="marquesina__dia">{rotulo(fecha)}</span>
            <span className="marquesina__numero cifra">{numeroDia(fecha)}</span>
          </button>
        );
      })}
    </div>
  );
}
