import { aFecha, hora } from '../../utiles/formato.js';
import './TiraFunciones.css';

const LIMPIEZA = 15; // RN-12

const minutosDesde = (texto, base) => Math.round((aFecha(texto) - base) / 60000);

/**
 * Programación del día como rollo de película: una tira por sala con la
 * proyección y los 15 minutos de limpieza (RN-12, RN-13).
 */
export default function TiraFunciones({ fecha, salas, funciones, alElegir }) {
  const base = aFecha(`${fecha} 00:00:00`);
  const activas = funciones.filter((f) => f.estado !== 'CANCELADA');
  const inicioHora = Math.min(13, ...activas.map((f) => aFecha(f.inicio).getHours()));
  const finMin = Math.max(24 * 60, ...activas.map((f) => minutosDesde(f.fin, base)));
  const desde = inicioHora * 60;
  const hasta = Math.ceil(finMin / 60) * 60;
  const rango = hasta - desde;
  const pct = (m) => `${((m - desde) / rango) * 100}%`;
  const horas = [];
  for (let m = desde; m <= hasta; m += 60) horas.push(m);

  return (
    <div className="tira-scroll" tabIndex={0} aria-label="Programación del día por sala">
      <div className="tira" style={{ '--columnas': horas.length - 1 }}>
        <div className="tira__horas" aria-hidden="true">
          {horas.map((m) => <span key={m} style={{ left: pct(m) }}>{String((m / 60) % 24).padStart(2, '0')}</span>)}
        </div>
        {salas.map((sala) => (
          <div key={sala.id} className="tira__carril">
            <span className="tira__sala">{sala.nombre}</span>
            <div className="tira__pista">
              {funciones.filter((f) => f.sala.id === sala.id).map((f) => {
                const ini = minutosDesde(f.inicio, base);
                const fin = minutosDesde(f.fin, base);
                const proyeccion = fin - ini - LIMPIEZA;
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`tira__funcion tira__funcion--${f.estado.toLowerCase()}`}
                    style={{ left: pct(ini), width: `${((fin - ini) / rango) * 100}%` }}
                    onClick={() => alElegir?.(f)}
                    title={`${f.pelicula.titulo} · ${hora(f.inicio)} a ${hora(f.fin)}`}
                    aria-label={`${f.pelicula.titulo}, ${sala.nombre}, de ${hora(f.inicio)} a ${hora(f.fin)}${f.estado === 'CANCELADA' ? ', cancelada' : ''}`}
                  >
                    <span className="tira__proyeccion" style={{ flexBasis: `${(proyeccion / (fin - ini)) * 100}%` }}>
                      <strong>{f.pelicula.titulo}</strong>
                      <span className="cifra">{hora(f.inicio)}</span>
                    </span>
                    <span className="tira__limpieza" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="tira__leyenda">
        <span><i className="tira__muestra tira__muestra--proyeccion" /> Proyección</span>
        <span><i className="tira__muestra tira__muestra--limpieza" /> 15 min de limpieza</span>
        <span><i className="tira__muestra tira__muestra--cancelada" /> Cancelada</span>
      </div>
    </div>
  );
}
