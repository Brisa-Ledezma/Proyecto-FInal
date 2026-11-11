import { Link, useSearchParams } from 'react-router-dom';
import { Clock } from '@phosphor-icons/react';
import { api, query } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { duracion, fechaISO, fechaRelativa, fechaLarga, sumarDias } from '../../utiles/formato.js';
import Telon from '../../componentes/marca/Telon.jsx';
import Marquesina from '../../componentes/marca/Marquesina.jsx';
import Destellos from '../../componentes/ui/Destellos.jsx';
import Boton from '../../componentes/ui/Boton.jsx';
import Afiche from '../../componentes/cartelera/Afiche.jsx';
import { Clasificacion, ListaFunciones } from '../../componentes/cartelera/Funciones.jsx';
import { Esqueleto, ErrorCarga, Vacio } from '../../componentes/ui/Estados.jsx';
import './Cartelera.css';

function PeliculaEnCartel({ pelicula }) {
  return (
    <article className="en-cartel aparecer">
      <Link to={`/pelicula/${pelicula.id}`} className="en-cartel__afiche" tabIndex={-1} aria-hidden="true">
        <Afiche pelicula={pelicula} />
      </Link>
      <div className="en-cartel__cuerpo">
        <div className="en-cartel__cabecera">
          <h2 className="en-cartel__titulo"><Link to={`/pelicula/${pelicula.id}`}>{pelicula.titulo}</Link></h2>
          <p className="en-cartel__meta">
            <Clasificacion valor={pelicula.clasificacion} />
            <span>{pelicula.genero}</span>
            <span className="en-cartel__duracion"><Clock aria-hidden="true" /> {duracion(pelicula.duracionMin)}</span>
          </p>
        </div>
        <ListaFunciones funciones={pelicula.funciones} titulo={pelicula.titulo} />
        <Link to={`/pelicula/${pelicula.id}`} className="en-cartel__detalle">Ver sinopsis y todas las funciones</Link>
      </div>
    </article>
  );
}

function CarteleraCargando() {
  return (
    <div className="cartelera__lista" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="en-cartel">
          <Esqueleto alto="100%" className="en-cartel__afiche" radio={4} />
          <div className="en-cartel__cuerpo">
            <Esqueleto alto={28} ancho="60%" />
            <Esqueleto alto={18} ancho="40%" />
            <div style={{ display: 'flex', gap: 10 }}><Esqueleto alto={58} ancho={168} /><Esqueleto alto={58} ancho={168} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** P-02 Cartelera · RF-03, CU-03. */
export default function Cartelera() {
  const [parametros, setParametros] = useSearchParams();
  const hoy = fechaISO();
  const fecha = parametros.get('fecha') ?? hoy;
  const fechas = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i));
  const { datos, cargando, error, recargar } = useCarga(() => api.get(`/cartelera${query({ fecha })}`), [fecha]);

  const elegirFecha = (f) => setParametros(f === hoy ? {} : { fecha: f }, { replace: true });
  const sugeridas = (datos?.proximasFechas ?? []).filter((f) => f !== fecha).slice(0, 3);

  return (
    <>
      <Telon compacto className="cartelera__escena">
        <div className="cartelera__hero">
          <Destellos cantidad={6} />
          <h1 className="cartelera__titulo texto-oro">Cartelera</h1>
          <p className="cartelera__bajada">Elegí el día, la película y el horario. Las butacas libres se actualizan al instante.</p>
          <Marquesina fechas={fechas.includes(fecha) ? fechas : [fecha, ...fechas]} seleccionada={fecha} alElegir={elegirFecha} />
        </div>
      </Telon>

      <div className="contenedor pagina">
        <h2 className="cartelera__dia">
          <span className="rotulo">Funciones de</span>
          <span>{fechaRelativa(fecha)}</span>
        </h2>

        {cargando && !datos && <CarteleraCargando />}
        {error && <ErrorCarga error={error} alReintentar={recargar} />}

        {datos && datos.peliculas.length === 0 && (
          <Vacio
            titulo={`No hay funciones para el ${fechaLarga(fecha)}`}
            accion={sugeridas.length > 0 && (
              <div className="cartelera__sugeridas">
                {sugeridas.map((f) => <Boton key={f} variante="secundario" onClick={() => elegirFecha(f)}>{fechaRelativa(f)}</Boton>)}
              </div>
            )}
          >
            {sugeridas.length ? 'Estas son las próximas fechas con funciones:' : 'Todavía no hay funciones programadas. Volvé a consultar más adelante.'}
          </Vacio>
        )}

        {datos && datos.peliculas.length > 0 && (
          <div className="cartelera__lista" aria-busy={cargando}>
            {datos.peliculas.map((p) => <PeliculaEnCartel key={p.id} pelicula={p} />)}
          </div>
        )}
      </div>
    </>
  );
}
