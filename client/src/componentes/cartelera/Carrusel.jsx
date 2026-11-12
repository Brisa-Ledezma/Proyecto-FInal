import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CaretLeft, CaretRight, Clock, Pause, Play, Ticket } from '@phosphor-icons/react';
import { diaCorto, duracion, fechaISO, hora, numeroDia, sumarDias } from '../../utiles/formato.js';
import Afiche from './Afiche.jsx';
import { Clasificacion } from './Funciones.jsx';
import Boton from '../ui/Boton.jsx';
import './Carrusel.css';

const INTERVALO = 6500;

/** "Hoy", "Mañana" o "Vie 13" */
export function diaFuncion(inicio) {
  const dia = String(inicio).slice(0, 10);
  const hoy = fechaISO();
  if (dia === hoy) return 'Hoy';
  if (dia === sumarDias(hoy, 1)) return 'Mañana';
  return `${diaCorto(dia)} ${numeroDia(dia)}`;
}

function Diapositiva({ pelicula, activa, indice, total }) {
  return (
    <div
      className={`carrusel__diapositiva ${activa ? 'carrusel__diapositiva--activa' : ''}`}
      role="group"
      aria-roledescription="diapositiva"
      aria-label={`${indice + 1} de ${total}: ${pelicula.titulo}`}
      aria-hidden={!activa}
      {...(activa ? {} : { inert: '' })}
    >
      {pelicula.afiche && <div className="carrusel__fondo" style={{ backgroundImage: `url(${pelicula.afiche})` }} aria-hidden="true" />}
      <Link to={`/pelicula/${pelicula.id}`} className="carrusel__afiche" tabIndex={-1} aria-hidden="true">
        <Afiche pelicula={pelicula} />
        <span className="carrusel__reflejo" />
      </Link>
      <div className="carrusel__info">
        <span className="carrusel__rotulo">
          <span>En cartelera</span>
          <span className="cifra">{String(indice + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        </span>
        <h2 className="carrusel__titulo">{pelicula.titulo}</h2>
        <p className="carrusel__meta">
          <Clasificacion valor={pelicula.clasificacion} />
          <span>{pelicula.genero}</span>
          <span className="carrusel__duracion"><Clock aria-hidden="true" /> {duracion(pelicula.duracionMin)}</span>
        </p>
        <p className="carrusel__sinopsis">{pelicula.sinopsis}</p>
        {pelicula.proximas.length > 0 && (
          <div className="carrusel__funciones">
            <span className="rotulo">Próximas funciones</span>
            <ul>
              {pelicula.proximas.slice(0, 4).map((f) => (
                <li key={f.id}>
                  {f.agotada ? (
                    <span className="carrusel__funcion carrusel__funcion--agotada">
                      <span>{diaFuncion(f.inicio)}</span><strong className="cifra">{hora(f.inicio)}</strong><span>Agotada</span>
                    </span>
                  ) : (
                    <Link to={`/funcion/${f.id}`} className="carrusel__funcion" aria-label={`${pelicula.titulo}, ${diaFuncion(f.inicio)} a las ${hora(f.inicio)} en ${f.sala.nombre}. Elegir butacas`}>
                      <span>{diaFuncion(f.inicio)}</span><strong className="cifra">{hora(f.inicio)}</strong><span>{f.sala.nombre}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="carrusel__acciones">
          <Boton variante="ticket" a={`/pelicula/${pelicula.id}`} icono={<Ticket weight="bold" />}>Ver funciones</Boton>
          <span className="carrusel__total">{pelicula.cantidadFunciones} {pelicula.cantidadFunciones === 1 ? 'función' : 'funciones'} en {pelicula.dias.length} {pelicula.dias.length === 1 ? 'día' : 'días'}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Carrusel de la cartelera: pasa solo cada 6,5 segundos y se detiene al pasar
 * el cursor, al enfocar o con el botón de pausa (WCAG 2.2.2). Se desliza con el dedo.
 */
export default function Carrusel({ peliculas }) {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [enPausa, setEnPausa] = useState(false); // pausa temporal por cursor o foco
  const toque = useRef(null);
  const total = peliculas.length;
  const ir = useCallback((n) => setActual(((n % total) + total) % total), [total]);
  const detenido = pausado || enPausa || total < 2;

  useEffect(() => {
    if (detenido) return undefined;
    const t = setTimeout(() => ir(actual + 1), INTERVALO);
    return () => clearTimeout(t);
  }, [actual, detenido, ir]);

  if (!total) return null;

  return (
    <section
      className={`carrusel ${detenido ? 'carrusel--detenido' : ''}`}
      aria-roledescription="carrusel"
      aria-label="Películas en cartelera"
      onMouseEnter={() => setEnPausa(true)}
      onMouseLeave={() => setEnPausa(false)}
      onFocus={() => setEnPausa(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setEnPausa(false); }}
      onPointerDown={(e) => { if (e.pointerType !== 'mouse') toque.current = e.clientX; }}
      onPointerUp={(e) => {
        if (toque.current === null) return;
        const dx = e.clientX - toque.current;
        toque.current = null;
        if (Math.abs(dx) > 50) ir(actual + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="carrusel__escenario" aria-live={detenido ? 'polite' : 'off'}>
        {peliculas.map((p, i) => <Diapositiva key={p.id} pelicula={p} activa={i === actual} indice={i} total={total} />)}
      </div>

      {total > 1 && (
        <>
          <button type="button" className="carrusel__flecha carrusel__flecha--izq" onClick={() => ir(actual - 1)} aria-label="Película anterior"><CaretLeft weight="bold" /></button>
          <button type="button" className="carrusel__flecha carrusel__flecha--der" onClick={() => ir(actual + 1)} aria-label="Película siguiente"><CaretRight weight="bold" /></button>

          <div className="carrusel__control">
            <button type="button" className="carrusel__pausa" onClick={() => setPausado((p) => !p)} aria-label={pausado ? 'Reanudar el carrusel' : 'Pausar el carrusel'}>
              {pausado ? <Play weight="fill" /> : <Pause weight="fill" />}
            </button>
            <div className="carrusel__miniaturas" role="tablist" aria-label="Elegir película">
              {peliculas.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={i === actual}
                  aria-label={p.titulo}
                  title={p.titulo}
                  className="carrusel__miniatura"
                  onClick={() => ir(i)}
                >
                  <Afiche pelicula={p} tamano="chico" />
                  {i === actual && <span key={actual} className="carrusel__progreso" style={{ animationDuration: `${INTERVALO}ms` }} />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
