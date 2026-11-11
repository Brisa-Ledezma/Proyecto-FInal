import { useEffect, useRef, useState } from 'react';
import { Check, LockSimple, Minus, MagnifyingGlassMinus, MagnifyingGlassPlus, X } from '@phosphor-icons/react';
import './MapaButacas.css';

// Estados de RF-04 más la selección propia. Cada uno con color y símbolo (RNF-08).
export const ESTADOS_BUTACA = {
  libre: { texto: 'Libre', Icono: null },
  seleccionada: { texto: 'Tu selección', Icono: Check },
  propia: { texto: 'Tu reserva pendiente', Icono: Check },
  bloqueada: { texto: 'Bloqueada', Icono: LockSimple },
  ocupada: { texto: 'Ocupada', Icono: X },
  inhabilitada: { texto: 'Inhabilitada', Icono: Minus },
};

export function Butaca({ estado, etiqueta, alTocar, tamano }) {
  const { Icono } = ESTADOS_BUTACA[estado];
  const elegible = estado === 'libre' || estado === 'seleccionada';
  return (
    <button
      type="button"
      className={`butaca butaca--${estado}`}
      style={tamano ? { '--t': `${tamano}px` } : undefined}
      aria-label={`${etiqueta}, ${ESTADOS_BUTACA[estado].texto.toLowerCase()}`}
      aria-pressed={estado === 'seleccionada'}
      aria-disabled={!elegible}
      data-etiqueta={etiqueta.replace('Fila ', '').replace(', butaca ', '')}
      onClick={elegible ? alTocar : undefined}
      tabIndex={alTocar ? 0 : -1}
    >
      {Icono && <Icono weight="bold" aria-hidden="true" />}
    </button>
  );
}

export function LeyendaButacas({ estados = ['libre', 'seleccionada', 'bloqueada', 'ocupada', 'inhabilitada'] }) {
  return (
    <ul className="leyenda-butacas" aria-label="Referencias del mapa">
      {estados.map((e) => (
        <li key={e}>
          <span className={`butaca butaca--${e} butaca--muestra`} aria-hidden="true">
            {ESTADOS_BUTACA[e].Icono && (() => { const I = ESTADOS_BUTACA[e].Icono; return <I weight="bold" />; })()}
          </span>
          {ESTADOS_BUTACA[e].texto}
        </li>
      ))}
    </ul>
  );
}

/**
 * Mapa de la sala organizado por filas (RF-04). Las butacas no muestran número:
 * la identificación aparece al pasar el mouse o con el foco, y en el resumen.
 * `estadoDe(butaca)` devuelve el estado visible de cada butaca.
 */
export default function MapaButacas({ filas, estadoDe, alTocar, leyenda = true }) {
  const contenedor = useRef(null);
  const [anchoDisponible, setAnchoDisponible] = useState(0);
  const [zoom, setZoom] = useState(1);
  const columnas = Math.max(...filas.map((f) => f.butacas.length), 1);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return undefined;
    const observador = new ResizeObserver(([e]) => setAnchoDisponible(e.contentRect.width));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  // Tamaño que hace entrar toda la fila en el ancho disponible; el zoom lo agranda.
  const espacioEtiquetas = 2 * 26;
  const ajuste = anchoDisponible ? (anchoDisponible - espacioEtiquetas) / columnas - 6 : 28;
  const base = Math.max(14, Math.min(36, Math.floor(ajuste)));
  const tamano = Math.round(base * zoom);
  const puedeAcercar = tamano < 44;

  return (
    <div className="mapa">
      <div className="mapa__herramientas">
        <span className="rotulo">Mapa de la sala</span>
        <div className="mapa__zoom" role="group" aria-label="Zoom del mapa">
          <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} disabled={zoom <= 1} aria-label="Alejar"><MagnifyingGlassMinus /></button>
          <button type="button" onClick={() => setZoom((z) => z + 0.25)} disabled={!puedeAcercar} aria-label="Acercar"><MagnifyingGlassPlus /></button>
        </div>
      </div>

      <div className="mapa__lienzo" ref={contenedor}>
        <div className="mapa__escena" style={{ '--t': `${tamano}px` }}>
          <div className="mapa__pantalla" aria-hidden="true"><span>Pantalla</span></div>
          <div className="mapa__filas" role="grid" aria-label="Butacas de la sala">
            {filas.map((fila) => (
              <div key={fila.letra} className="mapa__fila" role="row">
                <span className="mapa__letra" aria-hidden="true">{fila.letra}</span>
                <div className="mapa__butacas">
                  {fila.butacas.map((b) => (
                    <span role="gridcell" key={b.id}>
                      <Butaca
                        estado={estadoDe(b)}
                        etiqueta={`Fila ${fila.letra}, butaca ${b.numero}`}
                        alTocar={alTocar ? () => alTocar(b, fila) : undefined}
                      />
                    </span>
                  ))}
                </div>
                <span className="mapa__letra mapa__letra--der" aria-hidden="true">{fila.letra}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {leyenda && <LeyendaButacas />}
    </div>
  );
}
