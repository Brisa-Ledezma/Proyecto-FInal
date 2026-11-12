import { useId, useState } from 'react';
import './GraficoTorta.css';

const SERIES = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)', 'var(--serie-4)', 'var(--serie-5)'];

/**
 * Agrupa una lista en como máximo `maximo` porciones: las primeras y el resto
 * sumado en "Otras". El color sigue a cada entidad por su posición fija.
 */
export function agrupar(lista, { maximo = 5, clave, etiqueta, valor, textoOtras = 'Otras' }) {
  const ordenada = [...lista].sort((a, b) => valor(b) - valor(a));
  const principales = ordenada.length > maximo ? ordenada.slice(0, maximo - 1) : ordenada;
  const resto = ordenada.slice(principales.length);
  const datos = principales.map((x, i) => ({ clave: clave(x), etiqueta: etiqueta(x), valor: valor(x), color: SERIES[i] }));
  if (resto.length) datos.push({ clave: '__otras', etiqueta: `${textoOtras} (${resto.length})`, valor: resto.reduce((a, x) => a + valor(x), 0), color: 'var(--serie-otras)' });
  return datos;
}

function arco(cx, cy, r, inicio, fin) {
  const a = (ang) => [cx + r * Math.cos(ang - Math.PI / 2), cy + r * Math.sin(ang - Math.PI / 2)];
  const [x1, y1] = a(inicio);
  const [x2, y2] = a(fin);
  const grande = fin - inicio > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${grande} 1 ${x2} ${y2}`;
}

const pct = (v, total) => (total ? `${String(Math.round((v / total) * 1000) / 10).replace('.', ',')} %` : '0 %');

/**
 * Gráfico de torta (anillo) para una parte del todo con hasta 5 porciones.
 * Cada porción muestra su valor al pasar el cursor o con el foco, y la leyenda
 * lleva el nombre, el valor y el porcentaje: el color nunca es la única señal.
 * datos: [{ clave, etiqueta, valor, color }]
 */
export default function GraficoTorta({ datos, titulo, formatoValor = String, centro, tamano = 200 }) {
  const id = useId();
  const [activa, setActiva] = useState(null);
  const total = datos.reduce((a, d) => a + d.valor, 0);
  const r = 80;
  const grosor = 26;
  const separacion = datos.filter((d) => d.valor > 0).length > 1 ? 0.03 : 0;
  let acumulado = 0;
  const porciones = datos.map((d) => {
    const inicio = (acumulado / (total || 1)) * Math.PI * 2;
    acumulado += d.valor;
    const fin = (acumulado / (total || 1)) * Math.PI * 2;
    return { ...d, inicio, fin };
  });
  const actual = activa !== null ? porciones[activa] : null;

  return (
    <figure className="grafico-torta" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="solo-lector">{titulo}</figcaption>
      <div className="grafico-torta__lienzo" style={{ width: tamano, height: tamano }}>
        <svg viewBox="0 0 200 200" width={tamano} height={tamano} role="img" aria-label={`${titulo}: ${datos.map((d) => `${d.etiqueta} ${formatoValor(d.valor)}`).join(', ')}`}>
          <circle cx="100" cy="100" r={r} className="grafico-torta__pista" strokeWidth={grosor} fill="none" />
          {total > 0 && porciones.map((p, i) => (p.valor > 0 && (
            <path
              key={p.clave}
              d={p.fin - p.inicio >= Math.PI * 2 - 0.001
                ? `M 100 ${100 - r} A ${r} ${r} 0 1 1 99.99 ${100 - r}`
                : arco(100, 100, r, p.inicio + separacion / 2, p.fin - separacion / 2)}
              className={`grafico-torta__porcion ${activa === i ? 'grafico-torta__porcion--activa' : ''} ${activa !== null && activa !== i ? 'grafico-torta__porcion--atenuada' : ''}`}
              stroke={p.color}
              strokeWidth={grosor}
              fill="none"
              style={{ '--i': i }}
              tabIndex={0}
              aria-label={`${p.etiqueta}: ${formatoValor(p.valor)}, ${pct(p.valor, total)}`}
              onMouseEnter={() => setActiva(i)}
              onMouseLeave={() => setActiva(null)}
              onFocus={() => setActiva(i)}
              onBlur={() => setActiva(null)}
            />
          )))}
        </svg>
        <div className="grafico-torta__centro" aria-hidden="true">
          {actual ? (
            <>
              <span className="grafico-torta__centro-etiqueta">{actual.etiqueta}</span>
              <strong className="cifra">{formatoValor(actual.valor)}</strong>
              <span className="grafico-torta__centro-pct cifra">{pct(actual.valor, total)}</span>
            </>
          ) : (
            <>
              <span className="grafico-torta__centro-etiqueta">{centro?.etiqueta ?? 'Total'}</span>
              <strong className="cifra">{centro?.valor ?? formatoValor(total)}</strong>
            </>
          )}
        </div>
      </div>

      <ul className="grafico-torta__leyenda">
        {porciones.map((p, i) => (
          <li
            key={p.clave}
            className={activa === i ? 'grafico-torta__item--activo' : ''}
            onMouseEnter={() => setActiva(i)}
            onMouseLeave={() => setActiva(null)}
          >
            <span className="grafico-torta__muestra" style={{ background: p.color }} aria-hidden="true" />
            <span className="grafico-torta__nombre">{p.etiqueta}</span>
            <span className="grafico-torta__valor cifra">{formatoValor(p.valor)}</span>
            <span className="grafico-torta__pct cifra">{pct(p.valor, total)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
