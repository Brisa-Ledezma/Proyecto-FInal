import './Tabla.css';

/**
 * Tabla de gestión. En pantallas angostas cada fila se muestra como tarjeta
 * con la etiqueta de cada dato (RNF-13).
 * columnas: [{ clave, titulo, render?, clase?, alinear? }]
 */
export default function Tabla({ columnas, filas, claveFila = (f) => f.id, titulo, ordenarPor, orden, alOrdenar, claseFila }) {
  return (
    <div className="tabla-gestion">
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
        <tbody>
          {filas.map((fila) => (
            <tr key={claveFila(fila)} className={claseFila?.(fila)}>
              {columnas.map((c) => (
                <td key={c.clave} data-etiqueta={c.titulo} className={c.clase} style={{ textAlign: c.alinear }}>
                  {c.render ? c.render(fila) : fila[c.clave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
