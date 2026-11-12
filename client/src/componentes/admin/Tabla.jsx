import { useRef } from 'react';
import { usePaginacion } from '../../hooks/usePaginacion.js';
import Paginacion from '../ui/Paginacion.jsx';
import './Tabla.css';

/**
 * Tabla de gestión. En pantallas angostas cada fila se muestra como tarjeta
 * con la etiqueta de cada dato (RNF-13). Pagina sola cuando hay más filas
 * que `porPagina` (10 por defecto).
 * columnas: [{ clave, titulo, render?, clase?, alinear?, movil? }]
 * movil: 'principal' (va arriba, ancho completo y sin etiqueta), 'oculta' o 'ancha'.
 */
export default function Tabla({ columnas, filas, claveFila = (f) => f.id, titulo, ordenarPor, orden, alOrdenar, claseFila, porPagina = 10, unidad = 'filas', className = '' }) {
  const control = usePaginacion(filas, porPagina);
  const ref = useRef(null);
  const alCambiarPagina = () => {
    const tope = ref.current?.getBoundingClientRect().top ?? 0;
    if (tope < 80) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="tabla-envoltura" ref={ref}>
      <div className={`tabla-gestion brilla ${className}`}>
        <table>
          {titulo && <caption className="solo-lector">{titulo}</caption>}
          <thead>
            <tr>
              {columnas.map((c) => (
                <th key={c.clave} scope="col" className={c.clase} style={{ textAlign: c.alinear }} aria-sort={ordenarPor === c.clave ? (orden === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.ordenable && alOrdenar ? (
                    <button type="button" className="tabla-gestion__orden" onClick={() => alOrdenar(c.clave)}>
                      {c.titulo}
                      <span aria-hidden="true">{ordenarPor === c.clave ? (orden === 'asc' ? ' ▲' : ' ▼') : ' ↕'}</span>
                    </button>
                  ) : c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody key={control.pagina} className="tabla-gestion__cuerpo">
            {control.visibles.map((fila) => (
              <tr key={claveFila(fila)} className={claseFila?.(fila)}>
                {columnas.map((c) => (
                  <td key={c.clave} data-etiqueta={c.titulo} className={[c.clase, c.movil && `movil-${c.movil}`].filter(Boolean).join(' ') || undefined} style={{ textAlign: c.alinear }}>
                    {c.render ? c.render(fila) : fila[c.clave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacion control={control} etiqueta={titulo ? `Páginas de ${titulo.toLowerCase()}` : undefined} unidad={unidad} alCambiar={alCambiarPagina} />
    </div>
  );
}
