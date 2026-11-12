import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import './Paginacion.css';

/** Números a mostrar: siempre la primera, la última y las vecinas de la actual. */
function numeros(actual, total) {
  const set = new Set([1, total, actual - 1, actual, actual + 1].filter((n) => n >= 1 && n <= total));
  const orden = [...set].sort((a, b) => a - b);
  const salida = [];
  orden.forEach((n, i) => {
    if (i && n - orden[i - 1] > 1) salida.push(`hueco-${n}`);
    salida.push(n);
  });
  return salida;
}

/**
 * Paginación. No se muestra si todo entra en una sola página.
 * Recibe el objeto que devuelve usePaginacion.
 */
export default function Paginacion({ control, etiqueta = 'Paginación', unidad = 'resultados', alCambiar }) {
  const { pagina, paginas, total, porPagina, setPagina, activa } = control;
  if (!activa) return null;
  const ir = (n) => {
    setPagina(n);
    alCambiar?.(n);
  };
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(total, pagina * porPagina);

  return (
    <nav className="paginacion" aria-label={etiqueta}>
      <p className="paginacion__resumen" aria-live="polite">
        <span className="cifra">{desde}–{hasta}</span> de <span className="cifra">{total}</span> {unidad}
      </p>
      <div className="paginacion__botones">
        <button type="button" className="paginacion__flecha" onClick={() => ir(pagina - 1)} disabled={pagina === 1} aria-label="Página anterior">
          <CaretLeft weight="bold" />
        </button>
        {numeros(pagina, paginas).map((n) => (typeof n === 'string'
          ? <span key={n} className="paginacion__hueco" aria-hidden="true">…</span>
          : (
            <button
              key={n}
              type="button"
              className="paginacion__numero cifra"
              aria-current={n === pagina ? 'page' : undefined}
              aria-label={`Página ${n}`}
              onClick={() => ir(n)}
            >
              {n}
            </button>
          )))}
        <button type="button" className="paginacion__flecha" onClick={() => ir(pagina + 1)} disabled={pagina === paginas} aria-label="Página siguiente">
          <CaretRight weight="bold" />
        </button>
      </div>
    </nav>
  );
}
