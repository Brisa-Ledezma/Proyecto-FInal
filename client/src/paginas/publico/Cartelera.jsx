import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from '@phosphor-icons/react';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { usePaginacion } from '../../hooks/usePaginacion.js';
import { duracion, fechaISO, hora } from '../../utiles/formato.js';
import Telon from '../../componentes/marca/Telon.jsx';
import Carrusel, { diaFuncion } from '../../componentes/cartelera/Carrusel.jsx';
import Afiche from '../../componentes/cartelera/Afiche.jsx';
import { Clasificacion } from '../../componentes/cartelera/Funciones.jsx';
import Destellos from '../../componentes/ui/Destellos.jsx';
import Paginacion from '../../componentes/ui/Paginacion.jsx';
import { Esqueleto, ErrorCarga, Vacio } from '../../componentes/ui/Estados.jsx';
import './Cartelera.css';

const POR_PAGINA = 10;

/** Tarjeta de una película en cartel: afiche, datos y próximas funciones. */
function TarjetaPelicula({ pelicula, indice }) {
  const hayHoy = pelicula.dias.includes(fechaISO());
  return (
    <li className="tarjeta-peli" style={{ '--i': indice }}>
      <Link to={`/pelicula/${pelicula.id}`} className="tarjeta-peli__enlace brilla">
        <span className="tarjeta-peli__afiche">
          <Afiche pelicula={pelicula} />
          <span className="tarjeta-peli__barrido" aria-hidden="true" />
          {hayHoy && <span className="tarjeta-peli__cinta">Hoy</span>}
          <span className="tarjeta-peli__ver" aria-hidden="true">Ver funciones <ArrowRight weight="bold" /></span>
        </span>
        <span className="tarjeta-peli__cuerpo">
          <span className="tarjeta-peli__titulo">{pelicula.titulo}</span>
          <span className="tarjeta-peli__meta">
            <Clasificacion valor={pelicula.clasificacion} />
            <span>{pelicula.genero}</span>
            <span className="tarjeta-peli__duracion"><Clock aria-hidden="true" /> {duracion(pelicula.duracionMin)}</span>
          </span>
          {pelicula.proximas[0] && (
            <span className="tarjeta-peli__proxima">
              Próxima: <strong>{diaFuncion(pelicula.proximas[0].inicio)} <span className="cifra">{hora(pelicula.proximas[0].inicio)}</span></strong>
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

function HeroCargando() {
  return (
    <div className="cartelera__hero-cargando" aria-hidden="true">
      <Esqueleto alto={380} ancho={250} radio={8} />
      <div><Esqueleto alto={20} ancho="30%" /><Esqueleto alto={56} ancho="70%" /><Esqueleto alto={18} ancho="50%" /><Esqueleto alto={70} /></div>
    </div>
  );
}

/** P-02 Cartelera · RF-03, CU-03: todas las películas en cartel, sin elegir el día. */
export default function Cartelera() {
  const { datos, cargando, error, recargar } = useCarga(() => api.get('/cartelera/en-cartel'), []);
  const [genero, setGenero] = useState('');
  const peliculas = datos?.peliculas ?? [];
  const generos = useMemo(() => [...new Set(peliculas.map((p) => p.genero))].sort(), [peliculas]);
  const filtradas = useMemo(() => peliculas.filter((p) => !genero || p.genero === genero), [peliculas, genero]);
  const paginacion = usePaginacion(filtradas, POR_PAGINA);
  const seccion = useRef(null);
  const elegirGenero = (g) => { setGenero(g); paginacion.setPagina(1); };

  return (
    <>
      <Telon className="cartelera__escena">
        <Destellos cantidad={7} />
        {cargando && !datos && <HeroCargando />}
        {peliculas.length > 0 && <Carrusel peliculas={peliculas} />}
        {datos && !peliculas.length && (
          <div className="cartelera__hero-vacio">
            <h2 className="texto-oro">Pronto, nuevas funciones</h2>
            <p>Todavía no hay funciones programadas. Volvé a consultar más adelante.</p>
          </div>
        )}
      </Telon>

      <div className="contenedor pagina cartelera" ref={seccion}>
        <div className="encabezado-pagina">
          <div>
            <span className="rotulo">Golden Screen Cinema</span>
            <h1 className="titulo-pantalla">Cartelera</h1>
            <p className="texto-2">
              {datos ? `${peliculas.length} ${peliculas.length === 1 ? 'película' : 'películas'} en cartel. Elegí una para ver sus días y horarios.` : 'Buscando las películas en cartel…'}
            </p>
          </div>
          {generos.length > 1 && (
            <label className="cartelera__genero-select">
              <span className="solo-lector">Género</span>
              <select className="campo__control campo__control--select" value={genero} onChange={(e) => elegirGenero(e.target.value)}>
                <option value="">Todos los géneros</option>
                {generos.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
          )}
          {generos.length > 1 && (
            <div className="cartelera__generos" role="group" aria-label="Filtrar por género">
              <button type="button" aria-pressed={!genero} onClick={() => elegirGenero('')}>Todas</button>
              {generos.map((g) => <button key={g} type="button" aria-pressed={genero === g} onClick={() => elegirGenero(g)}>{g}</button>)}
            </div>
          )}
        </div>

        {error && <ErrorCarga error={error} alReintentar={recargar} />}
        {cargando && !datos && (
          <ul className="cartelera__grilla" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => <li key={i}><Esqueleto alto={0} className="cartelera__esqueleto" radio={8} /></li>)}
          </ul>
        )}
        {datos && peliculas.length === 0 && <Vacio titulo="No hay películas en cartel">Todavía no hay funciones programadas. Volvé a consultar más adelante.</Vacio>}

        {paginacion.visibles.length > 0 && (
          <ul className="cartelera__grilla" key={`${genero}-${paginacion.pagina}`}>
            {paginacion.visibles.map((p, i) => <TarjetaPelicula key={p.id} pelicula={p} indice={i} />)}
          </ul>
        )}
        <Paginacion
          control={paginacion}
          etiqueta="Páginas de la cartelera"
          unidad="películas"
          alCambiar={() => seccion.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      </div>
    </>
  );
}
