import { useEffect, useId, useMemo, useRef, useState } from 'react';
import './GraficoBarras.css';

/** Escala "linda" para el eje: 1, 2 o 5 por potencia de 10. */
function escala(maximo, marcas = 4) {
  if (maximo <= 0) return { tope: 1, paso: 1 };
  const bruto = maximo / marcas;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto);
  return { tope: Math.ceil(maximo / paso) * paso, paso };
}

/**
 * Gráfico de barras de una serie (RF-15). Cada barra muestra su valor al pasar el
 * mouse o con el foco; el total de cada día también está en la tabla de la pantalla.
 * datos: [{ clave, etiqueta, etiquetaLarga, valor }]
 */
export default function GraficoBarras({ datos, formatoValor, formatoEje = formatoValor, titulo, alto = 240 }) {
  const id = useId();
  const [activa, setActiva] = useState(null);
  const lienzo = useRef(null);
  const [ancho, setAncho] = useState(720);
  useEffect(() => {
    const el = lienzo.current;
    if (!el) return undefined;
    const obs = new ResizeObserver(([e]) => setAncho(Math.max(280, Math.round(e.contentRect.width))));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const margen = { arriba: 16, derecha: 8, abajo: 30, izquierda: ancho < 480 ? 52 : 64 };
  const internoAncho = ancho - margen.izquierda - margen.derecha;
  const internoAlto = alto - margen.arriba - margen.abajo;
  const maximo = Math.max(...datos.map((d) => d.valor), 0);
  const { tope, paso } = useMemo(() => escala(maximo), [maximo]);
  const marcas = [];
  for (let v = 0; v <= tope + paso / 2; v += paso) marcas.push(v);

  const banda = internoAncho / Math.max(datos.length, 1);
  const anchoBarra = Math.min(48, banda * 0.62);
  const y = (v) => margen.arriba + internoAlto - (v / tope) * internoAlto;
  const maxEtiquetas = Math.max(4, Math.floor(internoAncho / 52));
  const mostrarEtiqueta = (i) => datos.length <= maxEtiquetas || i % Math.ceil(datos.length / maxEtiquetas) === 0;
  const actual = activa !== null ? datos[activa] : null;

  return (
    <figure className="grafico-barras" aria-labelledby={`${id}-titulo`}>
      <figcaption id={`${id}-titulo`} className="solo-lector">{titulo}</figcaption>
      <div className="grafico-barras__lienzo" ref={lienzo}>
        <svg viewBox={`0 0 ${ancho} ${alto}`} width={ancho} height={alto} role="img" aria-label={titulo}>
          {marcas.map((v) => (
            <g key={v}>
              <line x1={margen.izquierda} x2={ancho - margen.derecha} y1={y(v)} y2={y(v)} className={v === 0 ? 'grafico-barras__base' : 'grafico-barras__grilla'} />
              <text x={margen.izquierda - 8} y={y(v)} className="grafico-barras__eje" textAnchor="end" dominantBaseline="middle">{formatoEje(v)}</text>
            </g>
          ))}
          {datos.map((d, i) => {
            const x = margen.izquierda + banda * i + (banda - anchoBarra) / 2;
            const alturaBarra = Math.max(0, y(0) - y(d.valor));
            const radio = Math.min(4, alturaBarra / 2, anchoBarra / 2);
            const camino = alturaBarra > 0
              ? `M${x},${y(0)} V${y(d.valor) + radio} Q${x},${y(d.valor)} ${x + radio},${y(d.valor)} H${x + anchoBarra - radio} Q${x + anchoBarra},${y(d.valor)} ${x + anchoBarra},${y(d.valor) + radio} V${y(0)} Z`
              : '';
            return (
              <g
                key={d.clave}
                className={`grafico-barras__grupo ${activa === i ? 'grafico-barras__grupo--activo' : ''}`}
                tabIndex={0}
                role="img"
                aria-label={`${d.etiquetaLarga ?? d.etiqueta}: ${formatoValor(d.valor)}`}
                onMouseEnter={() => setActiva(i)}
                onMouseLeave={() => setActiva(null)}
                onFocus={() => setActiva(i)}
                onBlur={() => setActiva(null)}
              >
                <rect x={margen.izquierda + banda * i} y={margen.arriba} width={banda} height={internoAlto} className="grafico-barras__zona" />
                {camino && <path d={camino} className="grafico-barras__barra" />}
                {mostrarEtiqueta(i) && <text x={x + anchoBarra / 2} y={alto - 10} textAnchor="middle" className="grafico-barras__eje">{d.etiqueta}</text>}
              </g>
            );
          })}
        </svg>
        {actual && (
          <div
            className="grafico-barras__tooltip"
            style={{ left: `${((margen.izquierda + banda * activa + banda / 2) / ancho) * 100}%`, top: `${(y(actual.valor) / alto) * 100}%` }}
            role="status"
          >
            <span>{actual.etiquetaLarga ?? actual.etiqueta}</span>
            <strong className="cifra">{formatoValor(actual.valor)}</strong>
          </div>
        )}
      </div>
    </figure>
  );
}

/** Medidor horizontal de ocupación (RF-16): la barra muestra el porcentaje; el número está siempre visible. */
export function Medidor({ valor, etiqueta }) {
  const ancho = Math.max(0, Math.min(100, valor));
  return (
    <span className="medidor" role="img" aria-label={etiqueta ?? `${valor} %`}>
      <span className="medidor__pista"><span className="medidor__relleno" style={{ width: `${ancho}%` }} /></span>
      <span className="medidor__valor cifra">{String(valor).replace('.', ',')} %</span>
    </span>
  );
}
