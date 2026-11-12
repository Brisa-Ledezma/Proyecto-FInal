import { useEffect, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { aFecha, fechaISO, hora } from '../../utiles/formato.js';
import './Cronograma.css';

const LIMPIEZA = 15; // RN-12
const PX_MINUTO = 1.15; // alto de cada minuto en la grilla
const dos = (n) => String(n).padStart(2, '0');

const minutosDesde = (texto, base) => Math.round((aFecha(texto) - base) / 60000);
const textoMinuto = (m) => `${dos(Math.floor(m / 60) % 24)}:${dos(m % 60)}`;

/** true si la pantalla es angosta (celular). */
function useAngosta(consulta = '(max-width: 760px)') {
  const [angosta, setAngosta] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const m = window.matchMedia(consulta);
    const alCambiar = () => setAngosta(m.matches);
    m.addEventListener('change', alCambiar);
    return () => m.removeEventListener('change', alCambiar);
  }, [consulta]);
  return angosta;
}

function useAhora() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

/**
 * Cronograma del día: una columna por sala y el horario de arriba hacia abajo.
 * Cada función ocupa el alto de su duración, con los 15 minutos de limpieza al
 * final (RN-12), así se ve de un vistazo que no se superponen (RN-13).
 * Tocar una función la abre para modificarla; tocar un hueco libre programa una nueva.
 */
