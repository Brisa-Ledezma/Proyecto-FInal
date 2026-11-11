import { Check } from '@phosphor-icons/react';
import './CordonPasos.css';

// RNF-06: la compra se completa en cinco pasos desde la cartelera.
export const PASOS_COMPRA = ['Cartelera', 'Función', 'Butacas', 'Pago', 'Confirmación'];

/** Indicador de pasos con forma de postes y cordón de alfombra roja. `actual` empieza en 1. */
export default function CordonPasos({ actual }) {
  return (
    <nav aria-label="Pasos de la compra" className="cordon-pasos">
      <ol className="cordon">
        {PASOS_COMPRA.map((paso, i) => {
          const numero = i + 1;
          const estado = numero < actual ? 'hecho' : numero === actual ? 'actual' : 'pendiente';
          return (
            <li key={paso} className={`cordon__paso cordon__paso--${estado}`} aria-current={estado === 'actual' ? 'step' : undefined}>
              <span className="cordon__poste" aria-hidden="true">
                {estado === 'hecho' ? <Check weight="bold" /> : numero}
              </span>
              {numero < PASOS_COMPRA.length && (
                <svg className="cordon__soga" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0 4 Q50 22 100 4" />
                </svg>
              )}
              <span className="cordon__texto">
                {paso}
                <span className="solo-lector">
                  {estado === 'hecho' ? ' (completado)' : estado === 'actual' ? ' (paso actual)' : ''}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
