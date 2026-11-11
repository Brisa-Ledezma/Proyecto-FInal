import { diaCorto, numeroDia } from '../../utiles/formato.js';
import './Marquesina.css';

/** Selector de fechas: la fecha elegida se enciende con lamparitas (RF-03). */
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
            <span className="marquesina__dia">{diaCorto(fecha)}</span>
            <span className="marquesina__numero">{numeroDia(fecha)}</span>
          </button>
        );
      })}
    </div>
  );
}