export default function Cronograma({ fecha, salas: todasLasSalas, funciones, alElegir, alNueva }) {
  const ahora = useAhora();
  // En el celular se ve una sala por vez, a todo el ancho, con botones para cambiar.
  const angosta = useAngosta();
  const [idSalaMovil, setIdSalaMovil] = useState(todasLasSalas[0]?.id);
  const salaMovil = todasLasSalas.find((s) => s.id === idSalaMovil) ?? todasLasSalas[0];
  const salas = angosta && salaMovil ? [salaMovil] : todasLasSalas;
  const base = aFecha(`${fecha} 00:00:00`);
  const activas = funciones.filter((f) => f.estado !== 'CANCELADA');
  const desde = Math.min(13 * 60, ...activas.map((f) => Math.floor(minutosDesde(f.inicio, base) / 60) * 60));
  const hasta = Math.max(24 * 60, ...activas.map((f) => Math.ceil(minutosDesde(f.fin, base) / 60) * 60));
  const alto = (hasta - desde) * PX_MINUTO;
  const y = (m) => (m - desde) * PX_MINUTO;
  const horas = [];
  for (let m = desde; m <= hasta; m += 60) horas.push(m);
  const esHoy = fecha === fechaISO();
  const minutoAhora = minutosDesde(ahora, base);
  const muestraAhora = esHoy && minutoAhora >= desde && minutoAhora <= hasta;

  const tocarHueco = (sala) => (e) => {
    if (e.target !== e.currentTarget || !alNueva) return;
    const r = e.currentTarget.getBoundingClientRect();
    const minuto = Math.round((desde + (e.clientY - r.top) / PX_MINUTO) / 15) * 15;
    alNueva({ idSala: String(sala.id), hora: textoMinuto(Math.min(Math.max(minuto, desde), 23 * 60 + 45)) });
  };

  return (
    <div className={`cronograma ${angosta ? 'cronograma--movil' : ''}`} style={{ '--columnas': salas.length }}>
      {angosta && todasLasSalas.length > 1 && (
        <div className="cronograma__salas-movil" role="tablist" aria-label="Elegir sala">
          {todasLasSalas.map((s) => {
            const cantidad = funciones.filter((f) => f.sala.id === s.id && f.estado !== 'CANCELADA').length;
            return (
              <button key={s.id} type="button" role="tab" aria-selected={s.id === salaMovil.id} onClick={() => setIdSalaMovil(s.id)}>
                {s.nombre} <span className="cifra">{cantidad}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="cronograma__desplazable" tabIndex={0} aria-label="Cronograma del día por sala">
        <div className="cronograma__grilla">
          <div className="cronograma__esquina" aria-hidden="true" />
          {salas.map((s) => {
            const propias = activas.filter((f) => f.sala.id === s.id);
            return (
              <div key={s.id} className="cronograma__sala">
                <strong>{s.nombre}</strong>
                <span>{propias.length} {propias.length === 1 ? 'función' : 'funciones'}</span>
              </div>
            );
          })}

          <div className="cronograma__horas" style={{ height: alto }} aria-hidden="true">
            {horas.map((m) => <span key={m} style={{ top: y(m) }}>{textoMinuto(m)}</span>)}
          </div>

          {salas.map((s) => (
            <div
              key={s.id}
              className={`cronograma__columna ${alNueva ? 'cronograma__columna--libre' : ''}`}
              style={{ height: alto, '--hora': `${60 * PX_MINUTO}px` }}
              onClick={tocarHueco(s)}
              title={alNueva ? `Tocá un espacio libre para programar en ${s.nombre}` : undefined}
            >
              {funciones.filter((f) => f.sala.id === s.id).map((f, i) => {
                const ini = minutosDesde(f.inicio, base);
                const fin = minutosDesde(f.fin, base);
                const total = fin - ini;
                const enCurso = esHoy && f.estado === 'PROGRAMADA' && minutoAhora >= ini && minutoAhora < fin;
                const ocupacion = f.capacidad ? Math.round((f.vendidas / f.capacidad) * 100) : 0;
                const editable = f.estado === 'PROGRAMADA';
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`cronograma__funcion cronograma__funcion--${f.estado.toLowerCase()} ${enCurso ? 'cronograma__funcion--en-curso' : ''} ${total * PX_MINUTO < 90 ? 'cronograma__funcion--corta' : ''}`}
                    style={{ top: y(ini), height: total * PX_MINUTO, '--limpieza': `${(LIMPIEZA / total) * 100}%`, '--i': i }}
                    onClick={() => editable && alElegir?.(f)}
                    aria-disabled={!editable}
                    title={`${f.pelicula.titulo} · ${hora(f.inicio)} a ${hora(f.fin)} · ${f.vendidas} de ${f.capacidad} vendidas`}
                    aria-label={`${f.pelicula.titulo}, ${s.nombre}, de ${hora(f.inicio)} a ${hora(f.fin)}, ${f.vendidas} de ${f.capacidad} entradas vendidas${f.estado === 'CANCELADA' ? ', cancelada' : f.estado === 'FINALIZADA' ? ', finalizada' : enCurso ? ', en curso' : '. Modificar'}`}
                  >
                    <span className="cronograma__proyeccion">
                      <span className="cronograma__hora cifra">{hora(f.inicio)} – {hora(f.fin)}</span>
                      <strong className="cronograma__titulo">{f.pelicula.titulo}</strong>
                      {enCurso && <span className="cronograma__etiqueta">En curso</span>}
                      {f.estado === 'CANCELADA' && <span className="cronograma__etiqueta">Cancelada</span>}
                      {f.estado !== 'CANCELADA' && (
                        <span className="cronograma__ocupacion">
                          <span className="cronograma__barra"><span style={{ width: `${ocupacion}%` }} /></span>
                          <span className="cifra">{f.vendidas}/{f.capacidad}</span>
                        </span>
                      )}
                    </span>
                    <span className="cronograma__limpieza" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          ))}

          {muestraAhora && (
            <div className="cronograma__ahora" style={{ top: `calc(var(--alto-cabecera) + ${y(minutoAhora)}px)` }} aria-hidden="true">
              <span className="cifra">{hora(ahora)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="cronograma__leyenda">
        <span><i className="cronograma__muestra cronograma__muestra--programada" /> Programada</span>
        <span><i className="cronograma__muestra cronograma__muestra--curso" /> En curso</span>
        <span><i className="cronograma__muestra cronograma__muestra--finalizada" /> Finalizada</span>
        <span><i className="cronograma__muestra cronograma__muestra--limpieza" /> 15 min de limpieza</span>
        <span><i className="cronograma__muestra cronograma__muestra--cancelada" /> Cancelada</span>
        {alNueva && <span className="cronograma__pista"><Plus weight="bold" aria-hidden="true" /> Tocá un espacio libre para programar ahí</span>}
      </div>
    </div>
  );
}
